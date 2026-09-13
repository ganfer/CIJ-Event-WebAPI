#!/usr/bin/env python3
import concurrent.futures
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

LOCALES_DIR = Path("public/locales")
SOURCE_LOCALE = "en-US"
LOCALE_PATTERN = re.compile(r"^translation\.(.+)\.json$")
PLACEHOLDER_PATTERN = re.compile(r"{{[^{}]+}}")
SEPARATOR = "ZXQSEPARATOR87421QXZ"

LANGUAGE_OVERRIDES = {
    "nb": "no",
    "zh-CN": "zh-CN",
    "zh-HK": "zh-TW",
    "zh-Hans-CN": "zh-CN",
    "zh-Hant-HK": "zh-TW",
    "zh-Hant-TW": "zh-TW",
    "zh-TW": "zh-TW",
}

# A few UI terms are legitimately identical to English in their target language,
# so an "unchanged" result is not an error. Keep these explicit and reviewable.
MANUAL_OVERRIDES = {
    "ca-ES": {"agenda": "Agenda"},
    "cs-CZ": {"agenda": "Program"},
    "da-DK": {"themeSystem": "System", "sessionFallback": "Session"},
    "eu-ES": {"agenda": "Agenda"},
    "fi-FI": {"agenda": "Ohjelma"},
    "fr-CA": {"sessionFallback": "Session"},
    "fr-FR": {"sessionFallback": "Session"},
    "id-ID": {"agenda": "Agenda"},
    "nb-NO": {"themeSystem": "System"},
    "nl-NL": {"agenda": "Agenda"},
    "pt-BR": {"agenda": "Agenda"},
    "pt-PT": {"agenda": "Agenda"},
    "ro-RO": {"agenda": "Agendă"},
    "sk-SK": {"agenda": "Program"},
    "sv-SE": {"themeSystem": "System", "sessionFallback": "Session"},
    "sr-Cyrl-CS": {
        "themeStatusSystem": "Тема: системска ({{resolved}})",
        "themeStatus": "Тема: {{theme}}",
        "eventImageAlt": "Слика догађаја: {{eventName}}",
    },
    "sr-Cyrl-RS": {
        "themeStatusSystem": "Тема: системска ({{resolved}})",
        "themeStatus": "Тема: {{theme}}",
        "eventImageAlt": "Слика догађаја: {{eventName}}",
    },
}

SERBIAN_LATIN_MAP = {
    "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Ђ": "Đ", "Е": "E", "Ж": "Ž", "З": "Z",
    "И": "I", "Ј": "J", "К": "K", "Л": "L", "Љ": "Lj", "М": "M", "Н": "N", "Њ": "Nj", "О": "O",
    "П": "P", "Р": "R", "С": "S", "Т": "T", "Ћ": "Ć", "У": "U", "Ф": "F", "Х": "H", "Ц": "C",
    "Ч": "Č", "Џ": "Dž", "Ш": "Š",
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ђ": "đ", "е": "e", "ж": "ž", "з": "z",
    "и": "i", "ј": "j", "к": "k", "л": "l", "љ": "lj", "м": "m", "н": "n", "њ": "nj", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "ћ": "ć", "у": "u", "ф": "f", "х": "h", "ц": "c",
    "ч": "č", "џ": "dž", "ш": "š",
}


def read_json(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, document):
    with path.open("w", encoding="utf-8") as handle:
        json.dump(document, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def language(locale):
    if locale in LANGUAGE_OVERRIDES:
        return LANGUAGE_OVERRIDES[locale]
    primary = locale.split("-", 1)[0].lower()
    return LANGUAGE_OVERRIDES.get(primary, primary)


def transliterate_serbian(text):
    return "".join(SERBIAN_LATIN_MAP.get(char, char) for char in text)


def protect(text, prefix=""):
    mapping = {}

    def repl(match):
        token = f"ZXQ{prefix}PH{len(mapping)}QXZ"
        mapping[token] = match.group(0)
        return token

    return PLACEHOLDER_PATTERN.sub(repl, text), mapping


def restore(text, mapping):
    result = text
    for token, original in mapping.items():
        if token not in result:
            raise RuntimeError(f"placeholder token changed: {token}")
        result = result.replace(token, original)
    return result


def request_translation(text, target):
    params = urllib.parse.urlencode({
        "client": "gtx",
        "sl": "en",
        "tl": target,
        "dt": "t",
        "q": text,
    })
    url = "https://translate.googleapis.com/translate_a/single?" + params
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    last_error = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                payload = json.loads(response.read().decode("utf-8"))
            translated = "".join(part[0] for part in payload[0] if part and part[0])
            if not translated.strip():
                raise RuntimeError("empty translation")
            return translated
        except Exception as error:
            last_error = error
            time.sleep(1.25 * (attempt + 1))
    raise last_error


def translate_individual(source, keys, target):
    translated = {}
    failures = []

    def work(item):
        index, key = item
        protected, mapping = protect(source[key], f"{index}X")
        value = restore(request_translation(protected, target), mapping)
        if value.strip() == source[key].strip():
            raise RuntimeError("translation returned unchanged source text")
        return key, value

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(work, item): item[1] for item in enumerate(keys)}
        for future in concurrent.futures.as_completed(futures):
            key = futures[future]
            try:
                translated_key, value = future.result()
                translated[translated_key] = value
            except Exception as error:
                failures.append((key, error))
    return translated, failures


def translate_locale(source, keys, target):
    protected_values = []
    mappings = []
    for index, key in enumerate(keys):
        protected, mapping = protect(source[key], f"{index}X")
        protected_values.append(protected)
        mappings.append(mapping)

    joined = f"\n{SEPARATOR}\n".join(protected_values)
    try:
        result = request_translation(joined, target)
        parts = re.split(rf"\s*{re.escape(SEPARATOR)}\s*", result)
        if len(parts) != len(keys):
            raise RuntimeError(f"separator mismatch: expected {len(keys)} parts, got {len(parts)}")

        translated = {}
        for key, source_value, value, mapping in zip(keys, [source[key] for key in keys], parts, mappings):
            value = restore(value.strip(), mapping)
            if not value or value == source_value.strip():
                raise RuntimeError(f"unchanged translation for {key}")
            translated[key] = value
        return translated, []
    except Exception as error:
        print(f"batch translation fallback for {target}: {error}")
        return translate_individual(source, keys, target)


def main():
    source = read_json(LOCALES_DIR / f"translation.{SOURCE_LOCALE}.json")
    source = {
        key: value for key, value in source.items()
        if isinstance(value, str) and value.strip() and not key.startswith("_")
    }
    failures = []

    for path in sorted(LOCALES_DIR.glob("translation.*.json")):
        match = LOCALE_PATTERN.match(path.name)
        if not match:
            continue
        locale = match.group(1)
        if locale == SOURCE_LOCALE:
            continue

        document = read_json(path)
        missing = [key for key in source if not isinstance(document.get(key), str) or not document[key].strip()]
        if not missing:
            print(f"{locale}: complete")
            continue

        if locale.lower().startswith("en-"):
            for key in missing:
                document[key] = source[key]
            print(f"{locale}: copied {len(missing)} key(s) from en-US")
        elif locale.startswith("sr-Latn-"):
            cyrl_locale = locale.replace("sr-Latn-", "sr-Cyrl-")
            cyrl_path = LOCALES_DIR / f"translation.{cyrl_locale}.json"
            cyrl_document = read_json(cyrl_path)
            for key in missing:
                value = cyrl_document.get(key)
                if not isinstance(value, str) or not value.strip():
                    failures.append(f"{locale}/{key}: missing Cyrillic source value")
                    continue
                document[key] = transliterate_serbian(value)
            print(f"{locale}: transliterated {len(missing)} key(s) from {cyrl_locale}")
        else:
            target = language(locale)
            print(f"{locale}: translating {len(missing)} key(s) -> {target}")
            translated, failed = translate_locale(source, missing, target)
            document.update(translated)

            manual = MANUAL_OVERRIDES.get(locale, {})
            for key, value in manual.items():
                if key in missing:
                    document[key] = value

            failed_keys = {key for key, _ in failed}
            overridden_keys = failed_keys.intersection(manual)
            for key, error in failed:
                if key in overridden_keys:
                    print(f"{locale}/{key}: resolved by reviewed manual override")
                    continue
                failures.append(f"{locale}/{key}: {error}")
                print(f"::warning title=Bootstrap translation pending::{locale}/{key}: {error}")

        # Apply reviewed overrides even if Google happened to return a value.
        for key, value in MANUAL_OVERRIDES.get(locale, {}).items():
            if key in missing:
                document[key] = value

        write_json(path, document)

    if failures:
        print("Bootstrap failures:")
        for failure in failures:
            print(" - " + failure)
        raise SystemExit(f"{len(failures)} portal UI translation(s) remain pending")

    print("All discovered portal locale files contain the complete standard UI key set.")


if __name__ == "__main__":
    main()
