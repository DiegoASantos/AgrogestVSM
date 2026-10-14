type DetailValues = {
  cantidadJabas: string;
  porcentajePeso: string;
  precioKilo: string;
  tipoDescuento?: string;
  montoDescuento?: string;
  detraccion: string;
};
type ReceptionValues = { jabas: string; pesoNeto: string };

const micro = (value: string | null | undefined): bigint | null => {
  if (!value || !/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
};
const round = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator / 2n) / denominator;
const showMicro = (value: bigint, places = 6) => {
  const scaled = round(value, 10n ** BigInt(6 - places));
  const base = 10n ** BigInt(places);
  return `${scaled / base}.${String(scaled % base).padStart(places, "0")}`;
};

export function derivedPrice(value: string, base: "JABA" | "KILO") {
  const parsed = micro(value);
  if (parsed === null) return "";
  const result = base === "JABA" ? round(parsed, 20n) : parsed * 20n;
  return showMicro(result).replace(/0+$/, "").replace(/\.$/, "");
}

export function calculatedAmounts(form: DetailValues, header: ReceptionValues) {
  const receivedCrates = Number(header.jabas);
  const crates = Number(form.cantidadJabas);
  const weight = micro(header.pesoNeto);
  const percentage = micro(form.porcentajePeso);
  const kiloPrice = micro(form.precioKilo);
  const discount = micro(form.tipoDescuento === "NO_APLICA" ? "0" : form.montoDescuento);
  const withholding = micro(form.detraccion);
  if (!Number.isInteger(receivedCrates) || receivedCrates <= 0 ||
      !Number.isInteger(crates) || crates < 0 || weight === null ||
      percentage === null || kiloPrice === null || discount === null ||
      withholding === null) {
    return { subTotal: "", totalPostDescuento: "", totalPostDetraccion: "" };
  }
  const subtotal = round(weight * BigInt(crates) * percentage,
    BigInt(receivedCrates) * 100_000_000n);
  const grossCents = round(subtotal * kiloPrice, 10_000_000_000n);
  const afterDiscountCents = grossCents - discount / 10_000n;
  const afterWithholdingCents = afterDiscountCents - withholding / 10_000n;
  const money = (cents: bigint) => cents < 0n
    ? `-${showMicro(-cents * 10_000n, 2)}`
    : showMicro(cents * 10_000n, 2);
  return {
    subTotal: showMicro(subtotal),
    totalPostDescuento: money(afterDiscountCents),
    totalPostDetraccion: money(afterWithholdingCents)
  };
}
