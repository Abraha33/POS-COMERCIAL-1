import { describe, expect, it } from 'vitest';
import { countryPack } from '@/mocks/seed';
import { defaultChannels } from '@/features/pos/proofs/channels';
import { defaultDenominations } from '@/features/pos-access/scenarios';
import { documentOptions } from '@/features/pos/proofs/documents';
import { countryPackSchema } from '@/shared/contracts';

/**
 * Mientras la UI siga leyendo constantes locales (canales, documentos, denominaciones), estas deben coincidir con el
 * paquete de país del contrato. Cuando la UI consuma `GET /pos/country-pack`, estas constantes y esta prueba se retiran.
 */
const typeOfKind: Record<string, string> = {
  efectivo: 'cash', billetera: 'wallet', cuenta: 'bank_transfer', llave: 'instant_key', qr: 'qr',
  datafono: 'card_terminal', pasarela: 'gateway', credito: 'credit',
};

describe('paquete de país CO frente a las constantes de la UI', () => {
  it('el paquete cumple el esquema', () => {
    expect(countryPackSchema.safeParse(countryPack).success).toBe(true);
  });

  it('los 9 canales coinciden en id, medio, tipo, evidencia, campos y destinos', () => {
    expect(countryPack.paymentChannels).toHaveLength(9);
    for (const ui of defaultChannels) {
      const pack = countryPack.paymentChannels.find((c) => c.id === ui.id);
      expect(pack, `canal ${ui.id}`).toBeDefined();
      expect(pack?.method).toBe(ui.method);
      expect(pack?.type).toBe(typeOfKind[ui.kind]);
      expect(pack?.requiresProof).toBe(ui.requiresProof);
      expect(pack?.fields).toEqual(ui.fields);
      expect(pack?.destinations).toEqual(ui.destinations);
    }
  });

  it('los tipos de documento y el valor por defecto coinciden', () => {
    expect(countryPack.documentTypes.map((d) => d.id).sort()).toEqual(documentOptions.map((o) => o.value).sort());
    expect(countryPack.documentTypes.find((d) => d.isDefault)?.id).toBe('documento-equivalente-pos');
  });

  it('las denominaciones de pos-access coinciden por valor y tipo', () => {
    const asKey = (kind: string, value: number) => `${kind === 'billete' ? 'bill' : 'coin'}-${value}`;
    expect(defaultDenominations.map((d) => asKey(d.kind, d.value)).sort()).toEqual(
      countryPack.cashDenominations.map((d) => `${d.kind}-${d.value}`).sort(),
    );
  });
});
