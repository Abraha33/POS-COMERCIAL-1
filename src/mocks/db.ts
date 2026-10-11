import { createSeed, type MockDb } from './seed';

/** Base en memoria de los mocks. Los handlers de cada feature la leen y mutan. */
export let db: MockDb = createSeed();

export const resetDb = () => {
  db = createSeed();
};
