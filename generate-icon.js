const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const inputFile = path.join(__dirname, 'assets/logo.jpg');
const tempFile = path.join(__dirname, 'assets/temp_icon.png');
const outputFile = path.join(__dirname, 'assets/icon.ico');

console.log(`Processing ${inputFile}...`);

Jimp.read(inputFile)
    .then(image => {
        return image
            .write(tempFile); // Save as clean PNG
    })
    .then(() => {
        console.log('Image processed. Converting to ICO...');
        const fileBuffer = fs.readFileSync(tempFile);
        return toIco([fileBuffer], { resize: true });
    })
    .then(buf => {
        fs.writeFileSync(outputFile, buf);
        console.log('Icon creation successful!');
        // Cleanup
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    })
    .catch(err => {
        console.error('Error creating icon:', err);
        process.exit(1);
    });
