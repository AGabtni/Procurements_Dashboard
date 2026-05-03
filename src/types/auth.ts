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
}

export interface UserDto {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}
