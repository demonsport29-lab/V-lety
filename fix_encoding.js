
const fs = require('fs');
const path = require('path');

function fixEncoding(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    
    // Read as binary to avoid early corruption
    const buffer = fs.readFileSync(filePath);
    
    // Convert to string using utf8
    let content = buffer.toString('utf8');
    
    // Try to detect if it's double-encoded or corrupted UTF-8
    // If we have 'Ăˇ' (C3 A1) it's likely 'á' (U+00E1)
    // We can try to repair common double-encoded UTF-8
    try {
        const repaired = Buffer.from(content, 'binary').toString('utf8');
        if (repaired !== content && repaired.includes('á')) {
            console.log(`Repaired potential double-encoding in ${filePath}`);
            content = repaired;
        }
    } catch (e) {}

    // Manual replacement for the most common garbled sequences if needed
    // but better to target the files with known good versions if possible.
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${filePath}`);
}

const files = [
    'd:\\Výlety\\public\\js\\app.js',
    'd:\\Výlety\\public\\css\\style.css',
    'd:\\Výlety\\public\\index.html'
];

files.forEach(fixEncoding);
