import { adminHandlers } from './admin';
import { authHandlers } from './auth';
import { inventoryHandlers } from './inventory';
import { ledgerHandlers } from './ledger';
import { posOpsHandlers } from './posops';
import { productHandlers } from './products';
import { purchaseHandlers } from './purchases';
import { readonlyHandlers } from './readonly';
import { registerHandlers } from './registers';
import { reportHandlers } from './reports';
import { saleHandlers } from './sales';
import { shiftHandlers } from './shifts';

export const handlers = [
  ...authHandlers,
  ...productHandlers,
  ...saleHandlers,
  ...shiftHandlers,
  ...registerHandlers,
  ...posOpsHandlers,
  ...inventoryHandlers,
  ...purchaseHandlers,
  ...ledgerHandlers,
  ...adminHandlers,
  ...reportHandlers,
  ...readonlyHandlers,
];
