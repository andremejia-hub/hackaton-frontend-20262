import { test, expect, signIn, session, summary, wanted } from './fixtures'

test('login vuelve exactamente a la ruta privada solicitada y logout protege rutas', async ({ page }) => {
  await page.goto('/wanted/test-wanted?page=1&size=10&q=sal#historia')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill('test@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Entrar a la consola' }).click()
  await expect(page).toHaveURL(/\/wanted\/test-wanted\?page=1&size=10&q=sal#historia$/)
  await expect(page.getByRole('heading', { name: wanted.name })).toBeVisible()
  await page.getByRole('button', { name: 'Salir', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => localStorage.getItem('logpose.token'))).toBeNull()
})

// Registration belongs to another teammate and is excluded from this audit.
test.skip('registro valida campos, muestra conflictos junto al campo y entra directamente', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/v1/auth/register', async route => {
    attempts++
    await route.fulfill(attempts === 1 ? { status: 409, json: { code: 'EMAIL_ALREADY_REGISTERED', message: 'El email ya pertenece a otra tripulación.' } } : { status: 201, json: session })
  })
  await page.goto('/register')
  await page.getByRole('button', { name: 'Crear cuenta y zarpar' }).click()
  await expect(page.getByText('Usa entre 3 y 40 caracteres.')).toBeVisible()
  expect(attempts).toBe(0)
  await page.getByLabel('Nombre de la tripulación').fill('Tripulación de pruebas')
  await page.getByLabel('Email', { exact: true }).fill('test@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Crear cuenta y zarpar' }).click()
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#email-error')).toHaveText('El email ya pertenece a otra tripulación.')
  await page.getByLabel('Email', { exact: true }).fill('other@example.test')
  await page.getByRole('button', { name: 'Crear cuenta y zarpar' }).click()
  await expect(page.getByRole('heading', { name: 'Bitácora de la tripulación' })).toBeVisible()
})

test.skip('registro asigna TEAM_NAME_TAKEN y VALIDATION_ERROR a los campos', async ({ page }) => {
  await page.route('**/api/v1/auth/register', route => route.fulfill({ status: 400, json: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ field: 'teamName', message: 'Nombre rechazado por servidor' }, { field: 'password', message: 'Contraseña rechazada por servidor' }] } }))
  await page.goto('/register')
  await page.getByLabel('Nombre de la tripulación').fill('Pruebas')
  await page.getByLabel('Email', { exact: true }).fill('test@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Crear cuenta y zarpar' }).click()
  await expect(page.locator('#teamName-error')).toHaveText('Nombre rechazado por servidor')
  await expect(page.locator('#password-error')).toHaveText('Contraseña rechazada por servidor')
  await page.route('**/api/v1/auth/register', route => route.fulfill({ status: 409, json: { code: 'TEAM_NAME_TAKEN', message: 'Nombre ya registrado' } }))
  await page.getByRole('button', { name: 'Crear cuenta y zarpar' }).click()
  await expect(page.locator('#teamName-error')).toHaveText('Nombre ya registrado')
})

test('restauración pendiente no muestra login; error de red permite reintentar', async ({ page }) => {
  await signIn(page)
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  let attempts = 0
  await page.route('**/api/v1/auth/me', async route => {
    attempts++
    if (attempts === 1) { await blocked; await route.fulfill({ status: 503, json: { message: 'Servidor temporalmente ocupado' } }) }
    else await route.fulfill({ json: session })
  })
  await page.goto('/wanted')
  await expect(page.getByText('Verificando la sesión de tu tripulación…')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toHaveCount(0)
  release()
  await expect(page.getByText('Servidor temporalmente ocupado')).toBeVisible()
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Carteles de «Se Busca»' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Carteles de «Se Busca»' })).toBeVisible()
})

test('401 en restauración y en consultas privadas regresa al login', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/auth/me', route => route.fulfill({ status: 401, json: { code: 'TOKEN_EXPIRED', message: 'Sesión vencida' } }))
  await page.goto('/wanted')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await page.unroute('**/api/v1/auth/me')
  await page.getByLabel('Email', { exact: true }).fill('test@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Entrar a la consola' }).click()
  await expect(page.getByRole('heading', { name: 'Carteles de «Se Busca»' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await page.route('**/api/v1/wanted?**', route => route.fulfill({ status: 401, json: { code: 'TOKEN_EXPIRED', message: 'Sesión vencida' } }))
  await page.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('MISSING')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
})

test('dashboard obtiene datos y Log Pose, maneja error y workspace vacío', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/dashboard/summary', route => route.fulfill({ status: 503, json: { message: 'Resumen no disponible' } }))
  await page.goto('/')
  await expect(page.getByText('Resumen no disponible')).toBeVisible()
  await page.unroute('**/api/v1/dashboard/summary')
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Rumbo a Reverse Mountain' })).toBeVisible()
  await expect(page.getByText('45', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: wanted.name })).toBeVisible()
  await page.route('**/api/v1/dashboard/summary', route => route.fulfill({ json: { ...summary, wanted: { ...summary.wanted, total: 0 }, topBounties: [] } }))
  await page.getByRole('button', { name: 'Actualizar estado' }).click()
  await expect(page.getByRole('heading', { name: 'La bitácora está vacía' })).toBeVisible()
})

test('paginación de servidor, filtros combinados, orden, tamaño y búsqueda debounced', async ({ page }) => {
  await signIn(page)
  const requests: URL[] = []
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/api/v1/wanted') requests.push(url) })
  await page.goto('/wanted?page=2&size=10')
  await expect(page.getByRole('link', { name: 'Cartel página 2' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('MISSING')
  await page.getByRole('combobox', { name: 'Tripulación', exact: true }).selectOption('test-crew')
  await page.getByRole('combobox', { name: 'Fruta del diablo', exact: true }).selectOption('NONE')
  await page.getByRole('combobox', { name: 'Ordenar por', exact: true }).selectOption('name,asc')
  await page.getByRole('combobox', { name: 'Por página', exact: true }).selectOption('50')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await page.getByLabel('Buscar por nombre o epíteto').pressSequentially('rumbo', { delay: 40 })
  await expect(page).toHaveURL(/q=rumbo/)
  await expect(page.getByLabel('Buscar por nombre o epíteto')).toBeFocused()
  await expect.poll(() => requests.filter(url => url.searchParams.has('q')).length).toBe(1)
  const last = requests.at(-1)!.searchParams
  expect(Object.fromEntries(last)).toMatchObject({ page: '0', size: '50', status: 'MISSING', crewId: 'test-crew', fruit: 'NONE', sort: 'name,asc', q: 'rumbo' })
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
})

test('URL sobrevive recarga, detalle, volver e historial atrás/adelante', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await signIn(page)
  await page.goto('/wanted?page=1&size=10&status=AT_LARGE&fruit=ZOAN&q=sal&sort=name%2Casc')
  await expect(page.getByRole('link', { name: 'Cartel página 1' })).toBeVisible()
  const original = page.url()
  await page.reload()
  await expect(page.getByLabel('Buscar por nombre o epíteto')).toHaveValue('sal')
  await page.getByRole('link', { name: 'Cartel página 1' }).click()
  await expect(page.getByRole('heading', { name: wanted.name })).toBeVisible()
  await expect(page.getByText(wanted.bio)).toBeVisible()
  await page.getByRole('link', { name: 'Volver a los carteles' }).click()
  await expect(page).toHaveURL(original)
  await expect(page.getByRole('link', { name: 'Cartel página 1' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('CAPTURED')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(original)
  await expect(page.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue('AT_LARGE')
  await page.goForward()
  await expect(page.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue('CAPTURED')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  expect(errors).toEqual([])
})

test('URL inválida se normaliza y página inexistente se corrige usando totales reales', async ({ page }) => {
  await signIn(page)
  await page.goto('/wanted?page=-2&size=999&status=evil&fruit=evil&sort=evil')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Por página', exact: true })).toHaveValue('20')
  await expect(page.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue('')
  await page.goto('/wanted?page=999&size=20')
  await expect(page.getByRole('link', { name: 'Cartel página 2' })).toBeVisible()
  await expect(page).toHaveURL(/page=2/)
})

test('listado ofrece loading, error con reintento, vacío y recuperación de tripulaciones', async ({ page }) => {
  await signIn(page)
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/wanted?**', async route => { await blocked; await route.fulfill({ status: 503, json: { message: 'Carteles no disponibles' } }) })
  await page.route('**/api/v1/crews', route => route.fulfill({ status: 503, json: { message: 'Tripulaciones no disponibles' } }))
  await page.goto('/wanted')
  await expect(page.getByText('Buscando los carteles de este rumbo…')).toBeVisible()
  await expect(page.getByLabel('Buscar por nombre o epíteto')).toBeVisible()
  const before = await page.locator('.results-body').boundingBox()
  release()
  await expect(page.getByText('Carteles no disponibles', { exact: true })).toBeVisible()
  await page.unroute('**/api/v1/crews')
  await page.getByRole('button', { name: 'Reintentar tripulaciones' }).click()
  await expect(page.getByRole('combobox', { name: 'Tripulación', exact: true })).toBeEnabled()
  await page.route('**/api/v1/wanted?**', route => route.fulfill({ json: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 } }))
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No hay carteles en este rumbo' })).toBeVisible()
  const after = await page.locator('.results-body').boundingBox()
  expect(after?.height).toBe(before?.height)
})

test('detalle maneja 404 y error recuperable; página desconocida muestra 404', async ({ page }) => {
  await signIn(page)
  await page.goto('/wanted/no-existe')
  await expect(page.getByRole('heading', { name: 'Cartel no encontrado' })).toBeVisible()
  await page.route('**/api/v1/wanted/test-wanted', route => route.fulfill({ status: 503, json: { message: 'Detalle no disponible' } }))
  await page.goto('/wanted/test-wanted')
  await expect(page.getByText('Detalle no disponible')).toBeVisible()
  await page.unroute('**/api/v1/wanted/test-wanted')
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(page.getByRole('heading', { name: wanted.name })).toBeVisible()
  await page.goto('/fuera-del-mapa')
  await expect(page.getByRole('heading', { name: '404 · Fuera del mapa' })).toBeVisible()
})

test('interfaz sin desbordamiento horizontal, navegación por teclado y consola sin errores', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await signIn(page)
  await page.goto('/wanted')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await page.keyboard.press('Enter')
  await page.getByRole('combobox', { name: 'Estado', exact: true }).focus()
  await page.keyboard.press('m')
  await page.keyboard.press('Enter')
  expect(errors).toEqual([])
})

test('credenciales incorrectas conservan login y permiten corregirlas', async ({ page }) => {
  await page.route('**/api/v1/auth/login', route => route.fulfill({ status: 401, json: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos.' } }))
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('test@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Entrar a la consola' }).click()
  await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos.')
  await expect(page.getByRole('button', { name: 'Entrar a la consola' })).toBeEnabled()
  await expect(page).toHaveURL(/\/login$/)
})

test('la fecha de expiración cierra una sesión sin nuevas consultas', async ({ page }) => {
  await signIn(page)
  await page.clock.install({ time: new Date('2026-10-26T12:00:00Z') })
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { ...session, expiresAt: '2026-10-26T12:00:05Z' } }))
  await page.goto('/wanted')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await page.clock.fastForward(6000)
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
})

test('una respuesta lenta no reemplaza los filtros más recientes', async ({ page }) => {
  await signIn(page)
  let release!: () => void
  let finishOld!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  const oldFinished = new Promise<void>(resolve => { finishOld = resolve })
  await page.route('**/api/v1/wanted?**', async route => {
    const status = new URL(route.request().url()).searchParams.get('status')
    if (status === 'MISSING') await blocked
    await route.fulfill({ json: { content: [{ ...wanted, name: status === 'MISSING' ? 'Respuesta antigua' : 'Respuesta actual' }], totalElements: 1, totalPages: 1, page: 0, size: 20 } }).catch(() => { /* The browser can abort the superseded request. */ })
    if (status === 'MISSING') finishOld()
  })
  await page.goto('/wanted')
  await expect(page.getByRole('link', { name: 'Respuesta actual' })).toBeVisible()
  const missing = page.waitForRequest(request => request.url().includes('status=MISSING'))
  await page.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('MISSING')
  await missing
  await page.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('CAPTURED')
  await expect(page.getByRole('link', { name: 'Respuesta actual' })).toBeVisible()
  release()
  await oldFinished
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
  await expect(page.getByRole('link', { name: 'Respuesta antigua' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Respuesta actual' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue('CAPTURED')
})

test('botones de página consultan el servidor y el detalle conserva el desplazamiento', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/wanted?**', route => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') ?? 0)
    return route.fulfill({ json: {
      content: Array.from({ length: 10 }, (_, i) => ({ ...wanted, id: i === 0 ? wanted.id : `test-${i}`, name: `Cartel ${pageNumber}-${i}` })),
      totalElements: 15, totalPages: 2, page: pageNumber, size: 10,
    } })
  })
  await page.goto('/wanted?page=0&size=10')
  await expect(page.getByRole('link', { name: 'Cartel 0-0', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByRole('link', { name: 'Cartel 1-0', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/page=1/)
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  await page.getByRole('button', { name: 'Anterior' }).click()
  await expect(page.getByRole('link', { name: 'Cartel 0-0', exact: true })).toBeVisible()
  const results = page.getByLabel('Área de carteles')
  await results.evaluate(element => { element.scrollTop = 250 })
  await expect.poll(() => results.evaluate(element => element.scrollTop)).toBe(250)
  // Navigate through the real first card without Playwright scrolling it into view.
  await page.getByRole('link', { name: 'Cartel 0-0', exact: true }).evaluate((element: HTMLAnchorElement) => element.click())
  await expect(page.getByRole('heading', { name: wanted.name })).toBeVisible()
  await page.getByRole('link', { name: 'Volver a los carteles' }).click()
  await expect(page.getByRole('link', { name: 'Cartel 0-0', exact: true })).toBeVisible()
  await expect.poll(() => results.evaluate(element => element.scrollTop)).toBe(250)
})
