import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(root);
const suites = ['table', 'table-games', 'physical', 'readable', 'offline', 'stable'];
const requested = process.argv.slice(2);
const selected = requested.length ? requested : suites;
if (selected.some(name => !suites.includes(name))) throw new Error(`Available suites: ${suites.join(', ')}`);
mkdirSync(join(root, 'output', 'playwright'), { recursive: true });

const server = await createServer({ root, server: { host: '127.0.0.1', port: 5186, strictPort: true } });
let browser;
const report = { browser: 'Chromium', physicalDeviceTested: false, results: [] };
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  for (const name of selected) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    try {
      const source = readFileSync(join(root, 'scripts', `qa-${name}.js`), 'utf8');
      const run = new Function('baseURL', 'offlineURL', `return (${source.trim()});`)(
        'http://127.0.0.1:5186/', pathToFileURL(join(root, 'dist', 'index.html')).href
      );
      const result = await run(page);
      report.results.push({ suite: name, passed: true, result });
      console.log(`PASS ${name}`);
    } catch (error) {
      report.results.push({ suite: name, passed: false, error: String(error) });
      await page.screenshot({ path: join(root, 'output', 'playwright', `failed-${name}.png`), fullPage: true }).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  writeFileSync(join(root, 'output', 'playwright', 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server.close();
}
