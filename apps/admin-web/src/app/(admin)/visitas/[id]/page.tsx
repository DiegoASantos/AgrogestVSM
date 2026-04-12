import { VisitaDetailScreen } from "../../../../modules/visitas/presentation/visita-detail-screen";

type VisitaDetailPageProps = {
  params: {
    id: string;
  };
};

export default function VisitaDetailPage({ params }: VisitaDetailPageProps) {
  return <VisitaDetailScreen visitaId={params.id} />;
}
