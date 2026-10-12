import type { LocaleId } from './locales';

/**
 * Catálogos de mensajes. Clave = código estable (no cambia con el idioma). Cada idioma declara solo lo que tradujo:
 * lo que falte cae al español (`fallback`) y se cuenta en las pruebas, para que el faltante sea visible.
 *
 * Estado: primer vertical (pantalla de acceso). El resto de pantallas se extrae por módulos; ver
 * docs/architecture/I18N.md.
 */
export type MessageKey = keyof typeof es;

const es = {
  'access.title': 'Acceso al POS',
  'access.open': 'Abrir caja',
  'access.continue': 'Continuar a Venta rápida',
  'access.relief': 'Solicitar relevo',
  'access.back': 'Volver',
  'access.status.closed': 'Caja cerrada',
  'access.status.occupied': 'Caja ocupada',
  'access.status.noPermission': 'Sin permiso',
  'access.status.noConnection': 'No verificable',
  'access.status.active': 'Turno activo',
  'access.loading': 'Cargando acceso…',
  'access.retry': 'Reintentar',
  'access.opening.title': 'Conteo de base inicial',
  'access.opening.review': 'Revisar apertura',
  'access.opening.confirm': 'Confirmar apertura',
  'access.opening.exact': 'Base exacta',
  'access.opening.total': 'Total contado',
  'access.opening.expected': 'Base esperada',
  'access.opening.difference': 'Diferencia',
  'access.opening.authNotRequired': 'No requerida',
  'access.opening.shiftOpened': 'Turno abierto en {register}: base {amount}.',
  'access.field.cashier': 'Cajero',
  'access.field.branch': 'Sede',
  'access.field.terminal': 'Terminal',
  'access.field.register': 'Caja',
  'access.field.connection': 'Conexión',
  'access.connection.online': 'En línea',
  'access.noRegister.title': 'Sin caja asignada',
  'access.noRegister.description': 'Tu usuario no tiene una caja o terminal asignada en esta sede. Pide a un administrador que la configure.',
  'access.field.name': 'Nombre',
  'access.field.role': 'Rol',
  'access.connection.offline': 'Sin conexión',
  'access.state.title': 'Estado de la caja',
  'access.occupiedBy': 'Turno de:',
  'access.explain.active': 'Tienes un turno abierto en esta caja. Puedes continuar con la venta.',
  'access.explain.closed': 'La caja está cerrada. Cuenta la base inicial para abrirla.',
  'access.explain.occupied': 'Otra persona tiene el turno abierto en esta caja. Pide el relevo o elige otra caja.',
  'access.explain.noPermission': 'Tu rol no puede vender en el punto de venta. Pide acceso a un administrador.',
  'access.explain.noConnection': 'Sin conexión no se puede verificar el estado del turno. Reintenta antes de abrir o vender.',
  'access.subtitle.sandbox': 'Escenario de prueba: no es el servidor real',
  'shell.language': 'Idioma',
} as const;

type Catalog = Partial<Record<MessageKey, string>>;

const en: Catalog = {
  'access.title': 'POS access',
  'access.open': 'Open register',
  'access.continue': 'Continue to Quick sale',
  'access.relief': 'Request handover',
  'access.back': 'Back',
  'access.status.closed': 'Register closed',
  'access.status.occupied': 'Register occupied',
  'access.status.noPermission': 'No permission',
  'access.status.noConnection': 'Not verifiable',
  'access.status.active': 'Active shift',
  'access.loading': 'Loading access…',
  'access.retry': 'Retry',
  'access.opening.title': 'Opening count',
  'access.opening.review': 'Review opening',
  'access.opening.confirm': 'Confirm opening',
  'access.opening.exact': 'Exact opening',
  'access.opening.total': 'Counted total',
  'access.opening.expected': 'Expected opening',
  'access.opening.difference': 'Difference',
  'access.opening.authNotRequired': 'Not required',
  'access.opening.shiftOpened': 'Shift opened at {register}: opening {amount}.',
  'access.field.cashier': 'Cashier',
  'access.field.branch': 'Branch',
  'access.field.terminal': 'Terminal',
  'access.field.register': 'Register',
  'access.field.connection': 'Connection',
  'access.connection.online': 'Online',
  'access.noRegister.title': 'No register assigned',
  'access.noRegister.description': 'Your user has no register or terminal assigned in this branch. Ask an administrator to set it up.',
  'access.field.name': 'Name',
  'access.field.role': 'Role',
  'access.connection.offline': 'Offline',
  'access.state.title': 'Register status',
  'access.occupiedBy': 'Shift of:',
  'access.explain.active': 'You have an open shift on this register. You can continue with the sale.',
  'access.explain.closed': 'The register is closed. Count the opening float to open it.',
  'access.explain.occupied': 'Another person has the shift open on this register. Request a handover or pick another register.',
  'access.explain.noPermission': 'Your role cannot sell at the POS. Ask an administrator for access.',
  'access.explain.noConnection': 'Without a connection the shift status cannot be verified. Retry before opening or selling.',
  'access.subtitle.sandbox': 'Test scenario: not the real server',
  'shell.language': 'Language',
};

/** Idiomas sin traducción todavía: caen al español y se cuentan como pendientes. */
export const catalogs: Record<LocaleId, Catalog> = {
  es,
  en,
  fr: {},
  ru: {},
  hi: {},
};

/** Textos que sí tienen traducción revisada en cada idioma (los demás son respaldo). */
export const translatedCount = (locale: LocaleId): number => Object.keys(catalogs[locale]).length;
