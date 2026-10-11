import type { ReactNode } from 'react';

export type Shortcut = {
  /** Texto de la tecla: 'F2', 'Esc', 'Ctrl+K'. */
  keys: string;
  label: string;
  /** Si se pasa, el atajo también es un botón táctil (≥ 44 px). El atajo de teclado lo registra la pantalla con `useHotkey`. */
  onSelect?: () => void;
};

export type ShortcutBarProps = {
  shortcuts: readonly Shortcut[];
  /** Resumen a la izquierda, p. ej. "4 productos · 14 unidades". */
  summary?: ReactNode;
};

/** Barra inferior de atajos (maqueta POS). Solo informa y, si hay `onSelect`, ofrece alternativa táctil. */
export const ShortcutBar = ({ shortcuts, summary }: ShortcutBarProps) => (
  <footer className="app-shortcuts" aria-label="Atajos de teclado">
    {summary ? <span className="app-shortcuts__lead">{summary}</span> : null}
    <ul className="app-shortcuts__list">
      {shortcuts.map((s) => (
        <li key={s.keys}>
          {s.onSelect ? (
            <button type="button" className="app-shortcuts__item" onClick={s.onSelect}>
              <kbd>{s.keys}</kbd> {s.label}
            </button>
          ) : (
            <span className="app-shortcuts__item"><kbd>{s.keys}</kbd> {s.label}</span>
          )}
        </li>
      ))}
    </ul>
  </footer>
);
