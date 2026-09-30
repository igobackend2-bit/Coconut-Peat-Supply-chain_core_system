import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { SessionAuthGuard } from './session-auth.guard';

describe('SessionAuthGuard', () => {
  function makeContext(headers: Record<string, string> = {}): ExecutionContext {
    const request: any = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('rejects a request with no Authorization header', async () => {
    const authService = { authenticate: jest.fn() } as unknown as AuthService;
    const guard = new SessionAuthGuard(authService);

    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
    expect(authService.authenticate).not.toHaveBeenCalled();
  });

  it('rejects a token that AuthService cannot authenticate', async () => {
    const authService = { authenticate: jest.fn().mockResolvedValue(null) } as unknown as AuthService;
    const guard = new SessionAuthGuard(authService);

    await expect(guard.canActivate(makeContext({ authorization: 'Bearer bad-token' }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the authenticated user to the request and allows the request through', async () => {
    const user = { id: 'u1', email: 'a@b.com', fullName: 'A B', roles: [], permissions: [] };
    const authService = { authenticate: jest.fn().mockResolvedValue(user) } as unknown as AuthService;
    const guard = new SessionAuthGuard(authService);
    const context = makeContext({ authorization: 'Bearer good-token' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(authService.authenticate).toHaveBeenCalledWith('good-token');
    expect((context.switchToHttp().getRequest() as any).user).toBe(user);
  });
});
