export type LoginResponse = {
  accessToken: string;
  mustChangePassword: boolean;
  platformRole: 'PLATFORM_ADMIN' | 'USER';
  activeCompanyId: string | null;
};

export type AuthState = {
  accessToken: string | null;
  mustChangePassword: boolean;
  platformRole: 'PLATFORM_ADMIN' | 'USER' | null;
  activeCompanyId: string | null;
};
