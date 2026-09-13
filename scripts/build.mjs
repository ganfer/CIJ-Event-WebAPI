import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('public');
const output = path.resolve('_site');

if (!fs.existsSync(source)) {
  console.error('Cannot build: public/ does not exist.');
  process.exit(1);
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

fs.cpSync(source, output, {
  recursive: true,
  filter(currentSource) {
    const relativePath = path.relative(source, currentSource).split(path.sep).join('/');
    return relativePath !== 'js/config.js';
  }
});

fs.writeFileSync(path.join(output, '.nojekyll'), '', 'utf8');

const generatedConfig = path.join(output, 'js', 'config.js');
if (fs.existsSync(generatedConfig)) {
  console.error('Build safety check failed: public/js/config.js was copied into _site/.');
  process.exit(1);
}

for (const required of ['index.html', 'event-details.html', 'js/config.example.js']) {
  const target = path.join(output, required);
  if (!fs.existsSync(target)) {
    console.error(`Build output is missing required file: ${required}`);
    process.exit(1);
  }
}

console.log('Static site built successfully in _site/.');
