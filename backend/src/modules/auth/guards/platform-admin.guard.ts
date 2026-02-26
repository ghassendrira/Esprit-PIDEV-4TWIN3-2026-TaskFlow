import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { platformRole?: PlatformRole } | undefined;

    if (user?.platformRole !== PlatformRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Platform admin access required');
    }

    return true;
  }
}
