import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import type { Shift, ShiftMovement } from '@/shared/contracts';
import { useAddShiftMovement, useCloseShift } from '@/shared/api/pos';
import { FormField } from '@/shared/ui';
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

type Props = { shift: Shift; heldCount: number; visible: boolean; onHide: () => void };

/** Movimientos de caja (BR-CAJ-09) y cierre con cuadre (BR-CAJ-05..07). */
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

  const difference = counted === null ? null : counted - shift.expectedCash;
  const noteRequired = difference !== null && difference !== 0;
  const canClose = counted !== null && (!noteRequired || closeNote.trim().length > 0) && !closeShift.isPending;

  const changeType = (next: MovementType) => {
    setType(next);
    setCategory(categories[next][0]?.value ?? 'otro');
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
    <Dialog header="Caja" visible={visible} onHide={onHide} style={{ width: 'min(34rem, 95vw)' }} modal>
      <div className="pos__totals">
        <div><span>Base inicial</span><span>{formatMoney(shift.openingCash)}</span></div>
        <div className="pos__total"><span>Efectivo esperado</span><span data-testid="expected-cash">{formatMoney(shift.expectedCash)}</span></div>
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
          <InputNumber
            inputId="mv-amount" value={amount} min={0}
            onChange={(e) => e.originalEvent && setAmount(e.value ?? 0)}
            mode="currency" currency="COP" locale="es-CO" minFractionDigits={0}
            inputStyle={{ width: '100%' }}
          />
        </div>
        <div className="pos__field">
          <label htmlFor="mv-note">Nota (opcional)</label>
          <InputText id="mv-note" value={movementNote} onChange={(e) => setMovementNote(e.target.value)} />
        </div>
        {addMovement.error ? <p className="pos__missing" role="alert">{addMovement.error.message}</p> : null}
        <Button
          type="button" label="Registrar movimiento" icon="pi pi-plus"
          disabled={amount <= 0} loading={addMovement.isPending} onClick={submitMovement}
        />
      </section>

      <section className="pos__panel mt-3" aria-label="Cierre de turno">
        <h2>Cerrar turno</h2>
        {heldCount > 0 ? (
          <p className="pos__hint" role="status">
            Hay {heldCount} venta(s) suspendida(s) en esta caja; se conservan en el navegador pero no se cobrarán en este turno.
          </p>
        ) : null}
        <FormField id="counted-cash" label="Efectivo contado (COP)">
          <InputNumber
            inputId="counted-cash" value={counted} min={0}
            onChange={(e) => e.originalEvent && setCounted(e.value ?? null)}
            mode="currency" currency="COP" locale="es-CO" minFractionDigits={0}
            inputStyle={{ width: '100%' }}
          />
        </FormField>
        {difference !== null ? (
          <p className={difference === 0 ? 'pos__change' : 'pos__missing'} data-testid="cash-difference">
            {difference === 0 ? 'La caja cuadra.' : `Diferencia: ${formatMoney(difference)} (${difference > 0 ? 'sobrante' : 'faltante'})`}
          </p>
        ) : null}
        {noteRequired ? (
          <FormField id="close-note" label="Nota de justificación (obligatoria)">
            <InputText id="close-note" className="w-full" value={closeNote} onChange={(e) => setCloseNote(e.target.value)} />
          </FormField>
        ) : null}
        {closeShift.error ? <p className="pos__missing" role="alert">{closeShift.error.message}</p> : null}
        <Button
          type="button" label="Cerrar turno" icon="pi pi-lock" severity="danger" className="w-full"
          disabled={!canClose} loading={closeShift.isPending} onClick={submitClose}
        />
      </section>
    </Dialog>
  );
};
