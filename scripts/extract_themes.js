const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'docs', 'reference-designs', 'templates', 'boutiques');
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

const results = {};

themes.forEach(t => {
  const filePath = path.join(dir, t + '.html');
  if (!fs.existsSync(filePath)) {
    console.error('MISSING:', filePath);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const rootMatch = content.match(/:root\s*\{([^}]+)\}/s);
  const fontMatch = content.match(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/);
  
  results[t] = {
    fontUrl: fontMatch ? fontMatch[1] : null,
    vars: rootMatch ? rootMatch[1].trim() : ''
  };
});

console.log(JSON.stringify(results, null, 2));
