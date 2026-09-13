#!/usr/bin/env python3
import asyncio
from googletrans import Translator

SOURCE = "This event is for demonstration purposes"
LANGUAGES = ("de", "it", "fr", "es", "pt", "pl", "cs")


async def main():
    failures = []
    async with Translator() as translator:
        for language in LANGUAGES:
            try:
                result = await translator.translate(SOURCE, src="en", dest=language)
                translated = result.text
                unchanged = translated.strip() == SOURCE
                status = "UNCHANGED" if unchanged else "OK"
                print(f"{language}: {status} | {translated}")
                if unchanged:
                    failures.append(f"{language}: unchanged")
            except Exception as exc:
                print(f"{language}: ERROR | {type(exc).__name__}: {exc}")
                failures.append(f"{language}: {type(exc).__name__}")

    if failures:
        raise SystemExit("googletrans diagnostic failed: " + ", ".join(failures))


if __name__ == "__main__":
    asyncio.run(main())
