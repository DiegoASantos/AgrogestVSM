export type Departamento = {
  id: string;
  code: string;
  name: string;
};

export type Provincia = {
  id: string;
  departamentoId: string;
  code: string;
  name: string;
};

export type Distrito = {
  id: string;
  provinciaId: string;
  ubigeo: string;
  name: string;
  provincia: Provincia & {
    departamento: Departamento;
  };
};
