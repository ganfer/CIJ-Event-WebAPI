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
TRANSLATION_PROVIDER = "googletrans+standard-fields"

# Stable local translations for the most common Customer Insights form fields.
# These keep basic registration forms usable even when googletrans is temporarily
# unavailable on a GitHub-hosted runner. Custom fields still use googletrans.
STANDARD_FIELD_TRANSLATIONS = {
    "cs-CZ": {"firstname": "Jméno", "lastname": "Příjmení", "emailaddress1": "E-mailová adresa", "submit": "Odeslat"},
    "de-DE": {"firstname": "Vorname", "lastname": "Nachname", "emailaddress1": "E-Mail-Adresse", "submit": "Absenden"},
    "es-ES": {"firstname": "Nombre", "lastname": "Apellidos", "emailaddress1": "Correo electrónico", "submit": "Enviar"},
    "fr-FR": {"firstname": "Prénom", "lastname": "Nom", "emailaddress1": "Adresse e-mail", "submit": "Envoyer"},
    "it-IT": {"firstname": "Nome", "lastname": "Cognome", "emailaddress1": "Indirizzo email", "submit": "Invia"},
    "pl-PL": {"firstname": "Imię", "lastname": "Nazwisko", "emailaddress1": "Adres e-mail", "submit": "Wyślij"},
    "pt-PT": {"firstname": "Nome", "lastname": "Apelido", "emailaddress1": "Endereço de e-mail", "submit": "Enviar"},
}


def discover_portal_locales():
    locales = []
    for file in LOCALES_DIR.glob("translation.*.json"):
        match = LOCALE_FILE_PATTERN.match(file.name)
        if match:
            locales.append(match.group(1))
    return sorted(set(locales))


def googletrans_language(locale):
    return locale.split("-", 1)[0].lower()


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


def build_standard_fallback(source, locale):
    glossary = STANDARD_FIELD_TRANSLATIONS.get(locale)
    if not glossary or not isinstance(source, dict):
        return None

    allowed_root_keys = {"fields", "buttons"}
    if set(source.keys()) - allowed_root_keys:
        return None

    source_fields = source.get("fields", {})
    if not isinstance(source_fields, dict):
        return None

    localized_fields = {}
    for field_key, field_value in source_fields.items():
        key = str(field_key).lower()
        if key not in {"firstname", "lastname", "emailaddress1"} or not isinstance(field_value, dict):
            return None
        if set(field_value.keys()) - {"label", "placeholder"}:
            return None

        localized_field = {}
        if "label" in field_value:
            localized_field["label"] = glossary[key]
        if "placeholder" in field_value:
            localized_field["placeholder"] = glossary[key]
        localized_fields[field_key] = localized_field

    source_buttons = source.get("buttons", {})
    if not isinstance(source_buttons, dict) or set(source_buttons.keys()) - {"submit"}:
        return None

    localized_buttons = {}
    if "submit" in source_buttons:
        localized_buttons["submit"] = glossary["submit"]

    return {"fields": localized_fields, "buttons": localized_buttons}


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
        reuse_existing = (
            cache_is_valid
            and isinstance(existing_locale, dict)
            and not is_untranslated_copy(source, existing_locale)
        )

        if reuse_existing:
            resolved[locale] = existing_locale
            print(f"form {locale}: reusing cached translation")
            continue

        standard_fallback = build_standard_fallback(source, locale)
        if standard_fallback is not None:
            resolved[locale] = standard_fallback
            print(f"form {locale}: using built-in standard field translation")
            continue

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
        print("All form translations were resolved locally or from cache; googletrans is not called.")

    result = {locale: resolved[locale] for locale in locales if locale in resolved}
    result["_meta"] = {
        "sourceLocale": "en-US",
        "translationProvider": TRANSLATION_PROVIDER,
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
