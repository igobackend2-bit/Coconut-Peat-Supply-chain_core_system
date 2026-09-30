import { ArgumentsHost, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthFailureAuditFilter } from './auth-failure-audit.filter';
import { DRIZZLE } from '../../db/drizzle.provider';
import { Test } from '@nestjs/testing';

describe('AuthFailureAuditFilter', () => {
  let filter: AuthFailureAuditFilter;
  let insertMock: jest.Mock;
  let valuesMock: jest.Mock;

  beforeEach(async () => {
    valuesMock = jest.fn().mockResolvedValue(undefined);
    insertMock = jest.fn().mockReturnValue({ values: valuesMock });

    const module = await Test.createTestingModule({
      providers: [AuthFailureAuditFilter, { provide: DRIZZLE, useValue: { insert: insertMock } }],
    }).compile();

    filter = module.get(AuthFailureAuditFilter);
  });

  function makeHost(request: Record<string, unknown>): { host: ArgumentsHost; jsonMock: jest.Mock; statusMock: jest.Mock } {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, method: 'POST', url: '/products', ...request }),
        getResponse: () => ({ status: statusMock }),
      }),
    } as unknown as ArgumentsHost;
    return { host, jsonMock, statusMock };
  }

  it('writes a FAILED audit row and forwards the original 401 response for an unauthenticated request', async () => {
    const exception = new UnauthorizedException('Missing bearer token');
    const { host, jsonMock, statusMock } = makeHost({});

    await filter.catch(exception, host);

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'SECURITY',
        entityType: 'access_attempt',
        actionType: 'REJECT',
        status: 'FAILED',
        actorType: 'SYSTEM',
        actorId: null,
        reason: 'Missing bearer token',
      }),
    );
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(exception.getResponse());
  });

  it('records the authenticated actor for a 403 from an authenticated-but-unauthorized user', async () => {
    const exception = new ForbiddenException('Missing required permission(s): master_data.product.write');
    const { host } = makeHost({ user: { id: 'u1', fullName: 'No Permission User' } });

    await filter.catch(exception, host);

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorType: 'USER', actorId: 'u1', actorName: 'No Permission User' }),
    );
  });
});
