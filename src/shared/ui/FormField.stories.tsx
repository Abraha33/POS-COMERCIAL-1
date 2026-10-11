import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputText } from 'primereact/inputtext';
import { FormField } from './FormField';

const meta = {
  title: 'Shared/FormField',
  component: FormField,
} satisfies Meta<typeof FormField>;
export default meta;

export const Normal: StoryObj<typeof meta> = {
  args: { id: 'nombre', label: 'Nombre', children: <InputText id="nombre" /> },
};

export const Con_error: StoryObj<typeof meta> = {
  args: { id: 'nombre', label: 'Nombre', error: 'Campo obligatorio', children: <InputText id="nombre" /> },
};
