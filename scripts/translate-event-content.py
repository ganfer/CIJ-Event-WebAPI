#!/usr/bin/env python3
import asyncio
import json
import sys
from googletrans import Translator

TARGETS = {"de-DE": "de", "fr-FR": "fr"}

async def translate_node(translator, source, existing, language):
    if isinstance(source, dict):
        result = existing if isinstance(existing, dict) else {}
        for key, value in source.items():
            result[key] = await translate_node(translator, value, result.get(key), language)
        return result
    if isinstance(source, str) and source.strip() and not existing:
        return (await translator.translate(source, src="en", dest=language)).text
    return existing if existing is not None else source

async def main():
    source_path, output_path = sys.argv[1], sys.argv[2]
    source = json.loads(open(source_path, encoding="utf-8").read())
    try:
        result = json.loads(open(output_path, encoding="utf-8").read())
    except FileNotFoundError:
        result = {}
    result["en-US"] = source
    async with Translator() as translator:
        for locale, language in TARGETS.items():
            result[locale] = await translate_node(translator, source, result.get(locale), language)
    result["_meta"] = {"sourceLocale": "en-US", "translationProvider": "googletrans"}
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

if __name__ == "__main__":
    asyncio.run(main())
