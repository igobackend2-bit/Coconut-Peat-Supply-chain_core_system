import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

type TestUser = { roles?: string[]; permissions: string[] };

describe('PermissionsGuard', () => {
  function makeContext(user?: TestUser): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }
  const guardRequiring = (codes: string[] | undefined) =>
    new PermissionsGuard({ getAllAndOverride: jest.fn().mockReturnValue(codes) } as unknown as Reflector);

  it('allows the request through when no permissions are required and no user is attached', () => {
    expect(guardRequiring(undefined).canActivate(makeContext())).toBe(true);
  });

  it('allows an undeclared route for a user who holds at least one role', () => {
    expect(guardRequiring(undefined).canActivate(makeContext({ roles: ['OPERATOR'], permissions: [] }))).toBe(true);
  });

  it('denies an undeclared route for an authenticated user with no roles', () => {
    expect(() => guardRequiring(undefined).canActivate(makeContext({ roles: [], permissions: [] }))).toThrow(ForbiddenException);
  });

  it('throws Unauthorized if permissions are required but no user is attached (guard ordering bug)', () => {
    expect(() => guardRequiring(['master_data.product.write']).canActivate(makeContext(undefined))).toThrow(UnauthorizedException);
  });

  it('throws Forbidden when the user is missing a required permission', () => {
    expect(() =>
      guardRequiring(['master_data.product.write']).canActivate(makeContext({ roles: ['X'], permissions: ['master_data.product.read'] })),
    ).toThrow(ForbiddenException);
  });

  it('allows the request through when the user has all required permissions', () => {
    expect(guardRequiring(['a', 'b']).canActivate(makeContext({ roles: ['X'], permissions: ['a', 'b', 'c'] }))).toBe(true);
  });

  it('reads metadata from both the handler and the class, so a class-level declaration is enforced', () => {
    const getAllAndOverride = jest.fn().mockReturnValue(['audit.event.read']);
    const guard = new PermissionsGuard({ getAllAndOverride } as unknown as Reflector);
    const ctx = makeContext({ roles: ['X'], permissions: [] });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(getAllAndOverride).toHaveBeenCalledWith(expect.any(String), [expect.anything(), expect.anything()]);
  });
});
