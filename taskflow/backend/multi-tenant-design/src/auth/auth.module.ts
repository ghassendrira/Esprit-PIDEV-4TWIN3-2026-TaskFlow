import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersController } from '../users/users.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../entities/User.entity';
import { Company } from '../entities/Company.entity';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, Company]),
    JwtModule.register({
      secret: (process.env.JWT_SECRET as string) || 'secretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
