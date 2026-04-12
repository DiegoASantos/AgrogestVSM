import { ProductorSectoresManagementScreen } from "../../../../../modules/productores/presentation/productor-sectores-management-screen";

type ProductorSectoresPageProps = {
  params: {
    id: string;
  };
};

export default function ProductorSectoresPage({
  params
}: ProductorSectoresPageProps) {
  return <ProductorSectoresManagementScreen productorId={params.id} />;
}
