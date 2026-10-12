import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSaleReprint, listSaleReprints } from '@/shared/api/receipts';

/**
 * Copias de un comprobante. El servidor registra cada COPIA; reimprimir no crea venta ni mueve stock o caja.
 * Contrato: `GET/POST /pos/sales/{id}/reprints` (ver contracts/openapi.yaml).
 */
const reprintsKey = (saleId: string) => ['sale-reprints', saleId] as const;

export const useSaleReprints = (saleId: string) =>
  useQuery({ queryKey: reprintsKey(saleId), queryFn: () => listSaleReprints(saleId) });

export const useCreateSaleReprint = (saleId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createSaleReprint(saleId, {}),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: reprintsKey(saleId) }),
  });
};
