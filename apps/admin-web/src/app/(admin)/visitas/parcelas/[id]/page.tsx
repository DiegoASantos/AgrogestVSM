import { ParcelaVisitasHistoryScreen } from "../../../../../modules/visitas/presentation/parcela-visitas-history-screen";

type ParcelaVisitasHistoryPageProps = {
  params: {
    id: string;
  };
};

export default function ParcelaVisitasHistoryPage({
  params
}: ParcelaVisitasHistoryPageProps) {
  return <ParcelaVisitasHistoryScreen parcelaId={params.id} />;
}
