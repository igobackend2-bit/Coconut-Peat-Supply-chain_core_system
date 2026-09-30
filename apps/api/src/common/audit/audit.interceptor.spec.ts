import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { lastValueFrom, of, throwError } from 'rxjs';
import { DRIZZLE } from '../../db/drizzle.provider';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflector: Reflector;
  let insertMock: jest.Mock;
  let valuesMock: jest.Mock;

  beforeEach(async () => {
    valuesMock = jest.fn().mockResolvedValue(undefined);
    insertMock = jest.fn().mockReturnValue({ values: valuesMock });

    const module = await Test.createTestingModule({
      providers: [AuditInterceptor, Reflector, { provide: DRIZZLE, useValue: { insert: insertMock } }],
    }).compile();

    interceptor = module.get(AuditInterceptor);
    reflector = module.get(Reflector);
  });

  function makeContext(request: Record<string, unknown> = {}): ExecutionContext {
    return {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          method: 'POST',
          url: '/audit-demo/ping',
          params: {},
          ...request,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('passes through untouched when no @AuditLog metadata is present', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    const handler: CallHandler = { handle: () => of({ ok: true }) };

    const result = await lastValueFrom(interceptor.intercept(makeContext(), handler) as any);

    expect(result).toEqual({ ok: true });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('writes a COMPLETED audit event on success', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue({ module: 'DEMO', entityType: 'ping', actionType: 'CREATE' });
    const handler: CallHandler = { handle: () => of({ id: 'abc-123' }) };

    const result = await lastValueFrom(interceptor.intercept(makeContext(), handler) as any);

    expect(result).toEqual({ id: 'abc-123' });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'COMPLETED',
        module: 'DEMO',
        entityType: 'ping',
        actionType: 'CREATE',
        actorType: 'SYSTEM',
        entityId: 'abc-123',
      }),
    );
  });

  it('writes a FAILED audit event with the error reason and rethrows', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue({ module: 'DEMO', entityType: 'ping', actionType: 'CREATE' });
    const error = new Error('boom');
    const handler: CallHandler = { handle: () => throwError(() => error) };

    await expect(
      lastValueFrom(interceptor.intercept(makeContext(), handler) as any),
    ).rejects.toThrow('boom');

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED', reason: 'boom' }),
    );
  });

  it('redacts declared response fields before writing after_state', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue({
      module: 'IDENTITY',
      entityType: 'user_session',
      actionType: 'LOGIN',
      redactResponseFields: ['token'],
    });
    const handler: CallHandler = {
      handle: () => of({ token: 'super-secret-raw-token', expiresAt: '2026-01-01' }),
    };

    await lastValueFrom(interceptor.intercept(makeContext(), handler) as any);

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        afterState: { token: '[REDACTED]', expiresAt: '2026-01-01' },
      }),
    );
  });

  it('propagates request_id/correlation_id from headers instead of generating new ones', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue({ module: 'DEMO', entityType: 'ping', actionType: 'CREATE' });
    const handler: CallHandler = { handle: () => of({}) };
    const requestId = '11111111-1111-1111-1111-111111111111';
    const correlationId = '22222222-2222-2222-2222-222222222222';

    await lastValueFrom(
      interceptor.intercept(
        makeContext({ headers: { 'x-request-id': requestId, 'x-correlation-id': correlationId } }),
        handler,
      ) as any,
    );

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ requestId, correlationId }),
    );
  });
});
