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

GOOGLETRANS_LANGUAGE_OVERRIDES = {
    "nb": "no",
    "zh-CN": "zh-cn",
    "zh-HK": "zh-tw",
    "zh-Hans-CN": "zh-cn",
    "zh-Hant-HK": "zh-tw",
    "zh-Hant-TW": "zh-tw",
    "zh-TW": "zh-tw",
}

# Stable local translations for the most common Customer Insights form fields.
# These keep basic registration forms usable even when googletrans is temporarily
# unavailable on a GitHub-hosted runner. Custom fields still use googletrans.
STANDARD_FIELD_TRANSLATIONS = {
    "ar-SA": {"firstname": "الاسم الأول", "lastname": "اسم العائلة", "emailaddress1": "البريد الإلكتروني", "submit": "إرسال"},
    "bg-BG": {"firstname": "Име", "lastname": "Фамилия", "emailaddress1": "Имейл адрес", "submit": "Изпращане"},
    "ca-ES": {"firstname": "Nom", "lastname": "Cognoms", "emailaddress1": "Adreça electrònica", "submit": "Envia"},
    "cs-CZ": {"firstname": "Jméno", "lastname": "Příjmení", "emailaddress1": "E-mailová adresa", "submit": "Odeslat"},
    "da-DK": {"firstname": "Fornavn", "lastname": "Efternavn", "emailaddress1": "E-mailadresse", "submit": "Send"},
    "de-DE": {"firstname": "Vorname", "lastname": "Nachname", "emailaddress1": "E-Mail-Adresse", "submit": "Absenden"},
    "el-GR": {"firstname": "Όνομα", "lastname": "Επώνυμο", "emailaddress1": "Διεύθυνση email", "submit": "Υποβολή"},
    "es-ES": {"firstname": "Nombre", "lastname": "Apellidos", "emailaddress1": "Correo electrónico", "submit": "Enviar"},
    "et-EE": {"firstname": "Eesnimi", "lastname": "Perekonnanimi", "emailaddress1": "E-posti aadress", "submit": "Saada"},
    "eu-ES": {"firstname": "Izena", "lastname": "Abizenak", "emailaddress1": "Helbide elektronikoa", "submit": "Bidali"},
    "fi-FI": {"firstname": "Etunimi", "lastname": "Sukunimi", "emailaddress1": "Sähköpostiosoite", "submit": "Lähetä"},
    "fr-CA": {"firstname": "Prénom", "lastname": "Nom", "emailaddress1": "Adresse courriel", "submit": "Envoyer"},
    "fr-FR": {"firstname": "Prénom", "lastname": "Nom", "emailaddress1": "Adresse e-mail", "submit": "Envoyer"},
    "gl-ES": {"firstname": "Nome", "lastname": "Apelidos", "emailaddress1": "Enderezo de correo electrónico", "submit": "Enviar"},
    "he-IL": {"firstname": "שם פרטי", "lastname": "שם משפחה", "emailaddress1": "כתובת דוא\"ל", "submit": "שליחה"},
    "hr-HR": {"firstname": "Ime", "lastname": "Prezime", "emailaddress1": "Adresa e-pošte", "submit": "Pošalji"},
    "hu-HU": {"firstname": "Keresztnév", "lastname": "Vezetéknév", "emailaddress1": "E-mail-cím", "submit": "Küldés"},
    "id-ID": {"firstname": "Nama depan", "lastname": "Nama belakang", "emailaddress1": "Alamat email", "submit": "Kirim"},
    "it-IT": {"firstname": "Nome", "lastname": "Cognome", "emailaddress1": "Indirizzo email", "submit": "Invia"},
    "ja-JP": {"firstname": "名", "lastname": "姓", "emailaddress1": "メールアドレス", "submit": "送信"},
    "ko-KR": {"firstname": "이름", "lastname": "성", "emailaddress1": "이메일 주소", "submit": "제출"},
    "lt-LT": {"firstname": "Vardas", "lastname": "Pavardė", "emailaddress1": "El. pašto adresas", "submit": "Pateikti"},
    "lv-LV": {"firstname": "Vārds", "lastname": "Uzvārds", "emailaddress1": "E-pasta adrese", "submit": "Iesniegt"},
    "nb-NO": {"firstname": "Fornavn", "lastname": "Etternavn", "emailaddress1": "E-postadresse", "submit": "Send"},
    "nl-NL": {"firstname": "Voornaam", "lastname": "Achternaam", "emailaddress1": "E-mailadres", "submit": "Verzenden"},
    "pl-PL": {"firstname": "Imię", "lastname": "Nazwisko", "emailaddress1": "Adres e-mail", "submit": "Wyślij"},
    "pt-BR": {"firstname": "Nome", "lastname": "Sobrenome", "emailaddress1": "Endereço de e-mail", "submit": "Enviar"},
    "pt-PT": {"firstname": "Nome", "lastname": "Apelido", "emailaddress1": "Endereço de e-mail", "submit": "Enviar"},
    "ro-RO": {"firstname": "Prenume", "lastname": "Nume", "emailaddress1": "Adresă de e-mail", "submit": "Trimite"},
    "ru-RU": {"firstname": "Имя", "lastname": "Фамилия", "emailaddress1": "Адрес электронной почты", "submit": "Отправить"},
    "sk-SK": {"firstname": "Meno", "lastname": "Priezvisko", "emailaddress1": "E-mailová adresa", "submit": "Odoslať"},
    "sl-SI": {"firstname": "Ime", "lastname": "Priimek", "emailaddress1": "E-poštni naslov", "submit": "Pošlji"},
    "sr-Cyrl-CS": {"firstname": "Име", "lastname": "Презиме", "emailaddress1": "Адреса е-поште", "submit": "Пошаљи"},
    "sr-Cyrl-RS": {"firstname": "Име", "lastname": "Презиме", "emailaddress1": "Адреса е-поште", "submit": "Пошаљи"},
    "sr-Latn-CS": {"firstname": "Ime", "lastname": "Prezime", "emailaddress1": "Adresa e-pošte", "submit": "Pošalji"},
    "sr-Latn-RS": {"firstname": "Ime", "lastname": "Prezime", "emailaddress1": "Adresa e-pošte", "submit": "Pošalji"},
    "sv-SE": {"firstname": "Förnamn", "lastname": "Efternamn", "emailaddress1": "E-postadress", "submit": "Skicka"},
    "th-TH": {"firstname": "ชื่อ", "lastname": "นามสกุล", "emailaddress1": "ที่อยู่อีเมล", "submit": "ส่ง"},
    "tr-TR": {"firstname": "Ad", "lastname": "Soyad", "emailaddress1": "E-posta adresi", "submit": "Gönder"},
    "uk-UA": {"firstname": "Ім’я", "lastname": "Прізвище", "emailaddress1": "Адреса електронної пошти", "submit": "Надіслати"},
    "vi-VN": {"firstname": "Tên", "lastname": "Họ", "emailaddress1": "Địa chỉ email", "submit": "Gửi"},
    "zh-CN": {"firstname": "名字", "lastname": "姓氏", "emailaddress1": "电子邮件地址", "submit": "提交"},
    "zh-HK": {"firstname": "名字", "lastname": "姓氏", "emailaddress1": "電子郵件地址", "submit": "提交"},
    "zh-Hans-CN": {"firstname": "名字", "lastname": "姓氏", "emailaddress1": "电子邮件地址", "submit": "提交"},
    "zh-Hant-HK": {"firstname": "名字", "lastname": "姓氏", "emailaddress1": "電子郵件地址", "submit": "提交"},
    "zh-Hant-TW": {"firstname": "名字", "lastname": "姓氏", "emailaddress1": "電子郵件地址", "submit": "提交"},
    "zh-TW": {"firstname": "名字", "lastname": "姓氏", "emailaddress1": "電子郵件地址", "submit": "提交"},
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
