import { useState } from 'react';
import type { Customer, DocumentType } from '@/shared/contracts';
import { useSaveCustomer } from '@/shared/api/ledger';
import { FormDialog } from '@/shared/ui';

const documentTypes: DocumentType[] = ['CC', 'NIT', 'CE', 'TI', 'PPT', 'PEP'];

type Props = {
  visible: boolean;
  onHide: () => void;
  onCreated: (customer: Customer) => void;
  /** Si viene, el diálogo edita este cliente (conserva cupo, responsabilidad y estado). */
  editing?: Customer | null;
};

/** Alta rápida de cliente desde la venta (modal). Cupo de crédito 0 hasta que se configure en Clientes. */
export const NewCustomerDialog = ({ visible, onHide, onCreated, editing = null }: Props) => {
  const save = useSaveCustomer();
  const [name, setName] = useState(editing?.name ?? '');
  const [documentType, setDocumentType] = useState<DocumentType>(editing?.documentType ?? 'CC');
  const [taxId, setTaxId] = useState(editing?.taxId ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (name.trim() === '' || taxId.trim() === '') {
      setError('Escribe el nombre y el documento.');
      return;
    }
    save.mutate(
      {
        ...(editing ? { id: editing.id } : {}),
        input: {
          name: name.trim(), documentType, taxId: taxId.trim(),
          taxResponsibility: editing?.taxResponsibility ?? 'R-99-PN', active: editing?.active ?? true,
          creditLimit: editing?.creditLimit ?? 0,
          ...(phone.trim() ? { phone: phone.trim() } : {}), ...(email.trim() ? { email: email.trim() } : {}),
        },
      },
      {
        onSuccess: (customer) => {
          if (!editing) {
            setName('');
            setTaxId('');
            setPhone('');
            setEmail('');
          }
          setError(null);
          onCreated(customer);
        },
        onError: (e) => setError(e.code === 'CUSTOMER_DUPLICATED' ? 'Ya existe un cliente con ese documento.' : e.message),
      },
    );
  };

  return (
    <FormDialog
      visible={visible} title={editing ? 'Editar cliente' : 'Nuevo cliente'} onHide={onHide} onSubmit={submit}
      submitLabel={editing ? 'Guardar cambios' : 'Crear cliente'}
      loading={save.isPending} error={error}
    >
      <label htmlFor="nc-name" className="pos-detail__title">Nombre</label>
      <input id="nc-name" className="p-inputtext w-full" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <label htmlFor="nc-type" className="pos-detail__title">Tipo de documento</label>
      <select id="nc-type" className="p-inputtext w-full" value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)}>
        {documentTypes.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <label htmlFor="nc-id" className="pos-detail__title">Número de documento</label>
      <input id="nc-id" className="p-inputtext w-full" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
      <label htmlFor="nc-phone" className="pos-detail__title">Teléfono (opcional)</label>
      <input id="nc-phone" className="p-inputtext w-full" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <label htmlFor="nc-mail" className="pos-detail__title">Correo (opcional)</label>
      <input id="nc-mail" className="p-inputtext w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
    </FormDialog>
  );
};
