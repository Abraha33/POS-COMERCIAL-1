import type { ReactNode } from 'react';

type Props = { id: string; label: string; error?: string; children: ReactNode };

/** Campo de formulario con etiqueta y mensaje de error accesibles. */
export const FormField = ({ id, label, error, children }: Props) => (
  <div className="field mb-3">
    <label htmlFor={id} className="block mb-1 font-medium">{label}</label>
    {children}
    {error ? <small id={`${id}-error`} className="p-error" role="alert">{error}</small> : null}
  </div>
);
