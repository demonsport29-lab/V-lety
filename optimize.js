const fs = require('fs');
const path = require('path');

const indexHtmlPath = 'd:/Výlety/public/index.html';
const styleCssPath = 'd:/Výlety/public/css/style.css';

let html = fs.readFileSync(indexHtmlPath, 'utf8');
let css = fs.readFileSync(styleCssPath, 'utf8');

// 1. Render Blocking (defer scripts)
html = html.replace(/<script src="([^"]*(leaflet|chart\.js|html2canvas)[^"]*)"><\/script>/gi, '<script src="$1" defer></script>');
html = html.replace(/<script src="\/js\/app\.js"><\/script>/, '<script src="/js/app.min.js" defer></script>'); // updated to app.min.js
html = html.replace(/<link rel="stylesheet" href="\/css\/style\.css">/, '<link rel="stylesheet" href="/css/style.min.css">');

// 2. Head Preconnects
const preconnects = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
`;
html = html.replace(/(<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/@tabler\/icons-webfont@latest\/dist\/tabler-icons\.min\.css" \/>)/, preconnects.trim() + '\n    $1');

// 3. Image URLs Unsplash webp
html = html.replace(/\?w=100&q=80"/g, '?w=100&q=80&fm=webp"');
html = html.replace(/\?w=100&q=80'\)/g, '?w=100&q=80&fm=webp\')');

// 4. Accessibility HTML
// 4a. Button ARIA labels
html = html.replace(/<button class="btnx"(.*?)>/g, '<button class="btnx" aria-label="Zavřít" $1>');
html = html.replace(/<button class="btn bgh bi" (.*?) onclick="toggleFriendSearch\(\)">(.*?)<\/button>/, '<button class="btn bgh bi" aria-label="Hledat přátele" $1 onclick="toggleFriendSearch()">$2</button>');
html = html.replace(/<button class="btn bgh bi" (.*?) onclick="zavritAktivniChat\(\)">(.*?)<\/button>/, '<button class="btn bgh bi" aria-label="Zavřít chat" $1 onclick="zavritAktivniChat()">$2</button>');
html = html.replace(/<button class="btn bgh bi" (.*?) onclick="toggleChatWidget\(\)"(.*?)>(.*?)<\/button>/, '<button class="btn bgh bi" aria-label="Chat a přátelé" $1 onclick="toggleChatWidget()"$2>$3</button>');
html = html.replace(/<button class="btn bgh bi" (.*?) onclick="prepniRezim\(\)">(.*?)<\/button>/, '<button class="btn bgh bi" aria-label="Přepnout režim" $1 onclick="prepniRezim()">$2</button>');
html = html.replace(/<button class="cb" onclick="toggleContact\(\)"(.*?)>\?<\/button>/, '<button class="cb" aria-label="Nápověda" onclick="toggleContact()"$1>?</button>');
html = html.replace(/<button class="btn bgh bi" id="btnEditTrip" onclick="toggleEditTrip\(\)" title="(.*?)">/g, '<button class="btn bgh bi" id="btnEditTrip" aria-label="$1" onclick="toggleEditTrip()" title="$1">');
html = html.replace(/<button class="btn bgh bi" id="btnUploadStrava" onclick="document.getElementById\('gpxUpload'\)\.click\(\)" title="(.*?)".*?>/g, '<button class="btn bgh bi" id="btnUploadStrava" aria-label="$1" onclick="document.getElementById(\'gpxUpload\').click()" title="$1" style="background:#fc4c02; color:#fff; border:none; padding:10px;">');
html = html.replace(/<button class="btn bgh bi" id="btnShareIG" onclick="exportovatNaInstagram\(event\)" title="(.*?)".*?>/g, '<button class="btn bgh bi" id="btnShareIG" aria-label="$1" onclick="exportovatNaInstagram(event)" title="$1" style="color:#d946ef; border-color:rgba(217,70,239,0.3); padding:10px;">');
html = html.replace(/<button class="btn bgh bi" id="btnShareTrip".*?title="(.*?)">/, '<button class="btn bgh bi" id="btnShareTrip" aria-label="$1" onclick="sdiletVylet(curOpenTripId, document.getElementById(\'resTitle\').innerText)" style="display:none;" title="$1">');
html = html.replace(/<button class="btn bgh bi" id="btnShowQR".*?title="(.*?)">/, '<button class="btn bgh bi" id="btnShowQR" aria-label="$1" onclick="otevritQRZDetailu()" style="display:none;" title="$1">');

// 4b. Headings hierarchy
html = html.replace(/<h3 style="margin-bottom: 12px; font-weight: 700;">AI Architekt<\/h3>/g, '<h2 style="margin-bottom: 12px; font-weight: 700; font-size: 1.17em;">AI Architekt</h2>');
html = html.replace(/<h3 style="margin-bottom: 12px; font-weight: 700;">Interaktivní Mapy<\/h3>/g, '<h2 style="margin-bottom: 12px; font-weight: 700; font-size: 1.17em;">Interaktivní Mapy</h2>');
html = html.replace(/<h3 style="margin-bottom: 12px; font-weight: 700;">Aktivní Komunita<\/h3>/g, '<h2 style="margin-bottom: 12px; font-weight: 700; font-size: 1.17em;">Aktivní Komunita</h2>');

// 4c. Main tag wrapper
// First remove internal main tags
html = html.replace(/<main>/g, '<div class="planner-main">');
html = html.replace(/<\/main>\n\s+<\/div>\n<\/div>\n\n<div class="cf">/, '</div>\n    </div>\n</div>\n\n<div class="cf">');
// Re-insert global main
html = html.replace(/<div id="viewLanding"/, '<main id="main-content">\n<div id="viewLanding"');
html = html.replace(/<div class="cf">/, '</main>\n\n<div class="cf">');


// CSS Contrast Modifications
css = css.replace(/--t3: rgba\(255,255,255,\.28\);/, '--t3: rgba(255,255,255,.55);');
css = css.replace(/--t3: rgba\(15,23,42,\.40\);/, '--t3: rgba(15,23,42,.65);');
css = css.replace(/\.ey\{font-family:var\(--fm\);([^}]+)color:var\(--a1\);([^}]+)\}/, '.ey{font-family:var(--fm);$1color:#818cf8;$2}\n[data-theme="light"] .ey { color: #4338ca; }');


fs.writeFileSync(indexHtmlPath, html);
fs.writeFileSync(styleCssPath, css);
console.log('HTML and CSS optimized successfully.');
