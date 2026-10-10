import { ApiError, apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const LOGOUT_ENDPOINT = "/api/auth/logout";

interface LogoutResponse {
  success: boolean;
  message: string;
}

export async function logout(): Promise<LogoutResponse> {
  const token = getAuthToken();
  if (!token) {
    return { success: false, message: "No auth token found" };
  }
  try {
    const response = await apiFetch<LogoutResponse>(LOGOUT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    if (response.success) {
      return { success: true, message: "Successfully logged out" };
    } else {
      return { success: false, message: "Logout failed" };
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: `Logout failed with status '${error.status}'` };
    }
    return { success: false, message: "An error occurred during logout" };
  }
}
