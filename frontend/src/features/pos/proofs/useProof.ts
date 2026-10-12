import { useCallback, useEffect, useRef, useState } from 'react';
import { getProofGateway } from './gateway';
import type { ProofRequest } from './proofs';

const POLL_MS = 1500;

/** Sigue una solicitud de comprobante: consulta mientras haya algo que esperar y se detiene al resolverse. */
export const useProof = (proofId: string | null) => {
  const [proof, setProof] = useState<ProofRequest | null>(null);
  const [lost, setLost] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!proofId) return;
    try {
      const next = await getProofGateway().get(proofId);
      if (alive.current) {
        setProof(next);
        setLost(false);
      }
    } catch {
      if (alive.current) setLost(true);
    }
  }, [proofId]);

  useEffect(() => {
    alive.current = true;
    if (!proofId) {
      setProof(null);
      return () => {
        alive.current = false;
      };
    }
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => {
      alive.current = false;
      window.clearInterval(timer);
    };
  }, [proofId, refresh]);

  return { proof, setProof, refresh, lost };
};
