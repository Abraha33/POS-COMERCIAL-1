import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import type { Shift, ShiftMovement } from '@/shared/contracts';
import { useAddShiftMovement, useCloseShift } from '@/shared/api/pos';
import { FormField, MoneyInput, MoneyText } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { useNotify } from '@/app/providers/ToastProvider';

type MovementType = ShiftMovement['type'];
type Category = ShiftMovement['category'];

const categories: Record<MovementType, { value: Category; label: string }[]> = {
  ingreso: [
    { value: 'base', label: 'Base' },
    { value: 'sencillo', label: 'Sencillo' },
  ],
  egreso: [
    { value: 'pago_proveedor', label: 'Pago a proveedor' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'sangria', label: 'Sangría (retiro por seguridad)' },
    { value: 'otro', label: 'Otro' },
  ],
};

/** Denominaciones COP para el conteo (PROPUESTA: ayuda local; el contrato solo recibe el total contado). */
const denominations = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];

const toCount = (text: string | undefined): number => Math.max(0, Math.floor(Number(text ?? 0)) || 0);

type Props = { shift: Shift; heldCount: number; visible: boolean; onHide: () => void };

/** Movimientos de caja (BR-CAJ-09) y cierre con cuadre y arqueo (BR-CAJ-05..07). */
export const CashDialog = ({ shift, heldCount, visible, onHide }: Props) => {
  const notify = useNotify();
  const addMovement = useAddShiftMovement();
  const closeShift = useCloseShift();

  const [type, setType] = useState<MovementType>('egreso');
  const [category, setCategory] = useState<Category>('transporte');
  const [amount, setAmount] = useState<number>(0);
  const [movementNote, setMovementNote] = useState('');
  const [counted, setCounted] = useState<number | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [counts, setCounts] = useState<Record<number, string>>({});

  const difference = counted === null ? null : counted - shift.expectedCash;
  const noteRequired = difference !== null && difference !== 0;
  const canClose = counted !== null && (!noteRequired || closeNote.trim().length > 0) && !closeShift.isPending;

  const changeType = (next: MovementType) => {
    setType(next);
    setCategory(categories[next][0]?.value ?? 'otro');
  };

  const setDenomination = (value: number, text: string) => {
    const nextCounts = { ...counts, [value]: text };
    setCounts(nextCounts);
    setCounted(denominations.reduce((acc, d) => acc + d * toCount(nextCounts[d]), 0));
  };

  const submitMovement = () =>
    addMovement.mutate(
      { shiftId: shift.id, input: { type, category, amount, ...(movementNote.trim() ? { note: movementNote.trim() } : {}) } },
      {
        onSuccess: () => {
          notify({ severity: 'success', summary: 'Movimiento registrado', detail: `${type}: ${formatMoney(amount)}` });
          setAmount(0);
          setMovementNote('');
        },
      },
    );

  const submitClose = () => {
    if (counted === null) return;
    closeShift.mutate(
      { shiftId: shift.id, input: { countedCash: counted, ...(closeNote.trim() ? { note: closeNote.trim() } : {}) } },
      {
        onSuccess: (closed) => {
          const diff = closed.difference ?? 0;
          notify({
            severity: diff === 0 ? 'success' : 'warn',
            summary: 'Turno cerrado',
            detail: diff === 0 ? 'La caja cuadra.' : `Diferencia registrada: ${formatMoney(diff)}`,
          });
          onHide();
        },
      },
    );
  };

  return (
    <Dialog header="Caja" visible={visible} onHide={onHide} className="pos-dialog" style={{ width: 'min(36rem, 95vw)' }} modal>
      <div className="pos-cash__summary">
        <div><span>Base inicial</span><MoneyText value={shift.openingCash} /></div>
        <div className="pos-cash__expected">
          <span>Efectivo esperado</span>
          <strong data-testid="expected-cash">{formatMoney(shift.expectedCash)}</strong>
        </div>
      </div>

      <section className="pos__panel" aria-label="Movimiento de caja">
        <h2>Registrar movimiento</h2>
        <div className="pos__field">
          <label htmlFor="mv-type">Tipo</label>
          <select id="mv-type" className="p-inputtext" value={type} onChange={(e) => changeType(e.target.value as MovementType)}>
            <option value="egreso">Egreso (sale efectivo)</option>
            <option value="ingreso">Ingreso (entra efectivo)</option>
          </select>
        </div>
        <div className="pos__field">
          <label htmlFor="mv-category">Concepto</label>
          <select id="mv-category" className="p-inputtext" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {categories[type].map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="pos__field">
          <label htmlFor="mv-amount">Valor (COP)</label>
          <MoneyInput id="mv-amount" value={amount} onChange={(v) => setAmount(v ?? 0)} />
        </div>
        <div className="pos__field">
          <label htmlFor="mv-note">Nota (opcional)</label>
          <input id="mv-note" className="p-inputtext" value={movementNote} onChange={(e) => setMovementNote(e.target.value)} />
        </div>
        {addMovement.error ? <p className="app-dialog__error" role="alert">{addMovement.error.message}</p> : null}
        <Button
          type="button" label="Registrar movimiento" icon="pi pi-plus"
          disabled={amount <= 0} loading={addMovement.isPending} onClick={submitMovement}
        />
      </section>

      <section className="pos__panel mt-3" aria-label="Cierre de turno">
        <h2>Cerrar turno y arqueo</h2>
        {heldCount > 0 ? (
          <p className="pos__hint" role="status">
            Hay {heldCount} venta(s) suspendida(s) en esta caja; se conservan en el navegador pero no se cobrarán en este turno.
          </p>
        ) : null}

        <details className="pos-cash__count">
          <summary>Contar por denominación (PROPUESTA)</summary>
          <p className="pos__hint">
            Ayuda de conteo en pantalla: solo el total llena «Efectivo contado»; las cantidades por billete no se envían.
          </p>
          <div className="app-table-scroll">
            <table className="pos-cash__table">
              <caption className="sr-only">Conteo de efectivo por denominación</caption>
              <thead>
                <tr>
                  <th scope="col">Denominación</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col" className="pos__num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {denominations.map((d) => (
                  <tr key={d}>
                    <th scope="row">{formatMoney(d)}</th>
                    <td>
                      <input
                        className="p-inputtext pos__qty-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        aria-label={`Cantidad de ${formatMoney(d)}`}
                        value={counts[d] ?? ''}
                        placeholder="0"
                        onChange={(e) => setDenomination(d, e.target.value)}
                      />
                    </td>
                    <td className="pos__num">{formatMoney(d * toCount(counts[d]))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <FormField id="counted-cash" label="Efectivo contado (COP)">
          <MoneyInput id="counted-cash" value={counted} onChange={setCounted} />
        </FormField>
        {difference !== null ? (
          <p
            className={`pos-cash__diff ${difference === 0 ? 'pos__change' : 'pos__missing'}`}
            data-testid="cash-difference"
          >
            <i className={difference === 0 ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'} aria-hidden="true" />{' '}
            {difference === 0 ? 'La caja cuadra.' : `Diferencia: ${formatMoney(difference)} (${difference > 0 ? 'sobrante' : 'faltante'})`}
          </p>
        ) : null}
        {noteRequired ? (
          <FormField id="close-note" label="Nota de justificación (obligatoria)">
            <input id="close-note" className="p-inputtext w-full" value={closeNote} onChange={(e) => setCloseNote(e.target.value)} />
          </FormField>
        ) : null}
        {closeShift.error ? <p className="app-dialog__error" role="alert">{closeShift.error.message}</p> : null}
        <Button
          type="button" label="Cerrar turno" icon="pi pi-lock" severity="danger" className="w-full pos__btn-solid-danger"
          disabled={!canClose} loading={closeShift.isPending} onClick={submitClose}
        />
      </section>
    </Dialog>
  );
};
