const fs = require('fs');

let content = fs.readFileSync('public/js/trips.js', 'utf8');

const splitIndex = content.indexOf('window.nactiPocasiOpenMeteo');
if (splitIndex !== -1) {
    content = content.slice(0, splitIndex);
}

const lines = [
    "window.nactiPocasiOpenMeteo = async function(nazevLokace) {",
    "    const wBox = document.getElementById('resWeather');",
    "    wBox.style.display = 'none';",
    "    if (!nazevLokace) return;",
    "",
    "    try {",
    "        const ciloveMisto = nazevLokace.includes('->') ? nazevLokace.split('->').pop().trim() : nazevLokace.trim();",
    "        const geoReq = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciloveMisto)}&count=1&language=cs&format=json`);",
    "        const geoRes = await geoReq.json();",
    "        ",
    "        if (geoRes.results && geoRes.results.length > 0) {",
    "            const lat = geoRes.results[0].latitude;",
    "            const lon = geoRes.results[0].longitude;",
    "            ",
    "            const weatherReq = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);",
    "            const weatherRes = await weatherReq.json();",
    "            ",
    "            if (weatherRes.current_weather) {",
    "                const cw = weatherRes.current_weather;",
    "                const wmoKody = {",
    "                    0: {i:'ph-sun wa-spin wa-sun', t:'Jasno'}, ",
    "                    1: {i:'ph-cloud-sun wa-float', t:'Polojasno'}, ",
    "                    2: {i:'ph-cloud wa-float wa-cloud', t:'Oblačno'}, ",
    "                    3: {i:'ph-cloud wa-float wa-cloud', t:'Zataženo'},",
    "                    45: {i:'ph-cloud-fog wa-pulse', t:'Mlha'}, ",
    "                    48: {i:'ph-cloud-fog wa-pulse', t:'Námrazová mlha'},",
    "                    51:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Slabé mrholení'}, ",
    "                    53:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Mrholení'}, ",
    "                    55:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Silné mrholení'},",
    "                    61:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Slabý déšť'}, ",
    "                    63:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Déšť'}, ",
    "                    65:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Silný déšť'},",
    "                    71:{i:'ph-cloud-snow wa-spin wa-snow', t:'Slabé sněžení'}, ",
    "                    73:{i:'ph-cloud-snow wa-spin wa-snow', t:'Sněžení'}, ",
    "                    75:{i:'ph-cloud-snow wa-spin wa-snow', t:'Silné sněžení'},",
    "                    80:{i:'ph-cloud-rain wa-pulse wa-bolt', t:'Přeháňky'}, ",
    "                    81:{i:'ph-cloud-rain wa-pulse wa-bolt', t:'Silné přeháňky'}, ",
    "                    82:{i:'ph-cloud-rain wa-pulse wa-bolt', t:'Přívalové srážky'},",
    "                    95:{i:'ph-cloud-lightning wa-pulse wa-bolt', t:'Bouřka'}, ",
    "                    96:{i:'ph-cloud-lightning wa-pulse wa-bolt', t:'Silná bouřka'}, ",
    "                    99:{i:'ph-cloud-lightning wa-pulse wa-bolt', t:'Bouřka a kroupy'}",
    "                };",
    "                const wip = wmoKody[cw.weathercode] || {i:'ph-cloud-sun wa-float', t:'Neznámé'};",
    "",
    "                wBox.innerHTML = `",
    "                    <div style=\"display:flex; align-items:center; gap:16px; background:rgba(255,255,255,0.06); padding:12px 18px; border-radius:18px; border:1px solid rgba(255,255,255,0.1); width:max-content; margin-top:14px; box-shadow:0 8px 32px rgba(0,0,0,0.15);\">",
    "                        <i class=\"ph ${wip.i} wa\" style=\"font-size:2.6rem; display:block;\"></i>",
    "                        <div>",
    "                            <div style=\"font-size:1.6rem; font-weight:800; font-family:var(--fm); line-height:1; margin-bottom:4px;\">${Math.round(cw.temperature)}°C</div>",
    "                            <div style=\"font-size:0.75rem; color:var(--t2); font-weight:600;\">${wip.t} &nbsp;&nbsp; Vítr ${Math.round(cw.windspeed)} km/h</div>",
    "                        </div>",
    "                    </div>`;",
    "                wBox.style.display = 'block';",
    "            }",
    "        }",
    "    } catch (err) {",
    "        console.error('API Počasí selhalo, nepodařilo se načíst data:', err);",
    "    }",
    "};"
].join('\\n');

fs.writeFileSync('public/js/trips.js', content + lines);
console.log('Fixed');
