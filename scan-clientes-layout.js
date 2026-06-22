const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../frontend/src/app/(admin)/clientes/page.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('<table') || line.includes('flex-row') || line.includes('grid-cols') || line.includes('md:')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
