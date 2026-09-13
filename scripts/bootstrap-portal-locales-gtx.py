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


def protect(text):
    mapping = {}
    def repl(match):
        token = f"ZXQPH{len(mapping)}QXZ"
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


def translate_once(text, target):
    protected, mapping = protect(text)
    params = urllib.parse.urlencode({
        "client": "gtx",
        "sl": "en",
        "tl": target,
        "dt": "t",
        "q": protected,
    })
    url = "https://translate.googleapis.com/translate_a/single?" + params
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    last_error = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
            translated = "".join(part[0] for part in payload[0] if part and part[0])
            translated = restore(translated, mapping)
            if not translated.strip() or translated.strip() == text.strip():
                raise RuntimeError("translation returned unchanged source text")
            return translated
        except Exception as error:
            last_error = error
            time.sleep(1.5 * (attempt + 1))
    raise last_error


def main():
    source_path = LOCALES_DIR / f"translation.{SOURCE_LOCALE}.json"
    source = read_json(source_path)
    source = {
        key: value for key, value in source.items()
        if isinstance(value, str) and value.strip() and not key.startswith("_")
    }

    locale_files = sorted(LOCALES_DIR.glob("translation.*.json"))
    failures = []

    for path in locale_files:
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
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                future_to_key = {pool.submit(translate_once, source[key], target): key for key in missing}
                for future in concurrent.futures.as_completed(future_to_key):
                    key = future_to_key[future]
                    try:
                        document[key] = future.result()
                    except Exception as error:
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
