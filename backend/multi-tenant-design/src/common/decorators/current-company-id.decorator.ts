import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // In a real application, the company_id would be extracted from the JWT token
    // which is attached to the request by the Passport JWT strategy.
    return request.user?.company_id;
  },
);
