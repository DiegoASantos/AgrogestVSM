import { apiRequest, type ApiRequestContext } from "../../../shared/services/api/client";

type UploadResponse = { id: string; publicId: string; createdAt: string };

export function subirFotoComercial(
  productorServerId: string,
  photoPublicId: string,
  uri: string,
  context: ApiRequestContext = {}
) {
  const form = new FormData();
  form.append("file", { uri, name: "foto.jpg", type: "image/jpeg" } as unknown as Blob);
  return apiRequest<UploadResponse>(
    `/comercial/productores/${productorServerId}/fotos`,
    {
      method: "POST",
      body: form,
      headers: { "X-Photo-Id": photoPublicId },
      timeoutMs: 90_000,
      ...context
    }
  );
}
