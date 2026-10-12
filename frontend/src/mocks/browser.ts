import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { createHttpProofStore } from './proofStoreHttp';
import { setProofStore } from './proofStore';

// En desarrollo, computador y teléfono comparten comprobantes a través del servidor de Vite. Las pruebas usan memoria.
if (import.meta.env.DEV) setProofStore(createHttpProofStore());

export const worker = setupWorker(...handlers);
