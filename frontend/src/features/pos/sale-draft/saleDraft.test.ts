import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearSaleDraft,
  createSaleDraft,
  loadSaleDraft,
  saleDraftStorageKey,
  saveSaleDraft,
  updateSaleDraft,
} from './index';

const context = { registerId: 'register-01', shiftId: 'shift-01' };
const otherShift = { registerId: 'register-01', shiftId: 'shift-02' };

beforeEach(() => window.sessionStorage.clear());

describe('SaleDraft foundation', () => {
  it('crea un borrador canónico por caja y turno con id, revisión y valores iniciales', () => {
    const draft = createSaleDraft(context);

    expect(draft).toMatchObject({
      version: 1,
      registerId: 'register-01',
      shiftId: 'shift-01',
      revision: 0,
      customerId: null,
      lines: [],
      note: '',
    });
    expect(draft.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(draft.updatedAt).toEqual(expect.any(String));
  });

  it('persiste y rehidrata únicamente para la misma caja y turno', () => {
    const draft = updateSaleDraft(createSaleDraft(context), {
      customerId: 'customer-01',
      note: 'Entregar mañana',
      lines: [{ productId: 'product-01', quantity: 2, discount: 250, quotedUnitPrice: 10000 }],
    });
    saveSaleDraft(draft);

    expect(loadSaleDraft(context)).toMatchObject({
      id: draft.id,
      revision: 1,
      customerId: 'customer-01',
      note: 'Entregar mañana',
      lines: [{ productId: 'product-01', quantity: 2, discount: 250, quotedUnitPrice: 10000 }],
    });
    expect(loadSaleDraft(otherShift)).toMatchObject({ shiftId: 'shift-02', lines: [] });
  });

  it('invalida el dato persistido si su caja o turno no coincide con el contexto', () => {
    const wrong = createSaleDraft(otherShift);
    window.sessionStorage.setItem(saleDraftStorageKey(context), JSON.stringify(wrong));

    const restored = loadSaleDraft(context);

    expect(restored).toMatchObject({ registerId: 'register-01', shiftId: 'shift-01', lines: [] });
    expect(restored.id).not.toBe(wrong.id);
    expect(window.sessionStorage.getItem(saleDraftStorageKey(context))).toBeNull();
  });

  it('descarta datos corruptos al rehidratar y conserva el storage limpio', () => {
    window.sessionStorage.setItem(saleDraftStorageKey(context), '{no-json');

    const restored = loadSaleDraft(context);

    expect(restored).toMatchObject({ registerId: 'register-01', shiftId: 'shift-01', lines: [] });
    expect(window.sessionStorage.getItem(saleDraftStorageKey(context))).toBeNull();
  });

  it('incrementa revisión sin convertir el precio cotizado en autoridad de precio', () => {
    const draft = createSaleDraft(context);
    const updated = updateSaleDraft(draft, {
      lines: [{ productId: 'product-01', quantity: 1, discount: 0, quotedUnitPrice: 8000 }],
    });

    expect(updated.revision).toBe(1);
    expect(updated.lines[0]).toEqual({ productId: 'product-01', quantity: 1, discount: 0, quotedUnitPrice: 8000 });
  });

  it('no persiste campos no contractuales como evidencia base64', () => {
    const draft = createSaleDraft(context);
    saveSaleDraft({
      ...draft,
      lines: [{ productId: 'product-01', quantity: 1, discount: 0, evidenceBase64: 'data:image/png;base64,secret' }],
    } as never);

    expect(window.sessionStorage.getItem(saleDraftStorageKey(context))).not.toContain('base64');
  });

  it('puede limpiar sólo el borrador del contexto indicado', () => {
    saveSaleDraft(createSaleDraft(context));
    saveSaleDraft(createSaleDraft(otherShift));

    clearSaleDraft(context);

    expect(window.sessionStorage.getItem(saleDraftStorageKey(context))).toBeNull();
    expect(window.sessionStorage.getItem(saleDraftStorageKey(otherShift))).not.toBeNull();
  });
});