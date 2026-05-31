import { Redirect } from "expo-router";

import { useAuthSession } from "../src/modules/auth/hooks/use-auth-session";

export default function IndexRoute() {
  const { isAuthenticated } = useAuthSession();

  return <Redirect href={isAuthenticated ? "/home" : "/login"} />;
}
