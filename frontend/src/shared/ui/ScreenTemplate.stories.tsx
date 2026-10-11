import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from 'primereact/button';
import { ScreenTemplate } from './ScreenTemplate';

const meta = {
  title: 'Shared/ScreenTemplate',
  component: ScreenTemplate,
} satisfies Meta<typeof ScreenTemplate>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  args: {
    title: 'Título de pantalla',
    subtitle: 'Descripción breve',
    actions: <Button label="Acción" icon="pi pi-plus" />,
    children: <p>Contenido de la pantalla</p>,
  },
};
