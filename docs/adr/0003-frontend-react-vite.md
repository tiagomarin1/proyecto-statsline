# ADR-0003: Frontend en React + Vite servido por FastAPI

**Estado:** Aceptada (2026-10-27)

## Contexto
El prototipo v1 está en HTML, CSS y JS vanilla (4 archivos). El MVP necesita estado de sesión, rutas y llamadas a la API. La tarjeta de Trello pedía que el backend pudiera servir el frontend.

## Opciones consideradas
1. **React + Vite + TypeScript, con el build servido por FastAPI:** un solo servicio para deployar.
2. **Next.js:** suma SSR, que no hace falta, y un segundo servidor Node.
3. **Seguir con el JS vanilla del prototipo:** rápido para arrancar, pero difícil de mantener y testear.

## Decisión
React 18 + Vite + TypeScript + React Router. En desarrollo, Vite hace proxy de `/api` a FastAPI. En producción, `npm run build` genera `frontend/dist` y FastAPI lo sirve como archivos estáticos, devolviendo `index.html` para cualquier ruta que no sea `/api`.

## Consecuencias
+ Hay un solo servicio en Railway y no hay CORS en producción (mismo origen).
+ Se portan los estilos del prototipo (`styles.css`) como base.
- Hay que reescribir la lógica de `app.js` como componentes.
