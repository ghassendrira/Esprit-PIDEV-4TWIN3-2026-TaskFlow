import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class TenantGuard implements CanActivate {
  private normalize(value: string | string[] | undefined): string {
    if (!value) return '';
    const raw = Array.isArray(value) ? value[0] : value;
    return String(raw).split(',')[0].trim();
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = this.normalize(
      (request.headers['x-tenant-id'] || request.headers['X-Tenant-Id']) as string,
    );
    const businessId =
      this.normalize((request.headers['x-business-id'] || request.headers['X-Business-Id']) as string) ||
      this.normalize((request.body as any)?.businessId) ||
      this.normalize(request.params?.businessId as string | undefined) ||
      tenantId;

    if (!tenantId) {
      throw new BadRequestException('X-Tenant-Id header is required');
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new BadRequestException('Invalid X-Tenant-Id header format');
    }

    if (businessId && !uuidRegex.test(businessId)) {
      throw new BadRequestException('Invalid X-Business-Id header format');
    }

    // Attach tenantId to request object for later use in services
    (request as any).tenantId = tenantId;
    (request as any).businessId = businessId;
    (request as any).requestId = this.normalize(
      (request.headers['x-request-id'] || request.headers['X-Request-Id']) as string,
    );

    return true;
  }
}
