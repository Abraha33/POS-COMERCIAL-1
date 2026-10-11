import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import type { LedgerPayment } from '@/shared/contracts';
import { FormField } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';

/** BR-CAR-02: medios de abono (sin crédito). */
const methods: { value: LedgerPayment['method']; label: string }[] = [
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

/** Abono o pago a una factura (BR-CAR-01: se aplica a la factura indicada y no puede superar el saldo). */
export const PaymentDialog = ({
  visible, header, party, reference, balance, actionLabel, saving, error, onSubmit, onHide,
}: Props) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<LedgerPayment['method']>('efectivo');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) { setAmount(0); setMethod('efectivo'); setNote(''); }
  }, [visible]);

  const exceeds = amount > balance;
  const invalid = amount <= 0 || exceeds;

  const submit = () => {
    if (invalid) return;
    onSubmit({ amount, method, ...(note.trim() ? { note: note.trim() } : {}) });
  };

  return (
    <Dialog header={header} visible={visible} onHide={onHide} style={{ width: 'min(28rem, 95vw)' }} modal>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <p className="mt-0">
          <strong>{party}</strong> · {reference}
        </p>
        <p className="mt-0" data-testid="payment-balance">Saldo pendiente: {formatMoney(balance)}</p>
        <FormField
          id="pay-amount"
          label="Valor (COP)"
          error={exceeds ? `Supera el saldo pendiente (${formatMoney(balance)})` : undefined}
        >
          <div className="flex gap-2">
            <InputNumber
              inputId="pay-amount" value={amount} min={0}
              onChange={(e) => e.originalEvent && setAmount(e.value ?? 0)}
              mode="currency" currency="COP" locale="es-CO" minFractionDigits={0}
              inputStyle={{ width: '100%', minHeight: 44 }} className="flex-1"
            />
            <Button type="button" label="Saldar" severity="secondary" outlined className="ledger__btn" onClick={() => setAmount(balance)} />
          </div>
        </FormField>
        <FormField id="pay-method" label="Medio de pago">
          <select
            id="pay-method" className="p-inputtext w-full" style={{ minHeight: 44 }} value={method}
            onChange={(e) => setMethod(e.target.value as LedgerPayment['method'])}
          >
            {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </FormField>
        <FormField id="pay-note" label="Nota (opcional)">
          <InputText id="pay-note" className="w-full" style={{ minHeight: 44 }} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        {error ? <p className="p-error" role="alert" data-testid="payment-error">{error}</p> : null}
        <div className="flex justify-content-end gap-2">
          <Button type="button" label="Cancelar" severity="secondary" outlined className="ledger__btn" onClick={onHide} />
          <Button type="submit" label={actionLabel} icon="pi pi-check" className="ledger__btn" disabled={invalid} loading={saving} />
        </div>
      </form>
    </Dialog>
  );
};
