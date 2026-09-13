import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
let checks = 0;
const supportedLocales = [
  'en-US', 'de-DE', 'it-IT', 'fr-FR',
  'es-ES', 'pt-PT', 'pl-PL', 'cs-CZ'
];

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath, predicate);
    return predicate(fullPath) ? [fullPath] : [];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

const requiredFiles = [
  'public/index.html',
  'public/event-details.html',
  'public/js/config.example.js',
  'public/js/security.js',
  'public/js/api-wrapper.js',
  'public/js/event-grid.js',
  'public/js/event-details.js',
  'public/js/form-translations.js',
  'public/lib/PublicApi.bundle.js',
  'public/_headers',
  'docs/START.md',
  'docs/API.md',
  'docs/SECURITY.md',
  'package.json',
  'package-lock.json',
  'server.js'
];

for (const file of requiredFiles) {
  check(fs.existsSync(file), `required file exists: ${file}`);
}

const authoredJavaScript = [
  'server.js',
  ...walk('public/js', (file) => file.endsWith('.js') && !file.endsWith('config.js')),
  ...walk('scripts', (file) => file.endsWith('.js') || file.endsWith('.mjs'))
];

for (const file of authoredJavaScript) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  check(syntax.status === 0, `JavaScript syntax is valid: ${relative(file)}`);
  if (syntax.status !== 0 && syntax.stderr) {
    console.error(syntax.stderr.trim());
  }
}

const jsonFiles = [
  'package.json',
  'package-lock.json',
  ...walk('public/locales', (file) => file.endsWith('.json')),
  ...walk('public/translations/events', (file) => file.endsWith('.json')),
  ...walk('public/translation/forms', (file) => file.endsWith('.json'))
];

for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
    check(true, `JSON is valid: ${relative(file)}`);
  } catch (error) {
    check(false, `JSON is valid: ${relative(file)} (${error.message})`);
  }
}

const localeFiles = walk('public/locales', (file) => file.endsWith('.json'));
const discoveredLocales = localeFiles
  .map((file) => path.basename(file).match(/^translation\.(.+)\.json$/)?.[1])
  .filter(Boolean);
check(
  JSON.stringify([...discoveredLocales].sort()) === JSON.stringify([...supportedLocales].sort()),
  `locale files match the supported locale set: ${supportedLocales.join(', ')}`
);

const expectedLanguageKeys = supportedLocales.map((locale) => `lang_${locale}`).sort();
for (const file of localeFiles) {
  const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
  const languageKeys = Object.keys(translations).filter((key) => key.startsWith('lang_')).sort();
  check(
    JSON.stringify(languageKeys) === JSON.stringify(expectedLanguageKeys),
    `${relative(file)} contains language labels for exactly the supported locales`
  );

  for (const key of expectedLanguageKeys) {
    const label = translations[key];
    check(
      typeof label === 'string' && label.trim() && !/[()]/.test(label),
      `${relative(file)} ${key} is a language-only label without a country/region suffix`
    );
  }
}

const localizationSource = fs.readFileSync('public/js/localization.js', 'utf8');
const supportedLocalesBlock = localizationSource.match(/this\.supportedLocales\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
const configuredLocales = [...supportedLocalesBlock.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
check(
  JSON.stringify(configuredLocales) === JSON.stringify(supportedLocales),
  'localization.js exposes the supported locales in the documented switcher order'
);

const serverSource = fs.readFileSync('server.js', 'utf8');
const allowedLocalesBlock = serverSource.match(/const allowedLocales\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
const serverLocales = [...allowedLocalesBlock.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
check(
  JSON.stringify(serverLocales) === JSON.stringify(supportedLocales),
  'server.js allows exactly the supported locales in the documented switcher order'
);

for (const directory of ['public/translations/events', 'public/translation/forms']) {
  for (const file of walk(directory, (candidate) => candidate.endsWith('.json') && !candidate.endsWith('.source.json'))) {
    const translation = JSON.parse(fs.readFileSync(file, 'utf8'));
    const unexpectedLocales = Object.keys(translation)
      .filter((key) => /^[a-z]{2}(?:-[A-Za-z0-9]+)+$/.test(key) && !supportedLocales.includes(key));
    check(unexpectedLocales.length === 0, `${relative(file)} contains no unsupported locale sections`);

    const unexpectedPending = Array.isArray(translation?._meta?.pendingLocales)
      ? translation._meta.pendingLocales.filter((locale) => !supportedLocales.includes(locale))
      : [];
    check(unexpectedPending.length === 0, `${relative(file)} contains no unsupported pending locales`);
  }
}

const htmlFiles = ['public/index.html', 'public/event-details.html'];
const generatedAtRuntime = new Set(['public/js/config.js']);

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const htmlDirectory = path.dirname(htmlFile);
  const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((reference) => reference && !/^(?:#|https?:|\/\/|mailto:|tel:|data:|javascript:)/i.test(reference));

  for (const reference of references) {
    const cleanReference = reference.split('#')[0].split('?')[0];
    if (!cleanReference) continue;

    const resolved = path.normalize(path.join(htmlDirectory, cleanReference));
    const normalized = resolved.split(path.sep).join('/');
    const exists = fs.existsSync(resolved) || generatedAtRuntime.has(normalized);
    check(exists, `${relative(htmlFile)} local reference exists: ${reference}`);
  }
}

const markdownFiles = ['README.md', ...walk('docs', (file) => file.endsWith('.md'))];
for (const markdownFile of markdownFiles) {
  const markdown = fs.readFileSync(markdownFile, 'utf8');
  const markdownDirectory = path.dirname(markdownFile);
  const references = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1].split('#')[0])
    .filter((reference) => reference && !/^(?:https?:|mailto:|#)/i.test(reference));

  for (const reference of references) {
    const resolved = path.normalize(path.join(markdownDirectory, reference));
    check(fs.existsSync(resolved), `${relative(markdownFile)} local documentation link exists: ${reference}`);
  }
}

const gitignore = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
check(/(?:^|\n)public\/js\/config\.js(?:\n|$)/.test(gitignore), '.gitignore excludes public/js/config.js');
check(/(?:^|\n)_site\/(?:\n|$)/.test(gitignore), '.gitignore excludes generated _site/ output');

const trackedConfig = spawnSync('git', ['ls-files', '--error-unmatch', 'public/js/config.js'], { encoding: 'utf8' });
check(trackedConfig.status !== 0, 'public/js/config.js is not tracked by Git');

if (failures.length > 0) {
  console.error(`Project checks failed (${failures.length}/${checks}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Project checks passed (${checks}/${checks}).`);
