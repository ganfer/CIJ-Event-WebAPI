#!/usr/bin/env python3
import json
from pathlib import Path

LOCALES_DIR = Path("public/locales")

# Reviewed corrections for UI terms where generic machine translation can choose
# the wrong meaning (for example, audio loudspeakers instead of event speakers).
OVERRIDES = {
    "fr-FR": {
        "themeLight": "Clair",
        "speakers": "Intervenants",
        "speakerFallback": "Intervenant",
    },
    "fr-CA": {
        "themeLight": "Clair",
        "speakers": "Intervenants",
        "speakerFallback": "Intervenant",
    },
    "es-ES": {
        "themeLight": "Claro",
        "people": "Personas",
        "speakers": "Ponentes",
        "speakerFallback": "Ponente",
    },
    "ar-SA": {
        "themeLight": "فاتح",
        "themeDark": "داكن",
        "useLightTheme": "استخدام المظهر الفاتح",
        "useDarkTheme": "استخدام المظهر الداكن",
        "people": "الأشخاص",
        "speakers": "المتحدثون",
    },
    "sr-Cyrl-CS": {
        "themeLight": "Светла",
        "themeDark": "Тамна",
        "speakers": "Говорници",
        "sessionFallback": "Сесија",
        "speakerFallback": "Говорник",
    },
    "sr-Cyrl-RS": {
        "themeLight": "Светла",
        "themeDark": "Тамна",
        "speakers": "Говорници",
        "sessionFallback": "Сесија",
        "speakerFallback": "Говорник",
    },
    "sr-Latn-CS": {
        "themeLight": "Svetla",
        "themeDark": "Tamna",
        "speakers": "Govornici",
        "sessionFallback": "Sesija",
        "speakerFallback": "Govornik",
    },
    "sr-Latn-RS": {
        "themeLight": "Svetla",
        "themeDark": "Tamna",
        "speakers": "Govornici",
        "sessionFallback": "Sesija",
        "speakerFallback": "Govornik",
    },
}


def main():
    changed_files = 0
    for locale, replacements in OVERRIDES.items():
        path = LOCALES_DIR / f"translation.{locale}.json"
        with path.open(encoding="utf-8") as handle:
            document = json.load(handle)

        changed = False
        for key, value in replacements.items():
            if document.get(key) != value:
                document[key] = value
                changed = True

        if changed:
            with path.open("w", encoding="utf-8") as handle:
                json.dump(document, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
            changed_files += 1
            print(f"{locale}: applied reviewed UI terminology")

    print(f"Reviewed portal terminology complete; {changed_files} locale file(s) updated.")


if __name__ == "__main__":
    main()
