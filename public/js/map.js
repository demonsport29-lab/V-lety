// map.js - Mapa a vykreslování

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
function aktualizovatMapu(v){
    loadMapDependencies(() => {
    window._lastMapData = v;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const tileUrl = isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    if(!mainMap){
        mainMap=L.map('globalMap').setView([49.8,15.5],5);
        window._mapTileLayer=L.tileLayer(tileUrl,{maxZoom:18}).addTo(mainMap);
        markerCluster=L.markerClusterGroup({chunkedLoading:true,spiderfyOnMaxZoom:true});
        mainMap.addLayer(markerCluster);
    } else {
        if(window._mapTileLayer){ window._mapTileLayer.setUrl(tileUrl); }
    }
    markerCluster.clearLayers();const pts=[];
    const icon=L.divIcon({className:'custom-map-marker',iconSize:[11,11],iconAnchor:[5,5]});
    v.forEach(x=>{if(x.etapy&&x.etapy[0]?.lat){const m=L.marker([x.etapy[0].lat,x.etapy[0].lng],{icon});m.bindPopup(`<div style="text-align:center;padding:4px;"><h4 style="margin:0 0 8px;">${x.lokace}</h4><button onclick="otevritGoogleMaps('${x.id}')" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:6px 14px;border-radius:9px;cursor:pointer;font-weight:700;font-size:.78rem;">Navigovat k cíli</button></div>`);markerCluster.addLayer(m);pts.push([x.etapy[0].lat,x.etapy[0].lng]);}});
    if(pts.length)mainMap.fitBounds(L.latLngBounds(pts).pad(0.15));
    });
}
function otevritGoogleMaps(id) {
    fetch('/api/ulozene-vylety').then(r => r.json()).then(v => {
        const x = v.find(x => x.id === id);
        if (!x?.etapy?.[0]?.lat) return alert('U tohoto výletu chybí navigační data.');

        
        const o = `${x.etapy[0].lat},${x.etapy[0].lng}`;
        const d = `${x.etapy[x.etapy.length - 1].lat},${x.etapy[x.etapy.length - 1].lng}`;
        const wp = x.etapy.length > 2 ? '&waypoints=' + x.etapy.slice(1, -1).map(e => `${e.lat},${e.lng}`).join('|') : '';
        
        // Chytrá detekce módu dopravy podle textu výletu
        let tm = 'driving'; // Výchozí stav (auto)

        const text = (x.lokace + ' ' + x.popis).toLowerCase();
        if (text.includes('kolo') || text.includes('cyklistika') || text.includes('mtb') || text.includes('cyklo')) {
            tm = 'bicycling'; // Kolo
        } else if (text.includes('procházka') || text.includes('turistika') || text.includes('pěší')) {
            tm = 'walking'; // Pěší
        }

        
        // Zcela nová, čistá a oficiální URL pro Google Maps Directions API

        const url = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}${wp}&travelmode=${tm}`;
        window.open(url, '_blank');
    });
}
// 2. ZCELA NOVĂ FUNKCE - Kreslí polyline trasu na mapu
function vykresliTrasuNaMape(v) {
    loadMapDependencies(() => {
    if (!mainMap) return;
    if (curPolyline) { mainMap.removeLayer(curPolyline); curPolyline = null; } 
    
    let pts = [];
    if (v.gpxTrasa && v.gpxTrasa.length > 0) {
        pts = v.gpxTrasa.map(p => [p.lat, p.lng]);
    } else if (v.etapy && v.etapy.length > 0) {
        v.etapy.forEach(e => {
            if (e.lat && e.lng) pts.push([e.lat, e.lng]);
        });
    }
    
    if (pts.length > 1) {
        const isGpx = v.gpxTrasa && v.gpxTrasa.length > 0;
        const opt = isGpx 
           ? {color: '#3b82f6', weight: 5, opacity: 0.9} 
           : {color: '#6366f1', weight: 4, opacity: 0.9, dashArray: '8, 8'};
           
        curPolyline = L.polyline(pts, opt).addTo(mainMap);
        mainMap.fitBounds(curPolyline.getBounds(), {padding: [40, 40]});
    } else if (pts.length === 1) {
        mainMap.setView(pts[0], 12);
    }
    });
}
async function zpracovatGPX(input) {
    if(!input.files || !input.files[0] || !curOpenTripId) return;
    const btn = document.getElementById('btnUploadStrava');
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<div class="spin" style="width:14px;height:14px;border-width:2px;margin:2px;"></div>';
    
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(e.target.result, "text/xml");
            const trkpts = xml.getElementsByTagName("trkpt");
            
            let path = [];
            // Omezení bodů trasy na max 300 bodů pro záchranu db kvót
            let step = Math.ceil(trkpts.length / 300);
            if (step < 1) step = 1;


            for (let i = 0; i < trkpts.length; i += step) {
                path.push({ lat: parseFloat(trkpts[i].getAttribute("lat")), lng: parseFloat(trkpts[i].getAttribute("lon")) });
            }
            if(path.length) path.push({ lat: parseFloat(trkpts[trkpts.length-1].getAttribute("lat")), lng: parseFloat(trkpts[trkpts.length-1].getAttribute("lon")) });

            const res = await (await fetch('/api/upravit-vylet', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: curOpenTripId, gpxTrasa: path})
            })).json();
            
            if(res.uspech) {
                curDraft.gpxTrasa = path; 
                vykresliTrasuNaMape(curDraft); 
                btn.innerHTML = '<svg class="ti ti-circle-check-filled" width="1.2em" height="1.2em" aria-hidden="true"  style="color:#10b981;font-size:1.1rem;"><use href="#ti-circle-check-filled"></use></svg>';
                setTimeout(() => btn.innerHTML = origHtml, 3000);
            } else alert("Chyba DB uložení: " + res.chyba);
        } catch(err) { alert("Chyba při čtení XML souboru GPX."); btn.innerHTML = origHtml; }

    };
    reader.readAsText(file);
}
