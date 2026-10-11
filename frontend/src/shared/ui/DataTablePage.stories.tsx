import type { Meta, StoryObj } from '@storybook/react-vite';
import { products } from '@/mocks/seed';
import type { Product } from '@/shared/contracts';
import { DataTablePage } from './DataTablePage';

const columns = [
  { field: 'sku', header: 'SKU' },
  { field: 'name', header: 'Nombre' },
  { field: 'category', header: 'Categoría' },
];

const meta = {
  title: 'Shared/DataTablePage',
  component: DataTablePage<Product>,
  args: { title: 'Productos', columns, rows: products, isLoading: false, error: null },
} satisfies Meta<typeof DataTablePage<Product>>;
export default meta;

type Story = StoryObj<typeof meta>;
export const Con_datos: Story = {};
export const Cargando: Story = { args: { isLoading: true } };
export const Vacio: Story = { args: { rows: [] } };
export const Con_error: Story = { args: { error: new Error('Sin conexión') } };
