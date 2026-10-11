import type { ReactNode } from 'react';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Botones de acción primaria/secundaria, alineados a la derecha (se apilan en móvil). */
  actions?: ReactNode;
  /** id del h1; `ScreenTemplate` usa `screen-title` para `aria-labelledby`. */
  titleId?: string;
};

/** Encabezado de pantalla: título (h1), subtítulo y acciones. */
export const PageHeader = ({ title, subtitle, actions, titleId = 'screen-title' }: PageHeaderProps) => (
  <header className="app-page-header">
    <div className="app-page-header__text">
      <h1 id={titleId} className="app-page-header__title">{title}</h1>
      {subtitle ? <p className="app-page-header__subtitle">{subtitle}</p> : null}
    </div>
    {actions ? <div className="app-page-header__actions">{actions}</div> : null}
  </header>
);
