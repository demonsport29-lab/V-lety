
const fs = require('fs');

const mapping = {
    // Lowercase
    'Ăˇ': 'á', 'Ĺˇ': 'š', 'ÄŤ': 'č', 'Ĺ™': 'ř', 'Ĺľ': 'ž', 'Ă˝': 'ý', 'Ă­': 'í', 'Ă©': 'é', 'Ä›': 'ě', 'Ăş': 'ú', 'ĹŻ': 'ů', 'Ăł': 'ó', 'ÄŹ': 'ď', 'ĹĄ': 'ť', 'Ĺ': 'ň',
    // Uppercase
    'Ă\x81': 'Á', 'ÄŚ': 'Č', 'ÄŽ': 'Ď', 'Ă\x89': 'É', 'Äš': 'Ě', 'Ă\x8D': 'Í', 'Ĺ‡': 'Ň', 'Ă\x93': 'Ó', 'Ĺ\x98': 'Ř', 'Ĺ\xa0': 'Š', 'Ĺ¤': 'Ť', 'Ă\x9A': 'Ú', 'ĹŽ': 'Ů', 'Ă\x9D': 'Ý', 'Ĺ˝': 'Ž',
    // Symbols/Special
    'â˜…': '★', 'đź”': '🔍', 'â€”': '—'
};

function repairFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // We need to be careful with overlapping patterns. 
    // Longer patterns should be replaced first, or we should use a regex that matches any of them.
    
    // Create a regex from keys, sorted by length descending
    const sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
    const escapedKeys = sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(escapedKeys.join('|'), 'g');
    
    content = content.replace(regex, (matched) => mapping[matched]);
    
    if (content !== original) {
        console.log(`Repaired content in ${filePath}`);
        fs.writeFileSync(filePath, content, 'utf8');
    } else {
        console.log(`No repair needed for ${filePath}`);
    }
}

const files = [
    'd:\\Výlety\\public\\js\\app.js',
    'd:\\Výlety\\public\\css\\style.css',
    'd:\\Výlety\\public\\index.html'
];

files.forEach(repairFile);
