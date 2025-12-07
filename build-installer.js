const electronInstaller = require('electron-winstaller');
const path = require('path');

console.log('Creating windows installer...');

const rootPath = path.join('./');
const outPath = path.join(rootPath, 'installers');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: path.join(rootPath, 'voicetype-win32-x64'),
    outputDirectory: outPath,
    authors: 'Minnyat',
    exe: 'voicetype.exe',
    setupExe: 'VoiceTypeSetup.exe',
    noMsi: true
});

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));
