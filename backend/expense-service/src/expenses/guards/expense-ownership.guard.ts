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
    const businessId = businessIdFromParam || businessIdFromHeader || businessIdFromBody || tenantId || '';

    if (businessId && businessId !== tenantId) {
      const belongs = await this.businessBelongsToTenant(businessId, tenantId);
      if (!belongs) {
        throw new ForbiddenException('Business ID does not belong to tenant');
      }
    }

    let normalizedRole = role.replace(/^ROLE_/, '').toUpperCase();
    if (normalizedRole === 'OWNER') normalizedRole = 'BUSINESS_OWNER';
    if (normalizedRole === 'ADMIN') normalizedRole = 'BUSINESS_ADMIN';
    if (normalizedRole === 'TEAM') normalizedRole = 'TEAM_MEMBER';
    if (normalizedRole === 'SUPER_MANAGER') normalizedRole = 'SUPER_ADMIN';
    if (normalizedRole === 'PROJECT_MANAGER') normalizedRole = 'BUSINESS_OWNER';

    (request as any).user = {
      userId,
      role: normalizedRole,
      tenantId,
      businessId,
      requestId: this.normalizeHeader(request.headers['x-request-id'] || request.headers['X-Request-Id']) || 'n/a',
    };

    return true;
  }
}
