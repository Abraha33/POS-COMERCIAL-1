import { useCallback, useState } from 'react';
import { Button } from 'primereact/button';
import { MoneyInput } from '@/shared/ui';
import { formatMoney } from '@/shared/utils/format';
import { uuid } from '@/shared/utils/uuid';
import { ChannelSection } from '../proofs/ChannelSection';
import { channelById, defaultChannels } from '../proofs/channels';
import type { ProofRequest } from '../proofs/proofs';
import { componentStatus, componentStatusLabel, reverseComponent, type ComponentStatus, type MixedComponent } from './mixed';
import '../proofs/proofs.css';

type Props = {
  components: MixedComponent[];
  onChange: (next: MixedComponent[]) => void;
  proofs: Record<string, ProofRequest | null>;
  onProof: (componentId: string, proof: ProofRequest | null) => void;
  operationId: string;
  actor: string;
  canAuthorizeException: boolean;
  usedReferences: readonly string[];
  missing: number;
  paid: number;
};

const tone: Record<ComponentStatus, string> = {
  recibido: 'info', 'por-verificar': 'warning', confirmado: 'success', 'sujeto-a-autorizacion': 'danger',
};

type CardProps = {
  index: number;
  c: MixedComponent;
  proof: ProofRequest | null;
  p: Props;
  onPatch: (patch: Partial<MixedComponent>) => void;
  onReverse: (reason: string) => void;
  onRemove: () => void;
};

const Card = ({ index, c, proof, p, onPatch, onReverse, onRemove }: CardProps) => {
  const report = p.onProof;
  const stable = useCallback((next: ProofRequest | null) => report(c.id, next), [report, c.id]);
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState(false);
  const channel = channelById(defaultChannels, c.state.channelId) ?? defaultChannels[0]!;
  const status = componentStatus(channel, c.state.values, proof);
  const locked = status === 'confirmado';

  return (
    <li className="mixed__card" aria-label={`Componente de pago ${index + 1}`}>
      <div className="proof__head">
        <strong>Pago {index + 1}</strong>
        <span className={`proof__badge proof__badge--${tone[status]}`} data-testid={`component-status-${index + 1}`}>
          {componentStatusLabel[status]}
        </span>
      </div>
      <ChannelSection
        channels={defaultChannels}
        state={c.state}
        onState={(state) => onPatch({ state })}
        amount={c.amount}
        operationId={`${p.operationId}#${c.id}`}
        actor={p.actor}
        canAuthorizeException={p.canAuthorizeException}
        usedReferences={p.usedReferences}
        onProof={stable}
        idPrefix={`mx-${c.id}`}
        channelLabel={`Medio de pago ${index + 1}`}
        locked={locked}
      />
      <label htmlFor={`mx-${c.id}-amount`} className="pos-pay__label">Monto {index + 1}</label>
      <MoneyInput
        id={`mx-${c.id}-amount`}
        aria-label={`Monto ${index + 1}`}
        value={c.amount}
        onChange={(v) => {
          if (!locked) onPatch({ amount: v ?? 0 });
        }}
      />
      <div className="proof__row">
        {locked ? (
          asking ? (
            <>
              <input
                className="p-inputtext" aria-label={`Motivo de la reversa ${index + 1}`} value={reason}
                onChange={(e) => setReason(e.target.value)} placeholder="Motivo de la reversa"
              />
              <Button
                type="button" label="Reversar pago" icon="pi pi-undo" severity="danger" disabled={reason.trim().length < 3}
                onClick={() => { onReverse(reason); setAsking(false); setReason(''); }}
              />
            </>
          ) : (
            <Button type="button" label={`Reversar pago ${index + 1}`} icon="pi pi-undo" outlined onClick={() => setAsking(true)} />
          )
        ) : (
          <Button
            type="button" icon="pi pi-times" rounded text severity="secondary"
            aria-label={`Quitar pago ${index + 1}`} onClick={onRemove}
          />
        )}
      </div>
    </li>
  );
};

export const MixedPayments = (p: Props) => {
  const { components, onChange, proofs, missing, paid } = p;
  const active = components.filter((c) => c.reversed === null);
  const reversed = components.filter((c) => c.reversed !== null);
  const patch = (id: string, change: Partial<MixedComponent>) =>
    onChange(components.map((c) => (c.id === id ? { ...c, ...change } : c)));

  return (
    <section aria-label="Pago mixto" className="mixed">
      <ul className="mixed__list">
        {active.map((c, i) => (
          <Card
            key={c.id} index={i} c={c} proof={proofs[c.id] ?? null} p={p}
            onPatch={(change) => patch(c.id, change)}
            onReverse={(reason) => {
              const r = reverseComponent(c, p.actor, reason, new Date());
              if (r.ok) onChange(components.map((x) => (x.id === c.id ? r.value : x)));
            }}
            onRemove={() => onChange(components.filter((x) => x.id !== c.id))}
          />
        ))}
      </ul>
      <Button
        type="button" label="Agregar medio de pago" icon="pi pi-plus" text
        onClick={() =>
          onChange([...components, {
            id: uuid().slice(0, 8),
            state: { channelId: 'efectivo', destinationId: '', values: {}, proofId: null },
            amount: missing,
            reversed: null,
          }])
        }
      />
      <p className="pos__hint">Pagado: {formatMoney(paid)}</p>
      {reversed.length > 0 ? (
        <div className="mixed__reversed" aria-label="Pagos reversados">
          <strong>Reversados</strong>
          <ul>
            {reversed.map((c) => (
              <li key={c.id}>
                {channelById(defaultChannels, c.state.channelId)?.label} · {formatMoney(c.amount)} — {c.reversed?.reason} ({c.reversed?.by})
              </li>
            ))}
          </ul>
          <p className="pos__hint">Devuelve el dinero al cliente: la reversa quita el pago de la venta, no mueve efectivo.</p>
        </div>
      ) : null}
    </section>
  );
};
