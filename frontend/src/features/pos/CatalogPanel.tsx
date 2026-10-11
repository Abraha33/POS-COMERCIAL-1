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
};

const ALL = 'Todos';

/** Buscador (código de barras / texto), chips de categoría y resultados como botones de lista (F-08). */
export const CatalogPanel = ({
  query, onQuery, onKeyDown, onSearch, inputRef, message, categories, category, onCategory, results, filtering, onAdd,
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

    <div className={`pos__results${filtering ? '' : ' pos__results--idle'}`}>
      {results.length > 0 ? (
        <ul className="pos__products" aria-label="Resultados">
          {results.map((product) => (
            <li key={product.id}>
              <button type="button" className="pos__product" onClick={() => onAdd(product)}>
                <span className="pos__thumb" aria-hidden="true"><i className="pi pi-box" /></span>
                <span className="pos__name">
                  <strong>{product.name}</strong>
                  <span className="pos__hint">{product.sku}</span>
                </span>
                <span className="pos__product-price"><MoneyText value={product.price} /></span>
                <span className="pos__product-add" aria-hidden="true"><i className="pi pi-plus" /></span>
              </button>
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
