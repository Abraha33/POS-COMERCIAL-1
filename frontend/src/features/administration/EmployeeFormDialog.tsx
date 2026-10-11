import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { employeeInputSchema, roleSchema, type Branch, type Employee, type EmployeeInput } from '@/shared/contracts';
import { roleLabels } from '@/app/config/permissions';
import { FormField } from '@/shared/ui';

type Props = {
  visible: boolean;
  employee: Employee | null;
  branches: Branch[];
  defaultBranchId: string;
  saving: boolean;
  /** Mensaje de error del último intento (p. ej. FORBIDDEN), mostrado dentro del diálogo. */
  errorMessage: string | null;
  onSubmit: (input: EmployeeInput) => void;
  onHide: () => void;
};

export const EmployeeFormDialog = ({
  visible, employee, branches, defaultBranchId, saving, errorMessage, onSubmit, onHide,
}: Props) => {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeInputSchema),
    defaultValues: { name: '', role: 'cajero', branchId: defaultBranchId, active: true },
  });

  useEffect(() => {
    if (!visible) return;
    reset(
      employee
        ? { name: employee.name, role: employee.role, branchId: employee.branchId, active: employee.active }
        : { name: '', role: 'cajero', branchId: defaultBranchId, active: true },
    );
  }, [visible, employee, defaultBranchId, reset]);

  return (
    <Dialog
      header={employee ? 'Editar empleado' : 'Nuevo empleado'}
      visible={visible}
      onHide={onHide}
      style={{ width: 'min(30rem, 95vw)' }}
      modal
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="emp-name" label="Nombre" error={errors.name?.message}>
          <InputText id="emp-name" className="w-full" autoComplete="off" {...register('name')} />
        </FormField>
        <FormField id="emp-role" label="Rol" error={errors.role?.message}>
          <select id="emp-role" className="p-inputtext w-full" {...register('role')}>
            {roleSchema.options.map((role) => (
              <option key={role} value={role}>{roleLabels[role]}</option>
            ))}
          </select>
        </FormField>
        <FormField id="emp-branch" label="Sede" error={errors.branchId?.message}>
          <select id="emp-branch" className="p-inputtext w-full" {...register('branchId')}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </FormField>
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <div className="flex align-items-center gap-2 mb-3">
              <Checkbox inputId="emp-active" checked={field.value} onChange={(e) => field.onChange(Boolean(e.checked))} />
              <label htmlFor="emp-active">Activo</label>
            </div>
          )}
        />
        {errorMessage ? (
          <p role="alert" className="p-error mt-0 mb-3" data-testid="employee-form-error">{errorMessage}</p>
        ) : null}
        <div className="flex justify-content-end gap-2">
          <Button type="button" label="Cancelar" severity="secondary" outlined onClick={onHide} />
          <Button type="submit" label="Guardar" icon="pi pi-check" loading={saving} />
        </div>
      </form>
    </Dialog>
  );
};
