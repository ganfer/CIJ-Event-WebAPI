#!/usr/bin/env python3
import asyncio
import json
import re
from pathlib import Path

from googletrans import Translator

LOCALES_DIR = Path("public/locales")
PORTAL_DIR = Path("public/translation/portal")
SOURCE_LOCALE = "en-US"
LOCALE_PATTERN = re.compile(r"^translation\.(.+)\.json$")
PLACEHOLDER_PATTERN = re.compile(r"{{[^{}]+}}")

GOOGLETRANS_LANGUAGE_OVERRIDES = {
    "nb": "no",
    "zh-CN": "zh-cn",
    "zh-HK": "zh-tw",
    "zh-TW": "zh-tw",
}


def discover_locales():
    locales = []
    for file in LOCALES_DIR.glob("translation.*.json"):
        match = LOCALE_PATTERN.match(file.name)
        if match:
            locales.append(match.group(1))
    return sorted(set(locales))


def google_language(locale):
    if locale in GOOGLETRANS_LANGUAGE_OVERRIDES:
        return GOOGLETRANS_LANGUAGE_OVERRIDES[locale]
    language = locale.split("-", 1)[0].lower()
    return GOOGLETRANS_LANGUAGE_OVERRIDES.get(language, language)


def read_json(path):
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        return {}


def protect_placeholders(text, offset=0):
    replacements = {}

    def replace(match):
        token = f"ZXQPLACEHOLDER{offset + len(replacements)}QXZ"
        replacements[token] = match.group(0)
        return token

    return PLACEHOLDER_PATTERN.sub(replace, text), replacements


def restore_placeholders(text, replacements):
    result = text
    for token, original in replacements.items():
        if token not in result:
            raise RuntimeError(f"translation changed placeholder token {token}")
        result = result.replace(token, original)
    return result


async def translate_missing(translator, source, keys, destination):
    protected_values = []
    replacements = []
    placeholder_offset = 0

    for key in keys:
        protected, mapping = protect_placeholders(source[key], placeholder_offset)
        placeholder_offset += len(mapping)
        protected_values.append(protected)
        replacements.append(mapping)

    raw_results = await translator.translate(protected_values, src="en", dest=destination)
    if not isinstance(raw_results, list):
        raw_results = [raw_results]
    if len(raw_results) != len(keys):
        raise RuntimeError(f"googletrans returned {len(raw_results)} result(s) for {len(keys)} input(s)")

    translated = {}
    failed = []
    for key, source_value, result, mapping in zip(keys, [source[key] for key in keys], raw_results, replacements):
        try:
            value = restore_placeholders(result.text, mapping)
            if value.strip() == source_value.strip():
                raise RuntimeError("googletrans returned unchanged source text")
            translated[key] = value
        except Exception as error:
            failed.append((key, error))

    return translated, failed


async def main():
    source_path = PORTAL_DIR / f"{SOURCE_LOCALE}.json"
    source = read_json(source_path)
    if not source:
        raise RuntimeError(f"Portal UI source is missing or empty: {source_path}")

    PORTAL_DIR.mkdir(parents=True, exist_ok=True)
    locales = discover_locales()
    pending = []

    async with Translator() as translator:
        for locale in locales:
            output_path = PORTAL_DIR / f"{locale}.json"

            if locale.lower().startswith("en-"):
                if locale != SOURCE_LOCALE:
                    with output_path.open("w", encoding="utf-8") as handle:
                        json.dump(source, handle, ensure_ascii=False, indent=2)
                        handle.write("\n")
                    print(f"portal {locale}: source copy")
                continue

            existing = read_json(output_path)
            missing = [
                key for key in source
                if not isinstance(existing.get(key), str) or not existing[key].strip()
            ]

            if not missing:
                print(f"portal {locale}: all keys already translated")
                continue

            print(f"portal {locale}: translating {len(missing)} missing key(s) in one batch")
            updated = dict(existing)

            try:
                translated, failed = await translate_missing(
                    translator,
                    source,
                    missing,
                    google_language(locale),
                )
                updated.update(translated)
                for key, error in failed:
                    print(f"::warning title=Portal UI translation pending::{locale}/{key}: {error}")
                if failed:
                    pending.append(locale)
            except Exception as error:
                pending.append(locale)
                print(f"::warning title=Portal UI translation pending::{locale}: {error}")

            if updated != existing:
                with output_path.open("w", encoding="utf-8") as handle:
                    json.dump(updated, handle, ensure_ascii=False, indent=2)
                    handle.write("\n")

    if pending:
        print("Pending portal UI translations will be retried on the next sync: " + ", ".join(sorted(set(pending))))
    else:
        print("Portal UI translations are complete for all discovered locales.")


if __name__ == "__main__":
    asyncio.run(main())
