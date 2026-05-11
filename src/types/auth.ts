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
