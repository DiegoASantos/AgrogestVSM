import { useAuthSessionContext } from "../state/auth-session-provider";

export function useAuthSession() {
  return useAuthSessionContext();
}
