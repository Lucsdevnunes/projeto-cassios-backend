const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const bubblewrapDir = 'C:\\Users\\Lucas Nunes\\.bubblewrap';
const jdkDir = path.join(bubblewrapDir, 'jdk-portable');
const sdkDir = path.join(bubblewrapDir, 'android-sdk-portable');

const jdkZipUrl = 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.11%2B9/OpenJDK17U-jdk_x64_windows_hotspot_17.0.11_9.zip';
const sdkZipUrl = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip';

const jdkZipPath = path.join(bubblewrapDir, 'jdk.zip');
const sdkZipPath = path.join(bubblewrapDir, 'sdk.zip');

async function downloadFile(url, dest) {
  console.log(`Downloading ${url} to ${dest}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  console.log(`Finished downloading ${dest}`);
}

function unzip(zipPath, destPath) {
  console.log(`Unzipping ${zipPath} to ${destPath}...`);
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }
  // Use native PowerShell Expand-Archive
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`);
  console.log(`Finished unzipping to ${destPath}`);
}

async function main() {
  try {
    // Create base directories
    if (!fs.existsSync(bubblewrapDir)) {
      fs.mkdirSync(bubblewrapDir, { recursive: true });
    }

    // 1. Download JDK 17
    if (!fs.existsSync(jdkZipPath)) {
      await downloadFile(jdkZipUrl, jdkZipPath);
    }
    
    // 2. Download Android Command Line Tools
    if (!fs.existsSync(sdkZipPath)) {
      await downloadFile(sdkZipUrl, sdkZipPath);
    }

    // 3. Unzip JDK
    const jdkExtractDest = path.join(bubblewrapDir, 'jdk-temp');
    unzip(jdkZipPath, jdkExtractDest);

    // Locate the actual JDK directory inside temp
    const tempDirs = fs.readdirSync(jdkExtractDest);
    const actualJdkFolderName = tempDirs.find(d => d.startsWith('jdk-'));
    if (!actualJdkFolderName) throw new Error('Could not find jdk folder inside temp extract');
    
    const actualJdkPath = path.join(jdkDir, 'jdk-17');
    if (fs.existsSync(actualJdkPath)) {
      fs.rmSync(actualJdkPath, { recursive: true, force: true });
    }
    fs.mkdirSync(jdkDir, { recursive: true });
    fs.renameSync(path.join(jdkExtractDest, actualJdkFolderName), actualJdkPath);
    fs.rmSync(jdkExtractDest, { recursive: true, force: true });
    console.log(`Moved JDK to final location: ${actualJdkPath}`);

    // 4. Unzip Android SDK Command Line Tools
    // Note: Android SDK requires tools to be in cmdline-tools/latest
    const sdkTempExtract = path.join(bubblewrapDir, 'sdk-temp');
    unzip(sdkZipPath, sdkTempExtract);
    
    const finalCmdlineToolsDir = path.join(sdkDir, 'cmdline-tools', 'latest');
    if (fs.existsSync(finalCmdlineToolsDir)) {
      fs.rmSync(finalCmdlineToolsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(sdkDir, 'cmdline-tools'), { recursive: true });
    
    // The zip extracts a folder named 'cmdline-tools'
    fs.renameSync(path.join(sdkTempExtract, 'cmdline-tools'), finalCmdlineToolsDir);
    fs.rmSync(sdkTempExtract, { recursive: true, force: true });
    console.log(`Moved Android SDK tools to final location: ${finalCmdlineToolsDir}`);

    // 5. Update Bubblewrap config.json
    const configPath = path.join(bubblewrapDir, 'config.json');
    const config = {
      jdkPath: actualJdkPath,
      androidSdkPath: sdkDir
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Updated bubblewrap config.json at ${configPath} with paths:`, config);

    // Clean up zip files
    fs.unlinkSync(jdkZipPath);
    fs.unlinkSync(sdkZipPath);
    console.log('Cleaned up zip files. Configuration complete!');

  } catch (err) {
    console.error('Configuration failed:', err);
  }
}

main();
