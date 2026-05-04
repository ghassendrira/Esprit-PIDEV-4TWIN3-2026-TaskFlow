import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  const mockAuth = {
    signup: jest.fn(),
    signin: jest.fn(),
    googleSignin: jest.fn(),
    changePassword: jest.fn(),
    generate2faSecret: jest.fn(),
    enable2fa: jest.fn(),
  };
  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should pass credentials to signin', async () => {
    mockAuth.signin.mockResolvedValue({ token: 'jwt' });

    const result = await controller.signIn({
      email: 'user@test.com',
      password: 'secret',
      recaptchaToken: 'token',
    });

    expect(mockAuth.signin).toHaveBeenCalledWith('user@test.com', 'secret', 'token');
    expect(result).toEqual({ token: 'jwt' });
  });

  it('should pass headers and dto to changePassword', async () => {
    mockAuth.changePassword.mockResolvedValue({ token: 'new-token' });

    const result = await controller.changePassword('Bearer token', {
      currentPassword: 'old',
      newPassword: 'NewPass1!',
    });

    expect(mockAuth.changePassword).toHaveBeenCalledWith('Bearer token', {
      currentPassword: 'old',
      newPassword: 'NewPass1!',
    });
    expect(result).toEqual({ token: 'new-token' });
  });

  it('should reject generate2fa when auth header is missing', async () => {
    await expect(controller.generate2fa('')).rejects.toThrow(UnauthorizedException);
  });

  it('should verify token and call generate2fa', async () => {
    mockAuth.generate2faSecret.mockResolvedValue({ secret: 's', qrCodeDataUrl: 'qr' });

    const result = await controller.generate2fa('Bearer token');

    expect(mockJwt.verifyAsync).toHaveBeenCalled();
    expect(mockAuth.generate2faSecret).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ secret: 's', qrCodeDataUrl: 'qr' });
  });
});
