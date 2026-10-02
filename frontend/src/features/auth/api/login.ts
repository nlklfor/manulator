import { ApiError, apiFetch } from "@/lib/api/client";
import { setAuthToken } from "@/lib/auth/session";

const LOGIN_ENDPOINT = "/api/auth/";

export interface LoginFormData {
  password: string;
  username: string;
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
    const body = new URLSearchParams();
    body.append("username", authData.username);
    body.append("password", authData.password);

    const response = await apiFetch<LoginResponse>(LOGIN_ENDPOINT, {
      method: "POST",
      body,
    });
    if (response.success && response.jwtToken) {
      setAuthToken(response.jwtToken);
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
