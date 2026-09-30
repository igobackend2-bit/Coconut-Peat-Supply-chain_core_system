import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { RequestUser } from './types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @AuditLog({ module: 'IDENTITY', entityType: 'user', actionType: 'CREATE', operation: 'register' })
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuditLog({
    module: 'IDENTITY',
    entityType: 'user_session',
    actionType: 'LOGIN',
    operation: 'login',
    // The response carries the raw session token — must never land in
    // audit_events.after_state, only its hash belongs in user_sessions.
    redactResponseFields: ['token'],
  })
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const user = await this.authService.validateCredentials(dto);
    const session = await this.authService.createSession(user.id, req.headers?.['user-agent'] ?? null);
    return { token: session.token, expiresAt: session.expiresAt };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @AuditLog({ module: 'IDENTITY', entityType: 'user_session', actionType: 'LOGOUT', operation: 'logout' })
  async logout(@Req() req: any) {
    const token = (req.headers.authorization as string).slice('Bearer '.length);
    await this.authService.revokeSession(token);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}
