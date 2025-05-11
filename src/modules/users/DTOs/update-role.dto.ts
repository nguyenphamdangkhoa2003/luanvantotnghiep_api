// src/modules/users/dto/update-role.dto.ts
import { IsEnum } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class UpdateRoleDto {
  @IsEnum(UserRole, { message: 'Invalid role' })
  role: UserRole;
}