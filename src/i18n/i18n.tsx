import { type ReactNode, createContext, use, useEffect, useMemo } from "react";
import type { Language } from "../app/model.ts";
import { en } from "./en.ts";
import { es } from "./es.ts";

export type Key = keyof typeof en;
export type Catalog = Record<Key, string>;

const CATALOGS: Record<Language, Catalog> = { en, es };
const LOCALES: Record<Language, string> = { en: "en-US", es: "es-US" };

export interface Translator {
  language: Language;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  money: (n: number) => string;
  number: (n: number) => string;
  percent: (n: number) => string;
  minutes: (n: number) => string;
  date: (iso: string) => string;
}

export function makeTranslator(language: Language): Translator {
  const catalog = CATALOGS[language];
  const locale = LOCALES[language];
  const moneyFormat = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const numberFormat = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  });
  const percentFormat = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const dateFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const t: Translator["t"] = (key, vars) => {
    let text = catalog[key];
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
  return {
    language,
    t,
    money: (n) => moneyFormat.format(n),
    number: (n) => numberFormat.format(n),
    percent: (n) => percentFormat.format(n),
    minutes: (n) =>
      Number.isFinite(n)
        ? t("unit.minutes", { n: numberFormat.format(Math.round(n)) })
        : t("unit.noRoute"),
    date: (iso) => dateFormat.format(new Date(`${iso}T00:00:00Z`)),
  };
}

const I18nContext = createContext<Translator>(makeTranslator("en"));

export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  const value = useMemo(() => makeTranslator(language), [language]);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useT(): Translator {
  return use(I18nContext);
}
