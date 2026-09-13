#!/usr/bin/env python3
import asyncio
import json
import sys
from googletrans import Translator

TARGETS = {"de-DE": "de", "fr-FR": "fr"}

async def translate_node(translator, value, language):
    if isinstance(value, dict):
        return {key: await translate_node(translator, child, language) for key, child in value.items()}
    if isinstance(value, str) and value.strip():
        return (await translator.translate(value, src="en", dest=language)).text
    return value

async def main():
    source_path, output_path = sys.argv[1], sys.argv[2]
    source = json.loads(open(source_path, encoding="utf-8").read())
    result = {"en-US": source}
    async with Translator() as translator:
        for locale, language in TARGETS.items():
            result[locale] = await translate_node(translator, source, language)
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

if __name__ == "__main__":
    asyncio.run(main())
