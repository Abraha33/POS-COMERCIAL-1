import { productHandlers } from './products';
import { readonlyHandlers } from './readonly';

export const handlers = [...productHandlers, ...readonlyHandlers];
