import { provisionDb, urlFor } from './provision';

export const MAIN_DB = 'coco_pith_factory_test';
export const BOOT_DB = 'coco_pith_factory_test_boot';

export default async function globalSetup() {
  await provisionDb(MAIN_DB, { withAdmin: true });
  await provisionDb(BOOT_DB, { withAdmin: false });
  process.env.E2E_DATABASE_URL = urlFor(MAIN_DB);
  process.env.E2E_BOOT_DATABASE_URL = urlFor(BOOT_DB);
}
