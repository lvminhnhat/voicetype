const { ipcRenderer } = require('electron');

const apiKeyInput = document.getElementById('apiKeyInput');
const addKeyBtn = document.getElementById('addKeyBtn');
const keyList = document.getElementById('keyList');
const languageSelect = document.getElementById('languageSelect');
const autoPasteToggle = document.getElementById('autoPasteToggle');
const voiceCmdToggle = document.getElementById('voiceCmdToggle');
const historyList = document.getElementById('historyList');

let apiKeys = [];
let historyData = [];

// --- Config Management ---
const config = {
    language: 'vi-VN',
    autoPaste: false,
    voiceCmd: true
};

function loadConfig() {
    const saved = localStorage.getItem('voiceTypeConfig');
    if (saved) {
        Object.assign(config, JSON.parse(saved));
    }
    // Update UI
    // Update UI
    if (languageSelect) languageSelect.value = config.language;
    if (autoPasteToggle) autoPasteToggle.checked = config.autoPaste;
    if (voiceCmdToggle) voiceCmdToggle.checked = config.voiceCmd;

    // Notify main/others
    ipcRenderer.send('config-update', config);
}

function saveConfig() {
    config.language = languageSelect.value;
    config.autoPaste = autoPasteToggle.checked;
    config.voiceCmd = voiceCmdToggle.checked;

    localStorage.setItem('voiceTypeConfig', JSON.stringify(config));
    ipcRenderer.send('config-update', config);
}

languageSelect.addEventListener('change', saveConfig);
autoPasteToggle.addEventListener('change', saveConfig);
voiceCmdToggle.addEventListener('change', saveConfig);

// --- Hotkey Management ---
const hotkeyInput = document.getElementById('hotkeyInput');
const changeHotkeyBtn = document.getElementById('changeHotkeyBtn');
const hotkeyMessage = document.getElementById('hotkeyMessage');
let isRecordingHotkey = false;

if (changeHotkeyBtn) {
    changeHotkeyBtn.addEventListener('click', () => {
        isRecordingHotkey = true;
        changeHotkeyBtn.disabled = true;
        hotkeyMessage.style.display = 'block';
        hotkeyInput.classList.add('recording');
        hotkeyInput.value = 'Press keys...';
    });
}

// Global keydown listener for hotkey recording
document.addEventListener('keydown', (e) => {
    if (!isRecordingHotkey) return;
    e.preventDefault();
    e.stopPropagation();

    const modifiers = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.metaKey) modifiers.push('Command'); // Electron maps Command on Mac, Super on Linux
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');

    // Ignore if only modifiers are pressed
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    let key = e.key.toUpperCase();

    // Normalize keys
    if (key === ' ') key = 'Space';
    // Add more normalizations if needed

    // Electron Animator format uses "+"
    // Ideally we map 'Ctrl' to 'CommandOrControl' for cross-platform, or just 'Ctrl'
    // Let's stick to what Electron expects. 
    // Usually on Windows 'Ctrl' is 'Ctrl'.
    // To support Mac/Windows duality nicely, 'CommandOrControl' is preferred but 'Ctrl' works on Windows.
    // Let's map global 'Ctrl' to 'CommandOrControl' for storage if we want generic, 
    // BUT for local recording, let's keep it simple.

    // Construct accelerator string
    let accelerator = '';
    if (modifiers.length > 0) {
        accelerator += modifiers.join('+') + '+';
    }
    accelerator += key;

    // "CommandOrControl" is better for Electron
    accelerator = accelerator.replace('Ctrl', 'CommandOrControl');
    accelerator = accelerator.replace('Command', 'CommandOrControl');

    hotkeyInput.value = accelerator;
    config.hotkey = accelerator;

    isRecordingHotkey = false;
    changeHotkeyBtn.disabled = false;
    hotkeyMessage.style.display = 'none';
    hotkeyInput.classList.remove('recording');

    saveConfig(); // Save and sync to main
});

// --- Tabs ---
window.openTab = (tabName) => {
    const contents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }

    const btns = document.getElementsByClassName('tab-btn');
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
    }

    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
};

// --- API Keys ---
function saveKeys() {
    ipcRenderer.send('save-api-keys', apiKeys);
}

function renderKeys() {
    if (!keyList) return;
    keyList.innerHTML = '';
    apiKeys.forEach((key, index) => {
        const div = document.createElement('div');
        div.className = 'key-item';

        const keyText = document.createElement('span');
        keyText.textContent = `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'key-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn edit';
        editBtn.innerHTML = '✎'; // Pencil icon
        editBtn.onclick = () => editKey(index);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'icon-btn remove';
        removeBtn.innerHTML = '🗑️'; // Trash icon
        removeBtn.onclick = () => removeKey(index);

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(removeBtn);

        div.appendChild(keyText);
        div.appendChild(actionsDiv);
        keyList.appendChild(div);
    });
}

window.removeKey = (index) => {
    if (confirm('Are you sure you want to remove this key?')) {
        apiKeys.splice(index, 1);
        renderKeys();
        saveKeys();
    }
};

window.editKey = (index) => {
    const newKey = prompt('Edit API Key:', apiKeys[index]);
    if (newKey !== null && newKey.trim() !== '') {
        apiKeys[index] = newKey.trim();
        renderKeys();
        saveKeys();
    }
};

if (addKeyBtn) {
    addKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            apiKeys.push(key);
            apiKeyInput.value = '';
            renderKeys();
            saveKeys();
        }
    });
}

// --- History ---
function loadHistory() {
    const saved = localStorage.getItem('voiceTypeHistory');
    if (saved) {
        historyData = JSON.parse(saved);
    }
    renderHistory();
}

function saveHistory() {
    localStorage.setItem('voiceTypeHistory', JSON.stringify(historyData));
    renderHistory();
}

// --- Clear History Custom Modal ---
const clearHistoryModal = document.getElementById('clearHistoryModal');

window.clearHistory = () => {
    clearHistoryModal.classList.add('show');
};

window.cancelClearHistory = () => {
    clearHistoryModal.classList.remove('show');
};

window.confirmClearHistory = () => {
    historyData = [];
    saveHistory();
    clearHistoryModal.classList.remove('show');
};

// Close modals when clicking outside
window.onclick = (event) => {
    if (event.target == exitModal) {
        closeModal();
    }
    if (event.target == clearHistoryModal) {
        cancelClearHistory();
    }
};

function renderHistory() {
    if (!historyList) return;
    if (historyData.length === 0) {
        historyList.innerHTML = '<div style="padding: 20px; text-align: center; color: #777;">No history yet</div>';
        return;
    }

    historyList.innerHTML = '';
    // Show newest first
    const reversed = [...historyData].reverse();
    // We need original index for editing/deleting, but displaying reversed.
    // map reversed items to their original indices -> length - 1 - unique_index in reversed
    // Simpler: iterate reversed and calculate original index: originalIndex = historyData.length - 1 - i

    reversed.forEach((item, i) => {
        if (!item || !item.text) return;

        const originalIndex = historyData.length - 1 - i;
        const div = document.createElement('div');
        div.className = 'history-item';
        div.id = `history-item-${originalIndex}`;

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'history-card-header';
        let timeStr = 'Unknown Time';
        try {
            timeStr = new Date(item.timestamp || Date.now()).toLocaleString();
        } catch (e) { }
        headerDiv.textContent = timeStr;

        // Body
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'history-card-body';
        bodyDiv.textContent = item.text;
        bodyDiv.id = `history-body-${originalIndex}`;

        // Edit Area (Hidden by default)
        const editAreaDiv = document.createElement('div');
        editAreaDiv.className = 'history-edit-container';
        editAreaDiv.style.display = 'none';
        editAreaDiv.id = `history-edit-${originalIndex}`;
        editAreaDiv.innerHTML = `
            <textarea class="history-edit-area" id="history-textarea-${originalIndex}"></textarea>
            <div class="edit-controls">
                <button onclick="saveHistoryEdit(${originalIndex})" style="background:var(--primary-color)">Save</button>
                <button onclick="cancelHistoryEdit(${originalIndex})" style="background:#555">Cancel</button>
            </div>
        `;

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'history-actions';
        actionsDiv.id = `history-actions-${originalIndex}`;
        actionsDiv.innerHTML = `
            <button class="action-btn copy" onclick="copyHistoryItem(${originalIndex}, this)" title="Copy">📋</button>
            <button class="action-btn edit" onclick="editHistoryItem(${originalIndex})" title="Edit">✏️</button>
            <button class="action-btn delete" onclick="deleteHistoryItem(${originalIndex})" title="Delete">🗑️</button>
        `;

        div.appendChild(headerDiv);
        div.appendChild(bodyDiv);
        div.appendChild(editAreaDiv);
        div.appendChild(actionsDiv);
        historyList.appendChild(div);
    });
}

// --- History Item Actions ---

window.copyHistoryItem = (index, btnElement) => {
    const text = historyData[index].text;
    const { clipboard } = require('electron');
    clipboard.writeText(text);

    // Visual feedback
    const originalIcon = btnElement.innerHTML;
    btnElement.innerHTML = '✔️';
    setTimeout(() => {
        btnElement.innerHTML = originalIcon;
    }, 2000);
};

window.editHistoryItem = (index) => {
    const body = document.getElementById(`history-body-${index}`);
    const editContainer = document.getElementById(`history-edit-${index}`);
    const actions = document.getElementById(`history-actions-${index}`);
    const textarea = document.getElementById(`history-textarea-${index}`);

    textarea.value = historyData[index].text;

    body.style.display = 'none';
    actions.style.display = 'none'; // Hide actions while editing
    editContainer.style.display = 'block';
};

window.saveHistoryEdit = (index) => {
    const textarea = document.getElementById(`history-textarea-${index}`);
    const newText = textarea.value.trim();
    if (newText) {
        historyData[index].text = newText;
        saveHistory();
        // Re-render handled by saveHistory -> renderHistory
        // But for smoother UX, maybe just update DOM? 
        // saveHistory calls renderHistory which refreshes list. That's fine.
    } else {
        // Empty? confirm delete? or just revert?
        // Let's just cancel if empty for safety or alert?
        // User might want to empty it?
        if (confirm("Text is empty. Delete this item?")) {
            deleteHistoryItem(index);
        }
    }
};

window.cancelHistoryEdit = (index) => {
    // Just re-render or toggle visibility
    renderHistory();
};

window.deleteHistoryItem = (index) => {
    // Fade out effect
    const div = document.getElementById(`history-item-${index}`);
    if (div) {
        div.classList.add('fade-out');
        setTimeout(() => {
            historyData.splice(index, 1);
            saveHistory();
        }, 300); // Match CSS animation duration
    } else {
        historyData.splice(index, 1);
        saveHistory();
    }
};

// IPC Events
ipcRenderer.on('api-keys-list', (event, keys) => {
    apiKeys = keys || [];
    renderKeys();
});

ipcRenderer.on('app-version', (event, version) => {
    const versionEl = document.getElementById('appVersion');
    if (versionEl) versionEl.innerText = version;
});

ipcRenderer.on('new-transcript', (event, text) => {
    // Add to history
    historyData.push({
        text: text,
        timestamp: Date.now()
    });
    // Limit history size (e.g., 50 items)
    if (historyData.length > 50) historyData.shift();

    saveHistory();
});

// Initialization
ipcRenderer.send('get-api-keys');
loadConfig();
loadHistory();
// Custom Window Controls
const minBtn = document.getElementById('minimizeBtn');
const cloBtn = document.getElementById('closeBtn');
const exitModal = document.getElementById('exitModal');

if (minBtn) minBtn.addEventListener('click', () => ipcRenderer.send('minimize-window'));
// Close button sends 'close-window' to Main, which triggers 'close' event, which sends 'show-exit-confirm' back.
if (cloBtn) cloBtn.addEventListener('click', () => ipcRenderer.send('close-window'));

ipcRenderer.on('show-exit-confirm', () => {
    exitModal.classList.add('show');
});

window.closeModal = () => {
    exitModal.classList.remove('show');
};

window.confirmMinimize = () => {
    ipcRenderer.send('minimize-window');
    closeModal();
};

window.confirmQuit = () => {
    ipcRenderer.send('quit-app');
    closeModal();
};


