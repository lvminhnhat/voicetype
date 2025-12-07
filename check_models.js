const https = require('https');
const fs = require('fs');
const path = require('path');
const { app } = require('electron'); // This won't work in standalone node script easily without electron runner.

// We'll read the key file directly assuming default location or hardcoded path for this specific run context if possible.
// Actually, since I am the agent, I can read the file using view_file first to see where keys are stored or just assume the user can run this.
// Better: I will create a script that assumes `api-keys.json` is in the user data folder or I can just ask it to read from a local file if I knew where it was.
// In `api-manager.js`: path.join(app.getPath('userData'), 'api-keys.json');
// UserData usually: %APPDATA%/VoiceType (project name usually) or Electron.

// Let's try to just read "api-keys.json" from the CURRENT directory if the user copied it there, OR just simple:
// I'll make a script that requires the API Key to be passed as arg or hardcoded.
// But I don't want to expose keys in logs if possible.
// Wait, I can see the `api-manager.js` code again.
// It loads from `path.join(app.getPath('userData'), 'api-keys.json')`.
// I can try to locate that file using `find_by_name` in AppData?
// Or I can just write a script that runs INSIDE the electron app? No that's complex.

// Simplest: I will create a script `check_models.js` in the project root.
// I will try to read the api-keys.json from the expected location.
// Windows UserData is usually `C:\Users\{User}\AppData\Roaming\VoiceType` (if name is VoiceType in package.json)
// Let's check package.json name.

const os = require('os');

const keyPath = path.join(process.env.APPDATA, 'VoiceType', 'api-keys.json'); // standard electron path

if (fs.existsSync(keyPath)) {
    console.log('Found key file at:', keyPath);
    try {
        const keys = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        if (keys.length > 0) {
            const apiKey = keys[0].key;
            listModels(apiKey);
        } else {
            console.log('No keys found in file.');
        }
    } catch (e) {
        console.error('Error reading key file:', e);
    }
} else {
    console.log('Key file not found at:', keyPath);
    // Fallback: try to find it in the current dir?
}

function listModels(apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    https.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            try {
                const data = JSON.parse(body);
                if (data.models) {
                    console.log('Available Models:');
                    data.models.forEach(m => {
                        if (m.name.includes('gemini') || m.name.includes('flash')) {
                            console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
                        }
                    });
                } else {
                    console.log('Response:', body);
                }
            } catch (e) {
                console.log('Response:', body);
            }
        });
    }).on('error', (e) => {
        console.error('Error:', e);
    });
}
