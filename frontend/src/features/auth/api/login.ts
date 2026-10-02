import { ApiError, apiFetch } from "@/lib/api/client";
const LOGIN_ENDPOINT = "/api/login";

export interface LoginFormData {
  password: string;
  email: string;
}

export interface LoginResponse {
  success: boolean;
  jwtToken: string | null;
}

export interface AuthenticationState {
  isAuthenticated: boolean;
  message: string;
}

export async function login(authData: LoginFormData): Promise<AuthenticationState> {
  try {
    const response = await apiFetch<LoginResponse>(LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authData),
    });
    if (response.success && response.jwtToken) {
      return { isAuthenticated: true, message: "Login successful" };
    }else{
      return { isAuthenticated: false, message: "Invalid JWT token" };
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return { isAuthenticated: false, message: "Invalid credentials. Please check your email and password and try again." };
      }
      return {
        isAuthenticated: false,
        message: `Login failed with status ${error.status}`,
      };
    }
    throw error;
  }
}
