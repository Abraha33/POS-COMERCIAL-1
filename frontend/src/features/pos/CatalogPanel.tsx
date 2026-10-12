import type { KeyboardEvent, RefObject } from 'react';
import { Button } from 'primereact/button';
import type { Product } from '@/shared/contracts';
import { MoneyText, SegmentedTabs } from '@/shared/ui';

type Props = {
  query: string;
  onQuery: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  message: string | null;
  categories: string[];
  category: string;
  onCategory: (value: string) => void;
  results: Product[];
  /** Con búsqueda o categoría activa; si no, en escritorio la rejilla se oculta y manda la tabla de líneas. */
  filtering: boolean;
  onAdd: (product: Product) => void;
  /** Detalle bajo demanda (precios por volumen, existencias por sede). */
  onDetail: (product: Product) => void;
  stockOf: (productId: string) => number;
  availability: Availability;
  onAvailability: (value: Availability) => void;
  quick: 'todos' | 'frecuentes';
  onQuick: (value: 'todos' | 'frecuentes') => void;
  view: 'lista' | 'cuadricula';
  onView: (value: 'lista' | 'cuadricula') => void;
};

export type Availability = 'todos' | 'disponibles' | 'agotados';

const ALL = 'Todos';

/** Buscador (código de barras / texto), chips de categoría y resultados como botones de lista (F-08). */
export const CatalogPanel = ({
  query, onQuery, onKeyDown, onSearch, inputRef, message, categories, category, onCategory, results, filtering, onAdd,
  onDetail, stockOf, availability, onAvailability, quick, onQuick, view, onView,
}: Props) => (
  <section className="pos__search-area" aria-label="Buscar productos">
    <div className="pos__searchbar">
      <label htmlFor="pos-search" className="sr-only">Buscar producto o escanear código (F2)</label>
      <span className="pos__searchfield">
        <i className="pi pi-barcode" aria-hidden="true" />
        <input
          id="pos-search"
          ref={inputRef}
          className="p-inputtext pos__search"
          placeholder="Escanear código de barras o buscar producto…"
          autoFocus
          autoComplete="off"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </span>
      <Button type="button" icon="pi pi-search" aria-label="Buscar" className="pos__searchbtn" onClick={onSearch} />
    </div>
    {message ? <p className="pos__inline-note" role="status">{message}</p> : null}

    {categories.length > 1 ? (
      <div className="pos__chips">
        <SegmentedTabs
          ariaLabel="Categorías"
          variant="chips"
          value={category}
          onChange={onCategory}
          options={[ALL, ...categories].map((c) => ({ value: c, label: c }))}
        />
      </div>
    ) : null}

    <div className="pos__filters" role="group" aria-label="Filtros del catálogo">
      <SegmentedTabs<Availability>
        ariaLabel="Disponibilidad" variant="chips" value={availability} onChange={onAvailability}
        options={[
          { value: 'todos', label: 'Cualquier stock' },
          { value: 'disponibles', label: 'Disponibles' },
          { value: 'agotados', label: 'Agotados' },
        ]}
      />
      <button
        type="button" className="app-segmented__item" aria-pressed={quick === 'frecuentes'}
        onClick={() => onQuick(quick === 'frecuentes' ? 'todos' : 'frecuentes')}
      >
        <i className="pi pi-star" aria-hidden="true" /> Frecuentes
      </button>
      <span className="pos__view" role="group" aria-label="Vista del catálogo">
        <button type="button" className="app-segmented__item" aria-pressed={view === 'lista'} aria-label="Vista de lista" onClick={() => onView('lista')}>
          <i className="pi pi-list" aria-hidden="true" />
        </button>
        <button type="button" className="app-segmented__item" aria-pressed={view === 'cuadricula'} aria-label="Vista de cuadrícula" onClick={() => onView('cuadricula')}>
          <i className="pi pi-th-large" aria-hidden="true" />
        </button>
      </span>
    </div>
    <div className={`pos__results${filtering ? '' : ' pos__results--idle'}`}>
      {results.length > 0 ? (
        <ul className={`pos__products${view === 'cuadricula' ? ' pos__products--grid' : ''}`} aria-label="Resultados">
          {results.map((product) => (
            <li key={product.id} className="pos__product-row">
              <button type="button" className="pos__product" onClick={() => onAdd(product)}>
                <span className="pos__thumb" aria-hidden="true"><i className="pi pi-box" /></span>
                <span className="pos__name">
                  <strong>{product.name}</strong>
                  <span className="pos__hint">{product.sku}</span>
                </span>
                <span className="pos__product-price">
                  <MoneyText value={product.price} />
                  {stockOf(product.id) <= 0 ? <span className="pos__soldout">Agotado</span> : null}
                </span>
                <span className="pos__product-add" aria-hidden="true"><i className="pi pi-plus" /></span>
              </button>
              <Button
                type="button" icon="pi pi-info-circle" text rounded className="pos__product-info"
                aria-label={`Ver detalle de ${product.name}`} onClick={() => onDetail(product)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="pos__hint" role="status">
          {query.trim() ? `Sin resultados para “${query}”.` : 'No hay productos en esta categoría.'}
        </p>
      )}
    </div>
  </section>
);

export const ALL_CATEGORIES = ALL;
