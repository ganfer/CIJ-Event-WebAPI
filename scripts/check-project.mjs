import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
let checks = 0;

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
  'public/js/api-wrapper.js',
  'public/js/event-grid.js',
  'public/js/event-details.js',
  'public/lib/PublicApi.bundle.js',
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
  ...walk('public/translations/events', (file) => file.endsWith('.json'))
];

for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
    check(true, `JSON is valid: ${relative(file)}`);
  } catch (error) {
    check(false, `JSON is valid: ${relative(file)} (${error.message})`);
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

const gitignore = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
check(/(?:^|\n)public\/js\/config\.js(?:\n|$)/.test(gitignore), '.gitignore excludes public/js/config.js');

if (failures.length > 0) {
  console.error(`Project checks failed (${failures.length}/${checks}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Project checks passed (${checks}/${checks}).`);
