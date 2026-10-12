import type { Role } from '@/shared/contracts';

/**
 * Usuarios y PIN de PRUEBA, solo para mocks y suite de conformidad. El backend de desarrollo debe
 * cargar los mismos (contracts/fixtures/users.json). Nunca usar en producción.
 */
export type TestUser = { username: string; employeeId: string; role: Role; pin?: string };

export const TEST_PASSWORD = '1234';

export const testUsers: TestUser[] = [
  { username: 'laura.gomez', employeeId: 'emp-001', role: 'cajero' },
  { username: 'andres.rojas', employeeId: 'emp-002', role: 'bodeguero' },
  { username: 'maria.perez', employeeId: 'emp-003', role: 'admin', pin: '1234' },
  { username: 'carlos.duenio', employeeId: 'emp-004', role: 'propietario', pin: '9999' },
  { username: 'sofia.ruiz', employeeId: 'emp-005', role: 'bodeguero' },
  { username: 'pedro.compras', employeeId: 'emp-006', role: 'comprador' },
  { username: 'ana.cartera', employeeId: 'emp-007', role: 'cartera' },
];

export const tokenForEmployee = (employeeId: string): string => `mock-token-${employeeId}`;

/** Token de un usuario de prueba con ese rol (para el selector de rol simulado en desarrollo). */
export const mockTokenForRole = (role: Role): string | null => {
  const user = testUsers.find((u) => u.role === role);
  return user ? tokenForEmployee(user.employeeId) : null;
};
