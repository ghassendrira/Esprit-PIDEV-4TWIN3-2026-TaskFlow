import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = (request.headers['x-tenant-id'] || request.headers['X-Tenant-Id']) as string;

    if (!tenantId) {
      throw new BadRequestException('X-Tenant-Id header is required');
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new BadRequestException('Invalid X-Tenant-Id header format');
    }

    // Attach tenantId to request object for later use in services
    (request as any).tenantId = tenantId;

    return true;
  }
}
