## Modules

Cada modulo mantiene su propia UI y, cuando haga falta, sus servicios y tipos.

Convencion base:
- `presentation/` para pantallas y componentes del modulo
- `services/` para consumo de API del modulo
- `types/` para contratos locales del modulo

La idea es crecer por features sin agregar capas innecesarias.
