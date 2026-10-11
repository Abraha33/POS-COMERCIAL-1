import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import type { LedgerPayment } from '@/shared/contracts';
import { FormDialog, FormField, MoneyInput, MoneyText, SegmentedTabs } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';

type Method = LedgerPayment['method'];

/** BR-CAR-02: medios de abono (sin crédito). */
const methods: { value: Method; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
];

type Props = {
  visible: boolean;
  header: string;
  /** Contraparte (cliente o proveedor) y referencia de la factura. */
  party: string;
  reference: string;
  balance: number;
  actionLabel: string;
  saving: boolean;
  error: string | null;
  onSubmit: (input: LedgerPayment) => void;
  onHide: () => void;
};

/**
 * Diálogo unificado de abono (cobrar) o pago (proveedor). BR-CAR-01: se aplica a la factura indicada y no puede
 * superar el saldo. Copia idéntica en receivables/ y payables/ (las features no se importan entre sí).
 */
export const PaymentDialog = ({
  visible, header, party, reference, balance, actionLabel, saving, error, onSubmit, onHide,
}: Props) => {
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<Method>('efectivo');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) { setAmount(null); setMethod('efectivo'); setNote(''); }
  }, [visible]);

  const value = amount ?? 0;
  const exceeds = value > balance;
  const invalid = value <= 0 || exceeds;

  const submit = () => {
    if (invalid) return;
    onSubmit({ amount: value, method, ...(note.trim() ? { note: note.trim() } : {}) });
  };

  return (
    <FormDialog
      visible={visible}
      title={header}
      onHide={onHide}
      onSubmit={submit}
      submitLabel={actionLabel}
      submitIcon="pi pi-check"
      submitDisabled={invalid}
      loading={saving}
      width="min(30rem, 96vw)"
    >
      <div className="ledger__pay-summary">
        <p><strong>{party}</strong> · {reference}</p>
        <p data-testid="payment-balance">Saldo pendiente: <MoneyText value={balance} strong /></p>
        {value > 0 && !exceeds ? (
          <p className="ledger__note">Saldo tras el movimiento: {formatMoney(balance - value)}</p>
        ) : null}
      </div>
      <FormField
        id="pay-amount"
        label="Valor (COP)"
        error={exceeds ? `Supera el saldo pendiente (${formatMoney(balance)})` : undefined}
      >
        <div className="ledger__pay-amount">
          <MoneyInput id="pay-amount" value={amount} onChange={setAmount} onEnter={submit} invalid={exceeds} autoFocus />
          <Button type="button" label="Saldar" severity="secondary" outlined className="ledger__btn" onClick={() => setAmount(balance)} />
        </div>
      </FormField>
      <div className="field mb-3">
        <span className="block mb-1 font-medium">Medio de pago</span>
        <SegmentedTabs options={methods} value={method} onChange={setMethod} ariaLabel="Medio de pago" />
      </div>
      <FormField id="pay-note" label="Nota (opcional)">
        <InputText id="pay-note" className="w-full" value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
      {error ? <p className="app-dialog__error" role="alert" data-testid="payment-error">{error}</p> : null}
    </FormDialog>
  );
};
