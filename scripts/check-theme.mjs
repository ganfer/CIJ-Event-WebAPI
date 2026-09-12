import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = {
  index: fs.readFileSync('public/index.html', 'utf8'),
  details: fs.readFileSync('public/event-details.html', 'utf8'),
  css: fs.readFileSync('public/css/theme.css', 'utf8'),
  registrationCss: fs.readFileSync('public/css/registration-form-theme.css', 'utf8'),
  init: 'public/js/theme-init.js',
  runtime: 'public/js/theme.js',
  registrationRuntime: 'public/js/registration-form-theme.js'
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

check(files.details.includes('css/registration-form-theme.css'), 'details: registration form theme stylesheet is loaded');
check(files.details.includes('js/registration-form-theme.js'), 'details: registration form theme controller is loaded');
check(files.details.indexOf('css/registration-form-theme.css') > files.details.indexOf('css/theme.css'), 'details: registration form overrides load after the shared theme');
check(files.details.indexOf('js/registration-form-theme.js') < files.details.indexOf('js/event-details.js'), 'details: registration form observer is registered before the event form can render');

for (const jsFile of [files.init, files.runtime, files.registrationRuntime]) {
  const syntax = spawnSync(process.execPath, ['--check', jsFile], { encoding: 'utf8' });
  check(syntax.status === 0, `${jsFile}: JavaScript syntax is valid`);
}

const registrationRuntimeSource = fs.readFileSync(files.registrationRuntime, 'utf8');
check(registrationRuntimeSource.includes('d365mkt-afterformload'), 'registration form: listens for the Customer Insights after-form-load event');
check(registrationRuntimeSource.includes('MutationObserver'), 'registration form: observes asynchronously inserted form markup');
check(registrationRuntimeSource.includes('event-portal-ci-form-themed'), 'registration form: marks themed form hosts without replacing submission logic');
check(!registrationRuntimeSource.includes('preventDefault'), 'registration form: does not intercept or replace form submission');

check(files.css.includes('@media (max-width: 520px)'), 'theme: compact mobile breakpoint exists');
check(files.css.includes('@media (prefers-reduced-motion: reduce)'), 'theme: reduced-motion preference is respected');

check(files.registrationCss.includes('.event-portal-registration-form-wrapper'), 'registration form: all overrides are scoped to the portal registration wrapper');
check(files.registrationCss.includes('[data-editorblocktype]'), 'registration form: Customer Insights editor blocks are normalized');
check(files.registrationCss.includes('input[type="checkbox"]'), 'registration form: checkbox styling exists');
check(files.registrationCss.includes('input[type="radio"]'), 'registration form: radio styling exists');
check(files.registrationCss.includes('button[type="submit"]'), 'registration form: submit button styling exists');
check(files.registrationCss.includes('[role="alert"]'), 'registration form: validation feedback styling exists');
check(files.registrationCss.includes('html[data-theme="dark"]'), 'registration form: dark mode overrides exist');
check(files.registrationCss.includes('color-scheme: dark'), 'registration form: native controls use dark color scheme in dark mode');
check(files.registrationCss.includes('@media (max-width: 620px)'), 'registration form: mobile layout adjustments exist');
check(files.registrationCss.includes('@media (prefers-reduced-motion: reduce)'), 'registration form: reduced-motion preference is respected');
check(!files.registrationCss.includes('background: #ffffff'), 'registration form: no forced white form surface remains');

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
