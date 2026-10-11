import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

/** Plantilla base de pantalla: encabezado + acciones + contenido. */
export const ScreenTemplate = ({ title, subtitle, actions, children }: Props) => (
  <section aria-labelledby="screen-title">
    <div className="flex align-items-start justify-content-between gap-3 mb-3">
      <div>
        <h1 id="screen-title" className="text-2xl m-0">{title}</h1>
        {subtitle ? <p className="m-0 mt-1 text-color-secondary">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
    {children}
  </section>
);
