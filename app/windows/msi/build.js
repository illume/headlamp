// Be sure to have the wix tool set installed.
const { MSICreator } = require('electron-wix-msi');
const fs = require('fs');
const path = require('path');
const info = require('../../package.json');

// Detect the architecture from the dist directory
// electron-builder creates win-unpacked for x64 and win-arm64-unpacked for arm64
let ARCH = 'x64';
let APP_DIR = path.resolve(__dirname, '../../dist/win-unpacked');

// Check if ARM64 build exists
const arm64Dir = path.resolve(__dirname, '../../dist/win-arm64-unpacked');
if (fs.existsSync(arm64Dir)) {
  ARCH = 'arm64';
  APP_DIR = arm64Dir;
  console.log('Detected ARM64 build');
} else if (fs.existsSync(APP_DIR)) {
  console.log('Detected x64 build');
} else {
  console.error('No unpacked Windows build found. Please run electron-builder first.');
  process.exit(1);
}

const OUT_DIR = path.resolve(__dirname, '../../dist');

// Use different UUIDs for different architectures to allow side-by-side installation
const APP_UUIDS = {
  x64: 'b5678886-26a5-4a15-8513-17d67aaeaf68',
  arm64: 'c6789997-37b6-5b26-9624-28e78bbfbf79',
};
const APP_UUID = APP_UUIDS[ARCH];

const nameOptions = {
  productName: info.productName,
  version: info.version,
  os: 'win',
  arch: ARCH,
};

// Generate the exe name from electron-builder's artifactName
let installerName = info.build.artifactName.split('.')[0];
Object.entries(nameOptions).forEach(([key, value]) => {
  installerName = installerName.replace(`\${${key}}`, value);
});
installerName += '.msi';

// For reference: https://github.com/felixrieseberg/electron-wix-msi#configuration
const msiOptions = {
  appDirectory: APP_DIR,
  outputDirectory: OUT_DIR,
  description: info.description,
  exe: info.name, // Name of the executable to launch the app, not the final installer.
  arch: ARCH,
  name: info.productName,
  shortName: info.shortName || info.productName, // Needs to be a name without spaces!
  manufacturer: info.author.name,
  version: info.version,
  upgradeCode: APP_UUID,
  appIconPath: path.resolve(__dirname, '../../build/icons/icon.ico'),
  ui: {
    chooseDirectory: true,
  },
};

console.info('Generating MSI with the following options:', msiOptions);

const msiCreator = new MSICreator(msiOptions);

msiCreator.create().then(async () => {
  await msiCreator.compile();

  // Rename the executable to the full name we want.
  const installerPath = path.join(OUT_DIR, installerName);
  fs.renameSync(path.join(OUT_DIR, msiOptions.exe + '.msi'), installerPath);

  console.info('Created .msi installer at: ', installerPath);
});
