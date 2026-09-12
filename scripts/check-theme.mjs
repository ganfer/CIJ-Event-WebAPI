import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = {
  index: fs.readFileSync('public/index.html', 'utf8'),
  details: fs.readFileSync('public/event-details.html', 'utf8'),
  css: fs.readFileSync('public/css/theme.css', 'utf8'),
  init: 'public/js/theme-init.js',
  runtime: 'public/js/theme.js'
};

const failures = [];
const checks = [];
const contrastResults = [];

function check(condition, message) {
  checks.push(message);
  if (!condition) failures.push(message);
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function channelToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(channelToLinear);
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function contrast(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function themeVariables(theme) {
  const marker = `html[data-theme="${theme}"]`;
  const start = files.css.indexOf(marker);
  check(start >= 0, `${theme}: theme selector exists`);
  if (start < 0) return {};

  const open = files.css.indexOf('{', start);
  const close = files.css.indexOf('}', open);
  const block = files.css.slice(open + 1, close);
  const variables = {};

  for (const match of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    variables[match[1]] = match[2];
  }

  return variables;
}

function checkContrast(theme, variables) {
  const pairs = [
    ['theme-text', 'theme-surface', 4.5],
    ['theme-text-muted', 'theme-surface', 4.5],
    ['theme-text-soft', 'theme-surface', 4.5],
    ['theme-accent', 'theme-surface', 4.5],
    ['theme-accent-contrast', 'theme-accent', 4.5],
    ['theme-error-text', 'theme-error-bg', 4.5],
    ['theme-focus', 'theme-surface', 3.0]
  ];

  for (const [foreground, background, minimum] of pairs) {
    const fg = variables[foreground];
    const bg = variables[background];
    check(Boolean(fg && bg), `${theme}: ${foreground}/${background} colors are defined`);
    if (!fg || !bg) continue;

    const ratio = contrast(fg, bg);
    contrastResults.push(`${theme}: ${foreground} on ${background} = ${ratio.toFixed(2)}:1`);
    check(ratio >= minimum, `${theme}: ${foreground}/${background} contrast ${ratio.toFixed(2)}:1 >= ${minimum}:1`);
  }
}

for (const [name, html] of [['index', files.index], ['details', files.details]]) {
  const initPosition = html.indexOf('js/theme-init.js');
  const firstStylesheet = html.indexOf('<link rel="stylesheet"');
  check(initPosition >= 0 && initPosition < firstStylesheet, `${name}: early theme initialization runs before stylesheets`);
  check(html.includes('css/theme.css'), `${name}: shared theme stylesheet is loaded`);
  check(html.includes('js/theme.js'), `${name}: theme controller is loaded`);
  check(html.includes('name="color-scheme" content="light dark"'), `${name}: browser color-scheme metadata is present`);
  check(count(html, /data-theme-choice="system"/g) === 1, `${name}: one System theme option exists`);
  check(count(html, /data-theme-choice="light"/g) === 1, `${name}: one Light theme option exists`);
  check(count(html, /data-theme-choice="dark"/g) === 1, `${name}: one Dark theme option exists`);
  check(html.includes('role="group" aria-label="Color theme"'), `${name}: theme switcher has an accessible group label`);
  check(html.includes('data-theme-status aria-live="polite"'), `${name}: theme changes have a screen-reader status region`);
}

for (const jsFile of [files.init, files.runtime]) {
  const syntax = spawnSync(process.execPath, ['--check', jsFile], { encoding: 'utf8' });
  check(syntax.status === 0, `${jsFile}: JavaScript syntax is valid`);
}

check(files.css.includes('@media (max-width: 520px)'), 'theme: compact mobile breakpoint exists');
check(files.css.includes('@media (prefers-reduced-motion: reduce)'), 'theme: reduced-motion preference is respected');
check(files.css.includes('html[data-theme="dark"] .event-portal-registration-form-wrapper'), 'theme: external registration form has a protected dark-mode host surface');
check(files.css.includes('color-scheme: light;'), 'theme: embedded registration form keeps light native controls in dark mode');

const light = themeVariables('light');
const dark = themeVariables('dark');
checkContrast('light', light);
checkContrast('dark', dark);

contrastResults.forEach(result => console.log(result));

if (failures.length > 0) {
  console.error(`Theme quality checks failed (${failures.length}/${checks.length}):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Theme quality checks passed (${checks.length}/${checks.length}).`);
