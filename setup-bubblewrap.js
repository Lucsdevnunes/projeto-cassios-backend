const { spawn } = require('child_process');

console.log('Starting bubblewrap setup...');
const child = spawn('npx', ['@bubblewrap/cli', 'setup'], {
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe']
});

process.stdin.pipe(child.stdin);

child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  
  // Auto-respond to JDK installation prompt
  if (text.includes('Do you want Bubblewrap to install the JDK')) {
    console.log('\n[Auto-Responding: Y]');
    child.stdin.write('y\n');
  }

  // Auto-respond to Android CLI Tools installation prompt
  if (text.includes('install the Android Command Line Tools')) {
    console.log('\n[Auto-Responding: Y]');
    child.stdin.write('y\n');
  }

  // Confirm paths (accepting defaults by pressing Enter)
  if (text.includes('Path to the Java Development Kit (JDK)')) {
    console.log('\n[Auto-Responding: Confirming JDK path with Enter]');
    child.stdin.write('\n');
  }
  if (text.includes('Path to the Android SDK') || text.includes('Path to the Android Command Line Tools')) {
    console.log('\n[Auto-Responding: Confirming Android SDK path with Enter]');
    child.stdin.write('\n');
  }

  // Auto-accept licenses
  if (text.includes('Do you accept the license agreement')) {
    console.log('\n[Auto-Responding: Y]');
    child.stdin.write('y\n');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});
