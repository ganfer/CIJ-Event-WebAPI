#!/usr/bin/env python3
import asyncio
import json
import re
from pathlib import Path

from googletrans import Translator

LOCALES_DIR = Path("public/locales")
SOURCE_LOCALE = "en-US"
LOCALE_PATTERN = re.compile(r"^translation\.(.+)\.json$")
PLACEHOLDER_PATTERN = re.compile(r"{{[^{}]+}}")
TRANSLATION_TIMEOUT_SECONDS = 30

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


def translatable_source(source):
    return {
        key: value
        for key, value in source.items()
        if not key.startswith("_") and isinstance(value, str) and value.strip()
    }


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

    separators = [f"ZXQITEM{index}QXZ" for index in range(1, len(protected_values))]
    combined_parts = []
    for index, value in enumerate(protected_values):
        if index:
            combined_parts.append(f"\n{separators[index - 1]}\n")
        combined_parts.append(value)
    combined = "".join(combined_parts)

    result = await translator.translate(combined, src="en", dest=destination)
    translated_text = result.text

    segments = [translated_text]
    for separator in separators:
        next_segments = []
        for segment in segments:
            if separator in segment:
                left, right = segment.split(separator, 1)
                next_segments.extend([left, right])
            else:
                next_segments.append(segment)
        segments = next_segments

    if len(segments) != len(keys):
        raise RuntimeError(
            f"googletrans changed batch separators: expected {len(keys)} segments, got {len(segments)}"
        )

    translated = {}
    failed = []
    for key, source_value, value, mapping in zip(keys, [source[key] for key in keys], segments, replacements):
        try:
            value = restore_placeholders(value.strip(), mapping)
            if value.strip() == source_value.strip():
                raise RuntimeError("googletrans returned unchanged source text")
            translated[key] = value
        except Exception as error:
            failed.append((key, error))

    return translated, failed


async def main():
    source_path = LOCALES_DIR / f"translation.{SOURCE_LOCALE}.json"
    source_document = read_json(source_path)
    source = translatable_source(source_document)
    if not source:
        raise RuntimeError(f"Portal UI source is missing or empty: {source_path}")

    locales = discover_locales()
    pending = []

    async with Translator() as translator:
        for locale in locales:
            if locale == SOURCE_LOCALE:
                continue

            output_path = LOCALES_DIR / f"translation.{locale}.json"
            existing = read_json(output_path)
            missing = [
                key for key in source
                if not isinstance(existing.get(key), str) or not existing[key].strip()
            ]

            if not missing:
                print(f"portal {locale}: all standard locale keys already present")
                continue

            updated = dict(existing)

            if locale.lower().startswith("en-"):
                for key in missing:
                    updated[key] = source[key]
                print(f"portal {locale}: copied {len(missing)} missing key(s) from en-US")
            else:
                print(f"portal {locale}: translating {len(missing)} missing key(s) in one text batch")
                try:
                    translated, failed = await asyncio.wait_for(
                        translate_missing(
                            translator,
                            source,
                            missing,
                            google_language(locale),
                        ),
                        timeout=TRANSLATION_TIMEOUT_SECONDS,
                    )
                    updated.update(translated)
                    for key, error in failed:
                        print(f"::warning title=Portal UI translation pending::{locale}/{key}: {error}")
                    if failed:
                        pending.append(locale)
                except asyncio.TimeoutError:
                    pending.append(locale)
                    print(
                        f"::warning title=Portal UI translation pending::"
                        f"{locale}: googletrans timed out after {TRANSLATION_TIMEOUT_SECONDS}s"
                    )
                except Exception as error:
                    pending.append(locale)
                    print(f"::warning title=Portal UI translation pending::{locale}: {error}")

            if updated != existing:
                with output_path.open("w", encoding="utf-8") as handle:
                    json.dump(updated, handle, ensure_ascii=False, indent=2)
                    handle.write("\n")

    if pending:
        print("Pending standard locale translations will be retried on the next sync: " + ", ".join(sorted(set(pending))))
    else:
        print("Standard portal locale files are complete for all discovered locales.")


if __name__ == "__main__":
    asyncio.run(main())
