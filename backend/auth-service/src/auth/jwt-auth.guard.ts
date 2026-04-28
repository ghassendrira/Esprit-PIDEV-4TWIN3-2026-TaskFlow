import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let authHeader = request.headers.authorization;

    this.logger.log(`Incoming request: ${request.method} ${request.url}`);
    
    if (authHeader && Array.isArray(authHeader)) {
      this.logger.warn(`Multiple Authorization headers detected! Taking first.`);
      authHeader = authHeader[0];
    } else if (authHeader && authHeader.includes(',')) {
      this.logger.warn(`Comma-separated Authorization headers detected: ${authHeader}`);
      authHeader = authHeader.split(',')[0].trim();
    }

    this.logger.log(`Authorization Header: ${authHeader ? 'Present' : 'Missing'}`);

    if (!authHeader) {
      this.logger.warn('Authorization header missing');
      throw new UnauthorizedException('Missing Authorization header');
    }

    const auth = authHeader.trim();
    const [scheme, ...tokenParts] = auth.split(/\s+/);
    const token = tokenParts.join(' ').trim();

    if (scheme?.toLowerCase() !== 'bearer') {
      this.logger.warn(`Invalid authorization scheme: ${scheme}`);
      throw new UnauthorizedException('Invalid authorization scheme');
    }

    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      this.logger.warn(`Invalid token value detected: "${token}"`);
      throw new UnauthorizedException('Invalid or missing token');
    }

    this.logger.log(`Extracted token: ${token.substring(0, 10)}...`);

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'change-me',
      });
      
      this.logger.log(`JWT Verified successfully for sub: ${payload.sub}`);
      this.logger.log(`Decoded Payload: ${JSON.stringify(payload)}`);
      
      // Normaliser les rôles : supprimer le préfixe ROLE_ et stocker le premier
      const roles = (payload.roles || []).map((r: string) => r.replace(/^ROLE_/, '').toUpperCase());
      const role = roles[0] || payload.role || 'USER';
      
      request.user = {
        ...payload,
        roles,
        role,
      };
      
      return true;
    } catch (err) {
      this.logger.error(`JWT Verification failed: ${err.message}`);
      
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Malformed JWT token');
      }
      
      throw new UnauthorizedException('Invalid token');
    }
  }
}
