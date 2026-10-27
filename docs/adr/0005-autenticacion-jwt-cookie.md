# ADR-0005: Autenticación con JWT en cookie httpOnly y hash Argon2

**Estado:** Aceptada (2026-10-27)

## Contexto
Las historias "Registrarse" e "Iniciar sesión" son del MVP. El login con Google y la recuperación de contraseña son R2.

## Opciones consideradas
1. **JWT firmado en una cookie `httpOnly`, `Secure` y `SameSite=Lax`:** el JS de la página no puede leer el token, y como la app es del mismo origen (ADR-0003) no hace falta CORS.
2. **JWT en `localStorage` con header `Authorization`:** más simple, pero queda expuesto a XSS.
3. **Sesiones en base de datos:** suma una tabla y más consultas.

## Decisión
Opción 1. La cookie se llama `sesion`, dura **8 horas** **(supuesto)** y no hay refresh token en el MVP. Las contraseñas se guardan con Argon2 usando `pwdlib`. `SECRET_KEY` sale de una variable de entorno.

## Consecuencias
+ Es seguro por defecto y fácil de testear con TestClient.
- Cuando vence la cookie hay que volver a iniciar sesión. Alcanza para el MVP.
