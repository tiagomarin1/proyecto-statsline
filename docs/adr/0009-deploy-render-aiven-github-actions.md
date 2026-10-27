# ADR-0009: Deploy gratis en Render + Aiven + GitHub Actions

**Estado:** Aceptada (2026-10-27). Reemplaza a ADR-0006.

## Contexto
ADR-0006 eligió Railway. Al ir a crear el proyecto, la prueba gratis ya había vencido: Railway no deja crear proyectos sin un plan pago, que arranca en unos USD 5 por mes más el uso. El equipo decidió no pagar hosting en el MVP.

Lo que hace falta sigue siendo lo mismo que en ADR-0006:
- la app publicada con un link para la demo del 9/11 y el testeo con el club piloto;
- MySQL 8;
- la sincronización diaria con API-Football (ADR-0008).

## Opciones consideradas
1. **Render (web gratis) + Aiven (MySQL gratis) + GitHub Actions (cron):**
   - Render construye el mismo `Dockerfile` y despliega con cada push a `main`;
   - Aiven da MySQL 8 real, que es el motor de ADR-0002;
   - Actions corre la sincronización con un `schedule`, gratis porque el repo es público.

   Ninguno pide tarjeta.
2. **Una VM de Oracle Cloud Always Free con `docker compose`:**
   - nunca se apaga y tiene todo junto;
   - pide tarjeta y hay que mantener el servidor a mano (actualizaciones, HTTPS, backups);
   - Oracle recortó el plan gratis en 2026.
3. **Una notebook del equipo con Tailscale o Cloudflare Tunnel:** cuesta cero, pero depende de que la notebook esté prendida. Sirve para el Demo Day, no para el testeo con el club piloto.
4. **Seguir con Railway en un plan pago:** es lo que se descartó.

## Decisión
Opción 1, con tres piezas:

| Pieza | Servicio | Configuración en el repo |
|---|---|---|
| App (FastAPI + build de React, ADR-0003) | Render, web service gratis, Docker | `render.yaml` (Blueprint) y `Dockerfile` |
| Base de datos | Aiven for MySQL, plan gratis | `DATABASE_URL` + `DATABASE_SSL_CA` |
| Sincronización diaria | GitHub Actions con `schedule` | `.github/workflows/sincronizacion.yml` |

- **Migraciones y semillas.** El plan gratis de Render no tiene comando de pre-deploy, así que `alembic upgrade head` y `python -m semillas` corren al arrancar el contenedor. Hay una sola instancia, así que no compiten entre ellas.
- **TLS obligatorio.** Aiven exige TLS. La app verifica el certificado del servidor con el CA de Aiven, que viaja en la variable `DATABASE_SSL_CA` (el contenido del PEM).
- **Además, CI.** GitHub Actions corre los tests de backend y frontend en cada PR, que en INF-001 figuraba como deseable.

## Consecuencias
+ Costo de hosting USD 0. Solo se sigue pagando API-Football.
+ El mismo `Dockerfile` sirve en local, en CI y en Render. Si más adelante hay presupuesto, se puede volver a Railway o pasar a un plan pago de Render sin tocar código.
- **Arranque lento:** Render apaga el servicio gratis después de 15 minutos sin tráfico y la primera visita tarda alrededor de un minuto. Antes de la demo y de cada prueba con usuarios, hay que abrir la página unos minutos antes.
- **Base chica:** Aiven gratis tiene 1 CPU, 1 GB de RAM y 1 GB de disco, sin SLA. Alcanza de sobra para unos 6.000 jugadores. Aiven puede apagar un servicio gratis que no se usa, pero avisa antes, y la sincronización diaria lo mantiene en uso.
- **Hay que fijar la región:** conviene usar la misma o una cercana en Render y en Aiven (por ejemplo Virginia en Render y una región del este de EE. UU. en Aiven) para que cada consulta no cruce el continente.
- **Cupo de horas:** Render da 750 horas gratis por mes por workspace. Alcanzan para un solo servicio prendido todo el mes, y el tiempo apagado no cuenta.
- **Los secretos se cargan en dos lugares:** en el panel de Render (servicio `web`) y en los secrets del repo de GitHub (cron). En un repo personal, los secrets de Actions los carga el dueño del repo.

## Al aceptarla (hecho el 2026-10-27)
- ADR-0006 pasó a "Reemplazada por ADR-0009".
- En `ENGINEERING_STANDARDS.md` §12, la fila "Deploy" pasó a decir "Funciona en Render (staging = main)" y el stack pasó a decir MySQL 8 (Aiven).
