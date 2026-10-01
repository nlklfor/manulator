import { ApiError, apiFetch } from "@/lib/api/client";
const LOGIN_ENDPOINT = "/api/login";

export interface LoginFormData {
  password: string;
  email: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  jwtToken: string | null;
}

export async function login(authData: LoginFormData): Promise<LoginResponse> {
  try {
    const response =  await apiFetch<LoginResponse>(LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authData),
    });
    if (response.success){
      // handle token storage or any other logic here if needed
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return { success: false, message: "Invalid credentials", jwtToken: null };
      }
      return {
        success: false,
        message: `Login failed with status ${error.status}`,
        jwtToken: null,
      };
    }
    throw error;
  }
}
