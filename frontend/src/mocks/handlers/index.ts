import { authHandlers } from './auth';
import { inventoryHandlers } from './inventory';
import { productHandlers } from './products';
import { readonlyHandlers } from './readonly';
import { saleHandlers } from './sales';
import { shiftHandlers } from './shifts';

export const handlers = [
  ...authHandlers,
  ...productHandlers,
  ...saleHandlers,
  ...shiftHandlers,
  ...inventoryHandlers,
  ...readonlyHandlers,
];
