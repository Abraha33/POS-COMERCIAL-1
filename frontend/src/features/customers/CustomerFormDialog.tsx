import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { customerInputSchema, type Customer, type CustomerInput } from '@/shared/contracts';
import { useSaveCustomer } from '@/shared/api/ledger';
import { FormField } from '@/shared/ui';
import { useNotify } from '@/app/providers/ToastProvider';
import { COUNTER_CUSTOMER_TAX_ID } from './ledger';

/** BR-CLI-07 / A3: el correo es obligatorio para clientes identificados (no consumidor final). */
const formSchema = customerInputSchema.superRefine((value, ctx) => {
  const identified = value.taxId.trim() !== COUNTER_CUSTOMER_TAX_ID;
  const email = (value.email ?? '').trim();
  if (identified && email === '') {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'El correo es obligatorio para clientes identificados' });
  } else if (email !== '' && !/^\S+@\S+\.\S+$/.test(email)) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'Correo con formato inválido' });
  }
  if (value.taxId.trim() === '') {
    ctx.addIssue({ code: 'custom', path: ['taxId'], message: 'El número de documento es obligatorio' });
  }
});

const emptyCustomer: CustomerInput = {
  name: '', documentType: 'NIT', taxId: '', taxResponsibility: 'R-99-PN', phone: '', email: '', active: true, creditLimit: 0,
};

const documentTypes = ['CC', 'NIT', 'CE', 'TI', 'PPT', 'PEP'] as const;

type Props = {
  visible: boolean;
  customer: Customer | null;
  onHide: () => void;
};

/** Alta y edición de cliente (BR-CLI-01, BR-CLI-07). Maneja `CUSTOMER_DUPLICATED` como error del campo documento. */
export const CustomerFormDialog = ({ visible, customer, onHide }: Props) => {
  const save = useSaveCustomer();
  const { reset: resetMutation } = save;
  const notify = useNotify();
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<CustomerInput>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyCustomer,
  });

  useEffect(() => {
    if (!visible) return;
    resetMutation();
    reset(customer ? { ...emptyCustomer, ...customer } : emptyCustomer);
  }, [visible, customer, reset, resetMutation]);

  const submit = (input: CustomerInput) => {
    const body: CustomerInput = {
      ...input,
      phone: input.phone?.trim() ? input.phone.trim() : undefined,
      email: input.email?.trim() ? input.email.trim() : undefined,
    };
    save.mutate(
      { id: customer?.id, input: body },
      {
        onSuccess: () => {
          notify({ severity: 'success', summary: 'Cliente guardado', detail: body.name });
          onHide();
        },
        onError: (e) => {
          if (e.code === 'CUSTOMER_DUPLICATED') {
            setError('taxId', { type: 'server', message: 'Ya existe un cliente con ese tipo y número de documento' });
            return;
          }
          notify({ severity: 'error', summary: 'No se pudo guardar el cliente', detail: e.message });
        },
      },
    );
  };

  return (
    <Dialog
      header={customer ? 'Editar cliente' : 'Nuevo cliente'}
      visible={visible}
      onHide={onHide}
      style={{ width: 'min(36rem, 95vw)' }}
      modal
    >
      <form onSubmit={handleSubmit(submit)} noValidate>
        <FormField id="cus-name" label="Nombre o razón social" error={errors.name?.message}>
          <InputText id="cus-name" className="w-full" {...register('name')} />
        </FormField>
        <div className="ledger__fields">
          <FormField id="cus-doctype" label="Tipo de documento" error={errors.documentType?.message}>
            <select id="cus-doctype" className="p-inputtext w-full" {...register('documentType')}>
              {documentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField id="cus-taxid" label="Número de documento" error={errors.taxId?.message}>
            <InputText id="cus-taxid" className="w-full" {...register('taxId')} />
          </FormField>
        </div>
        <FormField id="cus-taxresp" label="Responsabilidad tributaria" error={errors.taxResponsibility?.message}>
          <InputText id="cus-taxresp" className="w-full" {...register('taxResponsibility')} />
          <small className="ledger__note">Código DIAN, p. ej. R-99-PN. PROPUESTA: el catálogo de responsabilidades no está cerrado.</small>
        </FormField>
        <div className="ledger__fields">
          <FormField id="cus-phone" label="Teléfono (opcional)" error={errors.phone?.message}>
            <InputText id="cus-phone" className="w-full" inputMode="tel" {...register('phone')} />
          </FormField>
          <FormField id="cus-email" label="Correo electrónico" error={errors.email?.message}>
            <InputText id="cus-email" className="w-full" type="email" {...register('email')} />
          </FormField>
        </div>
        <FormField id="cus-credit" label="Cupo de crédito (COP)" error={errors.creditLimit?.message}>
          <Controller
            name="creditLimit"
            control={control}
            render={({ field }) => (
              <InputNumber
                inputId="cus-credit" value={field.value} min={0}
                onChange={(e) => e.originalEvent && field.onChange(e.value ?? 0)}
                mode="currency" currency="COP" locale="es-CO" minFractionDigits={0} inputStyle={{ width: '100%' }}
              />
            )}
          />
          <small className="ledger__note">0 = no puede comprar a crédito (BR-CLI-02).</small>
        </FormField>
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <div className="flex align-items-center gap-2 mb-4">
              <Checkbox inputId="cus-active" checked={field.value} onChange={(e) => field.onChange(Boolean(e.checked))} />
              <label htmlFor="cus-active">Cliente activo</label>
            </div>
          )}
        />
        <div className="flex justify-content-end gap-2">
          <Button type="button" label="Cancelar" severity="secondary" outlined className="ledger__btn" onClick={onHide} />
          <Button type="submit" label="Guardar" icon="pi pi-check" className="ledger__btn" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
};
