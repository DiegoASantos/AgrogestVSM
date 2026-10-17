import { useLocalSearchParams } from "expo-router";
import { VisitaComercialDetailScreen } from "../../../src/modules/visitas-comerciales/visitas-comerciales-history-screen";
export default function VisitaComercialDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VisitaComercialDetailScreen id={id} />;
}
