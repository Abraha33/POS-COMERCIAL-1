import { InputText } from 'primereact/inputtext';
import { formatMoney } from '@/shared/utils/format';

export type MoneyTextProps = {
  /** Entero COP (regla 4). */
  value: number;
  strong?: boolean;
  /** Pinta en rojo los valores negativos (ajustes, descuentos). */
  signed?: boolean;
  className?: string;
};

/** Dinero de solo lectura, formato es-CO ($ 154.700), cifras tabulares. */
export const MoneyText = ({ value, strong, signed, className }: MoneyTextProps) => {
  const cls = ['app-money', strong ? 'app-money--strong' : '', signed && value < 0 ? 'app-money--negative' : '', className ?? '']
    .filter(Boolean).join(' ');
  return <span className={cls}>{formatMoney(value)}</span>;
};

const grouping = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** "154.700" → 154700; vacío → null. Ignora todo lo que no sea dígito. */
export const parseMoneyInput = (text: string): number | null => {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
};

export type MoneyInputProps = {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  'aria-label'?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  max?: number;
  placeholder?: string;
  onEnter?: () => void;
};

/** Campo de dinero COP entero: teclado numérico en móvil, miles con punto, sin decimales. */
export const MoneyInput = ({
  id, value, onChange, disabled, autoFocus, invalid, max, placeholder = '0', onEnter, ...rest
}: MoneyInputProps) => (
  <div className="p-inputgroup app-money-input">
    <span className="p-inputgroup-addon" aria-hidden="true">$</span>
    <InputText
      id={id}
      inputMode="numeric"
      autoComplete="off"
      aria-label={rest['aria-label']}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={value === null ? '' : grouping.format(value)}
      onChange={(event) => {
        const parsed = parseMoneyInput(event.target.value);
        onChange(parsed !== null && max !== undefined ? Math.min(parsed, max) : parsed);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && onEnter) {
          event.preventDefault();
          onEnter();
        }
      }}
    />
    <span className="p-inputgroup-addon" aria-hidden="true">COP</span>
  </div>
);
