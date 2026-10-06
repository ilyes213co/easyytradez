const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'docs', 'reference-designs', 'templates', 'boutiques');
const targetDirs = [
  path.join(__dirname, '..', 'platform', 'styles', 'themes'),
  path.join(__dirname, '..', 'frontend', 'styles', 'themes'),
];

const themes = [
  'monochrome',
  'blossom-lavender',
  'phantom',
  'playful-pumpkin',
  'crimson',
  'natural',
  'energetic',
  'tuareg-indigo',
  'neo-brutalist',
  'luxe-noir'
];

themes.forEach(t => {
  const htmlPath = path.join(srcDir, `${t}.html`);
  if (!fs.existsSync(htmlPath)) {
    console.error(`Missing HTML template: ${htmlPath}`);
    return;
  }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const rootMatch = html.match(/:root\s*\{([^}]+)\}/s);
  if (!rootMatch) {
    console.error(`No :root block found in ${t}.html`);
    return;
  }

  // Format variables cleanly
  const rawVars = rootMatch[1].trim().split('\n').map(line => line.trim()).filter(Boolean);
  const formattedVars = rawVars.map(line => `  ${line}`).join('\n');
  const cssContent = `[data-theme="${t}"] {\n${formattedVars}\n}\n`;

  targetDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const targetFile = path.join(dir, `${t}.css`);
    fs.writeFileSync(targetFile, cssContent, 'utf-8');
    console.log(`Wrote: ${targetFile}`);
  });
});
