# GLOSARIO.md — lenguaje ubicuo

Todo el código está en español. El **nombre en código** es el único que se usa en tablas, columnas, clases, funciones, endpoints y tests. Si necesitás un término nuevo, agregalo acá en el mismo commit.

Convenciones:

- **Python:** `snake_case` para variables y funciones, `PascalCase` para clases. Ejemplos: `Jugador`, `EstadisticaTemporada`.
- **Tablas:** nombre en singular y `snake_case`. Ejemplo: `estadistica_temporada`.
- **TypeScript/React:** `camelCase` para variables y `PascalCase` para componentes. Ejemplo: `FichaJugador`.
- **Sin tildes ni ñ en identificadores:** `contrasena`, `tamano`, `anio`. En los textos de la UI sí van tildes y ñ.

| Término | Nombre en código | Definición | No usar | Entidad |
|---|---|---|---|---|
| Nombre completo | `nombre_completo` | Nombre de pila y apellido del jugador, o lo que haya de ellos, o el `nombre` de la fuente si faltan los dos (RN-038, JUG-004). Es lo que muestra la interfaz | nombre largo, full_name | campo calculado de la respuesta |
| Jugador | `jugador` | Futbolista que existe en la base, sincronizado desde API-Football | player, candidate, atleta, prospecto | `Jugador` |
| Candidato | (solo UI) | Cómo se llama al jugador en la pantalla de resultados. En el código siempre es `jugador` | candidato en el código | — |
| Liga | `liga` | Competición de API-Football que cubre el MVP | league, torneo, competencia | `Liga` |
| Temporada | `temporada` | Año de la temporada en API-Football (en Argentina coincide con el año calendario). Es un entero | season, anio | campo |
| Equipo | `equipo` | Club en el que juega el jugador según API-Football. **No** es el club del usuario | team, club (para esto) | `Equipo` |
| Club del usuario | `club` | Texto libre que carga el usuario al registrarse | equipo (para esto) | campo de `Usuario` |
| Estadística de temporada | `estadistica_temporada` | Números de un jugador en una liga, un equipo y una temporada | stats, performance | `EstadisticaTemporada` |
| Estadística vigente | `estadistica_vigente` | La `estadistica_temporada` que representa al jugador en la búsqueda, la ficha y el comparador: la de más minutos en la temporada actual de su liga (RN-017) | estadística principal, última estadística | — |
| Métrica | `metrica` | Indicador de rendimiento que se muestra o se compara. Lista oficial en RN-001 | stat, KPI, indicador | — |
| Métrica táctica | `metrica_tactica` | Métrica que se puede filtrar con un mínimo: pases, duelos, recuperaciones y minutos (RN-001) | filtro táctico | — |
| Dato no disponible | `None` / `null` | La liga no publica esa métrica para ese jugador. **Nunca es 0** (RN-008) | 0, vacío, N/A | — |
| Cobertura de liga | `cobertura` | `completa`, `basica` o `sin_datos` (RN-020) | — | campo de `Liga` |
| Posición | `posicion` | Una de las 4 de API-Football: `arquero`, `defensor`, `mediocampista`, `delantero` (RN-019) | rol (para esto), puesto | enum |
| Valor de mercado | `valor_mercado_eur` | Valor de Transfermarkt en EUR, tomado de transfermarkt-datasets (RN-002) | costo, precio, valor de referencia, cotización | campo de `Jugador` |
| Costo no disponible | (texto UI) | El jugador no tiene valor de mercado | — | — |
| Presupuesto máximo | `presupuesto_max_eur` | Monto máximo en EUR que el usuario define en una búsqueda (RN-003). **No** es el presupuesto del club (eso es R3) | budget, presupuesto del club | parámetro |
| Entra en el presupuesto | `entra_en_presupuesto` | `valor_mercado_eur` ≤ `presupuesto_max_eur` (RN-005) | — | — |
| Filtros de búsqueda | `filtros` | Conjunto de criterios de una búsqueda: nombre, posición, liga, edad, presupuesto y mínimos tácticos | criterios, query | — |
| Búsqueda por nombre | `nombre` (parámetro) | Texto con parte del nombre de un jugador que acota la búsqueda. Se compara con `nombre`, `nombre_pila` y `apellido` (RN-035) | search, query, texto libre, buscador | parámetro |
| Perfil de búsqueda | `perfil_busqueda` | Filtros guardados por el usuario. Hay uno por usuario en el MVP (RN-023) | perfil guardado, búsqueda guardada | `PerfilBusqueda` |
| Lista de seguimiento | `seguimiento` | Jugadores que el usuario guardó para revisar después | favoritos, watchlist, shortlist | `Seguimiento` |
| Comparación | `comparacion` | Vista de 2 o 3 jugadores lado a lado. No se guarda en el MVP | comparativa, versus | — |
| Mejor / Peor | `mejor` / `peor` | Marca por métrica dentro de una comparación (RN-006) | ganador, perdedor | — |
| Métricas ganadas | `metricas_ganadas` | Cantidad de métricas en las que un jugador es "Mejor" | — | — |
| Resumen de la comparación | `resumen_comparacion` | Bloque final de la comparación con una parte por jugador: en qué métricas gana y su valor de mercado (CMP-007) | veredicto, ganador | — |
| Diferencia de valor | `diferencia_valor_eur` | Valor más alto menos valor más bajo de una comparación. La API lo sigue devolviendo, pero desde el 27/11/2026 la interfaz no lo muestra (RN-006) | — | — |
| Reporte PDF | `pdf_comparacion` | PDF de la comparación que se arma en el navegador y se descarga (CMP-002, RN-014) | informe, export | — |
| Notas del PDF | `notas` | Texto opcional de hasta 500 caracteres que el usuario escribe al exportar el PDF. No se guarda (CMP-002) | comentarios, observaciones | — |
| Coincidencia con el perfil | `coincidencia` | Criterios del perfil que el jugador cumple, no cumple o no se pueden evaluar (RN-012) | match, % de coincidencia | — |
| Estado de un criterio | `cumple` / `no_cumple` / `no_disponible` | Resultado de cada criterio de la coincidencia. `no_disponible` = falta el dato del jugador (RN-012) | ✓ / ✗ en el código | enum |
| Excluidos sin valor | `excluidos_sin_valor` | Jugadores que cumplen todos los demás filtros y quedan afuera del presupuesto solo por no tener valor de mercado (RN-005) | — | campo de la respuesta |
| Cruce con Transfermarkt | `cruce` | Búsqueda de la fila de transfermarkt-datasets de un jugador (RN-002). Resultado: `cruzado`, `sin_coincidencia`, `ambiguo` o `sin_fecha` | match, matcheo | — |
| Aviso | `aviso` | Mensaje para el usuario que confirma una acción, por ejemplo al guardar en la lista de seguimiento (RN-026) | mensaje (para esto), toast | campo |
| Promedio de la posición | `promedio_posicion` | Promedio de una métrica entre los jugadores de la misma posición (RN-015) | — | — |
| Diferencia grande | `diferencia_grande` | Fila de la comparación donde el mejor supera al peor en al menos 10 % del mayor (RN-037) | — | — |
| Marca del promedio | `marca_promedio` | Línea vertical sobre la barra que indica el promedio de la posición (RN-015) | — | — |
| Jugador oculto | `jugador_oculto` | Jugador que se atenúa en la comparación y deja de contar para el resumen (RN-037) | — | — |
| Tour | `tour` | Guía de 3 pasos para el usuario nuevo (UI-007) | onboarding (en el código) | — |
| Progreso del flujo | `progreso_flujo` | Barra Buscar · Elegir · Comparar (UI-007) | stepper, wizard | — |
| Menú de navegación | `menu_navegacion` | Panel que se abre con el botón de tres rayas. En el celular tiene todas las opciones (UI-008); en escritorio, las secundarias: tu nombre y club, Ayuda, Términos, WhatsApp y Salir (UI-012). Reemplaza al "menú móvil" | hamburguesa, drawer, burger, menu_movil | — |
| Barra-isla | `topbar` | Barra de navegación flotante de escritorio, del ancho del contenedor, con esquinas redondeadas, que queda pegada arriba (UI-012) | navbar, header | — |
| Ayuda | (solo UI) | Opción del menú que abre el tour de bienvenida. Se llamaba "Ver tour" (UI-012) | — | — |
| Mini demo | `mini_demo` | Pedacito animado de la app, con cifras de ejemplo, que reemplaza al ícono en cada tarjeta de "Por qué StatsLine" (UI-014) | ilustración, widget | — |
| Demo guiada | `demo_guiada` | "Cómo funciona" de la home: los tres pasos como pestañas y una ventana de la app que avanza sola (UI-014) | tour (el tour es otra cosa, UI-007), carrusel, slider | — |
| Título escrito | `titulo_escrito` | El título del hero que se escribe letra por letra al cargar la home (UI-011) | typewriter | — |
| Tarjeta de jugador | `tarjeta_jugador` | Card con todos los datos de un candidato, usada en los resultados y en el seguimiento (UI-010) | ficha corta, fila | — |
| Nombre propio | `nombrePropio` | Cómo se muestra el nombre del usuario: con mayúscula inicial, partículas en minúscula y sin tocar lo que ya mezcla mayúsculas ("tiago marin" → "Tiago Marin"). Solo al mostrarlo; lo guardado no cambia (UI-012). No se aplica al club ni a los jugadores | capitalizar, title case | función del frontend |
| Usuario | `usuario` | Persona con cuenta en la plataforma | user, cliente | `Usuario` |
| Link de recuperación | `token_recuperacion` | Link del mail para elegir una contraseña nueva. Lleva un token firmado que vence a los 60 minutos y sirve una sola vez (RN-036, AUT-003) | reset, token de reseteo, password reset | — |
| Enviador de correo | `enviador` | Lo que manda los mails: Brevo en producción, el log en desarrollo y la memoria en los tests (AUT-003) | mailer, sender | `EnviadorCorreo` |
| Rol | `rol` | `director_tecnico`, `director_deportivo`, `dirigente` u `ojeador` | perfil (para esto), cargo | enum |
| Sincronización | `sincronizacion` | Proceso batch que trae datos de API-Football o de Transfermarkt a PostgreSQL | ingesta, import, sync | `Sincronizacion` |
| Fichaje | — | Incorporación concretada de un jugador. **La plataforma no gestiona fichajes**, solo apoya la decisión | contratación, pase | — |
| Score | `score` | Puntaje de 0 a 100. **Fuera del MVP v1** (R2) | puntaje, rating (el rating es otra cosa) | — |
| Rating | `rating` | Calificación promedio que publica API-Football por partido (`games.rating`) | score | campo |
