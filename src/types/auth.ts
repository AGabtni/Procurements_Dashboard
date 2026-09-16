export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  fullName: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  role: string;
  emailConfirmed: boolean;
  notificationsEnabled: boolean;
  activatedAt: string | null;
  trialDays: number;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  companyId: number | null;
  locale: string;
  commsLocale: string;
}

export interface UserDto {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  emailConfirmed: boolean;
  notificationsEnabled: boolean;
  companyId: number | null;
  companyName: string | null;
  activatedAt: string | null;
  trialDays: number;
  lastLogin: string | null;
  locale: string;
  commsLocale: string;
}

export interface SettingsDto {
  email: string;
  emailConfirmed: boolean;
  notificationsEnabled: boolean;
}

export interface UpdateSettingsRequest {
  email?: string;
  notificationsEnabled?: boolean;
}
