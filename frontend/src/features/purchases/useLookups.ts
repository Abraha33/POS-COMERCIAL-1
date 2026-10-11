import { useMemo } from 'react';
import type { Product, Supplier } from '@/shared/contracts';
import { useProducts, useSuppliers } from '@/shared/api/queries';

/** Mapas id -> entidad para mostrar nombres (nunca ids) en las tablas. */
export const useLookups = () => {
  const products = useProducts();
  const suppliers = useSuppliers();
  const productById = useMemo(() => new Map<string, Product>((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const supplierById = useMemo(() => new Map<string, Supplier>((suppliers.data ?? []).map((s) => [s.id, s])), [suppliers.data]);
  return { products, suppliers, productById, supplierById };
};
