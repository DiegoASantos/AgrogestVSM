import { ParcelaGeodatosScreen } from "../../../../../../modules/parcelas/presentation/parcela-geodatos-screen";

type ParcelaGeodatosPageProps = {
  params: {
    id: string;
  };
};

export default function ParcelaGeodatosPage({ params }: ParcelaGeodatosPageProps) {
  return <ParcelaGeodatosScreen parcelaId={params.id} />;
}
