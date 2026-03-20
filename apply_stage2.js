const fs = require('fs');
const https = require('https');

const indexHtmlPath = 'd:/Výlety/public/index.html';
const styleCssPath = 'd:/Výlety/public/css/style.css';
const appJsPath = 'd:/Výlety/public/js/app.js';

let html = fs.readFileSync(indexHtmlPath, 'utf8');
let css = fs.readFileSync(styleCssPath, 'utf8');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const icons = [
    'messages', 'user-plus', 'arrow-left', 'send', 'message-circle', 'bell-ringing', 'bell', 'trophy', 'brand-instagram', 'user-circle', 'chevron-down', 'user', 'coffee', 'login', 'logout', 'moon', 'edit', 'bookmark-filled', 'qrcode', 'trash', 'map-2', 'star', 'star-filled', 'circle-check-filled', 'heart', 'heart-filled', 'user-minus', 'copy', 'search', 'message', 'plus', 'shield-lock', 'settings'
];

async function fetchIcon(name) {
    let n = name;
    let style = 'outline';
    if (name.endsWith('-filled')) {
        n = name.replace('-filled', '');
        style = 'filled';
    }
    return new Promise((resolve) => {
        https.get(`https://raw.githubusercontent.com/tabler/tabler-icons/master/icons/${style}/${n}.svg`, (res) => {
            let data = '';
            if (res.statusCode !== 200) { resolve(null); return; }
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (data.includes('<svg')) {
                    // Extract inner content of svg
                    const match = data.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
                    if (match) {
                        resolve(`<symbol id="ti-${name}" viewBox="0 0 24 24" fill="${style === 'filled' ? 'currentColor' : 'none'}" stroke="${style === 'filled' ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${match[1]}</symbol>`);
                    } else resolve(null);
                } else resolve(null);
            });
        }).on('error', () => resolve(null));
    });
}

(async () => {
    console.log('Fetching icons...');
    let symbols = [];
    for (const d of icons) {
        const s = await fetchIcon(d);
        if (s) symbols.push(s);
    }
    const svgSprite = `\n<svg width="0" height="0" class="hidden" style="display:none;" aria-hidden="true">\n${symbols.join('\n')}\n</svg>\n`;

    // 1. Remove CDN and add Sprite
    html = html.replace(/<link rel="stylesheet"[^>]*tabler-icons\.min\.css"[^>]*>/i, '');
    html = html.replace(/<body[^>]*>/i, `$&${svgSprite}`);

    // Replace <i class="ti ti-X"></i> with SVG in HTML and JS
    const regexI = /<i ([^>]*)class="([^"]*ti ti-([a-zA-Z0-9-]+)[^"]*)"([^>]*)><\/i>/g;
    const replacement = '<svg $1class="$2" width="1.2em" height="1.2em" aria-hidden="true" $4><use href="#ti-$3"></use></svg>';
    html = html.replace(regexI, replacement);
    appJs = appJs.replace(regexI, replacement);

    // CSS styling for SVG icons
    css += `\n/* SVG Icons Base Styling */\nsvg.ti { vertical-align: middle; flex-shrink: 0; }\n`;

    // 2. Render-blocking Map & Chart
    html = html.replace(/<script src="[^"]*leaflet\.js".*?><\/script>/g, '');
    html = html.replace(/<script src="[^"]*leaflet\.markercluster\.js".*?><\/script>/g, '');
    html = html.replace(/<script src="[^"]*chart\.js".*?><\/script>/g, '');
    html = html.replace(/<link[^>]*leaflet\.css"[^>]*>/g, '');
    html = html.replace(/<link[^>]*MarkerCluster\.css"[^>]*>/g, '');
    html = html.replace(/<link[^>]*MarkerCluster\.Default\.css"[^>]*>/g, '');

    const mapLoader = `let mapDepsLoaded = false;
let mapDepsLoading = false;
let mapDepsQueue = [];

function loadMapDependencies(callback) {
    if (mapDepsLoaded) return callback();
    if (mapDepsLoading) { mapDepsQueue.push(callback); return; }
    mapDepsLoading = true;
    
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
     'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
     'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css'
    ].forEach(href => {
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
        document.head.appendChild(link);
    });

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
        const mcScript = document.createElement('script');
        mcScript.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
        mcScript.onload = () => {
            mapDepsLoaded = true;
            callback();
            mapDepsQueue.forEach(cb => cb());
            mapDepsQueue = [];
        };
        document.body.appendChild(mcScript);
    };
    document.body.appendChild(script);
}
\n`;
    appJs = mapLoader + appJs;
    
    // Wrap aktualizovatMapu body
    appJs = appJs.replace(/function aktualizovatMapu\(v\)\{([\s\S]*?)(?=\nfunction |async function |window\.)/m, (match, body) => {
        return `function aktualizovatMapu(v){ loadMapDependencies(() => {${body}}); }` + '\n';
    });

    appJs = appJs.replace(/function vykresliTrasuNaMape\(v\) \{([\s\S]*?)(?=\nfunction |async function |window\.)/m, (match, body) => {
        return `function vykresliTrasuNaMape(v){ loadMapDependencies(() => {${body}}); }` + '\n';
    });


    // 3. Shimmer GPU & CLS & A11y
    css = css.replace(/\.shimmer-text\s*\{[^}]+\}/, `.shimmer-text { position: relative; display: inline-block; color: var(--a1); overflow: hidden; }\n.shimmer-text::after { content: ''; position: absolute; top: 0; left: 0; width: 200%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%); transform: translateX(-100%); animation: shimmer-gpu 3s infinite; pointer-events: none; }`);
    css = css.replace(/\[data-theme="light"\] \.shimmer-text\s*\{[^}]+\}/, `[data-theme="light"] .shimmer-text { color: #4f46e5; }`);
    css = css.replace(/@keyframes shimmer\s*\{[^}]+\}/, `@keyframes shimmer-gpu { 100% { transform: translateX(50%); } }`);

    css = css.replace(/\.tab\s*\{([^}]+)\}/, '.tab { $1 will-change: color, background-color; }');
    css = css.replace(/\.blob\s*\{([^}]+)\}/, '.blob { $1 will-change: transform; opacity: 0.12 !important; }');
    css = css.replace(/--t2: rgba\(255,255,255,\.55\);/g, '--t2: rgba(255,255,255,0.75);');
    
    css += `\n.logo-wm, .logo-tag { color: #ffffff !important; }\n`;

    // SEO Meta
    html = html.replace(/<title>/, `<meta name="description" content="VeronaTrip – Váš osobní AI architekt pro plánování výletů. Objevte nová místa, vygenerujte si itinerář na míru a prohlížejte trasy na interaktivní mapě s aktivní komunitou cestovatelů.">\n    <title>`);

    // Lightbox CLS
    html = html.replace(/<img id="lightboxImg" src="" alt="">/, `<img id="lightboxImg" src="" alt="Detail fotografie" loading="lazy" width="800" height="600" style="width: auto; max-width: 90vw; height: auto;">`);


    fs.writeFileSync(indexHtmlPath, html);
    fs.writeFileSync(styleCssPath, css);
    fs.writeFileSync(appJsPath, appJs);
    console.log('Scripts, HTML, and CSS successfully patched for Lighthouse 100.');
})();
