const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip node_modules/.bin or similar if needed, but let's check node_modules/@bubblewrap
      if (file === 'node_modules' && !dir.endsWith('backend')) continue;
      searchDir(fullPath, query);
    } else if (stat.isFile() && file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes(query)) {
        console.log(`Found match in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(query) || line.includes('androidSdkPath')) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log('Searching in node_modules/@bubblewrap:');
const startPath = path.join(__dirname, 'node_modules', '@bubblewrap');
if (fs.existsSync(startPath)) {
  searchDir(startPath, 'androidSdkPath');
  searchDir(startPath, 'The androidSdkPath');
} else {
  console.log('Path not found:', startPath);
}
