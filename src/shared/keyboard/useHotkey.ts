import { useEffect, useRef } from 'react';

/** Atajo global: combo como 'F2' o 'ctrl+k'. Se ignora mientras se escribe en un campo si no lleva modificador. */
export const useHotkey = (combo: string, handler: () => void, enabled = true) => {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const wantsCtrl = parts.includes('ctrl');
    const wantsShift = parts.includes('shift');
    const wantsAlt = parts.includes('alt');

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key) return;
      if (event.ctrlKey !== wantsCtrl || event.shiftKey !== wantsShift || event.altKey !== wantsAlt) return;
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (typing && !wantsCtrl && !wantsAlt && !/^f\d+$/.test(key ?? '')) return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [combo, enabled]);
};
