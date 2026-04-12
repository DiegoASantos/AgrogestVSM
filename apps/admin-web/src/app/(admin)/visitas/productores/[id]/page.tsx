import { ProductorVisitasHistoryScreen } from "../../../../../modules/visitas/presentation/productor-visitas-history-screen";

type ProductorVisitasHistoryPageProps = {
  params: {
    id: string;
  };
};

export default function ProductorVisitasHistoryPage({
  params
}: ProductorVisitasHistoryPageProps) {
  return <ProductorVisitasHistoryScreen productorId={params.id} />;
}
