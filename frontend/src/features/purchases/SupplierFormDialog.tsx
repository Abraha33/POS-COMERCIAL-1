import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import type { Supplier } from '@/shared/contracts';
import { useSaveSupplier } from '@/shared/api/ledger';
import { FormField } from '@/shared/ui';
import { useNotify } from '@/app/providers/ToastProvider';
import { explainError } from './labels';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre del proveedor.'),
  taxId: z.string().trim().min(1, 'Escribe el documento (NIT o cédula).'),
  paymentTermsDays: z.number({ message: 'Indica el plazo de pago en días.' }).int('Usa días enteros.').min(0, 'El plazo no puede ser negativo.'),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  active: z.boolean(),
});
type FormValues = z.infer<typeof formSchema>;

const empty: FormValues = { name: '', taxId: '', paymentTermsDays: 30, phone: '', email: '', active: true };

type Props = { visible: boolean; supplier: Supplier | null; onHide: () => void };

export const SupplierFormDialog = ({ visible, supplier, onHide }: Props) => {
  const save = useSaveSupplier();
  const notify = useNotify();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    if (visible) {
      setServerError(null);
      reset(
        supplier
          ? {
              name: supplier.name, taxId: supplier.taxId, paymentTermsDays: supplier.paymentTermsDays,
              phone: supplier.phone ?? '', email: supplier.email ?? '', active: supplier.active,
            }
          : empty,
      );
    }
  }, [visible, supplier, reset]);

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    save.mutate(
      {
        id: supplier?.id,
        input: {
          name: values.name, taxId: values.taxId, paymentTermsDays: values.paymentTermsDays, active: values.active,
          ...(values.phone ? { phone: values.phone } : {}),
          ...(values.email ? { email: values.email } : {}),
        },
      },
      {
        onSuccess: (saved) => {
          notify({ severity: 'success', summary: 'Proveedor guardado', detail: saved.name });
          onHide();
        },
        onError: (e) => {
          const message = explainError(e, 'guardar');
          if (e.code === 'SUPPLIER_DUPLICATED') setError('taxId', { message });
          setServerError(message);
        },
      },
    );
  };

  return (
    <Dialog
      header={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
      visible={visible}
      onHide={onHide}
      style={{ width: 'min(30rem, 95vw)' }}
      modal
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="sup-name" label="Nombre" error={errors.name?.message}>
          <InputText id="sup-name" className="w-full" {...register('name')} />
        </FormField>
        <FormField id="sup-taxid" label="Documento (NIT o cédula)" error={errors.taxId?.message}>
          <InputText id="sup-taxid" className="w-full" {...register('taxId')} />
        </FormField>
        <FormField id="sup-terms" label="Plazo de pago (días)" error={errors.paymentTermsDays?.message}>
          <Controller
            name="paymentTermsDays"
            control={control}
            render={({ field }) => (
              <InputNumber
                inputId="sup-terms" value={field.value} min={0} maxFractionDigits={0}
                onChange={(e) => e.originalEvent && field.onChange(e.value)}
                inputStyle={{ width: '100%' }}
              />
            )}
          />
        </FormField>
        <FormField id="sup-phone" label="Teléfono (opcional)">
          <InputText id="sup-phone" className="w-full" {...register('phone')} />
        </FormField>
        <FormField id="sup-email" label="Correo (opcional)">
          <InputText id="sup-email" className="w-full" {...register('email')} />
        </FormField>
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <div className="flex align-items-center gap-2 mb-3">
              <Checkbox inputId="sup-active" checked={field.value} onChange={(e) => field.onChange(Boolean(e.checked))} />
              <label htmlFor="sup-active">Activo</label>
            </div>
          )}
        />
        {serverError ? <p className="purch__error" role="alert">{serverError}</p> : null}
        <div className="purch__actions">
          <Button type="button" label="Cancelar" severity="secondary" outlined onClick={onHide} />
          <Button type="submit" label="Guardar proveedor" icon="pi pi-check" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
};
