import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import type { Product, ProductInput } from '@/shared/contracts';
import { FormDialog, FormField, MoneyInput } from '@/shared/ui';
import { allowedRates, formatRate, productFormSchema, taxCategoryLabels, type TaxCategory } from './productRules';

const emptyProduct: ProductInput = {
  sku: '', barcode: '', name: '', category: '', unit: 'und', price: 0, cost: 0, taxCategory: 'gravado', taxRate: 0.19, active: true,
};

type Props = {
  visible: boolean;
  product: Product | null;
  /** Catálogo cargado: valida SKU y código de barras únicos (BR-PRO-01/02) antes de enviar. */
  catalog: readonly Product[];
  /** BR-PRO-01: el SKU no cambia cuando el producto ya tiene movimientos. */
  skuLocked: boolean;
  saving: boolean;
  onSubmit: (input: ProductInput) => void;
  onHide: () => void;
};

export const ProductFormDialog = ({ visible, product, catalog, skuLocked, saving, onSubmit, onHide }: Props) => {
  const { register, control, handleSubmit, reset, setError, setValue, watch, formState: { errors } } = useForm<ProductInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyProduct,
  });
  const taxCategory = watch('taxCategory');
  const presentations = useFieldArray({ control, name: 'presentations' });

  useEffect(() => {
    if (visible) reset(product ? { ...emptyProduct, ...product } : emptyProduct);
  }, [visible, product, reset]);

  const submit = (values: ProductInput) => {
    const sku = values.sku.trim();
    const barcode = values.barcode?.trim() || undefined;
    const others = catalog.filter((p) => p.id !== product?.id);
    if (others.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
      setError('sku', { message: 'Ya existe un producto con este SKU' });
      return;
    }
    if (barcode && others.some((p) => p.barcode === barcode)) {
      setError('barcode', { message: 'Ya existe un producto con este código de barras' });
      return;
    }
    const brand = values.brand?.trim() || undefined;
    const rows = values.presentations?.filter((r) => r.name.trim() !== '');
    const rest: ProductInput = { ...values };
    delete rest.brand;
    delete rest.presentations;
    onSubmit({
      ...rest, sku, barcode, name: values.name.trim(), category: values.category.trim(), unit: values.unit.trim(),
      ...(brand ? { brand } : {}), ...(rows && rows.length > 0 ? { presentations: rows } : {}),
    });
  };

  const categoryField = register('taxCategory', {
    onChange: (e: { target: { value: string } }) => {
      const next = e.target.value as TaxCategory;
      setValue('taxRate', allowedRates[next][0] ?? 0);
    },
  });

  return (
    <FormDialog
      visible={visible}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      onHide={onHide}
      onSubmit={() => void handleSubmit(submit)()}
      submitIcon="pi pi-check"
      loading={saving}
      width="min(34rem, 95vw)"
    >
      <div className="grid">
        <div className="col-12 md:col-6">
          <FormField id="sku" label="SKU" error={errors.sku?.message}>
            <InputText
              id="sku"
              className="w-full"
              disabled={skuLocked}
              aria-describedby={skuLocked ? 'sku-hint' : undefined}
              {...register('sku')}
            />
            {skuLocked ? (
              <small id="sku-hint" className="block text-color-secondary">
                El SKU no cambia porque el producto ya tiene movimientos.
              </small>
            ) : null}
          </FormField>
        </div>
        <div className="col-12 md:col-6">
          <FormField id="barcode" label="Código de barras (opcional)" error={errors.barcode?.message}>
            <InputText id="barcode" className="w-full" inputMode="numeric" {...register('barcode')} />
          </FormField>
        </div>
      </div>
      <FormField id="name" label="Nombre" error={errors.name?.message}>
        <InputText id="name" className="w-full" {...register('name')} />
      </FormField>
      <div className="grid">
        <div className="col-12 md:col-8">
          <FormField id="category" label="Categoría" error={errors.category?.message}>
            <InputText id="category" className="w-full" {...register('category')} />
          </FormField>
        </div>
        <div className="col-12 md:col-4">
          <FormField id="unit" label="Unidad" error={errors.unit?.message}>
            <InputText id="unit" className="w-full" {...register('unit')} />
          </FormField>
        </div>
      </div>
      <div className="grid">
        <div className="col-12 md:col-6">
          <FormField id="price" label="Precio de venta (IVA incluido)" error={errors.price?.message}>
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <MoneyInput id="price" value={field.value} onChange={(v) => field.onChange(v ?? 0)} invalid={Boolean(errors.price)} />
              )}
            />
          </FormField>
        </div>
        <div className="col-12 md:col-6">
          <FormField id="cost" label="Costo promedio" error={errors.cost?.message}>
            <Controller
              name="cost"
              control={control}
              render={({ field }) => (
                <MoneyInput id="cost" value={field.value} onChange={(v) => field.onChange(v ?? 0)} invalid={Boolean(errors.cost)} />
              )}
            />
          </FormField>
        </div>
      </div>
      <div className="grid">
        <div className="col-12 md:col-6">
          <FormField id="taxCategory" label="Categoría de IVA" error={errors.taxCategory?.message}>
            <select id="taxCategory" className="p-inputtext w-full" {...categoryField}>
              {(Object.keys(taxCategoryLabels) as TaxCategory[]).map((c) => (
                <option key={c} value={c}>{taxCategoryLabels[c]}</option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="col-12 md:col-6">
          <FormField id="taxRate" label="Tarifa" error={errors.taxRate?.message}>
            <select id="taxRate" className="p-inputtext w-full" {...register('taxRate', { valueAsNumber: true })}>
              {allowedRates[taxCategory].map((r) => (
                <option key={r} value={r}>{formatRate(r)}</option>
              ))}
            </select>
          </FormField>
        </div>
      </div>
      <FormField id="brand" label="Marca (opcional)" error={errors.brand?.message}>
        <InputText id="brand" {...register('brand')} />
      </FormField>
      <fieldset className="products__presentations">
        <legend>Presentaciones (opcional)</legend>
        {presentations.fields.map((field, index) => (
          <div className="products__presentation-row" key={field.id}>
            <input
              className="p-inputtext" aria-label={`Nombre de la presentación ${index + 1}`} placeholder="Caja x12"
              {...register(`presentations.${index}.name` as const)}
            />
            <input
              className="p-inputtext" type="number" min="0" step="any" inputMode="decimal"
              aria-label={`Unidades por presentación ${index + 1}`} placeholder="Unidades"
              {...register(`presentations.${index}.factor` as const, { valueAsNumber: true })}
            />
            <Button
              type="button" icon="pi pi-times" rounded text severity="secondary"
              aria-label={`Quitar presentación ${index + 1}`} onClick={() => presentations.remove(index)}
            />
            {errors.presentations?.[index]?.name || errors.presentations?.[index]?.factor ? (
              <p role="alert" className="products__presentation-error">
                {errors.presentations[index]?.name?.message ?? errors.presentations[index]?.factor?.message}
              </p>
            ) : null}
          </div>
        ))}
        <Button
          type="button" label="Agregar presentación" icon="pi pi-plus" text
          onClick={() => presentations.append({ name: '', factor: 1 })}
        />
      </fieldset>
      <Controller
        name="active"
        control={control}
        render={({ field }) => (
          <div className="flex align-items-center gap-2">
            <Checkbox inputId="active" checked={field.value} onChange={(e) => field.onChange(Boolean(e.checked))} />
            <label htmlFor="active">Activo (un producto inactivo no se vende ni se compra)</label>
          </div>
        )}
      />
    </FormDialog>
  );
};
