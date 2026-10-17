import { BadRequestException } from "@nestjs/common";

const MICRO = 1_000_000n;
const CENTS = 100n;

export type PrecioBase = "JABA" | "KILO";

function decimal(value: string | number, maxDecimals = 6): bigint {
  const source = String(value);
  if (!new RegExp(`^(?:0|[1-9]\\d{0,7})(?:\\.\\d{1,${maxDecimals}})?$`).test(source)) {
    throw new BadRequestException("Importe decimal no válido.");
  }
  const [whole, fraction = ""] = source.split(".");
  return BigInt(whole) * MICRO + BigInt(fraction.padEnd(6, "0"));
}

function rounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new BadRequestException("Divisor no válido.");
  return (numerator + denominator / 2n) / denominator;
}

function formatted(value: bigint, places: number): string {
  const divisor = 10n ** BigInt(6 - places);
  const roundedValue = rounded(value, divisor);
  const unit = 10n ** BigInt(places);
  return `${roundedValue / unit}.${String(roundedValue % unit).padStart(places, "0")}`;
}

export function calculatePaymentDetail(input: {
  jabasRecepcion: number;
  pesoNetoRecepcion: string;
  cantidadJabas: number;
  precioJaba: string;
  precioKilo: string;
  precioBase?: PrecioBase;
  porcentajePeso: string;
  tipoDescuento: string;
  montoDescuento?: string;
  detraccion: string;
}) {
  if (!Number.isInteger(input.jabasRecepcion) || input.jabasRecepcion <= 0 ||
      !Number.isInteger(input.cantidadJabas) || input.cantidadJabas <= 0) {
    throw new BadRequestException("La cantidad de jabas debe ser mayor que cero.");
  }
  const percentage = decimal(input.porcentajePeso, 2);
  if (percentage <= 0n || percentage > 100n * MICRO) {
    throw new BadRequestException("El porcentaje de peso debe ser mayor que 0 y menor o igual que 100.");
  }
  const cratePrice = decimal(input.precioJaba);
  const kiloPrice = decimal(input.precioKilo);
  const base = input.precioBase;
  if (base && ((base === "JABA" ? input.precioJaba : input.precioKilo).split(".")[1]?.length ?? 0) > 4) {
    throw new BadRequestException("El precio ingresado permite hasta cuatro decimales.");
  }
  const finalCratePrice = base === "KILO" ? kiloPrice * 20n : cratePrice;
  const finalKiloPrice = base === "JABA" ? rounded(cratePrice, 20n) : kiloPrice;
  if ((base === "JABA" && kiloPrice !== finalKiloPrice) ||
      (base === "KILO" && cratePrice !== finalCratePrice) ||
      (!base && cratePrice !== kiloPrice * 20n)) {
    throw new BadRequestException("Los precios por jaba y por kilo no coinciden.");
  }
  const discountType = input.tipoDescuento || "NO_APLICA";
  if (!["NO_APLICA", "CLP", "INSUMOS", "COMISION", "ANTICIPO"].includes(discountType)) {
    throw new BadRequestException("Tipo de descuento no válido.");
  }
  const discount = decimal(input.montoDescuento ?? "0", 2);
  if (discountType === "NO_APLICA" && discount !== 0n) {
    throw new BadRequestException("Sin descuento, el monto debe ser cero.");
  }
  if (discountType !== "NO_APLICA" && discount <= 0n) {
    throw new BadRequestException("Ingresa un monto de descuento mayor que cero.");
  }
  const withholding = decimal(input.detraccion, 2);
  const netWeight = decimal(input.pesoNetoRecepcion, 2);
  const subtotal = rounded(
    netWeight * BigInt(input.cantidadJabas) * percentage,
    BigInt(input.jabasRecepcion) * 100n * MICRO
  );
  const grossCents = rounded(subtotal * finalKiloPrice, 10_000_000_000n);
  const discountCents = discount / (MICRO / CENTS);
  const withholdingCents = withholding / (MICRO / CENTS);
  if (discountCents > grossCents || withholdingCents > grossCents - discountCents) {
    throw new BadRequestException("El descuento o la detracción supera el importe disponible.");
  }
  const maxNumeric = 99_999_999_999_999n;
  if (finalCratePrice > maxNumeric || finalKiloPrice > maxNumeric || subtotal > maxNumeric) {
    throw new BadRequestException("El valor supera la precisión permitida.");
  }
  if (grossCents > 9_999_999_999n) {
    throw new BadRequestException("El total supera la precisión permitida.");
  }
  return {
    precioJaba: formatted(finalCratePrice, 6),
    precioKilo: formatted(finalKiloPrice, 6),
    subTotal: formatted(subtotal, 6),
    tipoDescuento: discountType,
    montoDescuento: formatted(discount, 2),
    totalPostDescuento: formatted((grossCents - discountCents) * (MICRO / CENTS), 2),
    detraccion: formatted(withholding, 2),
    totalPostDetraccion: formatted((grossCents - discountCents - withholdingCents) * (MICRO / CENTS), 2)
  };
}
