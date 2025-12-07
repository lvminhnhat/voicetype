const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, shell } = require('electron');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const path = require('path');
const { registerHotkey, unregisterAll } = require('./hotkey');
const { createTray } = require('./tray');
const { APIKeyManager, callGemini, transcribeAudio } = require('./api-manager');

// ... (existing code) ...

// IPC Handlers
// ...



// ... (rest of code)


let mainWindow;
let overlayWindow;
let isRecording = false;
const apiKeyManager = new APIKeyManager();
let appConfig = {
    language: 'vi-VN',
    autoPaste: false,
    voiceCmd: true,
    hotkey: 'CommandOrControl+Alt+V'
};

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
        }
    });

    // Continue with app initialization
    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            autoHideMenuBar: true,
            frame: false, // Frameless window
            transparent: true, // Enable transparency for rounded corners
            titleBarStyle: 'hidden', // Hide title bar but keep window controls overlay
            icon: path.join(__dirname, '../../assets/logo.png')
        });

        // Make window draggable
        ipcMain.on('minimize-window', () => mainWindow.minimize());
        ipcMain.on('close-window', () => mainWindow.close());

        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

        // Handle external links
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('https://')) {
                shell.openExternal(url);
            }
            return { action: 'deny' };
        });

        mainWindow.on('close', (event) => {
            // If triggered by 'Quit App' button (isQuiting=true), let it close.
            // If triggered by Alt+F4, Taskbar, or 'close-window' IPC, prevent and ask user.
            if (!app.isQuiting) {
                event.preventDefault();
                mainWindow.show(); // Ensure window is visible
                mainWindow.webContents.send('show-exit-confirm');
            }
        });

        // Handle explicit Quit from Custom UI
        ipcMain.on('quit-app', () => {
            app.isQuiting = true;
            app.exit(0); // Force exit, bypassing close handlers
        });

        createTray(mainWindow);
    }


    function createOverlayWindow() {
        overlayWindow = new BrowserWindow({
            width: 300,
            height: 100,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false
        });

        overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));

        overlayWindow.on('closed', () => {
            overlayWindow = null;
        });
    }



    app.whenReady().then(() => {
        createWindow();
        createOverlayWindow();

        if (appConfig.hotkey) {
            registerHotkey(appConfig.hotkey, () => {
                toggleRecording();
            });
        } else {
            registerHotkey('CommandOrControl+Shift+V', () => {
                toggleRecording();
            });
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            } else {
                mainWindow.show();
            }
        });

        app.on('before-quit', () => {
            app.isQuiting = true;
        });
    });

    app.on('will-quit', () => {
        unregisterAll();
    });

    // Remove window-all-closed to keep app running in tray
    app.on('window-all-closed', () => {
        // Process stays alive for tray
    });

    // IPC Handlers
    ipcMain.on('save-api-keys', (event, keys) => {
        apiKeyManager.setKeys(keys);
        console.log('API Keys updated:', keys.length);
    });

    ipcMain.on('get-api-keys', (event) => {
        const keys = apiKeyManager.keys.map(k => k.key);
        event.sender.send('api-keys-list', keys);
        event.sender.send('app-version', app.getVersion()); // Send version
    });

    // Config Management
    ipcMain.on('config-update', (event, config) => {
        const oldHotkey = appConfig.hotkey;
        appConfig = config;
        console.log('Config updated:', config);

        // Update Hotkey if changed
        if (config.hotkey && config.hotkey !== oldHotkey) {
            unregisterAll(); // Simple approach: clear all and re-register
            registerHotkey(config.hotkey, toggleRecording);
            console.log(`Hotkey changed from ${oldHotkey} to ${config.hotkey}`);
        }
    });

    // Debug Logging from Renderer
    ipcMain.on('log', (event, message) => {
        console.log('[Overlay]', message);
    });

    ipcMain.on('audio-data', async (event, { buffer, config }) => {
        console.log(`Received audio data: ${buffer.length} bytes`);
        if (overlayWindow) overlayWindow.webContents.send('transcript-result', 'Transcribing...');

        // Retry logic loop
        let attempts = 0;
        let result = null;

        while (attempts < 3) {
            result = await transcribeAudio(buffer, apiKeyManager, appConfig.language);
            if (result.retry) {
                attempts++;
                console.log('Rate limit, retrying...');
            } else {
                break;
            }
        }

        if (result && result.text) {
            console.log('Transcription:', result.text);
            const text = result.text;

            // Send back to overlay
            if (overlayWindow) overlayWindow.webContents.send('transcript-result', text);

            // Add to History
            if (mainWindow) {
                mainWindow.webContents.send('new-transcript', text);
            }

            // Copy to Clipboard
            clipboard.writeText(text);

            // Auto-paste
            if (appConfig.autoPaste) {
                console.log('Auto-pasting...');
                const { spawn } = require('child_process');
                spawn('powershell', ['-Command', "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"]);
            }
        } else if (result && result.error) {
            console.error('Transcription error:', result.error);
            if (overlayWindow) overlayWindow.webContents.send('transcript-error', result.error);
        } else {
            console.log('No text transcribed.');
            if (overlayWindow) overlayWindow.webContents.send('transcript-result', 'No speech detected');
        }
    });

    // Overlay Control
    function toggleRecording() {
        isRecording = !isRecording;
        console.log(`Recording State: ${isRecording}`);

        if (isRecording) {
            if (!overlayWindow) createOverlayWindow();
            overlayWindow.show();
            // Pass config to overlay
            overlayWindow.webContents.send('start-recording', appConfig);
        } else {
            if (overlayWindow) {
                overlayWindow.webContents.send('stop-recording');
                overlayWindow.hide();
            }
        }
    }

    ipcMain.handle('refine-text', async (event, text) => {
        console.log("Refining text...");
        const result = await callGemini(text, apiKeyManager);
        return result;
    });
}
