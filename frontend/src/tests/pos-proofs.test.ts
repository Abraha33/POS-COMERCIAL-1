import { beforeEach, describe, expect, it } from 'vitest';
import { defaultChannels, isDuplicateReference, missingFields } from '@/features/pos/proofs/channels';
import { createContractGateway, ProofGatewayError } from '@/features/pos/proofs/gateway';
import { createMemoryImageStore } from '@/features/pos/proofs/imageStore';
import { canCloseSale, proofStatusLabel, validateEvidenceImage, type ProofRequest, type ProofStatus } from '@/features/pos/proofs/proofs';
import { componentReady, componentStatus, reverseComponent, type MixedComponent } from '@/features/pos/mixed/mixed';
import { setAccessToken } from '@/shared/api/client';
import { mockTokenForRole } from '@/mocks/test-users';
import { resetDb } from '@/mocks/db';

const T0 = new Date('2026-10-11T10:00:00Z');
const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

/** Solicitud en la forma de la vista. El estado lo decide el servidor; aquí solo se fija para probar reglas de presentación. */
const proofOf = (status: ProofStatus, exception: ProofRequest['exception'] = null): ProofRequest => ({
  id: 'p1', token: 'tok', operationId: 'op-1', method: 'transferencia', channelId: 'bancolombia', channelLabel: 'Bancolombia',
  amount: 185000, destination: 'Ahorros ••• 1234', employee: 'Ana', createdAt: T0.toISOString(),
  expiresAt: new Date(T0.getTime() + 15 * 60 * 1000).toISOString(), status, image: null, receivedAt: null,
  attempts: 0, exception, history: [],
});

describe('comprobantes: reglas de la vista', () => {
  it('una foto no es confirmación: solo confirmado o excepción habilitan cerrar la venta', () => {
    expect(canCloseSale(proofOf('esperando'))).toBe(false);
    expect(canCloseSale(proofOf('recibido'))).toBe(false);
    expect(canCloseSale(proofOf('rechazado'))).toBe(false);
    expect(canCloseSale(proofOf('confirmado'))).toBe(true);
    expect(canCloseSale(proofOf('excepcion', { authorizedBy: 'Dueño', reason: 'Banco caído', at: '' }))).toBe(true);
  });

  it('cada estado tiene etiqueta visible; la excepción no se presenta como verificación', () => {
    const statuses: ProofStatus[] = ['esperando', 'recibido', 'verificando', 'confirmado', 'rechazado', 'excepcion', 'vencido'];
    for (const status of statuses) expect(proofStatusLabel[status]).toBeTruthy();
    expect(proofStatusLabel.excepcion).toMatch(/sin verificación/i);
  });

  it('valida tipo y tamaño de la imagen antes de subirla', () => {
    expect(validateEvidenceImage(IMG).ok).toBe(true);
    const pdf = validateEvidenceImage('data:application/pdf;base64,AAAA');
    expect(pdf.ok === false && pdf.code).toBe('IMAGE_TYPE');
    const big = `data:image/png;base64,${'A'.repeat(5 * 1024 * 1024)}`;
    const tooBig = validateEvidenceImage(big);
    expect(tooBig.ok === false && tooBig.code).toBe('IMAGE_TOO_LARGE');
  });
});

describe('canales dinámicos', () => {
  const byId = (id: string) => defaultChannels.find((c) => c.id === id)!;
  it('los campos salen del tipo de canal', () => {
    expect(missingFields(byId('nequi'), {})).toEqual(['Número de referencia o aprobación']);
    expect(missingFields(byId('otros-bancos'), { reference: '123' })).toEqual(['Banco de origen']);
    expect(missingFields(byId('datafono'), {})).toEqual(['Código de aprobación']);
    expect(missingFields(byId('efectivo'), {})).toEqual([]);
  });
  it('datáfono y efectivo no exigen comprobante; billeteras y bancos sí', () => {
    expect(byId('datafono').requiresProof).toBe(false);
    expect(byId('efectivo').requiresProof).toBe(false);
    for (const id of ['nequi', 'daviplata', 'bancolombia', 'otros-bancos', 'bre-b', 'pse']) expect(byId(id).requiresProof).toBe(true);
  });
  it('detecta referencias repetidas sin distinguir mayúsculas', () => {
    expect(isDuplicateReference(['ABC123'], ' abc123 ')).toBe(true);
    expect(isDuplicateReference(['ABC123'], 'zzz')).toBe(false);
    expect(isDuplicateReference(['ABC123'], '')).toBe(false);
  });
});

describe('gateway de comprobantes sobre el contrato (MSW)', () => {
  beforeEach(() => {
    resetDb();
    setAccessToken(mockTokenForRole('cajero'));
  });
  const base = { operationId: '22222222-2222-4222-8222-222222222222', method: 'nequi', channelId: 'nequi', channelLabel: 'Nequi', amount: 50000, destination: 'Nequi del negocio', employee: 'Ana' };

  it('crear es idempotente por operación, canal y monto', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const a = await gw.create(base);
    const b = await gw.create(base);
    expect(b.id).toBe(a.id);
  });

  it('el teléfono entrega la foto por token; el cajero la ve, verifica y confirma', async () => {
    const images = createMemoryImageStore();
    const gw = createContractGateway(images);
    const p = await gw.create(base);
    const view = await gw.getPublic(p.token);
    expect(view.amount).toBe(50000);
    expect(view.channelLabel).toBe('Nequi');

    await gw.submitPublic(p.token, IMG);
    const seen = await gw.get(p.id);
    expect(seen.status).toBe('recibido');
    expect(seen.image).toBe(IMG);
    expect(canCloseSale(seen)).toBe(false);

    const verifying = await gw.verify(p.id, 'Ana');
    expect(verifying.status).toBe('verificando');
    const confirmed = await gw.confirm(p.id, 'Ana');
    expect(canCloseSale(confirmed)).toBe(true);
    expect(confirmed.history.map((h) => h.status)).toEqual(['esperando', 'recibido', 'verificando', 'confirmado']);
  });

  it('confirmar sin evidencia recibida lo rechaza el servidor (no el cliente)', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await expect(gw.confirm(p.id, 'Ana')).rejects.toMatchObject({ code: 'PROOF_INVALID_STATE', status: 409 });
  });

  it('una excepción autorizada cierra la venta sin marcar el pago como confirmado', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    // Solo propietario o administrador autorizan la excepción (regla del servidor, no de la vista).
    setAccessToken(mockTokenForRole('propietario'));
    const exc = await gw.authorizeException(p.id, 'Dueño', 'Banco caído hoy');
    expect(exc.status).toBe('excepcion');
    expect(exc.exception?.authorizedBy).toBeTruthy();
    expect(canCloseSale(exc)).toBe(true);
  });

  it('rechazar pide motivo y permite enviar otra foto', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await gw.submitPublic(p.token, IMG);
    await expect(gw.reject(p.id, 'Ana', 'no')).rejects.toBeInstanceOf(ProofGatewayError);
    const rejected = await gw.reject(p.id, 'Ana', 'Monto no coincide');
    expect(rejected.status).toBe('rechazado');
    const again = await gw.submitPublic(p.token, IMG);
    expect(again.status).toBe('recibido');
  });

  it('un token inexistente no da acceso', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    await expect(gw.getPublic('nope')).rejects.toBeInstanceOf(ProofGatewayError);
    await expect(gw.submitPublic('nope', IMG)).rejects.toMatchObject({ status: 404 });
  });

  it('segundo envío sobre un pago confirmado es rechazado con 409', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await gw.submitPublic(p.token, IMG);
    await gw.verify(p.id, 'Ana');
    await gw.confirm(p.id, 'Ana');
    await expect(gw.submitPublic(p.token, IMG)).rejects.toMatchObject({ status: 409, code: 'PROOF_INVALID_STATE' });
  });

  it('una imagen inválida se rechaza antes de llegar al servidor', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await expect(gw.submitPublic(p.token, 'data:application/pdf;base64,AAAA')).rejects.toMatchObject({ code: 'IMAGE_TYPE' });
  });
});

describe('pago mixto: componentes independientes', () => {
  const ch = (id: string) => defaultChannels.find((c) => c.id === id)!;
  const confirmed = proofOf('confirmado');
  const withException = proofOf('excepcion', { authorizedBy: 'Dueño', reason: 'Banco caído hoy', at: '' });

  it('estados por componente', () => {
    expect(componentStatus(ch('efectivo'), {}, null)).toBe('recibido');
    expect(componentStatus(ch('datafono'), {}, null)).toBe('por-verificar');
    expect(componentStatus(ch('datafono'), { authCode: '99' }, null)).toBe('recibido');
    expect(componentStatus(ch('nequi'), { reference: 'r' }, proofOf('esperando'))).toBe('por-verificar');
    expect(componentStatus(ch('nequi'), { reference: 'r' }, confirmed)).toBe('confirmado');
    expect(componentStatus(ch('nequi'), { reference: 'r' }, withException)).toBe('sujeto-a-autorizacion');
    expect(componentStatus(ch('credito'), {}, null)).toBe('sujeto-a-autorizacion');
  });

  it('un componente digital solo está listo con pago confirmado o excepción, y sin referencia repetida', () => {
    expect(componentReady(ch('nequi'), { reference: 'r' }, null, false)).toBe(false);
    expect(componentReady(ch('nequi'), { reference: 'r' }, confirmed, false)).toBe(true);
    expect(componentReady(ch('nequi'), { reference: 'r' }, confirmed, true)).toBe(false);
    expect(componentReady(ch('nequi'), {}, confirmed, false)).toBe(false);
    expect(componentReady(ch('efectivo'), {}, null, false)).toBe(true);
  });

  it('reversar exige motivo y responsable y conserva el rastro', () => {
    const c: MixedComponent = { id: 'a', state: { channelId: 'nequi', destinationId: '', values: {}, proofId: null }, amount: 1000, reversed: null };
    expect(reverseComponent(c, 'Ana', '', T0).ok).toBe(false);
    const r = reverseComponent(c, 'Ana', 'Cliente se arrepintió', T0);
    expect(r.ok && r.value.reversed?.reason).toBe('Cliente se arrepintió');
    if (r.ok) expect(reverseComponent(r.value, 'Ana', 'otra vez', T0).ok).toBe(false);
  });
});
