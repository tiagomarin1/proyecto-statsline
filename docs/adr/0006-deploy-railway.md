# ADR-0006: Deploy en Railway

**Estado:** Reemplazada por ADR-0009 (2026-10-27): la prueba gratis de Railway venció y el equipo decidió no pagar hosting.

## Contexto
La demo del 9/11 necesita la app publicada con datos reales. Hace falta hostear la app, MySQL y la sincronización periódica.

## Opciones consideradas
1. **Railway:** app, MySQL y cron en el mismo proyecto, con deploy desde GitHub.
2. **Render + MySQL externo:** Render no ofrece MySQL propio, así que serían dos proveedores.
3. **Solo local para la demo:** no queda un link para mostrar ni para el testeo con el club piloto.

## Decisión
Railway, con tres piezas:
- un servicio `web` (Dockerfile que construye React y levanta uvicorn);
- un plugin MySQL;
- un servicio cron que corre la sincronización **una vez por día** **(supuesto)**.

## Consecuencias
+ Se deploya en un paso, con variables de entorno por servicio.
- Tiene costo después del crédito de prueba. Hay que sumarlo a la tabla de costos del MVP (hoy figura "A definir").
