import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PermissionsGuard } from './guards/permissions.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { RequestUser } from './types';
import { UsersService } from './users.service';

class SetStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE']) status!: 'ACTIVE' | 'INACTIVE';
}

@Controller()
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get('users') @RequirePermissions('identity.user.read') users() { return this.svc.listUsers(); }
  @Get('roles') @RequirePermissions('identity.user.read') roles() { return this.svc.listRoles(); }
  @Get('permissions') @RequirePermissions('identity.user.read') permissions() { return this.svc.listPermissions(); }

  @Post('users') @RequirePermissions('identity.user.manage')
  @AuditLog({ module: 'IDENTITY', entityType: 'user', actionType: 'CREATE', operation: 'admin_create_user' })
  create(@Body() dto: CreateUserDto, @CurrentUser() u: RequestUser) { return this.svc.createUser(dto, u.id); }

  @Post('users/:id/roles') @RequirePermissions('identity.user.manage')
  @AuditLog({ module: 'IDENTITY', entityType: 'user_role', actionType: 'CREATE', operation: 'assign_role' })
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignRoleDto, @CurrentUser() u: RequestUser) { return this.svc.assignRole(id, dto.roleId, u.id); }

  @Delete('users/:id/roles/:roleId') @RequirePermissions('identity.user.manage')
  @AuditLog({ module: 'IDENTITY', entityType: 'user_role', actionType: 'DELETE', operation: 'remove_role' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Param('roleId', ParseUUIDPipe) roleId: string) { return this.svc.removeRole(id, roleId); }

  @Post('users/:id/status') @RequirePermissions('identity.user.manage')
  @AuditLog({ module: 'IDENTITY', entityType: 'user', actionType: 'UPDATE', operation: 'set_status' })
  status(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto, @CurrentUser() u: RequestUser) { return this.svc.setStatus(id, dto.status, u.id); }
}
