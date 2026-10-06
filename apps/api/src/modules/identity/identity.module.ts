import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';

@Module({
  controllers: [AuthController, UsersController],
  providers: [AuthService, UsersService, SessionAuthGuard, PermissionsGuard],
  exports: [AuthService, SessionAuthGuard, PermissionsGuard],
})
export class IdentityModule {}
