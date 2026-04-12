## Modules

Cada feature vive en `src/modules/<feature>`.

Patron sugerido para esta etapa:
- `presentation/` para pantallas y componentes propios del feature
- `repositories/` para acceso a SQLite y mapeo snake_case/camelCase
- `services/` como punto de entrada del feature para las pantallas
- `types/` para tipos propios del feature

`shared/` queda reservado para infraestructura transversal como UI base, cliente HTTP, constantes y utilidades.

Para el flujo de visitas, la idea es mantener:
- `visitas-campo` como feature principal de la visita
- `evaluaciones`, `observaciones-sanitarias`, `recomendaciones` y `productos-recomendados` como features hijas del flujo
