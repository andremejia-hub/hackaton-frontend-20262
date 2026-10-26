# CP1 y CP2 — estado verificable

Fecha: 26 de octubre de 2026. Alcance: implementación de los dos primeros checkpoints.

## Fuentes y auditoría inicial

- Fuente de requisitos: [README original, commit 4eddb6f](https://github.com/CS2031-DBP/hackaton-frontend-20262/blob/4eddb6f/README.md), secciones «Stack Obligatorio», «Acceso a la API», «Checkpoint 1 — Zarpar», «Checkpoint 2 — Carteles de “Se Busca”», «Evaluación» y «Reglas de Evaluación». El enunciado completo permanece en el README local, después de las instrucciones de ejecución añadidas.
- Contrato: [Swagger público](https://logpose-api-jg7f.onrender.com/docs) y [OpenAPI público](https://logpose-api-jg7f.onrender.com/openapi.json). Copia sin modificar: `docs/openapi.json`, versión `2026.2.0`. Se revisaron sus esquemas, parámetros, respuestas y errores; no se dedujeron endpoints de los nombres de componentes.
- Repositorio original: `CS2031-DBP/hackaton-frontend-20262`. Fork identificado por `git remote -v`: `andremejia-hub/hackaton-frontend-20262`.
- `gh api repos/{owner}/hackaton-frontend-20262/contents` devolvió únicamente `README.md` en ambos repositorios. `gh api .../issues --paginate` y `gh api .../milestones` devolvieron `[]` en ambos. No existen tareas adicionales recuperadas de esas fuentes.
- Projects no pudo verificarse: `gh project list` devolvió `unknown owner type`; GraphQL no autenticado devolvió primero 401 y después el límite público 403; el acceso web a las dos pestañas Projects tampoco devolvió contenido. No se afirma que no existan Projects privados.
- Estado local inicial: solo README versionado y configuración local `.idea/` sin versionar. Sin aplicación, lock, dependencias ni pruebas. Se preservó `.idea/` y se añadió a `.gitignore`. No se encontraron instrucciones AGENTS.md dentro del repositorio.
- Se leyeron también CP3, CP4 y CP5: CP3 es inspección presencial; CP4 requiere feed por cursor y verificación de rumores; CP5 requiere scrollytelling con datos de sagas y accesibilidad. No se implementan aquí ni se intenta evadir `423 LOG_POSE_REQUIRED`. El cliente HTTP, la sesión y los componentes de feedback pueden reutilizarse posteriormente.

El README original no asigna identificadores a las viñetas. Los IDs siguientes son referencias locales de auditoría, en el mismo orden del original, **no identificadores de issues**. Cada fila representa una viñeta completa, incluidos sus subcriterios.

## Matriz CP1 — Zarpar

Fuente de todas las filas: [Checkpoint 1 original](https://github.com/CS2031-DBP/hackaton-frontend-20262/blob/4eddb6f/README.md#checkpoint-1--zarpar).

| ID local / nombre original | Criterio completo | Inicial → final | Archivos principales | Dependencias | Evidencia |
| --- | --- | --- | --- | --- | --- |
| CP1.1 Registro de la tripulación | Crear cuenta, entrar directamente y mostrar junto al campo los errores de email/nombre duplicados y datos inválidos. | Pendiente → completo | `src/pages/AuthPage.tsx`, `src/components/FormField.tsx`, `src/auth/AuthProvider.tsx`, `src/lib/api.ts` | Stack y contrato de registro | E2E «registro valida campos…» y «registro asigna TEAM_NAME_TAKEN y VALIDATION_ERROR…» verifican validación local sin requests, 409 email, 409 nombre, detalles de validación y entrada sin login adicional. API real: registro 201 y ambos conflictos 409. |
| CP1.2 Login | Autenticar email y contraseña de la tripulación. | Pendiente → completo | `src/pages/AuthPage.tsx`, `src/auth/AuthProvider.tsx` | Cliente HTTP | E2E de login y de credenciales incorrectas; API real login 200; Chromium sin mocks: 401 INVALID_CREDENTIALS visible en el formulario. |
| CP1.3 Rutas privadas | Impedir acceso sin sesión y volver exactamente a la ruta solicitada después del login. | Pendiente → completo | `src/App.tsx`, `src/pages/AuthPage.tsx` | CP1.2 | E2E inicia en `/wanted/test-wanted?page=1&size=10&q=sal#historia` sin sesión y comprueba pathname, query y fragmento tras autenticarse. Registro conserva también el destino al alternar formularios. |
| CP1.4 Restauración de sesión | Recargar consulta `/auth/me`, sin mostrar login mientras se verifica. | Pendiente → completo | `src/auth/AuthProvider.tsx`, `src/App.tsx` | Token y endpoint `/auth/me` | E2E bloquea deliberadamente `/auth/me`, comprueba pantalla de verificación y ausencia de login, fuerza 503, reintenta y recarga. El token se conserva; la contraseña no. API real `/auth/me`: 200. |
| CP1.5 Sesión inválida | Volver al login cuando deja de ser válida. | Pendiente → completo | `src/lib/api.ts`, `src/auth/AuthProvider.tsx`, `src/App.tsx` | CP1.3–4 | E2E 401 tanto en restauración como en listado; E2E adelanta el reloj más allá de `expiresAt` sin hacer otra consulta. Pruebas HTTP comprueban que un 401 antiguo no cierra una sesión nueva. |
| CP1.6 Logout | Cerrar sesión y bloquear de nuevo las rutas privadas. | Pendiente → completo | `src/components/Layout.tsx`, `src/auth/AuthProvider.tsx` | Sesión | E2E pulsa Salir desde detalle, comprueba login y token eliminado. Además se escucha `storage` para sincronizar pestañas. |
| CP1.7 Dashboard | Datos reales de `/dashboard/summary` y estado del Log Pose. | Pendiente → completo | `src/pages/Dashboard.tsx`, `src/lib/types.ts` | CP1.3 y contrato de ambos endpoints | Indicadores, distribuciones por estado/fruta, tripulación más buscada, mayores recompensas y mensaje del Log Pose provienen de las respuestas. E2E dashboard; API real ambos endpoints 200. Botón Actualizar consulta nuevamente el estado. |
| CP1.8 Loading, error con reintento y estado vacío | Mostrar estados reales y permitir recuperarse. | Pendiente → completo | `src/components/Feedback.tsx`, `src/pages/Dashboard.tsx`, `src/App.tsx` | Carga HTTP | E2E restaura sesión en espera/error y reintenta; dashboard 503 → datos → `wanted.total=0`. Los formularios deshabilitan envío mientras esperan y muestran errores accionables. |
| CP1.9 Página 404 | Mostrar una vista para rutas inexistentes. | Pendiente → completo | `src/App.tsx`, `src/pages/WantedDetail.tsx` | Router | E2E `/fuera-del-mapa` muestra 404 con regreso al inicio; un cartel inexistente muestra su estado 404 específico. |

**CP1: 9/9 viñetas completas.**

## Matriz CP2 — Carteles de “Se Busca”

Fuente de todas las filas: [Checkpoint 2 original](https://github.com/CS2031-DBP/hackaton-frontend-20262/blob/4eddb6f/README.md#checkpoint-2--carteles-de-se-busca).

| ID local / nombre original | Criterio completo | Inicial → final | Archivos principales | Dependencias | Evidencia |
| --- | --- | --- | --- | --- | --- |
| CP2.1 Paginación real del servidor | Solicitar una página a la API y usar sus totales. | Pendiente → completo | `src/pages/WantedList.tsx`, `src/lib/types.ts` | CP1 sesión; GET `/wanted` | Request con `page` desde 0 y `size` 10/20/50; solo se renderiza `content`. E2E controla página pedida y límites. API real: página 0, tamaño 10, 10 elementos de un total de 137. No se carga el dataset completo ni se pagina en cliente. |
| CP2.2 Filtros combinables | Estado, tripulación y tipo de fruta, juntos. | Pendiente → completo | `src/pages/WantedList.tsx`, `src/lib/wantedQuery.ts` | GET `/crews`, CP2.1 | E2E comprueba una misma request con `status=MISSING`, `crewId=test-crew`, `fruit=NONE`. Tripulaciones llegan de la API; enums exactos de OpenAPI incluyen NONE. API real respondió 200 a filtros AND con búsqueda y orden. |
| CP2.3 Búsqueda por nombre o epíteto | Sin request por tecla. | Pendiente → completo | `src/pages/WantedList.tsx` | Parámetro `q`; CP2.5 | Debounce 400 ms, trim y máximo 100 caracteres. E2E escribe cinco letras y comprueba una sola consulta con `q`; conserva el foco después de confirmar. La búsqueda la ejecuta el servidor sobre nombre/epíteto, no el cliente sobre una página. |
| CP2.4 Ordenamiento y tamaño de página | Admitir los tres órdenes y tamaños documentados. | Pendiente → completo | `src/lib/wantedQuery.ts`, `src/pages/WantedList.tsx` | Contrato `/wanted` | Controles de recompensa descendente, nombre ascendente, actualización descendente y 10/20/50. E2E verifica `name,asc`, 50 y deshabilitado de siguiente según totales; unitarias verifican defaults y serialización. |
| CP2.5 Estado completo en URL | Recargar, compartir, atrás y adelante reproducen los controles y página. | Pendiente → completo | `src/lib/wantedQuery.ts`, `src/pages/WantedList.tsx` | React Router | URL con page, size, status, crewId, fruit, q, sort; no librería auxiliar de estado URL. E2E abre una URL directamente, recarga, entra/sale del detalle y navega atrás/adelante; unitarias verifican roundtrip de todos los controles y caracteres especiales. |
| CP2.6 URL inválida | Normalizar valores inválidos sin romper la vista. | Pendiente → completo | `src/lib/wantedQuery.ts`, `src/pages/WantedList.tsx` | CP2.5 | Enums/tamaño inválidos vuelven al default, páginas negativas/no enteras/no seguras a 0; longitudes limitadas; parámetros desconocidos eliminados mediante replace. Crew ID desconocido es válido según contrato y representa cero coincidencias. E2E y unitarias con NaN, infinito, decimales, overflow y valores arbitrarios. |
| CP2.7 Página existente al cambiar controles | Filtros, búsqueda, orden y tamaño no dejan página fuera de rango. | Pendiente → completo | `src/pages/WantedList.tsx` | CP2.1, CP2.5 | Los cambios reinician page=0. Una URL con page=999 consulta totales reales y reemplaza la URL con la última página existente; totalPages=0 lleva a 0. E2E verifica reseteo desde página 2 y corrección de página 999 a 2. |
| CP2.8 Respuestas antiguas | Nunca mostrar resultados de una consulta anterior. | Pendiente → completo | `src/lib/useResource.ts`, `src/pages/WantedList.tsx` | Fetch y ciclo de vida React | AbortController más bandera de vigencia y clave de consulta; se ocultan inmediatamente datos cuya clave no coincide con la URL. Unitaria resuelve la petición antigua después de la nueva incluso ignorando abort; E2E retrasa MISSING y cambia a CAPTURED. |
| CP2.9 Loading, error con reintento y sin resultados, sin mover layout | Mantener controles y espacio de resultados; recuperarse de errores sin navegación adicional. | Pendiente → completo | `src/components/Feedback.tsx`, `src/pages/WantedList.tsx`, `src/styles.css` | CP2.1 y CP2.8 | Área de resultados de altura estable con scroll interno y scrollbar reservada; controles y paginación permanecen. E2E bloquea petición, fuerza 503, reintenta, devuelve lista vacía y compara altura antes/después. El filtro de tripulación tiene reintento independiente si GET `/crews` falla. |
| CP2.10 Detalle en `/wanted/:id` y retorno exacto | Mostrar expediente real y volver al mismo listado. | Pendiente → completo | `src/components/WantedCard.tsx`, `src/pages/WantedDetail.tsx`, `src/pages/WantedList.tsx` | GET `/wanted/{id}`, CP2.5 | Nombre, epíteto, recompensa, estado, rol, tripulación, fruta, amenaza, edad, altura, biografía, avistamiento e historial desde la API. Links conservan la query; desplazamiento de resultados y ventana recordado por consulta en sessionStorage. E2E compara URL idéntica tras volver, filtros y página; cubre detalle 404, 503 y reintento. API real detalle 200. |

**CP2: 10/10 viñetas completas.**

## Requisitos transversales y decisiones

- React 19, TypeScript estricto, `.tsx`, Vite, React Router, Tailwind CSS (plugin Vite), Fetch y npm; Node 24. No se incorporaron librerías de UI, server cache, URL state, infinite scroll o animación prohibidas.
- No hay `any` explícito, endpoints inventados, datos de producción hardcodeados ni mocks importados por `src/`. Las fixtures de `tests/e2e/fixtures.ts` son exclusivamente para pruebas deterministas. El cliente real requiere la variable de entorno y muestra una explicación si falta.
- Responsividad: grid adaptable, filtros usables en móvil, tipografía escalable y sin overflow horizontal en los viewports probados. Accesibilidad: landmarks, etiquetas explícitas en formularios, errores mediante aria-describedby/aria-invalid, estados status/alert, enlace para saltar al contenido, foco visible, controles nativos y reduced motion.
- Las consultas protegidas envían Bearer; registro/login no envían el token. El 401 de credenciales incorrectas no activa el cierre global de sesión. Una respuesta antigua no invalida un token nuevo. Los errores de red al restaurar conservan el token y permiten reintentar.
- Las etapas futuras pueden añadir rutas bajo el layout privado y reutilizar `request`, `useResource`, tipos y feedback. No se simula ni desbloquea el Log Pose.

## Archivos creados o modificados

- Modificado: `README.md` (ejecución, verificación, arquitectura y estado; enunciado original preservado).
- Configuración creada: `.gitignore`, `.env.example`, `.nvmrc`, `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`.
- Aplicación creada: `src/main.tsx`, `src/App.tsx`, `src/styles.css`.
- Sesión creada: `src/auth/AuthContext.ts`, `src/auth/AuthProvider.tsx`.
- Infraestructura creada: `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/useResource.ts`, `src/lib/wantedQuery.ts`, `src/lib/format.ts`.
- Componentes creados: `src/components/Feedback.tsx`, `src/components/FormField.tsx`, `src/components/Layout.tsx`, `src/components/WantedCard.tsx`.
- Vistas creadas: `src/pages/AuthPage.tsx`, `src/pages/Dashboard.tsx`, `src/pages/WantedList.tsx`, `src/pages/WantedDetail.tsx`.
- Pruebas creadas: `tests/setup.ts`, `tests/api.test.ts`, `tests/wantedQuery.test.ts`, `tests/useResource.test.tsx`, `tests/e2e/fixtures.ts`, `tests/e2e/checkpoints.spec.ts`.
- Documentación creada: `docs/openapi.json`, `CP1_CP2_STATUS.md`.

## Verificación ejecutada

Los resultados finales se registran a continuación. Las rondas intermedias detectaron y permitieron corregir lint de efectos, selectores de pruebas, etiquetas de campos con errores, conservación del foco y desmontaje del detalle. No se cuentan esas rondas fallidas como aprobadas.

| Comando / comprobación | Resultado |
| --- | --- |
| `npm install` con certificados del sistema | Instalación finalizada; lock creado. Node v24.19.0, npm 11.17.0. |
| `npm install -D vitest@^5.0.5` | Actualizó herramienta de pruebas para corregir los tres avisos iniciales de audit; instalación reportó **0 vulnerabilidades**. |
| `npm run lint` | Aprobado, sin errores ni warnings. |
| `npm run typecheck` | Aprobado, TypeScript estricto. |
| `npm test` | **16/16** pruebas, 3 archivos, Vitest 5.0.5. |
| `npm run build` | Aprobado; bundle de producción generado en `dist/`. |
| `npx playwright install chromium` | Chromium y headless shell instalados correctamente. |
| `npm run test:e2e -- --workers=2` | **32/32 aprobadas en 15,1 s**: 16 escenarios en escritorio y los mismos 16 en emulación móvil Chromium. Incluye botones anterior/siguiente y restauración del desplazamiento del listado. |
| `npm run dev -- --port 5173 --strictPort` | Vite inició correctamente y sirvió la app en localhost; ready en 465 ms. |
| `git diff --check` | Sin errores de whitespace en los cambios versionados. |

### Integración real (sin interceptar la API)

Se ejecutó un smoke test contra la API pública usando una cuenta de validación generada en memoria. No se imprimieron ni guardaron email, contraseña, token o datos de sesión. No se modificó la cuenta oficial del equipo. El servidor no publica un endpoint de borrado de cuentas; queda una cuenta de validación creada.

- POST `/auth/register`: 201; POST `/auth/login`: 200.
- GET `/auth/me`, `/dashboard/summary`, `/log-pose`, `/crews`: 200 en todos.
- GET `/wanted?page=0&size=10&sort=bounty,desc`: 200; 10 resultados de 137, page=0 y size=10.
- GET `/wanted/{id}` usando un ID devuelto por la respuesta anterior: 200.
- GET `/wanted` con estado, tripulación, fruta, búsqueda por nombre y orden combinados: 200.
- Registro con mismo email: 409 EMAIL_ALREADY_REGISTERED; con mismo nombre y otro email: 409 TEAM_NAME_TAKEN.
- Smoke adicional en Chromium, sin interceptar la API: login con credenciales inválidas devolvió **401 INVALID_CREDENTIALS**, el formulario mostró exactamente el mensaje del servidor y no hubo errores de ejecución. Se comprobó así la conexión CORS desde la aplicación local. El script finalizó con código 0; los intentos previos del script fallaron por conversión de caracteres en PowerShell y por confundir `Response.status()` de Playwright con la propiedad `Response.status` de Fetch, ambos corregidos.

Las pruebas E2E son deterministas con API interceptada y fixtures ajustadas al contrato; se distinguen de esta integración real. Los estados especiales (workspace vacío, errores 5xx, expiración, peticiones fuera de orden) se fuerzan únicamente en pruebas, no en la aplicación.

## Limitaciones y entrega pendiente fuera de CP1/CP2

- **GitHub Projects:** no accesible con los permisos/autenticación disponibles. No se inventaron tareas provenientes de Projects ni se garantiza que no haya instrucciones privadas adicionales.
- **Datos académicos:** faltan nombres y códigos de integrantes y TEAM_CODE oficial. No se inventó `hackathon.json` sin esos datos ni un esquema no publicado. Son datos para el entregable general del curso, no una funcionalidad pendiente de CP1/CP2. El README señala esta pendiente explícitamente.
- **Navegadores:** pruebas automatizadas en Chromium, escritorio y emulación móvil; no se ejecutaron Firefox, WebKit, dispositivos físicos ni auditoría de lector de pantalla. La comprobación de accesibilidad descrita corresponde a etiquetas, teclado, foco, roles y viewport.
- **Entorno:** el primer intento npm falló por cadena TLS; se resolvió con `NODE_USE_SYSTEM_CA=1` (sin desactivar TLS). Esbuild no pudo leer directorios superiores bajo el sandbox; pruebas/build/Vite y Chromium se ejecutaron con elevación aprobada. Estos fallos iniciales no son fallos pendientes del proyecto.
- **CP3/CP4/CP5:** no implementados; CP3 exige personas e inspección presencial. Mostrar el estado del Log Pose corresponde a CP1 y no significa haber aprobado CP3.
- No se hizo push, despliegue ni modificación del repositorio remoto.
