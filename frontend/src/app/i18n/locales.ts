/**
 * Idiomas objetivo (DECISIONES_CONTRATOS §8): español, inglés, francés, ruso, hindi.
 * El código de máquina (`id`) es estable y no cambia con el idioma; el `bcp47` es el locale del formato.
 * Ninguno es de derecha a izquierda; la dirección se deriva del idioma y se aplica al documento.
 */
export const supportedLocales = ['es', 'en', 'fr', 'ru', 'hi'] as const;
export type LocaleId = (typeof supportedLocales)[number];

export type LocaleDef = { id: LocaleId; bcp47: string; label: string; direction: 'ltr' | 'rtl' };

export const localeDefs: Record<LocaleId, LocaleDef> = {
  es: { id: 'es', bcp47: 'es-CO', label: 'Español', direction: 'ltr' },
  en: { id: 'en', bcp47: 'en-US', label: 'English', direction: 'ltr' },
  fr: { id: 'fr', bcp47: 'fr-FR', label: 'Français', direction: 'ltr' },
  ru: { id: 'ru', bcp47: 'ru-RU', label: 'Русский', direction: 'ltr' },
  hi: { id: 'hi', bcp47: 'hi-IN', label: 'हिन्दी', direction: 'ltr' },
};

export const DEFAULT_LOCALE: LocaleId = 'es';

export const isLocaleId = (value: unknown): value is LocaleId =>
  typeof value === 'string' && (supportedLocales as readonly string[]).includes(value);
