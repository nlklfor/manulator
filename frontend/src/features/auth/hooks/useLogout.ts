import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/api/logout";
import { clearAuthToken, storeLogoutMessage } from "@/lib/auth/session";

export function useLogout() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    // Prevent multiple logout requests from being sent if the user clicks the logout button multiple times
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    // call the logout API endpoint to finish the session on the server
    const logoutResponse = await logout();

    if (logoutResponse.success) {
      // Clear the current session
      clearAuthToken();
      // Save the message so it can be reused in the auth page
      storeLogoutMessage(logoutResponse.message);
      // navigate to the auth page and refresh the page to clear any cached data
      router.replace("/auth");
      router.refresh();
      return;
    }

    // Show the message if the logout attempt failed
    setMessage(logoutResponse.message);
    setIsLoggingOut(false);
  }

  // Stable reference, so the Toast timer is not restarted on every render
  const clearMessage = useCallback(() => setMessage(null), []);

  return { message, isLoggingOut, handleLogout, clearMessage };
}
