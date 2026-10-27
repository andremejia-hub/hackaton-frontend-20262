import { test, expect, signIn, session, wanted, summary } from './fixtures'

test('un login abandonado no inicia sesión cuando su respuesta llega tarde', async ({ page }) => {
  let release!: () => void
  let completed!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  const delivered = new Promise<void>(resolve => { completed = resolve })
  await page.route('**/api/v1/auth/login', async route => {
    await blocked
    await route.fulfill({ json: session }).catch(() => { /* Cancellation is expected after leaving login. */ })
    completed()
  })
  await page.goto('/fuera-del-mapa')
  await page.getByRole('link', { name: 'Volver al inicio' }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill('test@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password')
  const sent = page.waitForRequest(request => request.url().endsWith('/auth/login'))
  await page.getByRole('button', { name: 'Entrar a la consola' }).click()
  await sent
  await expect(page.getByRole('button', { name: 'Conectando…' })).toBeDisabled()
  await page.goBack()
  await expect(page.getByRole('heading', { name: '404 · Fuera del mapa' })).toBeVisible()
  release()
  await delivered
  // Wait for the response handler to settle by observing subsequent navigation.
  await page.getByRole('link', { name: 'Volver al inicio' }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('logpose.token'))).toBeNull()
})

test('copiar la URL a otra pestaña restaura todos los controles y resultados', async ({ page, context }) => {
  await signIn(page)
  await page.goto('/wanted?page=1&size=10&status=MISSING&crewId=test-crew&fruit=NONE&q=sal&sort=updatedAt%2Cdesc')
  await expect(page.getByRole('link', { name: 'Cartel página 1' })).toBeVisible()
  const url = page.url()
  const tab = await context.newPage()
  const requests: string[] = []
  tab.on('request', request => { if (new URL(request.url()).pathname === '/api/v1/wanted') requests.push(new URL(request.url()).search) })
  await tab.goto(url)
  await expect(tab.getByRole('link', { name: 'Cartel página 1' })).toBeVisible()
  await expect(tab.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue('MISSING')
  await expect(tab.getByRole('combobox', { name: 'Tripulación', exact: true })).toHaveValue('test-crew')
  await expect(tab.getByRole('combobox', { name: 'Fruta del diablo', exact: true })).toHaveValue('NONE')
  await expect(tab.getByRole('combobox', { name: 'Ordenar por', exact: true })).toHaveValue('updatedAt,desc')
  await expect(tab.getByRole('combobox', { name: 'Por página', exact: true })).toHaveValue('10')
  await expect(tab.getByRole('searchbox')).toHaveValue('sal')
  expect(requests).toEqual([new URL(url).search])
  await tab.reload()
  await expect(tab.getByRole('link', { name: 'Cartel página 1' })).toBeVisible()
  await tab.close()
})

test('logout impide volver con historial, recarga y navegación directa', async ({ page }) => {
  await signIn(page)
  await page.goto('/wanted')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await page.getByRole('link', { name: 'Cartel página 0' }).click()
  await expect(page.getByRole('heading', { name: wanted.name })).toBeVisible()
  await page.getByRole('button', { name: 'Salir', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await page.goto('/wanted/test-wanted?page=2&size=10')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('logpose.token'))).toBeNull()
})

test('fallo de red del listado permite reintentar sin cambiar URL ni layout', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/wanted?**', route => route.abort('failed'))
  await page.goto('/wanted?status=AT_LARGE&crewId=test-crew&fruit=NONE&q=sal&sort=name%2Casc&page=0&size=10')
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar con la API')
  const url = page.url()
  const before = await page.locator('.results-body').boundingBox()
  await page.unroute('**/api/v1/wanted?**')
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await expect(page).toHaveURL(url)
  const after = await page.locator('.results-body').boundingBox()
  expect(after).toEqual(before)
})

test('historial y botón de volver conservan scroll de ventana y listado tras recorrer el detalle', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/wanted?**', route => route.fulfill({ json: {
    content: Array.from({ length: 20 }, (_, index) => ({ ...wanted, id: index ? `test-${index}` : wanted.id, name: `Expediente ${index}` })),
    totalElements: 20, totalPages: 1, page: 0, size: 20,
  } }))
  await page.route('**/api/v1/wanted/test-wanted', route => route.fulfill({ json: { ...wanted, bio: 'Historia extensa del expediente.\n'.repeat(100) } }))
  await page.goto('/wanted?page=0&size=20&status=AT_LARGE&crewId=test-crew&fruit=NONE&q=sal&sort=updatedAt%2Cdesc')
  await expect(page.getByRole('link', { name: 'Expediente 0', exact: true })).toBeVisible()
  const listUrl = page.url()
  const results = page.getByLabel('Área de carteles')
  await results.evaluate(element => { element.scrollTop = 250 })
  await page.evaluate(() => window.scrollTo(0, 250))
  await expect.poll(() => results.evaluate(element => element.scrollTop)).toBe(250)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(250)
  await page.getByRole('link', { name: 'Expediente 0', exact: true }).evaluate((element: HTMLAnchorElement) => element.click())
  await expect(page.getByRole('heading', { name: wanted.name })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.goBack()
  await expect(page).toHaveURL(listUrl)
  await expect(page.getByRole('link', { name: 'Expediente 0', exact: true })).toBeVisible()
  await expect.poll(() => results.evaluate(element => element.scrollTop)).toBe(250)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(250)
  await page.goForward()
  await expect(page.getByRole('heading', { name: wanted.name })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 900))
  await page.getByRole('link', { name: 'Volver a los carteles' }).evaluate((element: HTMLAnchorElement) => element.click())
  await expect(page).toHaveURL(listUrl)
  await expect(page.getByRole('link', { name: 'Expediente 0', exact: true })).toBeVisible()
  await expect.poll(() => results.evaluate(element => element.scrollTop)).toBe(250)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(250)
})

test('login lento envía una sola petición y recupera errores 5xx y de red', async ({ page }) => {
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  let calls = 0
  await page.route('**/api/v1/auth/login', async route => {
    calls++
    if (calls === 1) { await blocked; await route.fulfill({ status: 503, json: { message: 'Autenticación temporalmente no disponible' } }) }
    else if (calls === 2) await route.abort('failed')
    else await route.fulfill({ json: session })
  })
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('test@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Entrar a la consola' }).click()
  await expect(page.getByRole('button', { name: 'Conectando…' })).toBeDisabled()
  await page.locator('input[name=password]').press('Enter')
  expect(calls).toBe(1)
  expect(await page.evaluate(() => localStorage.getItem('logpose.token'))).toBeNull()
  release()
  await expect(page.getByRole('alert')).toHaveText('Autenticación temporalmente no disponible')
  await page.getByRole('button', { name: 'Entrar a la consola' }).click()
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar con la API')
  await page.getByRole('button', { name: 'Entrar a la consola' }).click()
  await expect(page.getByRole('heading', { name: 'Bitácora de la tripulación' })).toBeVisible()
  expect(calls).toBe(3)
})

test('restauración con fallo de red conserva token y reintenta sin exponer datos privados', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/auth/me', route => route.abort('failed'))
  await page.goto('/wanted?page=1&size=10')
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar con la API')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('logpose.token'))).toBe('test-session')
  await page.unroute('**/api/v1/auth/me')
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Cartel página 1' })).toBeVisible()
})

test('cerrar sesión en otra pestaña limpia inmediatamente las vistas privadas', async ({ page, context }) => {
  await signIn(page)
  await page.goto('/wanted')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  const tab = await context.newPage()
  await tab.goto('/wanted')
  await expect(tab.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await page.getByRole('button', { name: 'Salir', exact: true }).click()
  await expect(tab.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  await expect(tab.getByRole('article')).toHaveCount(0)
  expect(await tab.evaluate(() => localStorage.getItem('logpose.token'))).toBeNull()
  await tab.close()
})

test('Log Pose muestra únicamente el estado del servidor y recupera su error independiente', async ({ page }) => {
  await signIn(page)
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/log-pose', async route => { await blocked; await route.fulfill({ status: 503, json: { message: 'Log Pose no disponible' } }) })
  await page.goto('/')
  await expect(page.getByText('Consultando la bitácora…')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Grand Line abierto' })).toHaveCount(0)
  release()
  await expect(page.getByRole('alert')).toContainText('Log Pose no disponible')
  await page.unroute('**/api/v1/log-pose')
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Rumbo a Reverse Mountain' })).toBeVisible()
  await page.route('**/api/v1/log-pose', route => route.fulfill({ json: { status: 'UNLOCKED', grandLineUnlocked: true, unlockedAt: '2026-10-26T12:00:00Z', message: 'Estado desbloqueado enviado por el servidor de pruebas' } }))
  await page.getByRole('button', { name: 'Actualizar estado' }).click()
  await expect(page.getByRole('heading', { name: 'Grand Line abierto' })).toBeVisible()
  await expect(page.getByText('Estado desbloqueado enviado por el servidor de pruebas')).toBeVisible()
  // Only GET /log-pose is mocked; no CP3 mutation or Grand Line endpoint is called.
  await expect(page.getByText(String(summary.wanted.total), { exact: true })).toBeVisible()
})

test('cada orden y tamaño se envía con todos los filtros y representa la respuesta recibida', async ({ page }) => {
  await signIn(page)
  const observed: Record<string, string>[] = []
  await page.route('**/api/v1/wanted?**', async route => {
    const params = Object.fromEntries(new URL(route.request().url()).searchParams)
    observed.push(params)
    await route.fulfill({ json: {
      content: [{ ...wanted, name: `Resultado ${params.sort} ${params.size}`, status: 'MISSING', devilFruit: { name: 'Fruta de prueba', type: 'ZOAN' } }],
      totalElements: 1, totalPages: 1, page: Number(params.page), size: Number(params.size),
    } })
  })
  await page.goto('/wanted?page=0&size=10&status=MISSING&crewId=test-crew&fruit=ZOAN&q=sal&sort=bounty%2Cdesc')
  for (const sort of ['bounty,desc', 'name,asc', 'updatedAt,desc']) {
    await page.getByRole('combobox', { name: 'Ordenar por', exact: true }).selectOption(sort)
    for (const size of ['10', '20', '50']) {
      await page.getByRole('combobox', { name: 'Por página', exact: true }).selectOption(size)
      await expect(page.getByRole('link', { name: `Resultado ${sort} ${size}`, exact: true })).toBeVisible()
      expect(observed.at(-1)).toEqual({ page: '0', size, sort, status: 'MISSING', crewId: 'test-crew', fruit: 'ZOAN', q: 'sal' })
      await expect(page.locator('.wanted-card')).toContainText('Desaparecido')
      await expect(page.locator('.wanted-card')).toContainText('ZOAN')
    }
  }
})

test('URLs inválidas, duplicadas y desconocidas se normalizan sin errores de ejecución', async ({ page }) => {
  await signIn(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const search of ['page=-1', 'page=abc', 'size=999', 'sort=incorrecto', 'status=INVALID', 'page=abc&size=999&sort=incorrecto&status=INVALID&fruit=INVALID&extra=unknown', 'page=0&page=999&status=&other=x']) {
    await page.goto(`/wanted?${search}`)
    await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
    const url = new URL(page.url())
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: '0', size: '20', sort: 'bounty,desc' })
    await expect(page.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue('')
    await expect(page.getByRole('combobox', { name: 'Ordenar por', exact: true })).toHaveValue('bounty,desc')
    await expect(page.getByRole('combobox', { name: 'Por página', exact: true })).toHaveValue('20')
  }
  expect(errors).toEqual([])
})

test('cambiar cualquiera de los controles reinicia la página vigente', async ({ page }) => {
  await signIn(page)
  for (const [name, value] of [['Estado', 'MISSING'], ['Tripulación', 'test-crew'], ['Fruta del diablo', 'NONE'], ['Ordenar por', 'updatedAt,desc'], ['Por página', '50']]) {
    await page.goto('/wanted?page=2&size=10')
    await expect(page.getByRole('link', { name: 'Cartel página 2' })).toBeVisible()
    await page.getByRole('combobox', { name, exact: true }).selectOption(value)
    await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('page')).toBe('0')
  }
  await page.goto('/wanted?page=2&size=10')
  await expect(page.getByRole('link', { name: 'Cartel página 2' })).toBeVisible()
  await page.getByRole('searchbox').fill('nuevo rumbo')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('page')).toBe('0')
  expect(new URL(page.url()).searchParams.get('q')).toBe('nuevo rumbo')
})

test('debounce cancela búsquedas borradas y no solicita términos equivalentes', async ({ page }) => {
  await signIn(page)
  const requests: string[] = []
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/v1/wanted') requests.push(request.url()) })
  await page.goto('/wanted')
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await page.clock.install({ time: new Date('2026-10-26T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-26T12:00:01Z'))
  await page.getByRole('searchbox').fill('rumbo')
  await page.clock.fastForward(399)
  expect(requests).toHaveLength(1)
  await page.getByRole('searchbox').fill('')
  await page.clock.fastForward(500)
  expect(requests).toHaveLength(1)
  await page.getByRole('searchbox').fill('sal')
  await page.clock.fastForward(401)
  await expect(page).toHaveURL(/q=sal/)
  await expect(page.getByRole('link', { name: 'Cartel página 0' })).toBeVisible()
  await page.getByRole('searchbox').fill(' sal ')
  await page.clock.fastForward(500)
  expect(requests).toHaveLength(2)
  expect(new URL(requests[1]).searchParams.get('q')).toBe('sal')
})

test('página extrema con cero resultados se corrige a cero usando los totales', async ({ page }) => {
  await signIn(page)
  const pages: number[] = []
  await page.route('**/api/v1/wanted?**', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('page'))
    pages.push(current)
    return route.fulfill({ json: { content: [], totalElements: 0, totalPages: 0, page: current, size: 20 } })
  })
  await page.goto('/wanted?page=999&size=20&crewId=unknown-crew')
  await expect(page.getByRole('heading', { name: 'No hay carteles en este rumbo' })).toBeVisible()
  await expect(page).toHaveURL(/page=0/)
  expect(pages).toEqual([999, 0])
  await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
})

test('detalle lento muestra loading y recupera fallos de red conservando el destino', async ({ page }) => {
  await signIn(page)
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/wanted/test-wanted', async route => { await blocked; await route.abort('failed') })
  await page.goto('/wanted/test-wanted?page=1&size=10&q=sal')
  await expect(page.getByText('Consultando la bitácora…')).toBeVisible()
  release()
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar con la API')
  await page.unroute('**/api/v1/wanted/test-wanted')
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(page.getByRole('heading', { name: wanted.name })).toBeVisible()
  await page.getByRole('link', { name: 'Volver a los carteles' }).click()
  await expect(page.getByRole('link', { name: 'Cartel página 1' })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('q')).toBe('sal')
})
