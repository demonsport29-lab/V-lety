
const fs = require('fs');
const path = 'd:\\Výlety\\public\\js\\app.js';
if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(/â˜…/g, '★');
    content = content.replace(/â€”/g, '—');
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed star and dash in app.js');
}
