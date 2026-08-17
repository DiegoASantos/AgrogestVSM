export const LOSSLESS_PNG_MIME_TYPE = "application/octet-stream";
export const LOSSLESS_PNG_UTI = "public.data";

export function getLosslessPngShareOptions(label: string) {
  return {
    dialogTitle: `Compartir ${label} como imagen PNG`,
    mimeType: LOSSLESS_PNG_MIME_TYPE,
    UTI: LOSSLESS_PNG_UTI
  } as const;
}
