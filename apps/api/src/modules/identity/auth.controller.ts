import { Throttle } from '@nestjs/throttler';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { RequestUser } from './types';

// Per-IP, per minute. Env-tunable so the integration tests can run many logins.
const AUTH_LIMIT = Number(process.env.AUTH_RATE_LIMIT ?? 10);
const AUTH_THROTTLE = { default: { limit: AUTH_LIMIT, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  @AuditLog({ module: 'IDENTITY', entityType: 'user', actionType: 'CREATE', operation: 'register' })
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle(AUTH_THROTTLE)
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

  @Post('change-password')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @AuditLog({ module: 'IDENTITY', entityType: 'user', actionType: 'UPDATE', operation: 'change_password' })
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: RequestUser, @Req() req: any) {
    const token = (req.headers.authorization as string).slice('Bearer '.length);
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword, token);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}
