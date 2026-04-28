import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (process.env.JWT_SECRET as string) || 'secretKey',
    });
  }

  async validate(payload: any) {
    // This payload contains sub (userId), role, and current_company_id
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    
    if (!user) {
      throw new UnauthorizedException();
    }

    // Attach the company_id from the JWT payload to the request.user object
    // This is crucial for multi-tenancy as it represents the current active context.
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: payload.company_id, // Context extracted from token
    };
  }
}
