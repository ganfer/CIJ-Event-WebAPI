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
TRANSLATION_SCHEMA_VERSION = 2

# googletrans expects language codes, while the portal uses regional locales.
# Most locales map to their primary language automatically; only exceptions live here.
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


async def translate_node(translator, source, existing, language, reuse_existing, path=()):
    if isinstance(source, dict):
        existing_dict = existing if isinstance(existing, dict) else {}
        result = {}
        for key, value in source.items():
            result[key] = await translate_node(
                translator,
                value,
                existing_dict.get(key),
                language,
                reuse_existing,
                (*path, key),
            )
        return result

    # A speaker's personal name is identity data, not translatable content.
    if len(path) >= 3 and path[-3] == "speakers" and path[-1] == "name":
        return source

    if isinstance(source, str) and source.strip():
        if reuse_existing and existing is not None:
            return existing
        return (await translator.translate(source, src="en", dest=language)).text

    return existing if reuse_existing and existing is not None else source


async def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: translate-event-content.py <source.json> <output.json>")

    source_path, output_path = sys.argv[1], sys.argv[2]
    with open(source_path, encoding="utf-8") as handle:
        source = json.load(handle)

    locales = discover_portal_locales()
    if "en-US" not in locales:
        raise RuntimeError("Portal locale en-US is required because event source content uses en-US.")

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

    # Rebuild from the currently available portal locales. Existing translations
    # are only reused when they were produced by this schema from the exact same source.
    result = {}

    async with Translator() as translator:
        for locale in locales:
            if locale.lower().startswith("en-"):
                result[locale] = source
                continue

            reuse_existing = cache_is_valid and isinstance(existing_result.get(locale), dict)
            result[locale] = await translate_node(
                translator,
                source,
                existing_result.get(locale),
                googletrans_language(locale),
                reuse_existing,
            )

    result["_meta"] = {
        "sourceLocale": "en-US",
        "translationProvider": "googletrans",
        "translationSchemaVersion": TRANSLATION_SCHEMA_VERSION,
        "sourceHash": current_source_hash,
    }

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    asyncio.run(main())
