---
description: Revisa el diff actual con DeepSeek Reviewer sin modificar archivos.
agent: deepseek-reviewer
---

Revisa el diff actual de AgroGest VSM como reviewer independiente.

Contexto opcional del usuario:

```text
$ARGUMENTS
```

Reglas:

- No modifiques archivos.
- Revisa únicamente el diff y los documentos relacionados.
- Clasifica hallazgos en defectos comprobados, observaciones y falsos positivos.
- Cita rutas concretas.
- Prioriza datos, seguridad, sync, migraciones, contratos y rollback.
