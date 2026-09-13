#!/usr/bin/env python3
import asyncio
import copy
import importlib.util
import json
import sys
from pathlib import Path

from googletrans import Translator

BASE_SCRIPT = Path(__file__).with_name("translate-form-content.py")
spec = importlib.util.spec_from_file_location("base_form_translator", BASE_SCRIPT)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

TRANSLATION_SCHEMA_VERSION = 3
TRANSLATION_PROVIDER = "googletrans+standard-fields+extended-copy"


def apply_standard_overrides(source, translated, locale):
    glossary = base.STANDARD_FIELD_TRANSLATIONS.get(locale)
    if not glossary or not isinstance(translated, dict):
        return translated

    result = copy.deepcopy(translated)
    source_fields = source.get("fields", {}) if isinstance(source, dict) else {}
    target_fields = result.setdefault("fields", {})

    for field_key, source_field in source_fields.items():
        logical_key = str(field_key).lower()
        if logical_key not in {"firstname", "lastname", "emailaddress1"}:
            continue
        if not isinstance(source_field, dict):
            continue

        target_field = target_fields.setdefault(field_key, {})
        if "label" in source_field:
            target_field["label"] = glossary[logical_key]
        if "placeholder" in source_field:
            target_field["placeholder"] = glossary[logical_key]

    source_buttons = source.get("buttons", {}) if isinstance(source, dict) else {}
    if isinstance(source_buttons, dict) and "submit" in source_buttons:
        result.setdefault("buttons", {})["submit"] = glossary["submit"]

    return result


def standard_baseline(source, locale):
    return apply_standard_overrides(source, copy.deepcopy(source), locale)


async def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: translate-form-content-extended.py <source.json> <output.json>")

    source_path, output_path = sys.argv[1], sys.argv[2]
    with open(source_path, encoding="utf-8") as handle:
        source = json.load(handle)

    locales = base.discover_portal_locales()
    current_source_hash = base.source_hash(source)

    try:
        with open(output_path, encoding="utf-8") as handle:
            existing_result = json.load(handle)
    except FileNotFoundError:
        existing_result = {}

    existing_meta = existing_result.get("_meta", {}) if isinstance(existing_result, dict) else {}
    existing_pending = set(existing_meta.get("pendingLocales", []))
    cache_is_valid = (
        existing_meta.get("translationSchemaVersion") == TRANSLATION_SCHEMA_VERSION
        and existing_meta.get("sourceHash") == current_source_hash
        and existing_meta.get("sourceLocale") == "en-US"
        and existing_meta.get("translationProvider") == TRANSLATION_PROVIDER
    )

    resolved = {}
    pending = []

    for locale in locales:
        if locale.lower().startswith("en-"):
            resolved[locale] = source
            print(f"form {locale}: source copy")
            continue

        existing_locale = existing_result.get(locale)
        if (
            cache_is_valid
            and locale not in existing_pending
            and isinstance(existing_locale, dict)
        ):
            resolved[locale] = existing_locale
            print(f"form {locale}: reusing cached translation")
            continue

        standard_only = base.build_standard_fallback(source, locale)
        if standard_only is not None:
            resolved[locale] = standard_only
            print(f"form {locale}: using built-in standard field translation")
            continue

        pending.append(locale)
        resolved[locale] = standard_baseline(source, locale)
        print(f"form {locale}: extended translation required")

    failed_locales = []

    if pending:
        try:
            async with Translator() as translator:
                for locale in pending:
                    print(f"form {locale}: translating extended copy with googletrans")
                    try:
                        translated = await base.translate_node(
                            translator,
                            source,
                            base.googletrans_language(locale),
                        )
                        if base.is_untranslated_copy(source, translated):
                            raise RuntimeError("googletrans returned the unchanged en-US source")
                        resolved[locale] = apply_standard_overrides(source, translated, locale)
                        print(f"form {locale}: extended translation completed")
                    except Exception as error:
                        failed_locales.append(locale)
                        print(f"::warning title=Extended form translation pending::{locale}: {error}")
        except Exception as error:
            for locale in pending:
                if locale not in failed_locales:
                    failed_locales.append(locale)
            print(f"::warning title=googletrans unavailable for extended form translations::{error}")

    result = {locale: resolved[locale] for locale in locales if locale in resolved}
    result["_meta"] = {
        "sourceLocale": "en-US",
        "translationProvider": TRANSLATION_PROVIDER,
        "translationSchemaVersion": TRANSLATION_SCHEMA_VERSION,
        "sourceHash": current_source_hash,
        "pendingLocales": sorted(set(failed_locales)),
    }

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    if failed_locales:
        print("Pending extended form translations will be retried on the next sync: " + ", ".join(sorted(set(failed_locales))))


if __name__ == "__main__":
    asyncio.run(main())
