# PROMPT_CERRAR_PRS.md

Prompt para pegar en la sesión de Claude Code de Santi. Armado el 27/11/2026. Todo lo que sigue a la línea de abajo es el prompt.

---

Sos el Claude Code de Santi en el repo tiagomarin1/proyecto-statsline (StatsLine, Equipo 04, UADE). Leé primero CLAUDE.md y respetalo: todo en español, commits "<ID>: <qué hace>", y no se cambia sin aprobación explícita el modelo canónico, ENGINEERING_STANDARDS.md, las migraciones ya aplicadas ni las ADR aceptadas.

Tiago abrió dos PR de frontend contra main. Tu trabajo es revisarlos, mergearlos y cerrar lo que queda. Hacelo en este orden.

## 1. Revisar y mergear los dos PR

- **#46, UI-004:** página pública /terminos con los términos y condiciones, link a los términos desde el registro (abre en otra pestaña) y, en el pie de todas las páginas, "Términos" y "Escribinos por WhatsApp". El número vive en frontend/src/utilidades/contacto.ts. Agrega la spec docs/specs/interfaz/UI-004.md y la fila de UI-004 en el catálogo.
- **#47, JUG-001 y CMP-001:** la interfaz deja de mostrar la temporada de los datos (ficha, comparador y panel de detalle de Buscar). La API sigue devolviendo `temporada` y la trayectoria no se toca. Actualiza JUG-001.md, CMP-001.md y RN-027.

Para cada uno:
- Leé el diff completo y confirmá que no toca backend, modelo, migraciones, ADR ni CHANGELOG.md.
- Verificá el número de WhatsApp de contacto.ts (+54 9 11 2497-9777) con Santi antes de mergear #46, porque queda publicado.
- Corré en frontend/: `npm ci`, `npm test`, `npm run lint`, `npx prettier --check .` y `npm run build`.
- Mergealos solo con el CI en verde. Si el job e2e existe y falla, revisá si es por el cambio (por ejemplo un texto de temporada que el test esperaba) antes de tocar nada.
- Si el segundo PR queda con conflicto en App.tsx u otro archivo, resolvelo dejando lo de las dos ramas.

## 2. Cerrar UI-004 en la documentación

Después de mergear #46:
- En docs/CATALOGO_DE_FEATURES.md, pasá UI-004 de "en testing" a "hecho".
- Sumá una línea en docs/CHANGELOG.md (con la fecha de hoy) que cuente: página de términos y condiciones, link desde el registro, y pie con "Términos" y WhatsApp. Anotá también que la interfaz dejó de mostrar la temporada (JUG-001 y CMP-001).
- Un solo commit: "UI-004: pasa la feature a hecho y actualiza el changelog".

## 3. Lo que queda del MVP

- **INF-003** sigue "en testing": falta crear el monitor en UptimeRobot para que la app de Render no se duerma. Eso lo hace una persona con acceso a la cuenta; recordáselo a Santi y, cuando esté creado, pasá la feature a hecho.
- **Render:** abrí https://statsline-4dyy.onrender.com/api/v1/salud y confirmá que responde ok con la base. Si no responde en 2 minutos, mirá los Logs y Events del servicio statsline en el panel de Render antes de proponer un arreglo. Reiniciar, redesplegar o cambiar variables de producción lo decide una persona del equipo.
- **Fuera del MVP (R2), no hacer ahora:** Score, múltiples perfiles, jugadores similares, exportar PDF, compartir la lista, ingreso con Google y montos en pesos.

## Al terminar

Contame qué quedó mergeado, qué quedó pendiente y qué tiene que hacer una persona (monitor de UptimeRobot, confirmar el número de WhatsApp, revisar Render). Si algo depende de una decisión que no está escrita, frená y preguntá.
