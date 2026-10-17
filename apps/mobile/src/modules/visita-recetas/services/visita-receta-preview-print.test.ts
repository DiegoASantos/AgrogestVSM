import { describe, expect, it, vi } from "vitest";

const printAsync = vi.fn().mockResolvedValue(undefined);
const printToFileAsync = vi.fn().mockResolvedValue({ uri: "file:///receta.pdf" });
vi.mock("expo-print", () => ({ printAsync, printToFileAsync }));
vi.mock("expo-sharing", () => ({ isAvailableAsync: vi.fn().mockResolvedValue(true) }));
vi.mock("./visita-recetas.service", () => ({
  visitaRecetasService: { getByVisitaId: () => null }
}));
vi.mock("../../parcelas/repositories/parcelas.repository", () => ({
  parcelasRepository: {}
}));
vi.mock("../../productores/repositories/productores.repository", () => ({
  productoresRepository: {}
}));
vi.mock("../../visitas-campo/repositories/visitas-campo.repository", () => ({
  visitasCampoRepository: {}
}));
vi.mock("../../../shared/reporting/report-config", () => ({ REPORT_IMAGE_WIDTH: 900 }));
vi.mock("./producer-recipe-mixture-plan", () => ({
  renderProducerMixturePlan: () => "",
  renderProducerRecipeRecommendations: () => ""
}));

import { visitaRecetaPdfReportService } from "./visita-receta-pdf-report.service";

describe("recipe preview and print", () => {
  it("previews a generated PDF without opening the print dialog", async () => {
    const uri = await visitaRecetaPdfReportService.preview("visit-1");
    expect(uri).toBe("file:///receta.pdf");
    expect(printToFileAsync).toHaveBeenCalledOnce();
    expect(printAsync).not.toHaveBeenCalled();
  });

  it("opens the native print dialog only from the print action", async () => {
    await visitaRecetaPdfReportService.print("visit-1");
    expect(printAsync).toHaveBeenCalledOnce();
  });
});
