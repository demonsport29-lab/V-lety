
const fs = require('fs');

function fixDoubleEncoding(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Attempt double-encoding fix
    try {
        const repaired = Buffer.from(content, 'latin1').toString('utf8');
        
        // Validation: Check if repaired version contains more reasonable Czech chars
        // and less 'Ã' or 'Ă'
        const originalGarbageCount = (content.match(/[ĂĹ]/g) || []).length;
        const repairedGarbageCount = (repaired.match(/[ĂĹ]/g) || []).length;
        
        if (repaired !== content && (repaired.includes('á') || repaired.includes('í') || repaired.includes('š'))) {
            console.log(`Successfully repaired double-encoding in ${filePath}`);
            fs.writeFileSync(filePath, repaired, 'utf8');
        } else {
            console.log(`Double-encoding fix not applied to ${filePath} (no improvement detected)`);
        }
    } catch (e) {
        console.error(`Error repairing ${filePath}:`, e);
    }
}

const files = [
    'd:\\Výlety\\public\\js\\app.js',
    'd:\\Výlety\\public\\css\\style.css',
    'd:\\Výlety\\public\\index.html'
];

files.forEach(fixDoubleEncoding);
