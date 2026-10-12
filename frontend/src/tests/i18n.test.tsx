import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n } from '@/app/i18n/I18nProvider';
import { catalogs, translatedCount, type MessageKey } from '@/app/i18n/messages';
import { supportedLocales, localeDefs } from '@/app/i18n/locales';

const Probe = () => {
  const { t, money, def, setLocale, locale } = useI18n();
  return (
    <div>
      <h1>{t('access.title')}</h1>
      <p data-testid="money">{money(100000)}</p>
      <p data-testid="shift">{t('access.opening.shiftOpened', { register: 'Caja 1', amount: money(100000) })}</p>
      <span data-testid="dir">{def.direction}</span>
      <span data-testid="bcp">{def.bcp47}</span>
      <button onClick={() => setLocale('en')}>en</button>
      <button onClick={() => setLocale('fr')}>fr</button>
      <span data-testid="current">{locale}</span>
    </div>
  );
};

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = 'es';
  document.documentElement.dir = 'ltr';
});

describe('i18n · tubería de idiomas (DECISIONES_CONTRATOS §8)', () => {
  it('los cinco idiomas objetivo están declarados: español, inglés, francés, ruso, hindi', () => {
    expect([...supportedLocales].sort()).toEqual(['en', 'es', 'fr', 'hi', 'ru']);
    expect(Object.keys(localeDefs).sort()).toEqual(['en', 'es', 'fr', 'hi', 'ru']);
  });

  it('ningún idioma objetivo es de derecha a izquierda (no se prueba RTL en esta fase)', () => {
    expect(Object.values(localeDefs).every((d) => d.direction === 'ltr')).toBe(true);
  });

  it('por defecto es español (es-CO) y el documento declara idioma y dirección', () => {
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByRole('heading', { name: 'Acceso al POS' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('es-CO');
    expect(document.documentElement.dir).toBe('ltr');
    expect(screen.getByTestId('money').textContent).toMatch(/100\.000/);
  });

  it('cambiar a inglés traduce, formatea con en-US y se recuerda en el dispositivo', async () => {
    const user = userEvent.setup();
    render(<I18nProvider><Probe /></I18nProvider>);
    await user.click(screen.getByRole('button', { name: 'en' }));
    expect(screen.getByRole('heading', { name: 'POS access' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
    expect(window.localStorage.getItem('pos.locale')).toBe('en');
    // Intl en-US separa COP con un espacio no separable: se normalizan los espacios para comparar el texto.
    const shift = (screen.getByTestId('shift').textContent ?? '').replace(/\s/g, ' ');
    expect(shift).toBe('Shift opened at Caja 1: opening COP 100,000.');
  });

  it('un idioma sin traducción cae al español sin romper la pantalla', async () => {
    const user = userEvent.setup();
    render(<I18nProvider><Probe /></I18nProvider>);
    await user.click(screen.getByRole('button', { name: 'fr' }));
    expect(screen.getByRole('heading', { name: 'Acceso al POS' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('fr-FR');
  });

  it('la cobertura es visible: el español cubre todo el catálogo; los otros reportan lo que falta', () => {
    const total = Object.keys(catalogs.es).length;
    expect(translatedCount('es')).toBe(total);
    expect(translatedCount('en')).toBe(total);
    expect(translatedCount('fr')).toBe(0);
    expect(translatedCount('ru')).toBe(0);
    expect(translatedCount('hi')).toBe(0);
  });

  it('toda clave traducida al inglés existe en el catálogo base (sin claves huérfanas)', () => {
    const base = new Set(Object.keys(catalogs.es));
    for (const key of Object.keys(catalogs.en)) expect(base.has(key), key).toBe(true);
    const sample: MessageKey = 'access.title';
    expect(base.has(sample)).toBe(true);
  });

  it('el idioma guardado no válido vuelve a español', () => {
    window.localStorage.setItem('pos.locale', 'xx');
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('current').textContent).toBe('es');
  });
});
