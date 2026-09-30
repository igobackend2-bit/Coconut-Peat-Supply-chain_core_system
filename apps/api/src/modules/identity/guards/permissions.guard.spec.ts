import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  function makeContext(user?: { permissions: string[] }): ExecutionContext {
    return {
      getHandler: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('allows the request through when no permissions are required', () => {
    const reflector = { get: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('throws Unauthorized if permissions are required but no user is attached (guard ordering bug)', () => {
    const reflector = { get: jest.fn().mockReturnValue(['master_data.product.write']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(UnauthorizedException);
  });

  it('throws Forbidden when the user is missing a required permission', () => {
    const reflector = { get: jest.fn().mockReturnValue(['master_data.product.write']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() => guard.canActivate(makeContext({ permissions: ['master_data.product.read'] }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows the request through when the user has all required permissions', () => {
    const reflector = { get: jest.fn().mockReturnValue(['a', 'b']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(makeContext({ permissions: ['a', 'b', 'c'] }))).toBe(true);
  });
});
