import { useConnectivity } from "./use-connectivity";

export function useIsOnline() {
  const { isOnline } = useConnectivity();
  return { isOnline };
}
