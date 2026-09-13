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


def read_json(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def language(locale):
    if locale in LANGUAGE_OVERRIDES:
        return LANGUAGE_OVERRIDES[locale]
    primary = locale.split("-", 1)[0].lower()
    return LANGUAGE_OVERRIDES.get(primary, primary)


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
        else:
            target = language(locale)
            print(f"{locale}: translating {len(missing)} key(s) -> {target}")
            translated, failed = translate_locale(source, missing, target)
            document.update(translated)
            for key, error in failed:
                failures.append(f"{locale}/{key}: {error}")
                print(f"::warning title=Bootstrap translation pending::{locale}/{key}: {error}")

        with path.open("w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2)
            handle.write("\n")

    if failures:
        print("Bootstrap failures:")
        for failure in failures:
            print(" - " + failure)
        raise SystemExit(f"{len(failures)} portal UI translation(s) remain pending")

    print("All discovered portal locale files contain the complete standard UI key set.")


if __name__ == "__main__":
    main()
