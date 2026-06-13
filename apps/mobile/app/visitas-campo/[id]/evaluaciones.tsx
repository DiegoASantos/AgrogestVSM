import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function LegacyNutricionRedirectPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!visitaId) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/visitas-campo/[id]/nutricion",
      params: { id: visitaId }
    });
  }, [router, visitaId]);

  return null;
}
