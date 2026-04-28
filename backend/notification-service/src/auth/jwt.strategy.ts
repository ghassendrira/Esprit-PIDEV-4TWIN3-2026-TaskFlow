import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Must match auth-service JWT_SECRET (auth-service defaults to 'change-me').
      secretOrKey: process.env.JWT_SECRET ?? 'change-me',
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
      id: payload.sub || payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      roles: normalizedRoles,
      role: normalizedRoles[0] || 'USER',
      tenantId: payload.tenantId || payload.businessId,
      tenantName: payload.tenantName,
    };
  }
}
