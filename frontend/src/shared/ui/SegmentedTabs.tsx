import { useRef, type KeyboardEvent } from 'react';

export type SegmentOption<V extends string> = { value: V; label: string; count?: number };

export type SegmentedTabsProps<V extends string> = {
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
  /** `chips`: filtros (botones con aria-pressed). `tabs`: pestañas con flechas (role tablist). */
  variant?: 'chips' | 'tabs';
};

/** Chips de categoría o pestañas nativas y accesibles. Genérico en el tipo del valor. */
export const SegmentedTabs = <V extends string>({
  options, value, onChange, ariaLabel, variant = 'chips',
}: SegmentedTabsProps<V>) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const isTabs = variant === 'tabs';

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (!isTabs) return;
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    const target = options[next];
    if (target) {
      onChange(target.value);
      refs.current[next]?.focus();
    }
  };

  return (
    <div
      className={`app-segmented${isTabs ? ' app-segmented--tabs' : ''}`}
      role={isTabs ? 'tablist' : 'group'}
      aria-label={ariaLabel}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => { refs.current[index] = el; }}
            type="button"
            className="app-segmented__item"
            {...(isTabs
              ? { role: 'tab', 'aria-selected': selected, tabIndex: selected ? 0 : -1 }
              : { 'aria-pressed': selected })}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
            {option.count !== undefined ? <span className="app-segmented__count">({option.count})</span> : null}
          </button>
        );
      })}
    </div>
  );
};
