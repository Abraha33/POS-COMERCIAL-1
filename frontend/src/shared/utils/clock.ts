/**
 * Reloj de la aplicación (BR-GEN-03: zona de negocio `America/Bogota`).
 *
 * En producción es la hora del dispositivo. Con mocks (MSW) los mocks instalan su reloj fijo
 * (`mockNow`, 2026-10-11) con `setClock`, de modo que mora y vencimientos sean deterministas.
 * Con backend real la mora y los saldos vencidos los calcula el servidor (autoridad); este reloj solo
 * sirve para presentar fechas relativas.
 */
type ClockSource = () => Date;

const systemClock: ClockSource = () => new Date();
let source: ClockSource = systemClock;

/** Instala una fuente de tiempo (mocks y pruebas). Sin argumento restablece el reloj del sistema. */
export const setClock = (next: ClockSource = systemClock) => {
  source = next;
};

export const now = (): Date => source();

const bogotaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Fecha de hoy `YYYY-MM-DD` en la zona de negocio. */
export const today = (): string => bogotaDate.format(source());

/** Igual que `today()`, para componentes (se reevalúa en cada render). */
export const useToday = (): string => today();
