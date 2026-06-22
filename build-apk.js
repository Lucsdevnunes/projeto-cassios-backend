const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function typeInput(stdin, str) {
  // Replace all \n with \r since Inquirer in raw mode on Windows expects carriage return (\r)
  const normalized = str.replace(/\n/g, '\r');
  for (const char of normalized) {
    stdin.write(char);
    await new Promise(r => setTimeout(r, 25));
  }
}

async function runCommand(cmd, args, onData) {
  const jdkPath = 'C:\\Users\\Lucas Nunes\\.bubblewrap\\jdk-portable\\jdk-17';
  const jdkBinPath = path.join(jdkPath, 'bin');
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  const newPath = jdkBinPath + pathSeparator + (process.env.PATH || process.env.Path || '');

  return new Promise((resolve) => {
    console.log(`\nExecuting: ${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        JAVA_HOME: jdkPath,
        PATH: newPath,
        Path: newPath
      }
    });

    process.stdin.pipe(child.stdin);

    let stdoutBuffer = '';
    let isProcessing = false;

    async function checkBuffer() {
      if (isProcessing) return;
      isProcessing = true;
      try {
        let matched = true;
        while (matched) {
          matched = await onData(child.stdin, stdoutBuffer);
        }
      } catch (err) {
        console.error('Error in buffer check:', err);
      } finally {
        isProcessing = false;
      }
    }

    child.stdout.on('data', async (data) => {
      const text = data.toString();
      process.stdout.write(text);
      stdoutBuffer += text;
      await checkBuffer();
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    child.on('close', (code) => {
      console.log(`Process exited with code ${code}`);
      resolve(code);
    });
  });
}

async function main() {
  const manifestUrl = 'http://localhost:3000/manifest.webmanifest';
  
  // Step 1: Run init
  const answered = new Set();
  const initCode = await runCommand('npx', ['@bubblewrap/cli', 'init', `--manifest=${manifestUrl}`], async (stdin, stdoutBuffer) => {
    const lines = stdoutBuffer.split('\n');
    let lastPromptLine = '';
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('?')) {
        lastPromptLine = lines[i];
        break;
      }
    }

    if (!lastPromptLine) return false;
    const promptLower = lastPromptLine.toLowerCase();
    
    async function respond(key, value) {
      if (answered.has(key)) return false;
      answered.add(key);
      console.log(`\n[Auto-Responding: ${key} -> ${value.trim() || 'Enter'}]`);
      await typeInput(stdin, value);
      return true;
    }

    // Overwrite twa-manifest.json
    if (promptLower.includes('already exists') && promptLower.includes('overwrite')) {
      if (await respond('overwrite_manifest', 'yes\n')) return true;
    }

    // Domain
    if (promptLower.includes('domain') && !promptLower.includes('invalid')) {
      if (await respond('domain', '192.168.137.1\n')) return true;
    }
    // Application ID
    if (promptLower.includes('application id')) {
      if (await respond('app_id', 'com.cassios.clima\n')) return true;
    }
    // Keystore Password Confirm
    if (promptLower.includes('password for the key store (confirm)') || promptLower.includes('password for the keystore (confirm)')) {
      if (await respond('ks_pass_confirm', 'cassios123\n')) return true;
    }
    // Keystore Password
    if ((promptLower.includes('password for the key store') || promptLower.includes('password for the keystore')) && !promptLower.includes('(confirm)')) {
      if (await respond('ks_pass', 'cassios123\n')) return true;
    }
    // Key Password Confirm
    if (promptLower.includes('password for the key (confirm)') && !promptLower.includes('store') && !promptLower.includes('keystore')) {
      if (await respond('key_pass_confirm', 'cassios123\n')) return true;
    }
    // Key Password
    if (promptLower.includes('password for the key') && !promptLower.includes('store') && !promptLower.includes('keystore') && !promptLower.includes('(confirm)')) {
      if (await respond('key_pass', 'cassios123\n')) return true;
    }
    // First and last name
    if (promptLower.includes('first and last name') || promptLower.includes('first and last names')) {
      if (await respond('name', 'Cassios Clima\n')) return true;
    }
    // Organizational Unit
    if (promptLower.includes('organizational unit')) {
      if (await respond('unit', 'IT\n')) return true;
    }
    // Organization
    if (promptLower.includes('organization') && !promptLower.includes('unit')) {
      if (await respond('org', 'Cassios\n')) return true;
    }
    // City
    if (promptLower.includes('city') || promptLower.includes('locality')) {
      if (await respond('city', 'Goiania\n')) return true;
    }
    // State
    if (promptLower.includes('state') || promptLower.includes('province')) {
      if (await respond('state', 'GO\n')) return true;
    }
    // Country Code
    if (promptLower.includes('country')) {
      if (await respond('country', 'BR\n')) return true;
    }
    // Is this correct?
    if (promptLower.includes('is this correct')) {
      if (await respond('correct', 'yes\n')) return true;
    }

    // Default fallbacks (questions asking for paths/names/etc where we just hit Enter)
    const cleanKey = promptLower.replace(/\(.*\)/g, '').replace(/[^a-z0-9]/g, '_').substring(0, 60);
    if (cleanKey.replace(/_/g, '').length > 2) {
      if (await respond(`default_${cleanKey}`, '\n')) return true;
    }

    return false;
  });

  if (initCode !== 0) {
    console.error('Bubblewrap init failed!');
    return;
  }

  // Apply local network HTTP/Cleartext patches
  patchAndroidProject();

  // Step 2: Run build
  console.log('\n--- STARTING BUILD ---');
  const buildAnswered = new Set();
  await runCommand('npx', ['@bubblewrap/cli', 'build'], async (stdin, stdoutBuffer) => {
    const lines = stdoutBuffer.split('\n');
    let lastPromptLine = '';
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('?')) {
        lastPromptLine = lines[i];
        break;
      }
    }

    if (!lastPromptLine) return false;
    const promptLower = lastPromptLine.toLowerCase();
    
    async function respondBuild(key, value) {
      if (buildAnswered.has(key)) return false;
      buildAnswered.add(key);
      console.log(`\n[Auto-Responding Build: ${key}]`);
      await typeInput(stdin, value);
      return true;
    }

    // Disjoint partition matching for keystore vs key passwords
    if (promptLower.includes('password for the key store') || promptLower.includes('password for the keystore')) {
      if (await respondBuild('ks_pass', 'cassios123\n')) return true;
    }
    else if (promptLower.includes('password for the key') && !promptLower.includes('store') && !promptLower.includes('keystore')) {
      if (await respondBuild('key_pass', 'cassios123\n')) return true;
    }

    return false;
  });

  console.log('\nBuild finished. Checking for APK files...');
  const files = fs.readdirSync(process.cwd());
  const apkFiles = files.filter(f => f.endsWith('.apk'));
  if (apkFiles.length > 0) {
    console.log('Successfully generated APK files:', apkFiles);
    // Copy the release APK to the artifact directory for easy download
    const destDir = 'C:\\Users\\Lucas Nunes\\.gemini\\antigravity\\brain\\b0901184-c4c7-4c4d-80f7-72b8cb71c499';
    apkFiles.forEach(f => {
      const srcPath = path.join(process.cwd(), f);
      const destPath = path.join(destDir, f);
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${f} to artifacts directory: ${destPath}`);
    });
  } else {
    console.log('No APK files found.');
  }
}

function patchAndroidProject() {
  console.log('\n--- PATCHING ANDROID PROJECT FOR LOCAL HTTP/CLEARTEXT ---');
  
  // 1. Patch app/build.gradle
  const gradlePath = path.join(process.cwd(), 'app', 'build.gradle');
  if (fs.existsSync(gradlePath)) {
    let gradleContent = fs.readFileSync(gradlePath, 'utf8');
    
    // Change hostName to include port 3000
    gradleContent = gradleContent.replace(
      "hostName: '192.168.137.1',",
      "hostName: '192.168.137.1:3000',"
    );
    
    // Change https to http for launchUrl
    gradleContent = gradleContent.replace(
      'def launchUrl = "https://" + twaManifest.hostName',
      'def launchUrl = "http://" + twaManifest.hostName'
    );
    
    fs.writeFileSync(gradlePath, gradleContent, 'utf8');
    console.log('Patched app/build.gradle successfully!');
  } else {
    console.error('app/build.gradle not found!');
  }

  // 2. Patch app/src/main/AndroidManifest.xml
  const manifestPath = path.join(process.cwd(), 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    let manifestContent = fs.readFileSync(manifestPath, 'utf8');
    
    // Add android:usesCleartextTraffic="true" to <application
    if (!manifestContent.includes('android:usesCleartextTraffic="true"')) {
      manifestContent = manifestContent.replace(
        '<application',
        '<application android:usesCleartextTraffic="true"'
      );
      console.log('Added android:usesCleartextTraffic="true" to AndroidManifest.xml');
    }
    
    // Change scheme to http in intent filter
    manifestContent = manifestContent.replace(
      'android:scheme="https"',
      'android:scheme="http"'
    );
    
    fs.writeFileSync(manifestPath, manifestContent, 'utf8');
    console.log('Patched AndroidManifest.xml successfully!');
  } else {
    console.error('AndroidManifest.xml not found!');
  }
}

main();
