# Checklist de seguridad

- Secrets JWT separados y robustos; access corto y refresh rotado.
- Refresh hasheado, revocable y con detección de reutilización.
- Guard global, excepciones públicas y roles API correctos.
- Sin acceso horizontal por IDs.
- DTOs, tamaños, enums y rate limits adecuados.
- Errores sin enumeración ni internals.
- CORS exacto, proxy consciente y TLS según proveedor.
- Logs, Git, backups, IA y MCP sin secretos ni PII.
