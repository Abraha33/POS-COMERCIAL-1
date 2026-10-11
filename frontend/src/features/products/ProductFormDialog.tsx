import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { productInputSchema, type Product, type ProductInput } from '@/shared/contracts';
import { FormField } from '@/shared/ui';

const emptyProduct: ProductInput = {
  sku: '', name: '', category: '', unit: 'und', price: 0, cost: 0, taxRate: 0, active: true,
};

type Props = {
  visible: boolean;
  product: Product | null;
  saving: boolean;
  onSubmit: (input: ProductInput) => void;
  onHide: () => void;
};

export const ProductFormDialog = ({ visible, product, saving, onSubmit, onHide }: Props) => {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ProductInput>({
    resolver: zodResolver(productInputSchema),
    defaultValues: emptyProduct,
  });

  useEffect(() => {
    if (visible) reset(product ? { ...product } : emptyProduct);
  }, [visible, product, reset]);

  return (
    <Dialog
      header={product ? 'Editar producto' : 'Nuevo producto'}
      visible={visible}
      onHide={onHide}
      style={{ width: 'min(32rem, 95vw)' }}
      modal
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="sku" label="SKU" error={errors.sku?.message}>
          <InputText id="sku" className="w-full" {...register('sku')} />
        </FormField>
        <FormField id="name" label="Nombre" error={errors.name?.message}>
          <InputText id="name" className="w-full" {...register('name')} />
        </FormField>
        <FormField id="category" label="Categoría" error={errors.category?.message}>
          <InputText id="category" className="w-full" {...register('category')} />
        </FormField>
        <div className="grid">
          <div className="col-6">
            <FormField id="price" label="Precio" error={errors.price?.message}>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <InputNumber inputId="price" value={field.value} onValueChange={(e) => field.onChange(e.value ?? 0)} mode="currency" currency="COP" locale="es-CO" minFractionDigits={0} className="w-full" />
                )}
              />
            </FormField>
          </div>
          <div className="col-6">
            <FormField id="cost" label="Costo" error={errors.cost?.message}>
              <Controller
                name="cost"
                control={control}
                render={({ field }) => (
                  <InputNumber inputId="cost" value={field.value} onValueChange={(e) => field.onChange(e.value ?? 0)} mode="currency" currency="COP" locale="es-CO" minFractionDigits={0} className="w-full" />
                )}
              />
            </FormField>
          </div>
        </div>
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <div className="flex align-items-center gap-2 mb-4">
              <Checkbox inputId="active" checked={field.value} onChange={(e) => field.onChange(Boolean(e.checked))} />
              <label htmlFor="active">Activo</label>
            </div>
          )}
        />
        <div className="flex justify-content-end gap-2">
          <Button type="button" label="Cancelar" severity="secondary" outlined onClick={onHide} />
          <Button type="submit" label="Guardar" icon="pi pi-check" loading={saving} />
        </div>
      </form>
    </Dialog>
  );
};
