import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    validate(payload: any): Promise<{
        id: string;
        email: string;
        role: string;
        company_id: any;
    }>;
}
export {};
