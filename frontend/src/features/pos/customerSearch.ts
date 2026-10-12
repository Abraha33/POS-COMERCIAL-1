import type { Customer } from '@/shared/contracts';

const digits = (s: string): string => s.replace(/\D+/g, '');
const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca por nombre, documento (NIT con o sin puntos y dígito de verificación) o teléfono. */
export const searchCustomers = (customers: readonly Customer[], query: string): Customer[] => {
  const q = query.trim();
  if (q === '') return [...customers];
  const text = fold(q);
  const num = digits(q);
  return customers.filter((c) => {
    if (fold(c.name).includes(text)) return true;
    if (num.length >= 3) return digits(c.taxId).includes(num) || digits(c.phone ?? '').includes(num);
    return false;
  });
};
