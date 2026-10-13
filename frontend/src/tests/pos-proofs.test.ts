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
/** Responsable de la cuenta del seed: no es supervisora, así que verifica solo por estar asignada. */
const VERIFIER = { id: 'emp-007', role: 'cartera' as const };

/** Solicitud en la forma de la vista. El estado lo decide el servidor; aquí solo se fija para probar reglas de presentación. */
const proofOf = (status: ProofStatus, exception: ProofRequest['exception'] = null): ProofRequest => ({
  id: 'p1', token: 'tok', operationId: 'op-1', method: 'transferencia', channelId: 'bancolombia', channelLabel: 'Bancolombia',
  amount: 185000, destination: 'Ahorros ••• 1234', employee: 'Ana', createdAt: T0.toISOString(),
  expiresAt: new Date(T0.getTime() + 15 * 60 * 1000).toISOString(), status, photos: [], verifierId: null, reason: null, receivedAt: null,
  attempts: 0, exception, history: [],
});

describe('comprobantes: reglas de la vista', () => {
  it('una foto no es confirmación: solo confirmado o excepción habilitan cerrar la venta', () => {
    expect(canCloseSale(proofOf('esperando'))).toBe(false);
    expect(canCloseSale(proofOf('recibido'))).toBe(false);
    expect(canCloseSale(proofOf('enviado'))).toBe(false);
    expect(canCloseSale(proofOf('rechazado'))).toBe(false);
    expect(canCloseSale(proofOf('confirmado'))).toBe(true);
    expect(canCloseSale(proofOf('excepcion', { authorizedBy: 'Dueño', reason: 'Banco caído', at: '' }))).toBe(true);
  });

  it('cada estado tiene etiqueta visible; la excepción no se presenta como verificación', () => {
    const statuses: ProofStatus[] = ['esperando', 'recibido', 'enviado', 'verificando', 'confirmado', 'rechazado', 'excepcion', 'vencido'];
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
  const asVerifier = () => setAccessToken(mockTokenForRole(VERIFIER.role));

  it('crear es idempotente por operación, canal y monto', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const a = await gw.create(base);
    const b = await gw.create(base);
    expect(b.id).toBe(a.id);
  });

  it('acepta varias fotos y la vista previa conserva cada una (D-005)', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await gw.submitPublic(p.token, IMG);
    await gw.submitLocal(p.id, IMG, 'Ana');
    const seen = await gw.get(p.id);
    expect(seen.status).toBe('recibido');
    expect(seen.photos).toHaveLength(2);
    expect(seen.photos.every((photo) => photo.image === IMG)).toBe(true);
    expect(canCloseSale(seen)).toBe(false);
  });

  it('repetir quita una foto; sin fotos vuelve a esperar', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    const one = await gw.submitLocal(p.id, IMG, 'Ana');
    const two = await gw.submitLocal(p.id, IMG, 'Ana');
    expect(two.photos).toHaveLength(2);
    const afterRemove = await gw.removePhoto(p.id, one.photos[0]!.id, 'Ana');
    expect(afterRemove.photos).toHaveLength(1);
    expect(afterRemove.status).toBe('recibido');
    const empty = await gw.removePhoto(p.id, afterRemove.photos[0]!.id, 'Ana');
    expect(empty.photos).toHaveLength(0);
    expect(empty.status).toBe('esperando');
  });

  it('enviar exige al menos una foto y un responsable activo', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await expect(gw.send(p.id, VERIFIER.id, 'Ana')).rejects.toMatchObject({ code: 'PROOF_INVALID_STATE', status: 409 });
    await gw.submitLocal(p.id, IMG, 'Ana');
    await expect(gw.send(p.id, 'emp-inexistente', 'Ana')).rejects.toMatchObject({ code: 'PROOF_VERIFIER_INVALID', status: 422 });
    const sent = await gw.send(p.id, VERIFIER.id, 'Ana');
    expect(sent.status).toBe('enviado');
    expect(sent.verifierId).toBe(VERIFIER.id);
  });

  it('solo el responsable asignado (o un supervisor) verifica; el cajero que lo solicitó no', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await gw.submitLocal(p.id, IMG, 'Ana');
    await gw.send(p.id, VERIFIER.id, 'Ana');

    // El cajero no puede verificar su propio comprobante.
    await expect(gw.verify(p.id, 'Ana')).rejects.toMatchObject({ status: 403 });

    asVerifier();
    const verifying = await gw.verify(p.id, 'Ana Cartera');
    expect(verifying.status).toBe('verificando');
    const confirmed = await gw.confirm(p.id, 'Ana Cartera');
    expect(canCloseSale(confirmed)).toBe(true);
    expect(confirmed.history.map((h) => h.status)).toEqual(['esperando', 'recibido', 'enviado', 'verificando', 'confirmado']);
  });

  it('un supervisor puede verificar aunque no sea el responsable asignado', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await gw.submitLocal(p.id, IMG, 'Ana');
    await gw.send(p.id, VERIFIER.id, 'Ana');
    setAccessToken(mockTokenForRole('propietario'));
    const verifying = await gw.verify(p.id, 'Dueño');
    expect(verifying.status).toBe('verificando');
  });

  it('confirmar sin haber enviado lo rechaza el servidor (no el cliente)', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await gw.submitLocal(p.id, IMG, 'Ana');
    setAccessToken(mockTokenForRole('propietario'));
    await expect(gw.confirm(p.id, 'Dueño')).rejects.toMatchObject({ code: 'PROOF_INVALID_STATE', status: 409 });
  });

  it('una excepción autorizada cierra la venta sin marcar el pago como confirmado', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    // El cajero no autoriza excepciones (regla del servidor, no de la vista).
    await expect(gw.authorizeException(p.id, 'Ana', 'Banco caído hoy')).rejects.toMatchObject({ status: 403 });
    setAccessToken(mockTokenForRole('propietario'));
    const exc = await gw.authorizeException(p.id, 'Dueño', 'Banco caído hoy');
    expect(exc.status).toBe('excepcion');
    expect(exc.exception?.authorizedBy).toBeTruthy();
    expect(canCloseSale(exc)).toBe(true);
  });

  it('rechazar pide motivo; luego se agrega otra foto y se vuelve a enviar', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await gw.submitLocal(p.id, IMG, 'Ana');
    await gw.send(p.id, VERIFIER.id, 'Ana');
    asVerifier();
    await expect(gw.reject(p.id, 'Ana Cartera', 'no')).rejects.toBeInstanceOf(ProofGatewayError);
    const rejected = await gw.reject(p.id, 'Ana Cartera', 'Monto no coincide');
    expect(rejected.status).toBe('rechazado');

    setAccessToken(mockTokenForRole('cajero'));
    const again = await gw.submitLocal(p.id, IMG, 'Ana');
    expect(again.status).toBe('recibido');
    expect(again.photos).toHaveLength(2);
    const resent = await gw.send(p.id, VERIFIER.id, 'Ana');
    expect(resent.status).toBe('enviado');
  });

  it('un token inexistente no da acceso', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    await expect(gw.getPublic('nope')).rejects.toBeInstanceOf(ProofGatewayError);
    await expect(gw.submitPublic('nope', IMG)).rejects.toMatchObject({ status: 404 });
  });

  it('después de enviar no se aceptan más fotos (409)', async () => {
    const gw = createContractGateway(createMemoryImageStore());
    const p = await gw.create(base);
    await gw.submitPublic(p.token, IMG);
    await gw.send(p.id, VERIFIER.id, 'Ana');
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
    expect(componentStatus(ch('nequi'), { reference: 'r' }, proofOf('enviado'))).toBe('por-verificar');
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
