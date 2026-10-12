import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, isLocaleId, localeDefs, type LocaleDef, type LocaleId } from './locales';
import { catalogs, type MessageKey } from './messages';

const STORAGE_KEY = 'pos.locale';

type I18nValue = {
  locale: LocaleId;
  def: LocaleDef;
  /** Traduce una clave; si falta en el idioma, usa el español y no lanza. */
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  /** Formatea dinero en COP con el locale del idioma (entero, sin decimales). */
  money: (value: number) => string;
  /** Cambia el idioma (se recuerda en este dispositivo). */
  setLocale: (next: LocaleId) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

const readStored = (): LocaleId => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLocaleId(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
};

const interpolate = (text: string, params?: Record<string, string | number>): string =>
  params ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`)) : text;

export const I18nProvider = ({ children, initialLocale }: { children: ReactNode; initialLocale?: LocaleId }) => {
  const [locale, setLocaleState] = useState<LocaleId>(() => initialLocale ?? readStored());
  const def = localeDefs[locale];

  // El documento declara idioma y dirección: la accesibilidad y el diseño lo leen de aquí.
  useEffect(() => {
    document.documentElement.lang = def.bcp47;
    document.documentElement.dir = def.direction;
  }, [def]);

  const setLocale = useCallback((next: LocaleId) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* sin almacenamiento: el idioma vive solo en esta sesión */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const fallback = catalogs.es;
    const current = catalogs[locale];
    const money = (amount: number) =>
      new Intl.NumberFormat(def.bcp47, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    return {
      locale,
      def,
      t: (key, params) => interpolate(current[key] ?? fallback[key] ?? key, params),
      money,
      setLocale,
    };
  }, [locale, def, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de I18nProvider');
  return ctx;
};

/** Cuántas claves del catálogo del idioma están traducidas (para mostrar el faltante). */
export const coverage = (locale: LocaleId): { translated: number; total: number } => {
  const total = Object.keys(catalogs.es).length;
  return { translated: Object.keys(catalogs[locale]).length, total };
};
