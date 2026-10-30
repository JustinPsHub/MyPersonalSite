import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'MyPersonalSite/wwwroot');
const output = path.join(root, 'artifacts/static-site');
const pages = ['index', 'visuals', 'platform', 'resume', 'contact', 'privacy'];

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'portfolio'), { recursive: true });
for (const page of pages) {
  await cp(path.join(source, 'portfolio', `${page}.html`), path.join(output, `${page}.html`));
}
// Explicitly include the public frontend assets, never the host, configuration,
// database, or other files in wwwroot.
for (const file of ['telemetry.js','telemetry.css','owner-navigation.js','admin-session.js','observatory-admin.css','observatory-admin.js','preferences.js', 'engine.js', 'app.js', 'modern.js', 'contact.js', 'style.css', 'studio.css', 'studio.js', 'product.css', 'lab-previews.js', 'event-lab.js', 'atlas.css', 'journey.css', 'journey.js', 'journey-engine.js', 'atlas-engine.js', 'atlas.js', 'favicon.svg', 'fonts']) {
  await cp(path.join(source, 'portfolio', file), path.join(output, 'portfolio', file), { recursive: true });
}
await mkdir(path.join(output, 'resume'), { recursive: true });
for (const file of ['jrp_resume_20260128.docx', 'justin-palmer-resume.pdf']) await cp(path.join(source, 'resume', file), path.join(output, 'resume', file));
await cp(path.join(root, 'staticwebapp.config.json'), path.join(output, 'staticwebapp.config.json'));

const site = 'https://www.justinraypalmer.com';
await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/visuals', '/platform', '/resume'].map(route => `  <url><loc>${site}${route}</loc></url>`).join('\n')}\n</urlset>\n`);

// Publishing must not silently reintroduce a harvestable recipient address.
for (const file of [...pages.map(page => `${page}.html`), ...['telemetry', 'owner-navigation', 'admin-session', 'observatory-admin', 'preferences', 'engine', 'app', 'modern', 'contact', 'atlas-engine', 'journey', 'journey-engine', 'atlas', 'studio', 'lab-previews', 'event-lab'].map(name => `portfolio/${name}.js`)]) {
  const text = await readFile(path.join(output, file), 'utf8');
  if (/[A-Za-z0-9_.+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)) throw new Error(`Email address found in public asset: ${file}`);
}

let files = 0, bytes = 0;
async function measure(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) await measure(file);
    else { files++; bytes += (await stat(file)).size; }
  }
}
await measure(output);
// Fail early if the release unexpectedly grows beyond the free plan's limit.
if (bytes > 250 * 1024 * 1024 || files > 15000) throw new Error('Static release exceeds the Azure Free plan limits.');
JSON.parse(await readFile(path.join(output, 'staticwebapp.config.json'), 'utf8'));
console.log(`Static release: ${path.relative(root, output)} (${files} files, ${bytes.toLocaleString('en-US')} bytes)`);
