const { globalShortcut } = require('electron');

function registerHotkey(accelerator, callback) {
    const ret = globalShortcut.register(accelerator, () => {
        console.log(`${accelerator} is pressed`);
        if (callback) callback();
    });

    if (!ret) {
        console.log('Registration failed');
    }

    console.log(globalShortcut.isRegistered(accelerator) ? 'Hotkey registered' : 'Hotkey registration failed');
}

function unregisterAll() {
    globalShortcut.unregisterAll();
}

module.exports = {
    registerHotkey,
    unregisterAll
};
