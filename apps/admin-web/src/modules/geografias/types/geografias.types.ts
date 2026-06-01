export type DepartamentoListItem = {
  id: string;
  code: string;
  name: string;
};

export type ProvinciaListItem = {
  id: string;
  departamentoId: string;
  code: string;
  name: string;
};

export type DistritoListItem = {
  id: string;
  provinciaId: string;
  ubigeo: string;
  name: string;
  provincia: ProvinciaListItem & {
    departamento: DepartamentoListItem;
  };
};
