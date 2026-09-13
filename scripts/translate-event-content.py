#!/usr/bin/env python3
import asyncio
import json
import sys
from googletrans import Translator

# Keep this list aligned with supportedLocales in public/js/localization.js.
TARGETS = {
    "ar-SA": "ar", "bg-BG": "bg", "ca-ES": "ca", "cs-CZ": "cs",
    "da-DK": "da", "de-DE": "de", "el-GR": "el", "es-ES": "es",
    "et-EE": "et", "eu-ES": "eu", "fi-FI": "fi", "fr-CA": "fr",
    "fr-FR": "fr", "gl-ES": "gl", "he-IL": "he", "hr-HR": "hr",
    "hu-HU": "hu", "id-ID": "id", "it-IT": "it", "ja-JP": "ja",
    "ko-KR": "ko", "lt-LT": "lt", "lv-LV": "lv", "nb-NO": "no",
    "nl-NL": "nl", "pl-PL": "pl", "pt-BR": "pt", "pt-PT": "pt",
    "ro-RO": "ro", "ru-RU": "ru", "sk-SK": "sk", "sl-SI": "sl",
    "sr-Cyrl-CS": "sr", "sr-Latn-CS": "sr", "sv-SE": "sv",
    "th-TH": "th", "tr-TR": "tr", "uk-UA": "uk", "vi-VN": "vi",
    "zh-CN": "zh-cn", "zh-HK": "zh-tw", "zh-TW": "zh-tw",
}

# The source is en-US. Other English portal locales reuse the source content.
ENGLISH_LOCALES = ("en-AU", "en-CA", "en-GB", "en-US")

async def translate_node(translator, source, existing, language, path=()):
    if isinstance(source, dict):
        # Rebuild dictionaries from the current source structure. Existing values
        # are reused only for keys that still exist in the source, which removes
        # stale descriptions, sessions, speakers, and nested fields automatically.
        existing_dict = existing if isinstance(existing, dict) else {}
        result = {}
        for key, value in source.items():
            result[key] = await translate_node(
                translator,
                value,
                existing_dict.get(key),
                language,
                (*path, key),
            )
        return result

    # A speaker's personal name is identity data, not translatable content.
    if len(path) >= 3 and path[-3] == "speakers" and path[-1] == "name":
        return source

    if isinstance(source, str) and source.strip() and not existing:
        return (await translator.translate(source, src="en", dest=language)).text

    return existing if existing is not None else source

async def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: translate-event-content.py <source.json> <output.json>")

    source_path, output_path = sys.argv[1], sys.argv[2]
    with open(source_path, encoding="utf-8") as handle:
        source = json.load(handle)

    try:
        with open(output_path, encoding="utf-8") as handle:
            result = json.load(handle)
    except FileNotFoundError:
        result = {}

    for locale in ENGLISH_LOCALES:
        result[locale] = source

    async with Translator() as translator:
        for locale, language in TARGETS.items():
            result[locale] = await translate_node(
                translator,
                source,
                result.get(locale),
                language,
            )

    result["_meta"] = {
        "sourceLocale": "en-US",
        "translationProvider": "googletrans",
    }

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

if __name__ == "__main__":
    asyncio.run(main())
