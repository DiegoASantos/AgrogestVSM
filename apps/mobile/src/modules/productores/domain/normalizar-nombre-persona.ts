export function prepararNombrePersona(valor: string): string {
  return valor.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-PE").replace(
    /(^|[\s'-])(\p{L})/gu,
    (_, separador: string, letra: string) => separador + letra.toLocaleUpperCase("es-PE")
  );
}

export function tieneDosApellidos(valor: string): boolean {
  const apellidos = prepararNombrePersona(valor);
  return apellidos !== "" && apellidos.split(" ").length >= 2;
}
