import { registerConformance } from '@/conformance/scenarios';

// Los mocks MSW (src/mocks) deben cumplir exactamente la misma suite que el backend real.
registerConformance(`${window.location.origin}/api/v1`);
