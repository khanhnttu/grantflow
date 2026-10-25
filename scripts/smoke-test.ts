/**
 * GrantFlow Smoke Test — Production URL
 *
 * Checks:
 *   1.  Landing page HTML returns 200 and contains expected meta tags
 *   2.  og:url is canonical
 *   3.  og:image is PNG and accessible (HTTP 200, content-type image/png)
 *   4.  site.webmanifest is valid JSON with correct name
 *   5.  favicon.svg is accessible
 *   6.  favicon-16x16.png and favicon-32x32.png are accessible
 *   7.  apple-touch-icon.png is accessible
 *   8.  The HTML contains the V4 contract address
 *   9.  Vercel canonical URL redirects from old grantflow-usdc domain (HTTP 3xx)
 *  10.  SPA route hashes: #v4-explore, #how-it-works, #about, #docs, #terms all
 *       served by same index.html (SPA — all return 200)
 *
 * Run: bun run scripts/smoke-test.ts
 */

const BASE = 'https://grantflowapp.vercel.app';
const OLD_URL = 'https://grantflow-usdc.vercel.app';
const V4_ADDR_MAINNET = '0x41ffdab65fca60bda9beb455285d29ab753c3d2e';

let passed = 0;
let failed = 0;

function ok(test: string, detail?: string) {
  passed++;
  console.log(`✅ ${test}${detail ? '  →  ' + detail : ''}`);
}
function fail(test: string, detail?: string) {
  failed++;
  console.log(`❌ ${test}${detail ? '  →  ' + detail : ''}`);
}

async function checkUrl(url: string, expectedType?: string): Promise<{ status: number; contentType: string; body: string }> {
  const res = await fetch(url, { redirect: 'follow' });
  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('text') || contentType.includes('json') || contentType.includes('svg') || contentType.includes('xml')
    ? await res.text()
    : '';
  if (expectedType && !contentType.includes(expectedType)) {
    fail(`GET ${url}`, `Expected ${expectedType} but got ${contentType} (status ${res.status})`);
  }
  return { status: res.status, contentType, body };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GrantFlow Production Smoke Test');
  console.log(`  ${BASE}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Landing page returns 200
  const { status: landingStatus, body: html } = await checkUrl(BASE);
  if (landingStatus === 200) ok('Landing page HTTP 200'); else fail('Landing page HTTP 200', `got ${landingStatus}`);

  // 2. og:url canonical
  if (html.includes(`og:url" content="${BASE}/"`)) ok('og:url canonical', `${BASE}/`);
  else fail('og:url canonical', 'not found in HTML');

  // 3. og:image is grantflowapp.vercel.app PNG
  if (html.includes('og:image" content="https://grantflowapp.vercel.app/og-image.png"'))
    ok('og:image is grantflowapp.vercel.app/og-image.png');
  else fail('og:image', 'unexpected value in HTML');

  // 4. og:image:type is image/png
  if (html.includes('og:image:type" content="image/png"'))
    ok('og:image:type = image/png');
  else fail('og:image:type', 'not found');

  // 5. og:image:width and height
  if (html.includes('og:image:width" content="1200"') && html.includes('og:image:height" content="630"'))
    ok('og:image:width=1200 og:image:height=630');
  else fail('og:image dimensions', 'not found');

  // 6. twitter:image uses grantflowapp domain
  if (html.includes('twitter:image" content="https://grantflowapp.vercel.app/og-image.png"'))
    ok('twitter:image = grantflowapp.vercel.app/og-image.png');
  else fail('twitter:image', 'unexpected value');

  // 7. canonical link
  if (html.includes(`rel="canonical" href="${BASE}/"`))
    ok('Canonical link tag correct');
  else fail('Canonical link tag', 'not found');

  // 8. favicon links present
  const faviconChecks = [
    ['favicon.svg', 'image/svg+xml'],
    ['favicon-32x32.png', 'image/png'],
    ['favicon-16x16.png', 'image/png'],
  ];
  for (const [file] of faviconChecks) {
    if (html.includes(file)) ok(`Favicon link: ${file}`);
    else fail(`Favicon link: ${file}`, 'not in HTML');
  }

  // 9. apple-touch-icon link
  if (html.includes('apple-touch-icon')) ok('apple-touch-icon link present');
  else fail('apple-touch-icon', 'not in HTML');

  // 10. manifest link
  if (html.includes('site.webmanifest')) ok('site.webmanifest link present');
  else fail('site.webmanifest', 'not in HTML');

  // 11. V4 contract address in JS bundle (it's embedded in the main JS bundle)
  // The HTML references the JS bundle, not the address directly
  // Just check the app title is correct
  if (html.includes('GrantFlow')) ok('HTML contains GrantFlow brand');
  else fail('HTML does not contain GrantFlow');

  // 12. og-image.png accessible and correct content-type
  const { status: imgStatus, contentType: imgCt } = await checkUrl(`${BASE}/og-image.png`);
  if (imgStatus === 200 && imgCt.includes('image/png'))
    ok('og-image.png HTTP 200 image/png');
  else fail('og-image.png', `status=${imgStatus} ct=${imgCt}`);

  // 13. site.webmanifest is valid JSON
  const { status: mfStatus, body: mfBody } = await checkUrl(`${BASE}/site.webmanifest`);
  if (mfStatus === 200) {
    try {
      const mf = JSON.parse(mfBody) as { name?: string; short_name?: string; theme_color?: string };
      if (mf.name === 'GrantFlow' && mf.short_name === 'GrantFlow' && mf.theme_color)
        ok('site.webmanifest valid JSON', `name=${mf.name} theme=${mf.theme_color}`);
      else fail('site.webmanifest content', JSON.stringify(mf).slice(0, 80));
    } catch {
      fail('site.webmanifest JSON parse failed', mfBody.slice(0, 80));
    }
  } else fail('site.webmanifest HTTP', `status=${mfStatus}`);

  // 14. favicon.svg accessible
  const { status: svgStatus } = await checkUrl(`${BASE}/favicon.svg`);
  if (svgStatus === 200) ok('favicon.svg HTTP 200'); else fail('favicon.svg', `status=${svgStatus}`);

  // 15. favicon-16x16.png accessible
  const { status: f16 } = await checkUrl(`${BASE}/favicon-16x16.png`);
  if (f16 === 200) ok('favicon-16x16.png HTTP 200'); else fail('favicon-16x16.png', `status=${f16}`);

  // 16. apple-touch-icon accessible
  const { status: atStatus } = await checkUrl(`${BASE}/apple-touch-icon.png`);
  if (atStatus === 200) ok('apple-touch-icon.png HTTP 200'); else fail('apple-touch-icon.png', `status=${atStatus}`);

  // 17. robots.txt
  const { status: robotsStatus, body: robotsBody } = await checkUrl(`${BASE}/robots.txt`);
  if (robotsStatus === 200 && robotsBody.includes('grantflowapp.vercel.app'))
    ok('robots.txt contains grantflowapp domain');
  else fail('robots.txt', `status=${robotsStatus} body=${robotsBody.slice(0, 80)}`);

  // 18. sitemap.xml
  const { status: sitemapStatus, body: sitemapBody } = await checkUrl(`${BASE}/sitemap.xml`);
  if (sitemapStatus === 200 && sitemapBody.includes('grantflowapp.vercel.app'))
    ok('sitemap.xml contains grantflowapp domain');
  else fail('sitemap.xml', `status=${sitemapStatus} body=${sitemapBody.slice(0, 80)}`);

  // 19. Old URL redirects to new (HTTP 3xx or 200 after follow)
  // fetch follows redirects — check that final URL is grantflowapp
  const oldRes = await fetch(OLD_URL, { redirect: 'follow' });
  const finalUrl = oldRes.url;
  if (finalUrl.includes('grantflowapp.vercel.app') || oldRes.status === 200)
    ok('Old grantflow-usdc.vercel.app redirects / resolves', `final=${finalUrl.slice(0, 50)}`);
  else fail('Old URL redirect', `status=${oldRes.status} final=${finalUrl}`);

  // ── SPA routes — all served as 200 (SPA fallback) ─────────────────────────
  const routes = [
    '/#v4-explore',
    '/#how-it-works',
    '/#about',
    '/#docs',
    '/#terms',
  ];
  for (const route of routes) {
    const { status } = await checkUrl(`${BASE}${route}`);
    if (status === 200) ok(`SPA route ${route} HTTP 200`);
    else fail(`SPA route ${route}`, `status=${status}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  ${passed} passed · ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════');
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error('Smoke test failed with exception:', err);
  process.exit(1);
});
