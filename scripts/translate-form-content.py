#!/usr/bin/env python3
import asyncio
import hashlib
import json
import re
import sys
from pathlib import Path
from googletrans import Translator

LOCALES_DIR = Path("public/locales")
LOCALE_FILE_PATTERN = re.compile(r"^translation\.(.+)\.json$")
TRANSLATION_SCHEMA_VERSION = 1

GOOGLETRANS_LANGUAGE_OVERRIDES = {
    "nb": "no",
    "zh-CN": "zh-cn",
    "zh-HK": "zh-tw",
    "zh-Hans-CN": "zh-cn",
    "zh-Hant-HK": "zh-tw",
    "zh-Hant-TW": "zh-tw",
    "zh-TW": "zh-tw",
}


def discover_portal_locales():
    locales = []
    for file in LOCALES_DIR.glob("translation.*.json"):
        match = LOCALE_FILE_PATTERN.match(file.name)
        if match:
            locales.append(match.group(1))
    return sorted(set(locales))


def googletrans_language(locale):
    if locale in GOOGLETRANS_LANGUAGE_OVERRIDES:
        return GOOGLETRANS_LANGUAGE_OVERRIDES[locale]
    language = locale.split("-", 1)[0].lower()
    return GOOGLETRANS_LANGUAGE_OVERRIDES.get(language, language)


def source_hash(source):
    canonical = json.dumps(source, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def translatable_strings(node):
    values = []
    if isinstance(node, dict):
        for value in node.values():
            values.extend(translatable_strings(value))
    elif isinstance(node, str) and node.strip():
        values.append(node)
    return values


def is_untranslated_copy(source, localized):
    source_values = translatable_strings(source)
    localized_values = translatable_strings(localized)
    return bool(source_values) and source_values == localized_values


async def translate_node(translator, source, language):
    if isinstance(source, dict):
        result = {}
        for key, value in source.items():
            result[key] = await translate_node(translator, value, language)
        return result

    if isinstance(source, str) and source.strip():
        return (await translator.translate(source, src="en", dest=language)).text

    return source


async def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: translate-form-content.py <source.json> <output.json>")

    source_path, output_path = sys.argv[1], sys.argv[2]
    with open(source_path, encoding="utf-8") as handle:
        source = json.load(handle)

    locales = discover_portal_locales()
    if "en-US" not in locales:
        raise RuntimeError("Portal locale en-US is required because form source content uses en-US.")

    try:
        with open(output_path, encoding="utf-8") as handle:
            existing_result = json.load(handle)
    except FileNotFoundError:
        existing_result = {}

    current_source_hash = source_hash(source)
    existing_meta = existing_result.get("_meta", {}) if isinstance(existing_result, dict) else {}
    cache_is_valid = (
        existing_meta.get("translationSchemaVersion") == TRANSLATION_SCHEMA_VERSION
        and existing_meta.get("sourceHash") == current_source_hash
        and existing_meta.get("sourceLocale") == "en-US"
        and existing_meta.get("translationProvider") == "googletrans"
    )

    resolved = {}
    pending = []

    for locale in locales:
        if locale.lower().startswith("en-"):
            resolved[locale] = source
            print(f"form {locale}: source copy")
            continue

        existing_locale = existing_result.get(locale)
        reuse_existing = (
            cache_is_valid
            and isinstance(existing_locale, dict)
            and not is_untranslated_copy(source, existing_locale)
        )

        if reuse_existing:
            resolved[locale] = existing_locale
            print(f"form {locale}: reusing cached translation")
        else:
            pending.append(locale)
            print(f"form {locale}: translation required")

    failed_locales = []

    if pending:
        print("Missing or invalid form translations: " + ", ".join(pending))
        try:
            async with Translator() as translator:
                for locale in pending:
                    print(f"form {locale}: translating with googletrans")
                    try:
                        translated = await translate_node(
                            translator,
                            source,
                            googletrans_language(locale),
                        )
                        if is_untranslated_copy(source, translated):
                            raise RuntimeError("googletrans returned the unchanged en-US source")
                        resolved[locale] = translated
                        print(f"form {locale}: translation completed")
                    except Exception as error:
                        failed_locales.append(locale)
                        print(f"::warning title=Form translation pending::{locale}: {error}")
        except Exception as error:
            unresolved = [locale for locale in pending if locale not in resolved]
            for locale in unresolved:
                if locale not in failed_locales:
                    failed_locales.append(locale)
            print(f"::warning title=googletrans unavailable for form translations::{error}")
    else:
        print("All non-English form translations are already cached; googletrans is not called.")

    result = {locale: resolved[locale] for locale in locales if locale in resolved}
    result["_meta"] = {
        "sourceLocale": "en-US",
        "translationProvider": "googletrans",
        "translationSchemaVersion": TRANSLATION_SCHEMA_VERSION,
        "sourceHash": current_source_hash,
        "pendingLocales": failed_locales,
    }

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    if failed_locales:
        print("Pending form translations will be retried on the next sync: " + ", ".join(failed_locales))


if __name__ == "__main__":
    asyncio.run(main())
