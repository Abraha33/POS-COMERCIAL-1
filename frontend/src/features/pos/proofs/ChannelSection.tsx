import { useState } from 'react';
import type { ProofRequest } from './proofs';
import { digitsOnly, isDuplicateReference, type PaymentChannel } from './channels';
import { ProofPanel } from './ProofPanel';

export type ChannelState = {
  channelId: string;
  destinationId: string;
  values: Record<string, string>;
  proofId: string | null;
};

type Props = {
  channels: PaymentChannel[];
  state: ChannelState;
  onState: (next: ChannelState) => void;
  amount: number;
  operationId: string;
  actor: string;
  canAuthorizeException: boolean;
  usedReferences: readonly string[];
  onProof: (proof: ProofRequest | null) => void;
};

/** Formulario dinámico por TIPO de canal: los campos salen del catálogo, no de un componente por banco. */
export const ChannelSection = (props: Props) => {
  const { channels, state, onState, amount, operationId, actor, canAuthorizeException, usedReferences, onProof } = props;
  const channel = channels.find((c) => c.id === state.channelId) ?? channels[0];
  const [touched, setTouched] = useState(false);
  if (!channel) return null;

  const destination = channel.destinations.find((d) => d.id === state.destinationId) ?? channel.destinations[0];
  const set = (patch: Partial<ChannelState>) => onState({ ...state, ...patch });
  const duplicate = isDuplicateReference(usedReferences, state.values.reference ?? '');

  return (
    <section aria-label="Pago digital" className="proof-channel">
      <label htmlFor="pay-channel" className="pos-pay__label">Canal</label>
      <select
        id="pay-channel" className="p-inputtext w-full" value={channel.id}
        onChange={(e) => onState({ channelId: e.target.value, destinationId: '', values: {}, proofId: null })}
      >
        {channels.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>

      {channel.destinations.length > 0 ? (
        <>
          <label htmlFor="pay-destination" className="pos-pay__label">Cuenta destino</label>
          <select
            id="pay-destination" className="p-inputtext w-full" value={destination?.id ?? ''}
            onChange={(e) => set({ destinationId: e.target.value })}
          >
            {channel.destinations.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </>
      ) : null}

      {channel.fields.map((field) => {
        const value = state.values[field.key] ?? '';
        const empty = field.required && value.trim() === '';
        const id = `pay-field-${field.key}`;
        return (
          <div key={field.key}>
            <label htmlFor={id} className="pos-pay__label">
              {field.label}{field.required ? '' : ' (opcional)'}
            </label>
            <input
              id={id} className="p-inputtext w-full" value={value}
              inputMode={field.input === 'digits' ? 'numeric' : undefined}
              aria-invalid={touched && empty ? true : undefined}
              onBlur={() => setTouched(true)}
              onChange={(e) =>
                set({ values: { ...state.values, [field.key]: field.input === 'digits' ? digitsOnly(e.target.value) : e.target.value } })
              }
            />
          </div>
        );
      })}

      {duplicate ? (
        <p className="proof__note" role="alert">
          Esa referencia ya se usó en una venta de este dispositivo. Verifica que el comprobante no sea reutilizado.
        </p>
      ) : null}

      {channel.requiresProof ? (
        <ProofPanel
          operationId={operationId}
          method={channel.method}
          channelId={channel.id}
          channelLabel={channel.label}
          amount={amount}
          destination={destination?.label ?? ''}
          employee={actor}
          actor={actor}
          canAuthorizeException={canAuthorizeException}
          proofId={state.proofId}
          onProofId={(id) => set({ proofId: id })}
          onProof={onProof}
        />
      ) : (
        <p className="pos-pay__instruction">Cobra en el datáfono y registra el código de aprobación antes de confirmar.</p>
      )}
    </section>
  );
};
