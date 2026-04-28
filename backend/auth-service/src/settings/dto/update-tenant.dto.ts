import { IsOptional, IsString } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() matricule?: string;
  @IsOptional() branding?: Record<string, any>;
}
