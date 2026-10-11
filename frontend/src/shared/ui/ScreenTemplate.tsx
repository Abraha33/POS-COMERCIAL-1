import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

/** Plantilla base de pantalla: encabezado + acciones + contenido. */
export const ScreenTemplate = ({ title, subtitle, actions, children }: Props) => (
  <section aria-labelledby="screen-title">
    <PageHeader title={title} subtitle={subtitle} actions={actions} />
    {children}
  </section>
);
