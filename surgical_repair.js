
const fs = require('fs');

const mapping = {
    'Ăˇ': 'á',
    'Ĺˇ': 'š',
    'ÄŤ': 'č',
    'Ĺ™': 'ř',
    'Ĺľ': 'ž',
    'Ă˝': 'ý',
    'Ă­': 'í',
    'Ă©': 'é',
    'Ä›': 'ě',
    'Ăş': 'ú',
    'ĹŻ': 'ů',
    'Ăł': 'ó',
    'ďź”': '🔍',
    'potĹ™eba': 'potřeba',
    'ĂşÄŤet': 'účet',
    'pĹ™ihlĂˇĹˇenĂ­': 'přihlášení',
    'PĹ™ihlaste': 'Přihlaste',
    'denĂ­k': 'deník',
    'vĂ˝letĹŻ': 'výletů',
    'plĂˇnovaÄŤ': 'plánovač',
    'mnohem': 'mnohem',
    'PĹ™ihlĂˇĹˇen': 'Přihlášen',
    'OtevĹ™Ă­t': 'Otevřít',
    'mĹŻj': 'můj',
    'vĂ˝lety': 'výlety',
    'NaÄŤĂ­st': 'Načíst',
    'veĹ™ejnĂˇ': 'veřejná',
    'ZĂˇloĹľky': 'Záložky',
    'ihned': 'ihned',
    'vĹˇechny': 'všechny',
    'vyĹľadujĂ­cĂ­': 'vyžadující',
    'VĂ˝let': 'Výlet',
    'VĂ˝bornÄ›': 'Výborně',
    'ĂšSPÄšCH': 'ÚSPĚCH',
    'ODEMÄŚEN': 'ODEMČEN',
    'ĂşspÄ›ch': 'úspěch',
    'zĂ­skal': 'získal',
    'SkvÄ›lĂ©': 'Skvělé'
};

function repairFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (const [garbage, correct] of Object.entries(mapping)) {
        content = content.split(garbage).join(correct);
    }
    
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
