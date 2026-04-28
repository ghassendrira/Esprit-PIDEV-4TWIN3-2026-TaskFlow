import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  isStandard?: boolean;
}
