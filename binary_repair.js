
const fs = require('fs');

function repairHex(filePath, hexTarget, hexReplacement) {
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const target = Buffer.from(hexTarget, 'hex');
    const replacement = Buffer.from(hexReplacement, 'hex');
    
    let newBuf = buf;
    let index = newBuf.indexOf(target);
    while (index !== -1) {
        newBuf = Buffer.concat([
            newBuf.slice(0, index),
            replacement,
            newBuf.slice(index + target.length)
        ]);
        index = newBuf.indexOf(target, index + replacement.length);
    }
    
    if (!newBuf.equals(buf)) {
        console.log(`Repaired hex in ${filePath}`);
        fs.writeFileSync(filePath, newBuf);
    } else {
        console.log(`No hex repair needed for ${filePath}`);
    }
}

// c3a2 c298 e280a6 -> â˜… (should be ★ e29885)
repairHex('d:\\Výlety\\public\\js\\app.js', 'c3a2c298e280a6', 'e29885');
// c3a2e28094 -> â€” (should be — e28094)
repairHex('d:\\Výlety\\public\\js\\app.js', 'c3a2e28094', 'e28094');
