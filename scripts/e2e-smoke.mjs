import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import process from 'node:process'

const port = await findAvailablePort()
const baseUrl = `http://127.0.0.1:${port}`
const output = []
const server = spawn(
  'pnpm',
  ['exec', 'vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  {
    cwd: process.cwd(),
    env: { ...process.env, VITE_SITE_URL: baseUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)

server.stdout.on('data', (chunk) => output.push(chunk.toString()))
server.stderr.on('data', (chunk) => output.push(chunk.toString()))

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      if (!address || typeof address === 'string') {
        probe.close()
        reject(new Error('Could not allocate an E2E server port.'))
        return
      }
      probe.close((error) => (error ? reject(error) : resolve(address.port)))
    })
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => match[0])
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))
  return match?.[1]
}

function tagsWithAttribute(html, tagName, attributeName, expectedValue) {
  return tags(html, tagName).filter(
    (tag) => attribute(tag, attributeName)?.toLowerCase() === expectedValue.toLowerCase(),
  )
}

function assertSeoHead(html, { url, indexable }) {
  const titleMatches = [...html.matchAll(/<title>([^<]*)<\/title>/gi)]
  assert(titleMatches.length === 1, `${url} must render exactly one title.`)
  assert(titleMatches[0][1].trim().length > 0, `${url} must render a non-empty title.`)

  const descriptions = tagsWithAttribute(html, 'meta', 'name', 'description')
  assert(descriptions.length === 1, `${url} must render exactly one meta description.`)
  assert(attribute(descriptions[0], 'content')?.trim(), `${url} description must not be empty.`)

  const canonicals = tagsWithAttribute(html, 'link', 'rel', 'canonical')
  assert(canonicals.length === 1, `${url} must render exactly one canonical link.`)
  assert(attribute(canonicals[0], 'href') === url, `${url} canonical must match its public URL.`)

  for (const property of ['og:title', 'og:description', 'og:url', 'og:type']) {
    const matches = tagsWithAttribute(html, 'meta', 'property', property)
    assert(matches.length === 1, `${url} must render exactly one ${property} tag.`)
    assert(attribute(matches[0], 'content')?.trim(), `${url} ${property} must not be empty.`)
  }
  const openGraphUrls = tagsWithAttribute(html, 'meta', 'property', 'og:url')
  assert(attribute(openGraphUrls[0], 'content') === url, `${url} og:url must match its public URL.`)

  for (const name of ['twitter:card', 'twitter:title', 'twitter:description']) {
    const matches = tagsWithAttribute(html, 'meta', 'name', name)
    assert(matches.length === 1, `${url} must render exactly one ${name} tag.`)
    assert(attribute(matches[0], 'content')?.trim(), `${url} ${name} must not be empty.`)
  }

  const robots = tagsWithAttribute(html, 'meta', 'name', 'robots')
  const hasNoindex = robots.some((tag) =>
    attribute(tag, 'content')?.toLowerCase().includes('noindex'),
  )
  assert(
    indexable ? !hasNoindex : hasNoindex,
    `${url} robots metadata must match its indexability contract.`,
  )
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim())
}

function detectProductMode(html) {
  const hasSaas = html.includes('data-product-mode-home="saas"')
  const hasTool = html.includes('data-product-mode-home="tool"')
  assert(hasSaas !== hasTool, 'Home must expose exactly one active product mode.')
  return hasTool ? 'tool' : 'saas'
}

function normalizeGraphUrl(value) {
  const url = new URL(value)
  url.hash = ''
  return url.toString()
}

function internalLinks(html, pageUrl) {
  const links = new Set()
  for (const tag of tags(html, 'a')) {
    const raw = attribute(tag, 'href')
    if (!raw) continue
    const href = raw.replaceAll('&amp;', '&').trim()
    if (
      !href ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      href.startsWith('data:')
    ) {
      continue
    }

    try {
      const url = new URL(href, pageUrl)
      if (url.origin !== baseUrl) continue
      url.hash = ''
      links.add(url.toString())
    } catch {
      throw new Error(`Invalid internal href on ${pageUrl}: ${href}`)
    }
  }
  return [...links]
}

function graphDepths(graph, start) {
  const depths = new Map([[start, 0]])
  const queue = [start]

  while (queue.length > 0) {
    const current = queue.shift()
    const depth = depths.get(current) ?? 0
    for (const next of graph.get(current) ?? []) {
      if (depths.has(next)) continue
      depths.set(next, depth + 1)
      queue.push(next)
    }
  }

  return depths
}

async function waitForServer() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`Vite did not start.\n${output.join('')}`)
}

const getCache = new Map()

async function request(path, init) {
  const cacheable = !init
  if (cacheable && getCache.has(path)) return getCache.get(path)

  const response = await fetch(`${baseUrl}${path}`, init)
  const result = { response, text: await response.text() }
  if (cacheable) getCache.set(path, result)
  return result
}

async function requestAbsolute(url) {
  const parsed = new URL(url)
  return request(`${parsed.pathname}${parsed.search}`)
}

async function auditInternalLinkGraph(indexedHtml) {
  const sitemapSet = new Set([...indexedHtml.keys()].map(normalizeGraphUrl))
  const incoming = new Map([...sitemapSet].map((url) => [url, new Set()]))
  const graph = new Map([...sitemapSet].map((url) => [url, new Set()]))

  for (const [sourceUrl, html] of indexedHtml) {
    const normalizedSource = normalizeGraphUrl(sourceUrl)
    for (const targetUrl of internalLinks(html, sourceUrl)) {
      const targetResult = await requestAbsolute(targetUrl)
      assert(
        targetResult.response.status < 400,
        `Broken internal link: ${sourceUrl} -> ${targetUrl} returned ${targetResult.response.status}.`,
      )

      const normalizedTarget = normalizeGraphUrl(targetUrl)
      if (!sitemapSet.has(normalizedTarget)) continue

      graph.get(normalizedSource)?.add(normalizedTarget)
      if (normalizedTarget !== normalizedSource) {
        incoming.get(normalizedTarget)?.add(normalizedSource)
      }
    }
  }

  const homeUrl = normalizeGraphUrl(`${baseUrl}/`)
  for (const url of sitemapSet) {
    if (url === homeUrl) continue
    assert(
      (incoming.get(url)?.size ?? 0) > 0,
      `Indexable orphan page has no incoming internal link from another sitemap page: ${url}`,
    )
  }

  const depths = graphDepths(graph, homeUrl)
  for (const url of sitemapSet) {
    const depth = depths.get(url)
    assert(depth !== undefined, `Indexable page is unreachable from the homepage: ${url}`)
    if (depth > 3) {
      console.warn(`SEO warning: ${url} is ${depth} internal-link clicks from the homepage.`)
    }
  }
}

try {
  await waitForServer()

  const home = await request('/')
  assert(home.response.status === 200, 'Home route must return 200.')
  const activeMode = detectProductMode(home.text)
  assertSeoHead(home.text, { url: `${baseUrl}/`, indexable: true })
  assert(home.text.includes('application/ld+json'), 'Home JSON-LD is missing.')
  const hasChineseEquivalent = /hrefLang="zh-CN"/i.test(home.text)
  if (hasChineseEquivalent) {
    assert(/hrefLang="en"/i.test(home.text), 'English hreflang is missing.')
    assert(/hrefLang="x-default"/i.test(home.text), 'Home x-default hreflang is missing.')
    assert(
      /data-locale-switch[^>]+href="\/zh"/i.test(home.text),
      'Home locale switch must target the equivalent Chinese route.',
    )
  } else {
    assert(
      !/rel="alternate"[^>]+hrefLang=/i.test(home.text),
      'A single-locale homepage must not publish false hreflang alternates.',
    )
    assert(
      !home.text.includes('data-locale-switch'),
      'A single-locale homepage must not offer a false locale switch.',
    )
  }
  assert(
    home.response.headers.get('x-content-type-options') === 'nosniff',
    'Security headers are missing.',
  )
  assert(
    home.response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"),
    'CSP is missing.',
  )

  if (hasChineseEquivalent) {
    const zh = await request('/zh')
    assert(zh.text.includes('<html lang="zh-CN">'), 'Chinese route must set the document language.')
    assert(
      detectProductMode(zh.text) === activeMode,
      'Localized home routes must use the same active product mode.',
    )
    assert(/hrefLang="en"/i.test(zh.text), 'English reciprocal hreflang is missing.')
    assert(/hrefLang="zh-CN"/i.test(zh.text), 'Chinese hreflang is missing.')
    assert(/hrefLang="x-default"/i.test(zh.text), 'x-default hreflang is missing.')
    assert(
      /data-locale-switch[^>]+href="\/"/i.test(zh.text),
      'Chinese locale switch must target the equivalent English route.',
    )
  }

  const pricing = await request('/pricing', { redirect: 'manual' })
  const pricingAvailable = pricing.response.status === 200
  assert(
    pricingAvailable || pricing.response.status === 404,
    'Pricing must either be an enabled public page or an unavailable product surface.',
  )
  if (pricingAvailable) {
    assert(
      !pricing.text.includes('data-locale-switch'),
      'A single-locale page must not offer a false locale switch.',
    )
    assert(
      !/rel="alternate"[^>]+hrefLang=/i.test(pricing.text),
      'A single-locale page must not publish false hreflang alternates.',
    )
    assertSeoHead(pricing.text, { url: `${baseUrl}/pricing`, indexable: true })
  }

  const robots = await request('/robots.txt')
  assert(
    robots.response.status === 200 && robots.text.includes('/sitemap.xml'),
    'robots.txt is invalid.',
  )

  const sitemap = await request('/sitemap.xml')
  assert(sitemap.response.status === 200, 'sitemap.xml is invalid.')
  assert(
    !sitemap.text.includes('/tool-reference'),
    'Noindex Tool Landing reference routes must not appear in sitemap.xml.',
  )
  assert(
    sitemap.text.includes('/pricing') === pricingAvailable,
    'Pricing sitemap membership must match the active product-surface contract.',
  )

  const guides = await request('/guides')
  assert(guides.response.status === 200, 'Guides route must remain renderable for starter review.')
  const guidesIndexed = sitemap.text.includes(`<loc>${baseUrl}/guides</loc>`)
  assertSeoHead(guides.text, { url: `${baseUrl}/guides`, indexable: guidesIndexed })
  if (!guidesIndexed) {
    assert(
      !home.text.includes('href="/guides"'),
      'Disabled starter Guides must not remain in primary homepage navigation.',
    )
  }

  const indexedUrls = sitemapUrls(sitemap.text)
  assert(indexedUrls.length > 0, 'sitemap.xml must contain at least one public URL.')
  assert(
    new Set(indexedUrls).size === indexedUrls.length,
    'sitemap.xml must not contain duplicates.',
  )

  const indexedHtml = new Map()
  for (const indexedUrl of indexedUrls) {
    const url = new URL(indexedUrl)
    assert(url.origin === baseUrl, `Sitemap URL must use the configured site origin: ${indexedUrl}`)
    const page = await request(`${url.pathname}${url.search}`)
    assert(page.response.status === 200, `Sitemap URL must return 200: ${indexedUrl}`)
    assertSeoHead(page.text, { url: indexedUrl, indexable: true })
    indexedHtml.set(indexedUrl, page.text)
  }

  await auditInternalLinkGraph(indexedHtml)

  const privacy = await request('/privacy-policy')
  assert(privacy.response.status === 200, 'Privacy Policy route must return 200.')
  assert(
    privacy.text.includes('data-legal-document="privacy"'),
    'Privacy Policy must use the shared legal document template.',
  )
  assert(
    /href="mailto:[^"@]+@[^"@]+"/.test(privacy.text),
    'Privacy Policy must expose the configured contact address.',
  )

  const terms = await request('/terms-of-service')
  assert(terms.response.status === 200, 'Terms of Service route must return 200.')
  assert(
    terms.text.includes('data-legal-document="terms"'),
    'Terms of Service must use the shared legal document template.',
  )
  const legalDocumentsAreStarter = terms.text.includes('data-legal-review-status="starter"')
  const privacyIsNoindex = privacy.text.includes('noindex,nofollow')
  const termsAreNoindex = terms.text.includes('noindex,nofollow')
  assert(
    privacyIsNoindex === legalDocumentsAreStarter && termsAreNoindex === legalDocumentsAreStarter,
    'Legal page robots metadata must match the legal review state.',
  )
  assert(
    sitemap.text.includes('/privacy-policy') !== legalDocumentsAreStarter &&
      sitemap.text.includes('/terms-of-service') !== legalDocumentsAreStarter,
    'Only launch-ready legal pages may appear in sitemap.xml.',
  )
  assertSeoHead(privacy.text, {
    url: `${baseUrl}/privacy-policy`,
    indexable: !legalDocumentsAreStarter,
  })
  assertSeoHead(terms.text, {
    url: `${baseUrl}/terms-of-service`,
    indexable: !legalDocumentsAreStarter,
  })

  const textReference = await request('/tool-reference')
  assert(textReference.response.status === 200, 'Text Tool Landing reference must return 200.')
  assert(
    textReference.text.includes('noindex,nofollow'),
    'Text Tool Landing reference must remain noindex.',
  )
  assertSeoHead(textReference.text, { url: `${baseUrl}/tool-reference`, indexable: false })

  const uploadReference = await request('/tool-reference-upload')
  assert(uploadReference.response.status === 200, 'Upload Tool Landing reference must return 200.')
  assert(
    uploadReference.text.includes('noindex,nofollow'),
    'Upload Tool Landing reference must remain noindex.',
  )
  assertSeoHead(uploadReference.text, {
    url: `${baseUrl}/tool-reference-upload`,
    indexable: false,
  })

  const sandboxProbe = await request('/api/sandbox/session')
  const appAvailable = sandboxProbe.response.status !== 404

  if (!appAvailable) {
    const loginRoute = await request('/login', { redirect: 'manual' })
    const dashboardRoute = await request('/dashboard', { redirect: 'manual' })
    assert(loginRoute.response.status === 404, 'Disabled App surface must hide /login.')
    assert(dashboardRoute.response.status === 404, 'Disabled App surface must hide /dashboard.')
  } else {
    assert(
      sandboxProbe.response.status === 401,
      'Enabled anonymous session API must reject an anonymous request.',
    )
    assert(
      sandboxProbe.response.headers.get('cache-control') === 'no-store',
      'Session responses must not be cached.',
    )

    const loginPage = await request('/login')
    assert(loginPage.response.status === 200, 'Enabled App surface must expose /login.')
    assertSeoHead(loginPage.text, { url: `${baseUrl}/login`, indexable: false })

    const anonymousDashboard = await request('/dashboard', { redirect: 'manual' })
    assert(
      anonymousDashboard.response.status >= 300 && anonymousDashboard.response.status < 400,
      'Anonymous dashboard requests must redirect before rendering protected content.',
    )
    assert(
      anonymousDashboard.response.headers.get('location') === '/login',
      'Anonymous dashboard requests must redirect to the local login.',
    )

    const login = await request('/api/sandbox/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'maker@shiplean.local' }),
    })
    assert(login.response.status === 200, 'Sandbox login failed.')
    const cookie = login.response.headers.get('set-cookie')?.split(';')[0]
    assert(cookie?.startsWith('shiplean_sandbox_session='), 'Sandbox session cookie is missing.')

    const authenticated = await request('/api/sandbox/session', { headers: { cookie } })
    assert(authenticated.response.status === 200, 'Authenticated session readback failed.')
    assert(authenticated.text.includes('maker@shiplean.local'), 'Local identity is missing.')

    const dashboard = await request('/dashboard', { headers: { cookie } })
    assert(dashboard.response.status === 200, 'Starter dashboard must return 200.')
    assert(
      dashboard.text.includes('data-starter-dashboard'),
      'Starter dashboard content is missing.',
    )
    assert(dashboard.text.includes('maker@shiplean.local'), 'Dashboard session must render on SSR.')
    assert(dashboard.text.includes('Exit local demo'), 'Dashboard logout control is missing.')
    assertSeoHead(dashboard.text, { url: `${baseUrl}/dashboard`, indexable: false })

    const logout = await request('/api/sandbox/session', {
      method: 'DELETE',
      headers: { cookie },
    })
    assert(logout.response.status === 200, 'Sandbox logout failed.')
    assert(
      logout.response.headers.get('set-cookie')?.includes('Max-Age=0'),
      'Sandbox logout must expire the session cookie.',
    )

    const loggedOut = await request('/api/sandbox/session')
    assert(loggedOut.response.status === 401, 'Logged-out session must be anonymous.')
  }

  console.log(
    `E2E smoke passed for ${activeMode} mode: SEO-first sitemap, internal-link graph, mode-aware surfaces, metadata, legal templates, tool references, security, and local session lifecycle.`,
  )
} finally {
  server.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ])
}
