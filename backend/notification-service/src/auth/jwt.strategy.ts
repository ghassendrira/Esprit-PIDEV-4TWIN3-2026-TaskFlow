import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const authServiceJwtSecret =
      process.env.AUTH_SERVICE_JWT_SECRET ??
      process.env.AUTH_JWT_SECRET ??
      'change-me';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Must match auth-service JWT secret (defaults to 'change-me' in local setup).
      secretOrKey: authServiceJwtSecret,
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token invalide');
    }

    // FIX 4: Normaliser les rôles en supprimant le préfixe ROLE_
    const normalizedRoles = (payload.roles || []).map((role: string) =>
      role.replace(/^ROLE_/, '').toUpperCase()
    );

    return {
      sub: payload.sub || payload.id,
      id: payload.sub || payload.id,
      email: payload.email,
      name: payload.name,
      firstName: payload.firstName,
      lastName: payload.lastName,
      roles: normalizedRoles,
      role: normalizedRoles[0] || 'USER',
      tenantId: payload.tenantId || payload.businessId,
      tenantName: payload.tenantName,
    };
  }
}
