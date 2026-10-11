import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productSchema, type Product, type ProductInput } from '@/shared/contracts';
import { api } from '@/shared/api/client';

type SaveArgs = { id?: string; input: ProductInput };

export const useSaveProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<Product, Error, SaveArgs>({
    mutationFn: ({ id, input }) =>
      id ? api.put(`/products/${id}`, input, productSchema) : api.post('/products', input, productSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
};
