import { Test, TestingModule } from '@nestjs/testing';
import { AuthProxyController } from './auth.proxy.controller';
import { Request, Response } from 'express';

describe('AuthProxyController', () => {
  let controller: AuthProxyController;

  beforeAll(() => {
    global.fetch = jest.fn();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthProxyController],
    }).compile();

    controller = module.get<AuthProxyController>(AuthProxyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should proxy signup', async () => {
    const mockReq = { headers: { authorization: 'Bearer token' } } as any as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any as Response;

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 201,
      headers: new Map([['content-type', 'application/json']]),
      text: jest.fn().mockResolvedValue('{"success":true}'),
    });

    await controller.signup({ email: 'test@test.com' }, mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.send).toHaveBeenCalledWith('{"success":true}');
  });

  it('should handle signup error', async () => {
    const mockReq = { headers: {} } as any as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any as Response;

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Downstream error'));

    await controller.signup({}, mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(502);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Upstream auth-service error' }));
  });

  it('should proxy signin', async () => {
    const mockReq = { headers: {} } as any as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as any as Response;

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: jest.fn().mockResolvedValue('{"token":"jwt"}'),
    });

    await controller.signin({ email: 'test@test.com', password: 'pass' }, mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith('{"token":"jwt"}');
  });
});
