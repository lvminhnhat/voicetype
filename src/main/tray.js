const { Tray, Menu } = require('electron');
const path = require('path');

let tray = null;

function createTray(mainWindow) {
    // Use a placeholder icon if actual icon missing, or handle error
    const iconPath = path.join(__dirname, '../../assets/logo.png');

    try {
        tray = new Tray(iconPath);
    } catch (e) {
        console.log("Tray icon not found, skipping tray creation for now or using default if possible.");
        return;
    }

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Settings',
            click: () => mainWindow.show()
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                require('electron').app.quit();
            }
        }
    ]);

    tray.setToolTip('VoiceType');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
    });
}

module.exports = { createTray };
