import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../types';

/** Reads the RequestUser attached by SessionAuthGuard. Only valid behind that guard. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
