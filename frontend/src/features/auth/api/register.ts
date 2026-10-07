import { apiFetch } from "@/lib/api/client";

const REGISTER_ENDPOINT = "/api/auth/register";

export interface RegistrationFormData {
  display_name: string;
  email: string;
  password: string;
}

export interface RegistrationResponse {
  success: boolean;
}

export async function registerUser(
  registrationData: RegistrationFormData,
): Promise<RegistrationResponse> {
  return apiFetch<RegistrationResponse>(REGISTER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registrationData),
  });
}
