import { Injectable, CanActivate, ExecutionContext, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ExpenseGuard implements CanActivate {

  private normalizeHeader(value: string | string[] | undefined) {
    if (!value) return '';
    const rawValue = Array.isArray(value) ? value[0] : value;
    return rawValue.split(',')[0].trim();
  }

  private async businessBelongsToTenant(businessId: string, tenantId: string) {
    const businessServiceUrl = process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003';
    const url = `${businessServiceUrl.replace(/\/$/, '')}/businesses/${encodeURIComponent(businessId)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return false;
      }

      const business = await response.json();
      return Boolean(business && String(business.tenantId).toLowerCase() === String(tenantId).toLowerCase());
    } catch (error) {
      return false;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const userId = this.normalizeHeader(request.headers['x-user-id'] || request.headers['X-User-Id']);
    const role = this.normalizeHeader(request.headers['x-user-role'] || request.headers['X-User-Role']);
    const tenantId = this.normalizeHeader(request.headers['x-tenant-id'] || request.headers['X-Tenant-Id']);

    if (!userId || !role || !tenantId) {
      throw new BadRequestException('Multi-tenant context missing (x-user-id, x-user-role, x-tenant-id)');
    }

    const businessIdFromParam = this.normalizeHeader(request.params?.businessId as string | undefined);
    const businessIdFromHeader = this.normalizeHeader(request.headers['x-business-id'] || request.headers['X-Business-Id']);
    const businessIdFromBody = this.normalizeHeader((request.body as any)?.businessId);
    const businessId = businessIdFromParam || businessIdFromHeader || businessIdFromBody || '';

    if (businessId) {
      const belongs = await this.businessBelongsToTenant(businessId, tenantId);
      if (!belongs) {
        throw new ForbiddenException('Business ID does not belong to tenant');
      }
    }

    (request as any).user = {
      userId,
      role,
      tenantId,
      businessId,
    };

    return true;
  }
}
