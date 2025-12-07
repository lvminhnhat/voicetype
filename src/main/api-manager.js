const https = require('https');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class APIKeyManager {
    constructor() {
        this.keys = [];
        this.configPath = path.join(app.getPath('userData'), 'api-keys.json');
        this.loadKeys();
    }

    loadKeys() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                this.keys = JSON.parse(data);
                console.log(`Loaded ${this.keys.length} API keys from disk.`);
            }
        } catch (e) {
            console.error('Failed to load API keys:', e);
            this.keys = [];
        }
    }

    saveKeys() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.keys, null, 2));
            console.log('Saved API keys to disk.');
        } catch (e) {
            console.error('Failed to save API keys:', e);
        }
    }

    setKeys(keyStrings) {
        if (!Array.isArray(keyStrings)) return;
        this.keys = keyStrings.map(k => ({
            key: k,
            usage: 0,
            limitedUntil: 0
        }));
        this.saveKeys();
    }

    addKey(key) {
        this.keys.push({ key, usage: 0, limitedUntil: 0 });
        this.saveKeys();
    }

    getAvailableKey() {
        const now = Date.now();
        const available = this.keys.filter(k => k.limitedUntil < now);

        if (available.length === 0) {
            throw new Error('All API keys are rate limited');
        }

        // Sort by usage to balance load
        available.sort((a, b) => a.usage - b.usage);
        return available[0];
    }

    markUsed(keyString) {
        const k = this.keys.find(obj => obj.key === keyString);
        if (k) k.usage++;
        // Optional: save usage stats? Maybe not needed for MVP to minimize io
    }

    markLimited(keyString, retryAfterSeconds = 60) {
        const k = this.keys.find(obj => obj.key === keyString);
        if (k) {
            k.limitedUntil = Date.now() + (retryAfterSeconds * 1000);
        }
    }
}

async function callGemini(text, apiKeyManager) {
    let keyObj;
    try {
        keyObj = apiKeyManager.getAvailableKey();
    } catch (e) {
        return { error: 'No API keys available' };
    }

    const apiKey = keyObj.key;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const data = JSON.stringify({
        contents: [{
            parts: [{ text: `Correction this text (fix grammar, spelling, punctuation) only output the corrected text: ${text}` }]
        }]
    });

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 429) {
                    apiKeyManager.markLimited(apiKey);
                    resolve({ error: 'Rate limit exceeded', retry: true });
                } else if (res.statusCode !== 200) {
                    resolve({ error: `API Error: ${res.statusCode} ${body}` });
                } else {
                    try {
                        const response = JSON.parse(body);
                        const resultText = response.candidates[0].content.parts[0].text;
                        apiKeyManager.markUsed(apiKey);
                        resolve({ text: resultText });
                    } catch (e) {
                        resolve({ error: 'Parsing error' });
                    }
                }
            });
        });

        req.on('error', (e) => resolve({ error: e.message }));
        req.write(data);
        req.end();
    });
}



async function transcribeAudio(audioBuffer, apiKeyManager, language = 'vi-VN') {
    let keyObj;
    try {
        keyObj = apiKeyManager.getAvailableKey();
    } catch (e) {
        return { error: 'No API keys available' };
    }

    const apiKey = keyObj.key;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent?key=${apiKey}`;

    // Convert Buffer to Base64
    // Ensure it is a Buffer instance (Electron IPC might send Uint8Array)
    const audioExample = Buffer.from(audioBuffer).toString('base64');

    const data = JSON.stringify({
        contents: [{
            parts: [
                {
                    inlineData: {
                        mimeType: "audio/webm",
                        data: audioExample
                    }
                },
                {
                    text: `Transcribe the audio to text (Language: ${language}). Then, correct any spelling or grammatical errors in the transcription. Return ONLY the final corrected text. Do not add any commentary. If the audio is empty or silence, return nothing.`
                }
            ]
        }]
    });

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 429) {
                    apiKeyManager.markLimited(apiKey);
                    resolve({ error: 'Rate limit exceeded', retry: true });
                } else if (res.statusCode !== 200) {
                    // Log details if error
                    resolve({ error: `API Error: ${res.statusCode} Body: ${body}` });
                } else {
                    try {
                        const response = JSON.parse(body);
                        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts.length > 0) {
                            const resultText = response.candidates[0].content.parts[0].text.trim();
                            apiKeyManager.markUsed(apiKey);
                            resolve({ text: resultText });
                        } else {
                            resolve({ text: '' }); // Nothing returned
                        }

                    } catch (e) {
                        resolve({ error: 'Parsing error: ' + e.message });
                    }
                }
            });
        });

        req.on('error', (e) => resolve({ error: e.message }));
        req.write(data);
        req.end();
    });
}

module.exports = { APIKeyManager, callGemini, transcribeAudio };
