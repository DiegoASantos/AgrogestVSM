## Modules

`src/modules` agrupa cada dominio como un modulo independiente del monolito.

Patron base recomendado para nuevos dominios:

- `application/`: casos de uso y servicios de aplicacion.
- `infrastructure/persistence/entities/`: entidades TypeORM y adaptadores de persistencia.
- `presentation/`: controladores, DTOs y guards propios del modulo cuando hagan falta.

Los dominios de negocio de Semana 5 quedan preparados como contenedores vacios.
Se incorporaran al `AppModule` solo cuando tengan una implementacion minima real.

Los dominios de Semana 6 para visitas de campo tambien pueden prepararse con el
mismo patron, sin registrarlos en Nest hasta que exista una base minima real.
