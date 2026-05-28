import { useUserStore } from "@/store/useUserStore";
import {
  TRANSLATIONS,
  type LanguageType,
  type TranslationKeys,
} from "@/constants/languages";

export function useTranslation() {
  const { uiLanguage } = useUserStore();

  // The parameters passed on are in the form of "common.backhome"
  const t = (path: TranslationKeys) => {
    const keys = path.split(".");
    let result: unknown = TRANSLATIONS[uiLanguage as LanguageType];

    for (const key of keys) {
      if (
        result &&
        typeof result === "object" &&
        key in result
      ) {
        result = (result as Record<string, unknown>)[key];
      } else {
        return path;
      }
    }
    return typeof result === "string" ? result : path;
  };

  return { t, lang: uiLanguage };
}
