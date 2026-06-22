const { spawn } = require('child_process');
const path = require('path');

const bubblewrapDir = 'C:\\Users\\Lucas Nunes\\.bubblewrap';
const jdkPath = path.join(bubblewrapDir, 'jdk-portable', 'jdk-17');
const sdkPath = path.join(bubblewrapDir, 'android-sdk-portable');
const sdkmanagerPath = path.join(sdkPath, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat');

console.log('Using JDK:', jdkPath);
console.log('Using SDK manager:', sdkmanagerPath);

async function runSdkmanager(args, autoRespondY = false) {
  return new Promise((resolve, reject) => {
    // Quote the command path to handle spaces in folder name "Lucas Nunes"
    const cmd = `"${sdkmanagerPath}"`;
    console.log(`\nRunning: ${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, {
      env: {
        ...process.env,
        JAVA_HOME: jdkPath
      },
      shell: true
    });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (autoRespondY && (text.includes('(y/N)') || text.includes('Accept?') || text.includes('Review license'))) {
        child.stdin.write('y\n');
      }
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    child.on('close', (code) => {
      console.log(`sdkmanager exited with code ${code}`);
      if (code === 0) resolve();
      else reject(new Error(`sdkmanager failed with exit code ${code}`));
    });
  });
}

async function main() {
  try {
    // 1. Accept licenses first
    console.log('Accepting Android SDK licenses...');
    await runSdkmanager(['--sdk_root="' + sdkPath + '"', '--licenses'], true);

    // 2. Install build-tools and platform
    console.log('Installing Android SDK packages (build-tools;34.0.0, platforms;android-34, platform-tools)...');
    await runSdkmanager([
      '--sdk_root="' + sdkPath + '"',
      '"build-tools;34.0.0"',
      '"platforms;android-34"',
      '"platform-tools"'
    ], true);

    console.log('Android SDK packages installed successfully!');
  } catch (err) {
    console.error('Failed to install SDK packages:', err);
  }
}

main();
