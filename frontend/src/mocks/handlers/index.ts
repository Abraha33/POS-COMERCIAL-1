import { adminHandlers } from './admin';
import { authHandlers } from './auth';
import { inventoryHandlers } from './inventory';
import { ledgerHandlers } from './ledger';
import { productHandlers } from './products';
import { purchaseHandlers } from './purchases';
import { readonlyHandlers } from './readonly';
import { saleHandlers } from './sales';
import { shiftHandlers } from './shifts';

export const handlers = [
  ...authHandlers,
  ...productHandlers,
  ...saleHandlers,
  ...shiftHandlers,
  ...inventoryHandlers,
  ...purchaseHandlers,
  ...ledgerHandlers,
  ...adminHandlers,
  ...readonlyHandlers,
];
