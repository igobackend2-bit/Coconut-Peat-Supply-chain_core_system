import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * Must run after SessionAuthGuard — reads request.user set by it.
 *
 * - Requires ALL permission codes declared with @RequirePermissions, read
 *   from the handler *and* the class (the handler wins), so a class-level
 *   declaration can no longer be silently ignored and leave a route open.
 * - A route that declares no permission still needs the caller to hold at
 *   least one role: an authenticated account with no roles gets nothing.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[] | undefined>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const user = context.switchToHttp().getRequest().user;

    if (!requiredPermissions || requiredPermissions.length === 0) {
      if (user && (user.roles ?? []).length === 0) {
        throw new ForbiddenException('Your account has no roles assigned. Ask an administrator to grant access.');
      }
      return true;
    }

    if (!user) {
      // SessionAuthGuard should have run first and thrown already if unauthenticated.
      throw new UnauthorizedException('Authentication required');
    }

    const missing = requiredPermissions.filter((code) => !user.permissions.includes(code));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing required permission(s): ${missing.join(', ')}`);
    }

    return true;
  }
}
