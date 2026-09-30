import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

/**
 * Declares which permission codes (from the `permissions` table) a route
 * requires. Checked by PermissionsGuard, which must run after
 * SessionAuthGuard (see identity.module.ts for the intended guard
 * order). A handler without this decorator requires only
 * authentication, not any specific permission.
 */
export const RequirePermissions = (...codes: string[]) => SetMetadata(REQUIRE_PERMISSIONS_KEY, codes);
