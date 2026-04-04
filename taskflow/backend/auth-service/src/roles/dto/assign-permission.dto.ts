import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class AssignPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
