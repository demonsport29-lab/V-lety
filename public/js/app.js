let curDraft=null,curOpenTripId=null,prihlaseno=false,mainMap=null,markerCluster=null,mujProfil=null,pripraveneFotky=[],curPolyline=null,lastSocNeprecteno=0,vListBackup=[];
// --- Produkční error logging ---
window.addEventListener("unhandledrejection", function(e) {
    console.error("[Verona] Neošetřená chyba:", e.reason);
});
let mapDepsLoaded = false;
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

function toggleContact(){const w=document.getElementById('contactWin');if(w.style.display==='flex'){w.style.display='none';return;}w.style.display='flex';w.style.flexDirection='column';}

// --- HELPER: Ochranná funkce pro akce vyžadující přihlášení ---

function vyzadujePrihlaseni() {
    if (prihlaseno) return true;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    modal.innerHTML = `
        <div style="background:linear-gradient(160deg,var(--gb2),var(--gb3));border:1px solid var(--gbd);border-radius:20px;padding:40px;max-width:360px;text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:16px;">🔍</div>
            <h3 style="font-size:1.3rem;font-weight:800;margin-bottom:10px;">Pro tuto akci je potřeba účet</h3>
            <p style="color:var(--t2);font-size:.9rem;line-height:1.6;margin-bottom:24px;">Přihlaste se zdarma přes Google a odemkněte plnou funkčnost — deník výletů, AI plánovač, chat a mnohem více.</p>
            <button class="btn bp bf" onclick="location.href='/auth/google'" style="width:100%;margin-bottom:10px;">Přihlásit se přes Google</button>

            <button class="btn bgh" onclick="this.closest('[style*=fixed]').remove()" style="width:100%;border:none;">Pokračovat jako host</button>

        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
    return false;
}

async function init(){
    // Záložky a data dostupná ihned pro všechny (i hosty)

    document.getElementById('navTabsContainer').style.display='flex';
    if(window.innerWidth <= 768) document.getElementById('mobileTabsContainer').style.display='flex';

    try{
        const data=await(await fetch('/api/auth-status')).json();
        if(data.prihlaseno){
            prihlaseno=true;mujProfil=data.profil;
            if(document.getElementById('dropLogin')) document.getElementById('dropLogin').style.display='none';
            if(document.getElementById('dropLogout')) document.getElementById('dropLogout').style.display='flex';
            if(document.getElementById('dropSocial')) document.getElementById('dropSocial').style.display='flex';
            if(document.getElementById('dropNotif')) document.getElementById('dropNotif').style.display='flex';
            spustitNotifikace();
            if(!localStorage.getItem('verona_news')) setTimeout(()=>document.getElementById('newsletterModal').style.display='flex',1500);
            document.getElementById('landingActionBtns').innerHTML = `
                <button class="btn bp blg" onclick="prepniTab('planovac')">Otevřít můj deník</button>
                <button class="btn bg blg" onclick="prepniTab('verejne')">Procházet inspiraci</button>
            `;


        } else {
            // Host: Rozcestník se zachovanou možností prohlížení

            document.getElementById('landingActionBtns').innerHTML = `
                <button class="btn bp blg" onclick="location.href='/auth/google'">Přihlásit se a začít</button>
                <button class="btn bg blg" onclick="prepniTab('verejne')">Procházet výlety</button>
                <button class="btn bg blg" onclick="prepniTab('akce')">Zobrazit akce</button>
            `;

        }
    }catch(e){console.error('Auth status chyba:', e);}

    // Hash routing funguje pro všechny
    const hash = window.location.hash.replace('#', '');
    const validniTaby = ['komunita', 'planovac', 'verejne', 'akce'];
    if (validniTaby.includes(hash)) {
        prepniTab(hash, false);
    } else {
        prepniTab('landing', false);
    }

    // Načíst veřejná data (pro všechny)
    await nactiVerejneVylety();
    await nactiAkce();
    await nactiFeed(); // Feed je veřejný, vidí ho i hosté
    // Načíst privátní data jen pokud přihlášen
    if (prihlaseno) {
        await nactiDnik();
    }

    // Deep Linking
    const urlParams = new URLSearchParams(window.location.search);
    const sdilenyId = urlParams.get('vylet');
    if (sdilenyId) {
        try {
            const res = await (await fetch('/api/sdileny-vylet/' + sdilenyId)).json();
            if (res.uspech) {
                setTimeout(() => { prepniTab('planovac'); otevritDetailVyletu(res.data); }, 500);
            } else {
                alert('Odkaz na výlet nefunguje: ' + res.chyba);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch(e) {}
    }
}
// prepniTab() je definována níže (aktuální verze s podporou Friend Hub)

// popstate listener je definován níže (novější verze)

async function nactiVerejneVylety() {
    const res = await fetch('/api/verejne-vylety');
    const data = await res.json();
    const c = document.getElementById('verejneStream');
    if (!c) return;
    
    if (!data.uspech || !data.data.length) {
        c.innerHTML = '<div class="es"><p>Zatím zde nejsou žádné veřejné výlety. Buďte první!</p></div>';
        return;
    }

    
    window.verejneVyletyData = data.data; // Uložení pro prokliky

    
    c.innerHTML = data.data.map((x, i) => {
        const av = x.autorAvatar ? `background-image:url(${x.autorAvatar});color:transparent;` : '';
        const ini = x.autorJmeno ? x.autorJmeno.charAt(0).toUpperCase() : 'U';
        
        return `
        <div class="dc au" style="animation-delay:${i*.05}s;" onclick="otevritDetailVerejnehoVyletuZListu('${x.id}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
                <div>
                    <h3 style="font-size:1.15rem;font-weight:800;letter-spacing:-.02em;margin-bottom:3px;">${x.lokace}</h3>
                    <div style="display:flex;align-items:center;gap:6px;margin-top:8px;cursor:pointer;" onclick="event.stopPropagation(); otevritVerejnyProfil('${x.vlastnikId}')" title="Profil autora">
                        <div class="av" style="${av};width:24px;height:24px;font-size:.6rem;">${ini}</div>
                        <span style="font-family:var(--fm);font-size:.7rem;color:var(--a1);transition:color .2s;" onmouseover="this.style.color='var(--a2)'" onmouseout="this.style.color='var(--a1)'">${x.autorJmeno}</span>
                    </div>
                </div>
            </div>
            <div class="sr"><div><span class="sl">Komentáře</span><span class="sv">${x.komentare?.length||0}</span></div></div>
        </div>`;
    }).join('');
}

window.otevritDetailVerejnehoVyletuZListu = function(id) {
    const trip = window.verejneVyletyData.find(t => t.id === id);
    if (trip) {
        prepniTab('planovac'); // Hodí tě k mapě
        otevritDetailVyletu(trip); // Nakreslí čáru na mapu a ukáže itinerář
    }

};

function toggleAcc(wid,bid){const w=document.getElementById(wid),b=document.getElementById(bid),o=w.classList.toggle('open');b.style.maxHeight=o?'380px':'0';}

function toggleProfileDropdown() {
    const menu = document.getElementById('profileDropdown');
    menu.classList.toggle('open');
}



// Click outside dropdown to close
document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.profile-dropdown');
    const menu = document.getElementById('profileDropdown');
    if (dropdown && !dropdown.contains(e.target) && menu.classList.contains('open')) {
        menu.classList.remove('open');
    }
});

function aktualizujIndikator() {
    const activeTab = document.querySelector('.nav-in .tab.active');
    const indicator = document.getElementById('navIndicator');
    if (activeTab && indicator) {
        indicator.style.width = `${activeTab.offsetWidth}px`;
        indicator.style.left = `${activeTab.offsetLeft}px`;
    }

    const mobileActiveTab = document.querySelector('.mnav .tab.active');
    const mobileIndicator = document.getElementById('mobileIndicator');
    if (mobileActiveTab && mobileIndicator) {
        mobileIndicator.style.width = `${mobileActiveTab.offsetWidth}px`;
        mobileIndicator.style.left = `${mobileActiveTab.offsetLeft}px`;
    }
}
window.addEventListener('resize', aktualizujIndikator);

function prepniRezim(){
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    if(window._lastMapData) { aktualizovatMapu(window._lastMapData); }
}

function zmenitAvatar(){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=e=>{const r=new FileReader();r.onloadend=()=>{mujProfil.avatar=r.result;document.getElementById('profAvatar').style.backgroundImage=`url(${r.result})`;document.getElementById('profAvatar').innerText='';};r.readAsDataURL(e.target.files[0]);};i.click();}
async function ulozitProfil(){await fetch('/api/ulozit-profil',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prezdivka:document.getElementById('profPrezdivka').value,vek:document.getElementById('profVek').value,telefon:document.getElementById('profTelefon').value,bio:document.getElementById('profBio').value,avatar:mujProfil.avatar||''})});document.getElementById('profileModal').style.display='none';alert('Profil uložen!');location.reload();}
async function poslatPrispevek(){document.getElementById('btnKoupit').innerHTML='<div class="spin" style="margin:0 auto"></div>';try{const d=await(await fetch('/api/vytvorit-platbu',{method:'POST'})).json();if(d.url)window.location.href=d.url;}catch(e){document.getElementById('btnKoupit').innerText='Zkusit znovu';}}

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

async function nactiDnik(){
    const v=await(await fetch('/api/ulozene-vylety')).json();
    vListBackup = v;
    aktualizovatMapu(v);
    const d=document.getElementById('diary'),sel=document.getElementById('feedTripSelect');
    sel.innerHTML='<option value="">Bez navázaného výletu</option>';
    if(!v.length){d.innerHTML=`<div class="es" style="grid-column: 1 / -1; width: 100%; text-align: center; padding: 50px 20px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.15); border-radius: 16px;"><p style="font-size: 1rem; color: var(--t2); margin: 0;">Deník je prázdný. Vygenerujte si svůj první výlet v plánovači výše.</p></div>`;return;}
    d.innerHTML='';
    v.forEach((x,i)=>{
        sel.innerHTML+=`<option value="${x.id}">${x.lokace}</option>`;
        const k=document.createElement('div');k.className=`dc au${x.dokonceno?' done':''}`;k.style.animationDelay=`${i*.05}s`;k.dataset.id=x.id;
        const fh=x.fotky?.length?`<div class="ps">${x.fotky.map(f=>`<img src="${f}" class="pt2" onclick="event.stopPropagation();openGallery('${f}')">`).join('')}</div>`:'';
        
        k.innerHTML=`
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
                <div><h3 style="font-size:1.15rem;font-weight:800;letter-spacing:-.02em;margin-bottom:3px;">${x.lokace}</h3><p style="font-family:var(--fm);font-size:.62rem;color:var(--t2);">${x.datumUlozeni||''}</p></div>
                <div style="display:flex; gap:6px;">
                    <button class="btn bgh bi" style="width:28px; height:28px; border-radius:8px;" onclick="event.stopPropagation(); window.smazat('${x.id}')" title="Smazat"><svg class="ti ti-trash" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-trash"></use></svg></button>
                </div>
            </div>
            <div class="pr"><span class="chip ${x.verejny?'ci':'cm'}">${x.verejny?'Veřejný':'Soukromý'}</span><button class="btn bgh" style="padding:4px 11px;font-size:.7rem;border-radius:8px;" onclick="event.stopPropagation();prepnoutSoukromi('${x.id}',${!x.verejny})">Změnit</button></div>
           <div class="sr"><div></div><div style="text-align:right;"><span class="sl">Komentáře</span><span class="sv">${x.komentare?.length||0}</span></div></div>
            <div class="ar-unified" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-top:16px; justify-items: center;">
                <button class="btn bg bi" onclick="event.stopPropagation();otevritGoogleMaps('${x.id}')" style="justify-content:center; border-radius:10px; height:42px; width:100%;" title="Mapa"><svg class="ti ti-map-2" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-map-2"></use></svg></button>
                <button class="btn bg bi btn-ig" onclick="event.stopPropagation();exportujIGZListu('${x.id}', event)" style="justify-content:center; border-radius:10px; height:42px; width:100%;" title="Instagram"><svg class="ti ti-brand-instagram" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-brand-instagram"></use></svg></button>
                <button class="btn bg bi btn-strava" onclick="event.stopPropagation();nahrajStravaZListu('${x.id}')" style="justify-content:center; border-radius:10px; height:42px; width:100%;" title="Strava"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display:block; margin: 0 auto;"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg></button>
                <button class="btn bg bi btn-qr" onclick="event.stopPropagation(); window.generovatQRVyletu('${x.shareId || ''}','${x.id}')" style="justify-content:center; border-radius:10px; height:42px; width:100%;" title="QR Kód"><svg class="ti ti-qrcode" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-qrcode"></use></svg></button>
                <button class="btn ${x.dokonceno?'bgh':'bp'}" style="justify-content:center; border-radius:10px; grid-column: span 4; margin-top:4px; width:100%;" onclick="event.stopPropagation();prepnoutStav('${x.id}',${!x.dokonceno})">${x.dokonceno?'Hotovo':'Splnit'}</button>
            </div>`;

        k.onclick=e=>{if(e.target.closest('button')||e.target.closest('img'))return;otevritDetailVyletu(x);};
        d.appendChild(k);
    });
}

window.smazat = async function(id) {
    const karta = document.querySelector(`[data-id="${id}"]`);
    if (!karta) { await window._smazatAPI(id); return; }
    
    karta.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:160px;gap:16px;padding:20px;position:relative;z-index:10;">
            <p style="font-weight:800;font-size:1rem;text-align:center;">Opravdu smazat výlet?</p>
            <div style="display:flex;gap:10px;">
                <button class="btn bp" onclick="event.stopPropagation(); window._smazatAPI('${id}')">Ano, smazat</button>
                <button class="btn bgh" onclick="event.stopPropagation(); nactiDnik()">Zrušit</button>
            </div>
        </div>
    `;
};

window._smazatAPI = async function(id) {
    try {
        const res = await fetch('/api/smazat-vylet/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.uspech) {
            document.getElementById('resCard').style.display = 'none';
            nactiDnik();
        } else {
            alert('Chyba při mazání: ' + (data.chyba || 'Neznámý problém.'));
        }
    } catch(e) {
        alert('Chyba spojení: ' + e.message);
    }
};

async function hodnoceniVyletu(id, val){
    await fetch('/api/upravit-vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,hodnoceni:val})});
    vykresliHvezdicky(id,val);nactiDnik();
}
function vykresliHvezdicky(id, cur=0){
    let h='';for(let i=1;i<=5;i++){h+=`<svg class="ti ti-star${i<=cur?' ti-star-filled':''} star ${i<=cur?'lit':''}" width="1.2em" height="1.2em" aria-hidden="true"  onclick="hodnoceniVyletu('${id}',${i})"><use href="#ti-star"></use></svg>`;}
    const ratingEl = document.getElementById('resTopRating');
    if (ratingEl) ratingEl.innerHTML = h;
}

function vykresliKomentare(k){
    document.getElementById('commentsSection').style.display='block';
    const l=document.getElementById('commentsList');
    if(!k.length){l.innerHTML=`<p style="color:var(--t2);font-size:.85rem;text-align:center;padding:20px;">Zatím žádné komentáře.</p>`;return;}
    l.innerHTML=k.map(c=>{
        const io=prihlaseno&&mujProfil&&(c.autorId===mujProfil._id||mujProfil.isAdmin);
        const ak=io?`<div style="display:flex;gap:5px;"><button class="btn bgh bi" style="width:26px;height:26px;border-radius:6px;font-size:.75rem;" onclick="upravitKomentar('${c.id}','${encodeURIComponent(c.text)}')">Upravit</button><button class="btn bgh bi" style="width:26px;height:26px;border-radius:6px;font-size:.75rem;" onclick="smazatKomentar('${c.id}')">Smazat</button></div>`:'';
        
        // Unikátní ID pro avatar aby se dal vyrenderovat po vložení do DOM
        const avId = `av-c-${Math.random().toString(36).substr(2, 9)}`;
        setTimeout(() => {
            const el = document.getElementById(avId);
            renderovatAvatar(el, c.avatar, c.autor);
        }, 0);

        return `<div class="ci2"><div id="${avId}" class="av" style="width:34px;height:34px;font-size:.78rem;"></div><div style="flex:1;"><div class="cm2"><div><span class="cn">${c.autor}</span><span class="cd" style="margin-left:8px;">${c.datum}</span></div>${ak}</div><p class="ct">${c.text}</p></div></div>`;
    }).join('');
}

async function odeslatKomentar(){if(!prihlaseno)return alert('Pro komentování se prosím přihlaste.');if(!curOpenTripId)return;const t=document.getElementById('newCommentText').value.trim();if(!t)return;document.getElementById('newCommentText').value='';await fetch('/api/pridat-komentar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idVyletu:curOpenTripId,text:t})});const v=await(await fetch('/api/ulozene-vylety')).json();vykresliKomentare(v.find(x=>x.id===curOpenTripId)?.komentare||[]);nactiDnik();}
async function smazatKomentar(cid){if(!confirm('Smazat komentář?'))return;await fetch('/api/smazat-komentar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tripId:curOpenTripId,commentId:cid})});const v=await(await fetch('/api/ulozene-vylety')).json();vykresliKomentare(v.find(x=>x.id===curOpenTripId)?.komentare||[]);}
async function upravitKomentar(cid,enc){const s=decodeURIComponent(enc),n=prompt('Upravit komentář:',s);if(n&&n.trim()&&n!==s){await fetch('/api/upravit-komentar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tripId:curOpenTripId,commentId:cid,text:n})});const v=await(await fetch('/api/ulozene-vylety')).json();vykresliKomentare(v.find(x=>x.id===curOpenTripId)?.komentare||[]);}}

function nactiFotkyDoFeedu(i){const p=document.getElementById('feedPhotoPreview');p.innerHTML='';pripraveneFotky=[];Array.from(i.files).slice(0,4).forEach(f=>{const r=new FileReader();r.onloadend=()=>{pripraveneFotky.push(r.result);p.innerHTML+=`<img src="${r.result}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;border:1px solid var(--gbd);">`;};r.readAsDataURL(f);});}
async function odeslatDoFeedu(){if(!prihlaseno)return alert('Pro publikování se prosím přihlaste.');const t=document.getElementById('feedText').value.trim();if(!t&&!pripraveneFotky.length)return alert('Příspěvek nemůže být prázdný.');const sel=document.getElementById('feedTripSelect'),btn=document.getElementById('btnOdeslatFeed');btn.innerHTML='<div class="spin"></div>';await fetch('/api/pridat-do-feedu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t,fotky:pripraveneFotky,pripojenyVyletId:sel.value,pripojenyVyletLokace:sel.value?sel.options[sel.selectedIndex].text:null})});document.getElementById('feedText').value='';document.getElementById('feedPhotoPreview').innerHTML='';pripraveneFotky=[];btn.innerText='Publikovat v komunitě';nactiFeed();}
// nactiFeed() je definována níže (aktuální verze s lajky, chat stylem a klikatelnými profily)


async function smazatFeed(id){if(confirm('Opravdu chcete příspěvek smazat?')){await fetch(`/api/smazat-feed/${id}`,{method:'DELETE'});nactiFeed();}}
async function upravitFeed(id,enc){const s=decodeURIComponent(enc),n=prompt('Upravit příspěvek:',s);if(n&&n.trim()&&n!==s){await fetch('/api/upravit-feed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:id,text:n})});nactiFeed();}}

async function generovat(){
    if(!prihlaseno)return alert('Pro plánování výletů se prosím přihlaste.');
    const start=document.getElementById('startIn').value.trim();
    const cil=document.getElementById('cilIn').value.trim();
    if(!start || !cil)return alert('Zadejte prosím odkud a kam chcete jet.');
    const misto = `${start} -> ${cil}`;
    const filtry=Array.from(document.querySelectorAll('.ai-filter:checked')).map(c=>c.value);
    const posuvnik = document.getElementById('inpLide');
    if(posuvnik) filtry.push(`Počet osob: ${posuvnik.value}`);
    const posuvnikZ = document.getElementById('inpZastavky');
    if(posuvnikZ) filtry.push(`Počet zastávek: ${posuvnikZ.value}`);
    const btn=document.getElementById('genBtn');btn.innerHTML='<div class="spin"></div> Zpracov\xE1v\xE1m...';btn.disabled=true;

    try{
        const res=await(await fetch('/api/vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({misto,specifikace:document.getElementById('specIn').value,vybraneFiltry:filtry})})).json();
        if(res.uspech){
            curDraft=res.data;curOpenTripId=null;
            document.getElementById('resTitle').innerText=curDraft.lokace;
            document.getElementById('resDiffText').innerText = 'AI Koncept — Náročnost ' + (curDraft.obtiznost || 2);

            // Render Widgetu Počasí
            const wBox = document.getElementById('resWeather');
            if (curDraft.pocasi && curDraft.pocasi.teplota !== undefined) {
                const wmoKody = {
                    0: {i:'ph-sun wa-spin wa-sun', t:'Jasno'}, 
                    1: {i:'ph-cloud-sun wa-float', t:'Polojasno'}, 
                    2: {i:'ph-cloud wa-float wa-cloud', t:'Oblačno'}, 
                    3: {i:'ph-cloud wa-float wa-cloud', t:'Zataženo'},
                    45: {i:'ph-cloud-fog wa-pulse', t:'Mlha'}, 
                    48: {i:'ph-cloud-fog wa-pulse', t:'Námrazová mlha'},
                    51:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Slabé mrholení'}, 
                    53:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Mrholení'}, 
                    55:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Silné mrholení'},
                    61:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Slabý déšť'}, 
                    63:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Déšť'}, 
                    65:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Silný déšť'},
                    71:{i:'ph-cloud-snow wa-spin wa-snow', t:'Slabé sněžení'}, 
                    73:{i:'ph-cloud-snow wa-spin wa-snow', t:'Sněžení'}, 
                    75:{i:'ph-cloud-snow wa-spin wa-snow', t:'Silné sněžení'},
                    80:{i:'ph-cloud-rain wa-pulse wa-bolt', t:'Přeháňky'}, 
                    81:{i:'ph-cloud-rain wa-pulse wa-bolt', t:'Silné přeháňky'}, 
                    82:{i:'ph-cloud-rain wa-pulse wa-bolt', t:'Přívalové srážky'},
                    95:{i:'ph-cloud-lightning wa-pulse wa-bolt', t:'Bouřka'}, 
                    96:{i:'ph-cloud-lightning wa-pulse wa-bolt', t:'Silná bouřka'}, 
                    99:{i:'ph-cloud-lightning wa-pulse wa-bolt', t:'Bouřka a kroupy'}
                };
                const wip = wmoKody[curDraft.pocasi.wmo] || {i:'ph-cloud-sun wa-float', t:'Neznámé'};

                wBox.innerHTML = `
                    <div style="display:flex; align-items:center; gap:16px; background:rgba(255,255,255,0.06); padding:12px 18px; border-radius:18px; border:1px solid rgba(255,255,255,0.1); width:max-content; margin-top:14px; box-shadow:0 8px 32px rgba(0,0,0,0.15);">
                        <i class="ph ${wip.i} wa" style="font-size:2.6rem; display:block;"></i>
                        <div>
                            <div style="font-size:1.6rem; font-weight:800; font-family:var(--fm); line-height:1; margin-bottom:4px;">${curDraft.pocasi.teplota}°C</div>
                            <div style="font-size:0.75rem; color:var(--t2); font-weight:600;">${wip.t} &nbsp;&nbsp; Vítr ${curDraft.pocasi.vitr} km/h</div>
                        </div>
                    </div>`;
                wBox.style.display = 'block';
            } else { wBox.style.display = 'none'; }
            document.getElementById('commentsSection').style.display='none';
            document.getElementById('btnSaveAI').style.display='inline-flex';
            
            // Tlačítka okamžitě viditelná po generování
            if(document.getElementById('btnUploadStrava')) document.getElementById('btnUploadStrava').style.display='inline-flex';
            if(document.getElementById('btnShareIG')) document.getElementById('btnShareIG').style.display='inline-flex';
            if(document.getElementById('btnEditTrip')) document.getElementById('btnEditTrip').style.display='inline-flex';
            if(document.getElementById('btnCalendarAdd')) document.getElementById('btnCalendarAdd').style.display='inline-flex';
            if(document.getElementById('btnShowQR')) document.getElementById('btnShowQR').style.display='inline-flex';
            let h='<div class="tl">';
            curDraft.etapy.forEach((e,i)=>{
                const isLast=i===curDraft.etapy.length-1;
                h+=`<div class="tr">`;
                h+=`<div class="t-left"><div class="td">${String(i+1).padStart(2,'0')}</div><div class="tt">${e.cas}</div></div>`;
                h+=`<div class="tc"><h4>${e.misto}</h4><p>${e.popis}</p></div>`;
                h+=`</div>`;
                if(!isLast) h+=`<div class="tr-line"></div>`;
            });
            h+='</div>';
            if(curDraft.doporuceni)h+=`<div class="ait"><span class="ait-ico">+</span><span>${curDraft.doporuceni}</span></div>`;
            document.getElementById('resBody').innerHTML=h;
            
            // BEZPEČNÉ SKRYTÍ TLAČÍTKA SDÍLENÍ

            const shareBtn = document.getElementById('btnShareTrip');
            if(shareBtn) shareBtn.style.display = 'none';
            
            document.getElementById('resCard').style.display='block';
            document.getElementById('budgetWidget').style.display='flex';
            vykreslitRozpocet();
            window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});
        }else alert('Chyba: '+(res.chyba||'Neznámý problém při komunikaci s AI.'));
    }catch(e){alert('Chyba spojení: '+e.message);}
    btn.innerHTML='Sestavit itinerář AI';btn.disabled=false;
}


async function ulozitNovyAI(){
    if(!curDraft)return;
    try {
        const res = await (await fetch('/api/ulozit-vylet',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({lokace:curDraft.lokace,popis:document.getElementById('resBody').innerHTML,obtiznost:curDraft.obtiznost,typ:'ai',etapy:curDraft.etapy})
        })).json();
        
        document.getElementById('resCard').style.display='none';
        nactiDnik();
        
        if (res.uspech && res.awarded && res.awarded.length > 0) {
            ukazAchievementModal(res.awarded[0], false); 
        } else {
            alert('Itinerář byl úspěšně uložen do deníku.');
        }

    } catch(e) { alert('Chyba při ukládání.'); }
}

function ukazAchievementModal(ach, allowShare = true) {
    document.getElementById('achIcon').className = `ti ${ach.ikona}`;
    document.getElementById('achTitle').innerText = ach.nazev;
    document.getElementById('achDesc').innerText = ach.popis;
    
    const shareBtn = document.getElementById('btnAchShare');
    if (shareBtn) shareBtn.style.display = allowShare ? 'inline-flex' : 'none';
    
    document.getElementById('achievementModal').style.display = 'flex';
    console.log("Achievement UNLOCKED:", ach.nazev);
}

function pridatEtapu(){const d=document.createElement('div');d.className='man-etapa';d.style.cssText='display:flex;gap:7px;margin-bottom:7px;align-items:center;';d.innerHTML=`<input type="time" class="f e-cas" style="width:108px;margin:0;" value="12:00"><input type="text" class="f e-misto" placeholder="Místo" style="flex:1;margin:0;"><input type="text" class="f e-popis" placeholder="Popis" style="flex:2;margin:0;"><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--t2);font-size:1rem;">✕</button>`;document.getElementById('manEtapy').appendChild(d);}
async function ulozitVlastni(){const l=document.getElementById('manLokace').value.trim();if(!l)return alert('Zadejte název výletu.');const etapyEls=Array.from(document.querySelectorAll('.man-etapa'));let h='<div class="tl">';etapyEls.forEach((e,i)=>{const isLast=i===etapyEls.length-1;h+=`<div class="tr"><div class="t-left"><div class="td">${String(i+1).padStart(2,'0')}</div><div class="tt">${e.querySelector('.e-cas').value}</div></div><div class="tc"><h4>${e.querySelector('.e-misto').value}</h4><p>${e.querySelector('.e-popis').value}</p></div></div>`;if(!isLast)h+=`<div class="tr-line"></div>`;});h+='</div>';await fetch('/api/ulozit-vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lokace:l,popis:h,obtiznost:parseInt(document.getElementById('manObtiznost').value),typ:'vlastni',etapy:[]})});document.getElementById('manualModal').style.display='none';nactiDnik();}
// NATIVNÍ SDÍLENÍ (Nyní odkazuje na konkrétní výlet)

async function sdiletVylet(id, lokace) {
    const res = await (await fetch('/api/ulozit-vylet-share-id/' + id)).json(); // Potřebujeme shareId
    const sid = res.shareId || id;
    const url = window.location.origin + '/s/' + sid;
    
    if (navigator.share) {
        navigator.share({ title: `Výlet: ${lokace}`, url });
    } else {
        await navigator.clipboard.writeText(url);
        alert('Odkaz zkopírován do schránky!');
    }

}


async function exportujIGZListu(id, event) {
    const x = vListBackup.find(t=>t.id===id);
    if(x) {
        exportovatNaInstagram({ currentTarget: event.currentTarget }, x);
    }
}
window.exportujIGZListu = exportujIGZListu;

// ROZPOČET A VYROVNÁNÍ NÁKLADŮ

async function pridatVydaj() {
    const kdo = document.getElementById('budgetKdo').value.trim();
    const zaCo = document.getElementById('budgetZaCo').value.trim();
    const kolik = parseFloat(document.getElementById('budgetKolik').value);
    
    if (!kdo || !zaCo || isNaN(kolik) || kolik <= 0) {
        alert('Vyplňte správně všechna pole.');
        return;
    }
    
    if (!curDraft) curDraft = {};
    if (!curDraft.rozpocet) curDraft.rozpocet = [];
    
    const novyVydaj = {
        id: Date.now().toString(),
        kdo: kdo,
        zaCo: zaCo,
        kolik: kolik
    };
    
    curDraft.rozpocet.push(novyVydaj);
    
    document.getElementById('budgetKdo').value = '';
    document.getElementById('budgetZaCo').value = '';
    document.getElementById('budgetKolik').value = '';
    
    vykreslitRozpocet();
    
    if (curOpenTripId) {
        try {
            await fetch('/api/upravit-vylet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: curOpenTripId, rozpocet: curDraft.rozpocet })
            });
        } catch(e) { console.error('Nelze uložit rozpočet: ', e); }
    }
}

window.pridatVydaj = pridatVydaj;

async function smazatVydaj(id) {
    if (!curDraft || !curDraft.rozpocet) return;
    
    curDraft.rozpocet = curDraft.rozpocet.filter(v => v.id !== id);
    vykreslitRozpocet();
    
    if (curOpenTripId) {
        try {
            await fetch('/api/upravit-vylet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: curOpenTripId, rozpocet: curDraft.rozpocet })
            });
        } catch(e) { console.error('Nelze aktualizovat rozpočet: ', e); }
    }
}

window.smazatVydaj = smazatVydaj;

function vykreslitRozpocet() {
    const listEl = document.getElementById('budgetList');
    const splitEl = document.getElementById('budgetSplit');
    
    if (!curDraft || !curDraft.rozpocet || curDraft.rozpocet.length === 0) {
        listEl.innerHTML = '<p style="color:var(--t2); font-size:0.9rem;">Zatím žádné výdaje.</p>';
        splitEl.innerHTML = '';
        return;
    }
    
    // Vykreslení seznamu
    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
    let celkem = 0;
    const utratyLidi = {};
    
    curDraft.rozpocet.forEach(v => {
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:10px; border-radius:var(--rsm); border:1px solid var(--gbd);">
            <div>
                <strong style="color:var(--a1); font-weight: 800;">${v.kdo}</strong> platil(a) za <strong>${v.zaCo}</strong>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-weight:bold; font-family: var(--fm);">${v.kolik} Kč</span>
                <button class="btn bgh bi" style="padding:4px;" aria-label="Smazat výdaj" onclick="smazatVydaj('${v.id}')"><span style="color: #ef4444; font-weight: bold;">✕</span></button>
            </div>
        </div>`;
        
        celkem += v.kolik;
        if (!utratyLidi[v.kdo]) utratyLidi[v.kdo] = 0;
        utratyLidi[v.kdo] += v.kolik;
    });
    html += '</div>';
    listEl.innerHTML = html;
    
    // Matematika - Split bill
    const lide = Object.keys(utratyLidi);
    const pocetLidi = lide.length;
    
    if (pocetLidi <= 1) {
        splitEl.innerHTML = `<p style="margin:0; font-family: var(--fm);">Celkem utraceno: <strong style="color:var(--t1); font-size: 1.1rem;">${celkem} Kč</strong></p>`;
        return;
    }
    
    const prumer = celkem / pocetLidi;
    const bilance = [];
    
    lide.forEach(osoba => {
        bilance.push({
            kdo: osoba,
            rozdil: utratyLidi[osoba] - prumer
        });
    });
    
    const dluznici = bilance.filter(b => b.rozdil < -0.01).sort((a,b) => a.rozdil - b.rozdil); // ti co zaplatili méně
    const veritele = bilance.filter(b => b.rozdil > 0.01).sort((a,b) => b.rozdil - a.rozdil);  // ti co zaplatili více
    
    let vyrovnaniHtml = `<p style="margin-bottom:12px; font-family: var(--fm); font-size: 0.95rem;">Celkem utraceno: <strong style="color:var(--t1); font-size: 1.1rem;">${celkem} Kč</strong> <span style="color:var(--t2); font-size: 0.8rem;">(cca ${Math.round(prumer)} Kč na osobu)</span></p>`;
    vyrovnaniHtml += `<ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:6px;">`;
    
    let i = 0;
    let j = 0;
    
    while (i < dluznici.length && j < veritele.length) {
        const dluznik = dluznici[i];
        const veritel = veritele[j];
        
        const castka = Math.min(Math.abs(dluznik.rozdil), veritel.rozdil);
        
        vyrovnaniHtml += `<li style="font-size:0.9rem; background: rgba(16, 185, 129, 0.1); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #10b981; display:flex; align-items:center; gap:8px;">
            <span>💸</span>
            <span><strong style="color:#ef4444; font-weight:800;">${dluznik.kdo}</strong> pošle <strong style="color:#10b981; font-family:var(--fm); font-size:1.05em;">${Math.round(castka)} Kč</strong> pro <strong style="color:var(--t1); font-weight:800;">${veritel.kdo}</strong></span>
        </li>`;
        
        dluznik.rozdil += castka;
        veritel.rozdil -= castka;
        
        if (Math.abs(dluznik.rozdil) < 0.01) i++;
        if (veritel.rozdil < 0.01) j++;
    }
    
    vyrovnaniHtml += `</ul>`;
    splitEl.innerHTML = vyrovnaniHtml;
}

window.vykreslitRozpocet = vykreslitRozpocet;

async function exportRozpocetJPG() {
    if (typeof html2canvas === 'undefined') {
        alert('Knihovna html2canvas není prozatím načtena.');
        return;
    }
    const widget = document.getElementById('budgetWidget');
    const form = document.getElementById('budgetForm');
    const btnExport = document.getElementById('btnExportJPG');
    
    // Schovat formulář a tlačítko před přescreenováním
    if (form) form.style.display = 'none';
    if (btnExport) btnExport.style.display = 'none';
    
    try {
        const canvas = await html2canvas(widget, {
            backgroundColor: '#060810',
            scale: 2,
            useCORS: true
        });
        
        const link = document.createElement('a');
        link.download = 'Rozpocet.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    } catch (e) {
        console.error('Chyba při exportu rozpočtu:', e);
        alert('Nepodařilo se vyfotit rozpočet.');
    } finally {
        // Vrátit zpět
        if (form) form.style.display = 'flex';
        if (btnExport) btnExport.style.display = 'inline-flex';
    }
}
window.exportRozpocetJPG = exportRozpocetJPG;

// NOVÁ DESIGN QR FUNKCE
async function generovatQRVyletu(shareId, id) {
    let sid = shareId;
    if(!sid || sid === 'undefined' || sid === 'null' || sid === '') {
        const res = await (await fetch('/api/ulozit-vylet-share-id/' + id)).json();
        sid = res.shareId;
    }
    if(!sid) return alert('Tento výlet zatím nemá unikátní odkaz pro QR.');

    const modal = document.createElement('div');
    modal.id = 'qrModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); z-index:100000; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.3s ease;';

    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, var(--gb2, #1a1c29), var(--gb3, #060810)); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; text-align: center; max-width: 90%; width: 340px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); transform: translateY(20px); transition: transform 0.3s ease;">
            <h3 style="color: white; font-size: 1.5rem; margin-bottom: 10px; font-weight: 800;">Sdílet výlet 🚀</h3>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px;">Ukaž tento kód kamarádovi. Stačí namířit foťák!</p>

            <div id="qrLoader" style="color: white; margin: 40px 0;">Generuji QR kód...</div>

            <img id="qrImage" src="" alt="QR Kód" style="display: none; width: 100%; border-radius: 12px; margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 10px;">

            <button onclick="document.getElementById('qrModal').remove()" style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: bold; width: 100%; transition: background 0.2s;">Zavřít</button>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('div').style.transform = 'translateY(0)';
    }, 10);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    try {
        const response = await fetch('/api/qr/' + sid);
        const data = await response.json();

        if (data.uspech) {
            document.getElementById('qrLoader').style.display = 'none';
            const img = document.getElementById('qrImage');
            img.src = data.qrData;
            img.style.display = 'block';
        } else {
            document.getElementById('qrLoader').innerText = '❌ Chyba při generování';
        }
    } catch (err) {
        document.getElementById('qrLoader').innerText = '❌ Nelze se spojit se serverem';
    }
}
window.generovatQRVyletu = generovatQRVyletu;
window.otevritQRZDetailu = function() {
    if(!curOpenTripId) return;
    const sid = curDraft ? curDraft.shareId : null;
    window.generovatQRVyletu(sid, curOpenTripId);
};

 window.nahrajStravaZListu = function(id) {
    const v = vListBackup.find(t=>t.id===id); 
    if(v) {
        curOpenTripId = id;
        document.getElementById('gpxUpload').click();
    }
};
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

function openGallery(s){document.getElementById('lightboxImg').src=s;document.getElementById('lightbox').style.display='flex';}
async function doKalendare() {
    const d = document.getElementById('dateIn').value;
    if (!d) return alert('Vyberte prosím datum.');


    const btn = document.getElementById('btnKalendarModal');
    const origText = btn.innerText;
    btn.innerText = 'Zpracovávám...';


    let ml = '';
    let polohaStartu = '';
    
    if (typeof curDraft !== 'undefined' && curDraft?.etapy && curDraft.etapy.length > 0) {
        polohaStartu = curDraft.etapy[0].misto;
        if (curDraft.etapy[0].lat) {
            const o = `${curDraft.etapy[0].lat},${curDraft.etapy[0].lng}`;
            const d2 = `${curDraft.etapy[curDraft.etapy.length - 1].lat},${curDraft.etapy[curDraft.etapy.length - 1].lng}`;
            const wp = curDraft.etapy.length > 2 ? '&waypoints=' + curDraft.etapy.slice(1, -1).map(e => `${e.lat},${e.lng}`).join('|') : '';
            
            let tm = 'driving';
            const text = (document.getElementById('resTitle').innerText + ' ' + document.getElementById('resBody').innerText).toLowerCase();
            if (text.includes('kolo') || text.includes('cyklistika') || text.includes('mtb') || text.includes('cyklo')) tm = 'bicycling';
            else if (text.includes('procházka') || text.includes('turistika') || text.includes('pěší')) tm = 'walking';

            ml = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d2}${wp}&travelmode=${tm}`;
        }
    }

    let detailniPopis = `Itinerář výletu: ${document.getElementById('resTitle').innerText}\n\n`;

    if (typeof curDraft !== 'undefined' && curDraft?.etapy) {
        curDraft.etapy.forEach(e => {
            detailniPopis += `📍 ${e.cas} — ${e.misto}\n📝 ${e.popis}\n\n`;
        });
    }
    if (typeof curDraft !== 'undefined' && curDraft?.doporuceni) {
        detailniPopis += `💡 Tip architekta: ${curDraft.doporuceni}\n\n`;
    }


    try {
        const r = await fetch('/api/kalendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lokace: document.getElementById('resTitle').innerText,
                popis: detailniPopis.trim(),
                datum: d,
                mapaLink: ml,
                startMisto: polohaStartu
            })
        });
        const data = await r.json();
        btn.innerText = origText;
        
        if (data.uspech && data.url) {
            document.getElementById('calendarModal').style.display = 'none';
            
            let noveOkno = window.open(data.url, '_blank');
            if (!noveOkno || noveOkno.closed || typeof noveOkno.closed === 'undefined') {
                window.location.href = data.url;
            }
        } else {
            alert(data.chyba || 'Došlo k chybě při vytváření kalendáře.');
        }

    } catch (e) {
        btn.innerText = origText;
        alert('Chyba: ' + e.message);
    }
}

async function odeslatKontaktV2(){const pe=document.getElementById('kontaktPredmet'),ze=document.getElementById('kontaktZprava');if(!pe.value||!ze.value)return alert('VyplĹte prosím všechna pole.');const btn=event.target,orig=btn.innerText;btn.innerHTML='<div class="spin" style="margin:0 auto"></div>';btn.disabled=true;try{const r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:'c8ed8521-b2ea-4c17-ad1a-2379968a739e',subject:`VERONA: ${pe.value}`,from_name:'Uživatel VERONA',message:ze.value})});const res=await r.json();if(res.success){alert('Vaše zpráva byla úspěšně odeslána. Děkujeme.');document.getElementById('contactWin').style.display='none';pe.value='';ze.value='';}else alert('Došlo k chybě: '+res.message);}catch(e){alert('Chyba při komunikaci se serverem.');}btn.innerText=orig;btn.disabled=false;}
// 1. UPRAVENĂ FUNKCE PRO DETAIL - Zavolá kreslení mapy
function otevritDetailVyletu(v){
    curOpenTripId=v.id;
    
    // BEZPEÄŚNMâ€° ZOBRAZENMĹ¤ TLAÄŚMĹ¤TKA SDMĹ¤LENMĹ¤
    const shareBtn = document.getElementById('btnShareTrip');
    if(shareBtn) shareBtn.style.display = 'inline-flex';
    
    // Tlačítka viditelná v detailu
    if(document.getElementById('btnUploadStrava')) document.getElementById('btnUploadStrava').style.display='inline-flex';
    if(document.getElementById('btnShareIG')) document.getElementById('btnShareIG').style.display='inline-flex';
    if(document.getElementById('btnEditTrip')) document.getElementById('btnEditTrip').style.display='inline-flex';
    if(document.getElementById('btnCalendarAdd')) document.getElementById('btnCalendarAdd').style.display='inline-flex';
    if(document.getElementById('btnShowQR')) document.getElementById('btnShowQR').style.display='inline-flex';
    
    document.getElementById('resTitle').innerText=v.lokace;
    document.getElementById('resDiffText').innerText='Uloženo: '+(v.datumUlozeni||'');
    document.getElementById('btnSaveAI').style.display='none';
    
    // Novinka: Tlačítko pro kopírování cizích výletů a schování úpravy
    const bpub = document.getElementById('btnSavePublic');
    const bedit = document.getElementById('btnEditTrip');
    const bgpx = document.getElementById('btnUploadStrava');
    if (v.vlastnikId && mujProfil && v.vlastnikId !== mujProfil._id) {
        if(bpub) bpub.style.display = 'inline-flex';
        if(bedit) bedit.style.display = 'none';
        if(bgpx) bgpx.style.display = 'none';
    } else {
        if(bpub) bpub.style.display = 'none';
        if(bedit) bedit.style.display = 'inline-flex';
        if(bgpx) bgpx.style.display = 'inline-flex';
    }

    const wBox = document.getElementById('resWeather');
    if (v.pocasi && v.pocasi.teplota !== undefined) {
        const wmoKody = {
            0: {i:'ph-sun wa-spin wa-sun', t:'Jasno'}, 
            1: {i:'ph-cloud-sun wa-float', t:'Polojasno'}, 
            2: {i:'ph-cloud wa-float wa-cloud', t:'Oblačno'}, 
            3: {i:'ph-cloud wa-float wa-cloud', t:'Zataženo'},
            45: {i:'ph-cloud-fog wa-pulse', t:'Mlha'}, 
            48: {i:'ph-cloud-fog wa-pulse', t:'Námrazová mlha'},
            51:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Slabé mrholení'}, 
            53:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Mrholení'}, 
            55:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Silné mrholení'},
            61:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Slabý déšť'}, 
            63:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Déšť'}, 
            65:{i:'ph-cloud-rain wa-pulse wa-rain', t:'Silný déšť'},
            71:{i:'ph-cloud-snow wa-spin wa-snow', t:'Slabé sněžení'}, 
            73:{i:'ph-cloud-snow wa-spin wa-snow', t:'Sněžení'}, 
            75:{i:'ph-cloud-snow wa-spin wa-snow', t:'Silné sněžení'},
            80:{i:'ph-cloud-rain wa-pulse wa-bolt', t:'Přeháňky'}, 
            81:{i:'ph-cloud-rain wa-pulse wa-bolt', t:'Silné přeháňky'}, 
            82:{i:'ph-cloud-rain wa-pulse wa-bolt', t:'Přívalové srážky'},
            95:{i:'ph-cloud-lightning wa-pulse wa-bolt', t:'Bouřka'}, 
            96:{i:'ph-cloud-lightning wa-pulse wa-bolt', t:'Silná bouřka'}, 
            99:{i:'ph-cloud-lightning wa-pulse wa-bolt', t:'Bouřka a kroupy'}
        };
        const wip = wmoKody[v.pocasi.wmo] || {i:'ph-cloud-sun wa-float', t:'Neznámé'};

        wBox.innerHTML = `
            <div style="display:flex; align-items:center; gap:16px; background:rgba(255,255,255,0.06); padding:12px 18px; border-radius:18px; border:1px solid rgba(255,255,255,0.1); width:max-content; margin-top:14px; box-shadow:0 8px 32px rgba(0,0,0,0.15);">
                <i class="ph ${wip.i} wa" style="font-size:2.6rem; display:block;"></i>
                <div>
                    <div style="font-size:1.6rem; font-weight:800; font-family:var(--fm); line-height:1; margin-bottom:4px;">${v.pocasi.teplota}°C</div>
                    <div style="font-size:0.75rem; color:var(--t2); font-weight:600;">${wip.t} &nbsp;&nbsp; Vítr ${v.pocasi.vitr} km/h</div>
                </div>
            </div>`;
        wBox.style.display = 'block';
    } else { wBox.style.display = 'none'; }

    vykresliKomentare(v.komentare||[]);
    curDraft=v;
    document.getElementById('resCard').style.display='block';
    document.getElementById('budgetWidget').style.display='flex';
    vykreslitRozpocet();
    window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});
    
    // Novinka: Nakreslí trasu!
    vykresliTrasuNaMape(v);

}

async function ulozitCiziVylet() {
    if (!prihlaseno) return alert('Musíte být přihlášeni.');

    if (!curOpenTripId) return;
    const btn = document.getElementById('btnSavePublic');
    btn.innerHTML = '<div class="spin"></div> Kopíruji...';
    try {
        const res = await (await fetch('/api/ulozit-cizi-vylet', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idVyletu: curOpenTripId})})).json();
        if (res.uspech) {
            alert('Výlet úspěšně uložen do vaší sekce Můj Deník!');
            nactiDnik();
            btn.innerHTML = 'Uloženo <i class="ph-fill ph-check"></i>';
            setTimeout(() => btn.style.display = 'none', 3000);
        } else {

            alert('Chyba: ' + res.chyba);
            btn.innerHTML = 'Uložit do mého deníku <i class="ph-fill ph-bookmark-simple" style="margin-left:5px;"></i>';
        }
    } catch(e) { 
        alert('Spojení selhalo.'); 
        btn.innerHTML = 'Uložit do mého deníku <i class="ph-fill ph-bookmark-simple" style="margin-left:5px;"></i>';
    }
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

// 3. UPRAVENMť FEED - Dělá jména a avatary klikací
async function nactiFeed(){
    const f=await(await fetch('/api/feed')).json();const c=document.getElementById('feedStream');
    if(!f.length){c.innerHTML=`<div class="es"><p style="font-size:.88rem;">Komunita je zatím prázdná. Napište první zprávu!</p></div>`;return;}
    
    // Změna názvů v poli pro psaní
    document.querySelector('.clabel').innerText = '// Chat s komunitou';
    document.getElementById('btnOdeslatFeed').innerText = 'Odeslat do chatu';
    
    c.innerHTML=f.map((p,i)=>{
        const isMine = prihlaseno && mujProfil && p.autorId === mujProfil._id;
        // Pokud je zpráva tvá, zarovná se doprava a získá lehce fialový nádech jako iMessage
        const chatStyle = isMine 
            ? 'margin-left:auto; background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05)); border-color: rgba(99,102,241,0.25);' 
            : 'margin-right:auto;';

        const likedByMe = prihlaseno && mujProfil && p.likes && p.likes.includes(mujProfil._id.toString());
        const hl = likedByMe ? 'color:#ef4444;' : 'color:var(--t2);';
        const hi = likedByMe ? 'ti ti-heart-filled' : 'ti ti-heart';

        // Unikátní ID pro avatar
        const avId = `av-f-${p._id}`;
        setTimeout(() => {
            const el = document.getElementById(avId);
            renderovatAvatar(el, p.autorAvatar, p.autorJmeno);
        }, 0);

        return `<div class="fp" style="max-width:85%; ${chatStyle} animation-delay:${i*.06}s;">
            <div class="ph"><div class="pa" style="cursor:pointer;" onclick="otevritVerejnyProfil('${p.autorId}')" title="Zobrazit profil"><div id="${avId}" class="av"></div><div><p class="an" style="transition:color .2s;" onmouseover="this.style.color='var(--a1)'" onmouseout="this.style.color='currentColor'">${p.autorJmeno}</p><p class="pd">${p.datum}</p></div></div></div>
            <p class="pt">${p.text}</p>
            <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                <button class="btnx" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; font-size:.85rem; padding:4px 10px; width:auto; border-radius:12px; transition:all .2s; cursor:pointer; background:rgba(0,0,0,0.1); border:1px solid rgba(255,255,255,0.05); ${hl}" onclick="toggleLike('${p._id}', this)">
                    <i class="${hi}" style="transition:transform .2s; font-size:1.05rem; display:block; margin-top:2px;"></i> 
                    <span class="lc" style="font-weight:700; display:block; line-height:1;">${p.likes?.length || 0}</span>
                </button>
            </div>
        </div>`;
    }).join('');
}

async function toggleLike(postId, btn) {
    if(!prihlaseno) return alert('Pro lajkování se musíte přihlásit.');
    const icon = btn.querySelector('i');
    const countSpan = btn.querySelector('.lc');
    icon.style.transform = 'scale(1.4)';
    setTimeout(() => icon.style.transform = 'scale(1)', 200);
    try {
        const res = await (await fetch('/api/feed-zmena-lajku', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId})})).json();
        if(res.uspech) {
            countSpan.innerText = res.count;
            if(res.isActive) { btn.style.color = '#ef4444'; icon.className = 'ti ti-heart-filled'; } 
            else { btn.style.color = 'var(--t2)'; icon.className = 'ti ti-heart'; }
        }
    } catch(e) {}
}

// 4. ZCELA NOVMâ€° FUNKCE PRO VEĹEJNMâ€° PROFILY
window.pubTripsData = []; // Záložní úložiště pro prokliky
async function otevritVerejnyProfil(id) {
    if (!id) return;
    document.getElementById('pubTrips').innerHTML = '<div class="spin" style="margin:20px auto;display:block;"></div>';
    document.getElementById('publicProfileModal').style.display = 'flex';
    
    try {
        const res = await (await fetch('/api/profil/' + id)).json();
        if (res.uspech) {
            const p = res.profil;
            window.pubTripsData = res.vylety; 
            
            document.getElementById('pubName').innerText = p.jmeno;
            document.getElementById('pubBio').innerText = p.bio || 'Tento cestovatel o sobě zatím nic nenapsal.';
            const avDiv = document.getElementById('pubAvatar');
            if (p.avatar) { avDiv.style.backgroundImage = `url(${p.avatar})`; avDiv.innerText = ''; } 
            else { avDiv.style.backgroundImage = 'linear-gradient(135deg,var(--a1),var(--a3))'; avDiv.innerText = p.jmeno.charAt(0).toUpperCase(); }
            // --- NOVINKA: TLAČÍTKO SLEDOVAT (Instagram styl) ---
            let followBtn = document.getElementById('btnSledovatProfil');
            if (!followBtn) {
                // Vytvoříme tlačítko, pokud tam ještě není
                followBtn = document.createElement('button');
                followBtn.id = 'btnSledovatProfil';
                // Vložíme ho hned pod jméno a bio
                document.getElementById('pubBio').parentNode.insertBefore(followBtn, document.getElementById('pubBio').nextSibling);
            }
            
            // Pokud koukám sám na sebe, tlačítko schovám (nemůžu sledovat sám sebe)
            if (mujProfil && p._id === mujProfil._id) {
                followBtn.style.display = 'none';
            } else {
                followBtn.style.display = 'inline-flex';
                followBtn.style.alignItems = 'center';
                followBtn.style.justifyContent = 'center';
                followBtn.style.gap = '8px';
                followBtn.style.padding = '8px 20px';
                followBtn.style.borderRadius = '20px';
                followBtn.style.fontSize = '0.9rem';
                followBtn.style.fontWeight = 'bold';
                followBtn.style.cursor = 'pointer';
                followBtn.style.marginTop = '15px';
                followBtn.style.transition = 'all 0.2s ease';
                followBtn.style.border = 'none';

                // Zjistíme, jestli ho už sleduju
                let uzSleduji = p.sledujici && mujProfil && p.sledujici.includes(mujProfil._id);
                
                // Funkce na přebarvení tlačítka
                const vykresliTlacitko = (sleduje) => {
                    if (sleduje) {
                        followBtn.innerHTML = 'Sleduji <i class="ph-fill ph-check-circle"></i>';
                        followBtn.style.background = 'rgba(255,255,255,0.1)';
                        followBtn.style.color = '#fff';
                        followBtn.style.border = '1px solid rgba(255,255,255,0.2)';
                    } else {
                        followBtn.innerHTML = 'Sledovat <i class="ph-bold ph-user-plus"></i>';
                        followBtn.style.background = 'var(--a1, #6b4ce6)'; // Tvoje fialová/modrá barva
                        followBtn.style.color = '#fff';
                        followBtn.style.border = 'none';
                    }
                };
                
                vykresliTlacitko(uzSleduji);
                
                // Co se stane po kliknutí
                followBtn.onclick = async () => {
                    if (!prihlaseno) return alert('Pro sledování cestovatelů se musíš přihlásit.');
                    followBtn.innerHTML = '<div class="spin" style="width:16px;height:16px;border-width:2px;"></div>'; // Animace načítání
                    try {
                        const targetId = p._id || id;
                        const fRes = await (await fetch('/api/sleduj/' + targetId, { method: 'POST' })).json();
                        if (fRes.uspech) {
                            uzSleduji = fRes.nyniSleduje;
                            vykresliTlacitko(uzSleduji);
                        } else {
                            alert(fRes.chyba);
                            vykresliTlacitko(uzSleduji);
                        }
                    } catch(e) { 
                        console.error('Follow error:', e);
                        alert('Chyba spojení.'); 
                        vykresliTlacitko(uzSleduji); 
                    }
                };
            }
            // --- KONEC TLAČÍTKA SLEDOVAT ---
            // Logika přátelství a Chat zobrazení pouze pro přihlášeného klienta (Ne na svém vlastním profilu)
            const pubActions = document.getElementById('pubActions');
            if (prihlaseno && mujProfil && mujProfil._id !== id) {
                pubActions.style.display = 'flex';
                window.aktualniCiziProfilId = id;
                window.aktualniCiziProfilJmeno = p.jmeno;
                window.aktualniCiziProfilAvatar = p.avatar;
                
                const btnFriend = document.getElementById('btnPridatPritele');
                if (p.jePritel) {
                    btnFriend.innerHTML = '<svg class="ti ti-user-minus" width="1.2em" height="1.2em" aria-hidden="true"  style="margin-right:4px;"><use href="#ti-user-minus"></use></svg> <span>Odebrat</span>';
                    btnFriend.className = 'btn bgh';
                } else {
                    btnFriend.innerHTML = '<svg class="ti ti-user-plus" width="1.2em" height="1.2em" aria-hidden="true"  style="margin-right:4px;"><use href="#ti-user-plus"></use></svg> <span>Přidat přítele</span>';
                    btnFriend.className = 'btn bg';
                }
            } else { pubActions.style.display = 'none'; }
            
            const c = document.getElementById('pubTrips');
            if (!window.pubTripsData.length) {
                c.innerHTML = '<p style="color:var(--t2);font-size:.85rem;text-align:center;padding:20px;">Zatím žádné veřejné výlety.</p>';
            } else {
                c.innerHTML = window.pubTripsData.map(x => `
                    <div class="dc" style="padding:16px;margin-bottom:0;cursor:default;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <h4 style="font-size:1rem;font-weight:700;margin-bottom:4px;">${x.lokace}</h4>
                                <p style="font-family:var(--fm);font-size:.6rem;color:var(--t2);">${x.datumUlozeni||''}</p>
                            </div>
                            <button class="btn bg" style="font-size:.7rem;padding:6px 12px;" onclick="otevritDetailVerejnehoVyletu('${x.id}')">Zobrazit trasu</button>
                        </div>
                    </div>
                `).join('');
            }
        } else { document.getElementById('pubTrips').innerHTML = '<p>Chyba načítání profilu.</p>'; }
    } catch(e) { document.getElementById('pubTrips').innerHTML = '<p>Chyba spojení.</p>'; }
}

window.otevritDetailVerejnehoVyletu = function(id) {
    const trip = window.pubTripsData.find(t => t.id === id);
    if (trip) {
        document.getElementById('publicProfileModal').style.display = 'none';
        prepniTab('planovac'); // Hodíme uživatele na hlavní obrazovku k mapě
        otevritDetailVyletu(trip); // A vykreslíme cizí trasu i s čárou!
    }
};

// --- CHAT A PĹĂTELMâ€° LOGIKA ---
async function pridatOdebratPritele() {
    if(!window.aktualniCiziProfilId) return;
    try {
        const res = await (await fetch('/api/pridat-pritele', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ targetId: window.aktualniCiziProfilId }) })).json();
        if(res.uspech) { otevritVerejnyProfil(window.aktualniCiziProfilId); } // Znovu vyrenderuje tlačítka
    } catch(e) { console.error(e); }
}

window.chatRefreshInterval = null;

// Nová funkce otevritChat nyní rovnou volá widget
window.otevritChat = function() {
    otevritChatV2(window.aktualniCiziProfilId, window.aktualniCiziProfilJmeno, window.aktualniCiziProfilAvatar);
};

async function nactiChat() {
    if(!mujProfil) return;
    const widget = document.getElementById('chatWidget');
    // Kontrola, zda je widget otevřený, jinak zbytečně nezatěžujeme server
    if(!widget || widget.style.display === 'none') return;
    
    try {
        const res = await (await fetch('/api/zpravy/' + window.aktualniCiziProfilId)).json();
        if(res.uspech) {
            const hist = document.getElementById('chatHistory');
            if(!hist) return;
            const isScrolledToBottom = hist.scrollHeight - hist.clientHeight <= hist.scrollTop + 20;

            if(res.data.length === 0) hist.innerHTML = '<div style="padding:20px;text-align:center;opacity:0.5;">Zatím žádné zprávy.</div>';
            else {
                hist.innerHTML = res.data.map((z) => {
                    const isMine = z.odesilatelId === mujProfil._id;
                    const bSty = isMine ? 'background:var(--a1);color:white;margin-left:auto;' : 'background:rgba(255,255,255,0.1);margin-right:auto;';
                    return `<div style="max-width:80%;padding:10px;border-radius:12px;font-size:0.85rem;${bSty}">${z.text}</div>`;
                }).join('');
            }
            if(isScrolledToBottom) hist.scrollTop = hist.scrollHeight;
        }
    } catch(e) {}
}


async function poslatZpravu() {
    const inp = document.getElementById('chatInput');
    const text = inp.value;
    if(!text.trim() || !window.aktualniCiziProfilId) return;
    inp.value = '';
    
    try {
        await fetch('/api/poslat-zpravu', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prijemceId: window.aktualniCiziProfilId, text }) });
        nactiChat();
        setTimeout(() => { const h=document.getElementById('chatHistory'); h.scrollTop=h.scrollHeight; }, 100);
    } catch(e) {}
}

// Změna soukromí výletu (Veřejný <-> Soukromý)
async function prepnoutSoukromi(id, stav) {
    try {
        const r = await fetch('/api/upravit-vylet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, verejny: stav })
        });
        const data = await r.json();
        if (data.uspech) {
            nactiDnik(); // Překreslí deník a aktualizuje štítek
        } else {
            alert('Chyba při změně soukromí.');
        }
    } catch(e) {
        alert('Chyba spojení.');
    }
}

// Změna stavu výletu (Splněno <-> Zrušit)
async function prepnoutStav(id, stav) {
    try {
        const r = await fetch('/api/upravit-vylet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, dokonceno: stav })
        });
        const data = await r.json();
        if (data.uspech) {
            nactiDnik(); // Překreslí deník a zbarví okraj výletu
        } else {
            alert('Chyba při změně stavu.');
        }
    } catch(e) {
        alert('Chyba spojení.');
    }
}

// Logic relocated to Social Hub

async function vykreslitFriendHub() {
    if(!prihlaseno) return;
    try {
        const res = await (await fetch('/api/moji-pratele')).json();
        const hubCont = document.getElementById('friendsHubContainer');
        const hub = document.getElementById('friendsHub');
        
        if(!res.uspech || !res.data || res.data.length === 0) {
        hubCont.style.display = 'none';
            return;
        }
        
        hubCont.style.display = 'block';
        hub.innerHTML = res.data.map(p => {
            const avId = `av-hub-${p.id}`;
            setTimeout(() => {
                const el = document.getElementById(avId);
                renderovatAvatar(el, p.avatar, p.jmeno);
            }, 0);
            return `
            <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; min-width:60px;" onclick="otevritChatZHubu('${p.id}', '${p.jmeno}', '${p.avatar || ''}')">
                <div id="${avId}" class="av" style="width:48px; height:48px; border-radius:50%; border:2px solid var(--a1); margin-bottom:6px; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'"></div>
                <span style="font-size:0.65rem; font-family:var(--fm); color:var(--t2); text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:64px;">${p.jmeno.split(' ')[0]}</span>
            </div>
            `;
        }).join('');
    } catch(e) { console.error(e); }
}

window.otevritChatZHubu = function(id, jmeno, avatar) {
    window.aktualniCiziProfilId = id;
    window.aktualniCiziProfilJmeno = jmeno;
    window.aktualniCiziProfilAvatar = avatar;
    otevritChat();
};

function prepniTab(tab, updateUrl = true){
    ['landing', 'planovac', 'verejne', 'akce', 'komunita', 'profil'].forEach(t=>{
        const btn = document.getElementById(`t-${t}`);
        if(btn) btn.classList.remove('active');
        const m = document.getElementById(`mt-${t}`);
        if(m) m.classList.remove('active');
        
        const viewId = (t === 'landing' ? 'viewLanding' : t === 'planovac' ? 'viewPlanovac' : t === 'verejne' ? 'viewVerejne' : t === 'akce' ? 'viewAkce' : t === 'profil' ? 'viewProfil' : 'viewKomunita');
        const view = document.getElementById(viewId);
        if(view) view.classList.add('hidden');
    });
    
    document.getElementById(`t-${tab}`)?.classList.add('active');
    document.getElementById(`mt-${tab}`)?.classList.add('active');
    const targetViewId = (tab === 'landing' ? 'viewLanding' : tab === 'planovac' ? 'viewPlanovac' : tab === 'verejne' ? 'viewVerejne' : tab === 'akce' ? 'viewAkce' : tab === 'profil' ? 'viewProfil' : 'viewKomunita');
    document.getElementById(targetViewId)?.classList.remove('hidden');

    if(tab==='landing'){ if(window.nactiStats) nactiStats(); }
    if(tab==='planovac'){ nactiDnik(); if(mainMap) setTimeout(()=>mainMap.invalidateSize(),200); }
    if(tab==='verejne'){ nactiExplore(); }
    if(tab==='komunita'){ nactiFeed(); vykreslitFriendHub(); }
    if(tab==='profil'){ nactiMujProfil(); }

    if(updateUrl) history.pushState({tab}, '', `?v=${tab}`);
    window.scrollTo(0, 0);
    setTimeout(aktualizujIndikator, 50);
}


async function nactiExplore() {
    // exploreGrid je alternativní ID - fallback na verejneStream
    const c = document.getElementById('exploreGrid') || document.getElementById('verejneStream');
    if(!c) return;
    c.innerHTML = '<div class="spin" style="margin:40px auto; display:block;"></div>';
    try {
        const res = await (await fetch('/api/verejne-vylety')).json();
        if (res.uspech && res.data.length) {
            c.innerHTML = res.data.map(x => {
                const avId = `av-ex-${x.id}`;
                setTimeout(() => {
                    const el = document.getElementById(avId);
                    renderovatAvatar(el, x.autorAvatar, x.autorJmeno);
                }, 0);

                return `
                <div class="dc au" onclick="otevritDetailVyletuJSON('${encodeURIComponent(JSON.stringify(x))}')" style="cursor:pointer; padding:0; overflow:hidden;">
                    <div style="height:120px; background:linear-gradient(135deg, #1e1b4b, #312e81); position:relative;">
                        <div style="position:absolute; bottom:12px; left:16px;">
                            <h3 style="font-size:1rem; font-weight:800; color:#fff;">${x.lokace}</h3>
                        </div>
                    </div>
                    <div style="padding:16px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                            <div id="${avId}" class="av" style="width:24px; height:24px; font-size:0.6rem; border:1px solid var(--a1);"></div>
                            <span style="font-size:0.7rem; color:var(--t2); font-weight:600;">${x.autorJmeno}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.65rem; color:var(--a1); font-weight:800;">ZOBRAZIT</span>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            c.innerHTML = '<p style="text-align:center; padding:40px; color:var(--t2);">Zatím žádné veřejné výlety. Buďte první!</p>';
        }
    } catch(e) { c.innerHTML = '<p>Chyba načítání.</p>'; }
}

function otevritDetailVyletuJSON(enc) {
    const v = JSON.parse(decodeURIComponent(enc));
    otevritDetailVyletu(v);
}

async function nactiMujProfil() {
    const c = document.getElementById('profilContent');
    if(!c) return;
    c.innerHTML = '<div class="spin" style="margin:40px auto; display:block;"></div>';
    try {
        const res = await (await fetch('/api/moje-info')).json();
        if (res.uspech) {
            const u = res.user;
            const stats = u.statistiky || {pocetVyletu:0, ujetaVzdalenost:0, ziskaneAchievementy:0};
            // Unikátní ID pro avatar
            const avId = `av-mp-${u._id}`;
            setTimeout(() => {
                const el = document.getElementById(avId);
                renderovatAvatar(el, u.avatar, u.prezdivka);
            }, 0);

            c.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:30px;">
                    <div style="display:flex; align-items:center; gap:20px; background:rgba(255,255,255,0.03); padding:24px; border-radius:24px; border:1px solid rgba(255,255,255,0.05);">
                        <div id="${avId}" class="av" style="width:80px; height:80px; font-size:2rem; border:3px solid var(--a1);"></div>
                        <div style="flex:1;">
                            <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:4px;">${u.prezdivka}</h2>
                            <p style="color:var(--t2); font-size:0.9rem;">ÄŚlenem od: ${new Date(u.datumRegistrace).toLocaleDateString()}</p>
                        </div>
                        <button class="btn bgh" onclick="prepniProfilPrihlaseni()" title="Odhlásit se"><svg class="ti ti-logout" width="1.2em" height="1.2em" aria-hidden="true"  style="font-size:1.2rem;"><use href="#ti-logout"></use></svg></button>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;">
                        <div class="dc au" style="text-align:center; padding:16px; border-radius:20px;">
                            <span style="font-size:1.5rem; font-weight:900; color:var(--a1); display:block;">${stats.pocetVyletu}</span>
                            <span style="font-size:0.65rem; color:var(--t2); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">Výlety</span>
                        </div>
                        <div class="dc au" style="text-align:center; padding:16px; border-radius:20px;">
                            <span style="font-size:1.5rem; font-weight:900; color:var(--a1); display:block;">${stats.ujetaVzdalenost}</span>
                            <span style="font-size:0.65rem; color:var(--t2); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">Kilometry</span>
                        </div>
                        <div class="dc au" style="text-align:center; padding:16px; border-radius:20px;">
                            <span style="font-size:1.5rem; font-weight:900; color:var(--a1); display:block;">${u.achievementy?.length || 0}</span>
                            <span style="font-size:0.65rem; color:var(--t2); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">Úspěchy</span>
                        </div>
                    </div>

                    <div>
                        <h3 style="margin-bottom:16px; font-weight:800;">Tvé odznaky</h3>
                        <div style="display:flex; flex-wrap:wrap; gap:12px;" id="achievementsGrid">
                            ${(u.achievementy || []).map(ach => `
                                <div class="dc au" style="width:80px; text-align:center; padding:12px; border-radius:20px; background:rgba(99,102,241,0.05);">
                                    <i class="ti ${ach.ikona}" style="font-size:1.8rem; color:var(--a1); display:block; margin-bottom:6px;"></i>
                                    <span style="font-size:0.55rem; font-weight:700; line-height:1.2; display:block;">${ach.nazev}</span>
                                </div>
                            `).join('') || '<p style="color:var(--t2); font-size:0.85rem; padding-left:10px;">Zatím žádné úspěchy. Vyraz na první výlet!</p>'}
                        </div>
                    </div>
                </div>
            `;
        }
    } catch(e) { c.innerHTML = '<p>Chyba načítání profilu.</p>'; }
}


// Podpora pro tlačítko "Zpět" — funguje i pro hosty
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('v');
    const validni = ['komunita', 'planovac', 'verejne', 'akce', 'landing'];
    prepniTab(validni.includes(tab) ? tab : 'landing', false);
});

// VYKRESLENMĹ¤ AKCMĹ¤ (S perfektně vycentrovanými SVG ikonami)
async function nactiAkce() {
    const res = await fetch('/api/akce');
    const data = await res.json();
    const c = document.getElementById('akceStream');
    if (!c) return;
    
    if (!data.uspech || !data.data.length) {
        c.innerHTML = '<div class="es"><p>Zatím zde nejsou žádné plánované akce.</p></div>';
        return;
    }
    
    c.innerHTML = data.data.map((x, i) => `
        <div class="dc au" style="animation-delay:${i*.05}s; padding:0; cursor:default; overflow:hidden; height:100%;">
            <div style="height:160px; background:url(${x.logoUrl}) center/cover; position:relative; flex-shrink:0;">
                <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.85), transparent);"></div>
                <div style="position:absolute; bottom:16px; left:20px; right:20px;">
                    <h3 style="font-size:1.4rem; font-weight:800; color:#fff; line-height:1.1; text-shadow:0 2px 10px rgba(0,0,0,0.5);">${x.nazev}</h3>
                </div>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; flex-grow:1;">
                <div style="margin-bottom:14px;">
                    <div style="display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,var(--a1),var(--a2)); color:#fff; padding:7px 14px; border-radius:8px; font-weight:800; font-size:.9rem; margin-bottom:12px; box-shadow:0 4px 14px rgba(99,102,241,.3); line-height:1;">
                        <span style="display:block; transform:translateY(1px);">${x.datum}</span>
                    </div>
                    
                    <div style="color:var(--t1); font-weight:600; font-size:.85rem; display:flex; align-items:center; gap:6px; line-height:1;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--a3)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span style="display:block; transform:translateY(1px);">${x.misto}</span>
                    </div>
                </div>
                <p style="font-size:.85rem; color:var(--t2); margin-bottom:18px; line-height:1.6;">${x.popis}</p>
                
                <a href="${x.vstupenkyUrl}" target="_blank" class="btn bp bf" style="text-decoration:none; margin-top:auto; display:flex; align-items:center; justify-content:center; gap:8px; line-height:1; padding:12px;">
                    <span style="display:block; transform:translateY(1px);">Koupit vstupenky</span>
                </a>
            </div>
        </div>
    `).join('');
}

// NezapomeĹ přidat `await nactiAkce();` do funkce init() hned vedle `await nactiVerejneVylety();`!
function prihlasitNewsletter() {
    const btn = document.getElementById('btnNews');
    btn.innerHTML = '✅ Jste na seznamu!';
    btn.style.background = 'var(--a4)'; 
    localStorage.setItem('verona_news', '1'); 
    setTimeout(() => { document.getElementById('newsletterModal').style.display='none'; }, 2000);
}
let mujChart = null; // Proměnná pro uchování grafu, aby se nenačítal přes sebe

async function otevritMujProfil() {
    // 1. Zobrazíme okno
    document.getElementById('profileModal').style.display = 'flex';
    const friendlyCodeEl = document.getElementById('mujFriendlyCode');
    if (friendlyCodeEl) friendlyCodeEl.value = mujProfil._id;
    
    // Zobrazení tlačítka pro speciální administrátorskou sekci
    if (mujProfil.isAdmin || (mujProfil.email && mujProfil.email === 'demonsport29@gmail.com')) {
        document.getElementById('adminPanelWrapper').style.display = 'block';
    } else {
        document.getElementById('adminPanelWrapper').style.display = 'none';
    }
    
    // 2. Stáhneme data ze serveru
    try {
        const res = await (await fetch('/api/moje-staty')).json();
        if (res.uspech) {
            vykresliGraf(res.staty);
            vykresliMedaile(res.medaile);
        }
    } catch(e) { console.error('Chyba načítání statistik:', e); }
}

function vykresliGraf(staty) {
    const ctx = document.getElementById('profilGraf').getContext('2d');
    
    // Pokud už tam starý graf je, zničíme ho, ať nedělá neplechu
    if (mujChart) mujChart.destroy();

    const barvaTextu = document.documentElement.getAttribute('data-theme') === 'light' ? '#333' : '#a5b4fc';

    mujChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Uložené výlety', 'Splněno', 'Zpráv v komunitě'],
            datasets: [{
                label: 'Počet',
                data: [staty.pocetVyletu, staty.pocetSplnenych, staty.pocetFeed],
                backgroundColor: ['#6366f1', '#10b981', '#06b6d4'],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, color: barvaTextu, font: {family: 'Space Mono'} }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: barvaTextu, font: {family: 'Bricolage Grotesque', weight: 600} }, grid: { display: false } }
            }
        }
    });
}
function vykresliMedaile(medaile) {
    const kontejner = document.getElementById('profilMedaile');
    

    kontejner.innerHTML = medaile.map(m => {
        // Pokud je medaile získaná, svítí barevně. Pokud ne, je zašedlá a průhledná.
        const vzhled = m.ziskana 
            ? 'background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.15)); border-color: rgba(99,102,241,0.4); opacity: 1; filter: none;' 
            : 'background: rgba(0,0,0,0.1); border-color: transparent; opacity: 0.4; filter: grayscale(1);';
            
        return `
            <div style="flex: 1 1 45%; border: 1px solid transparent; border-radius: 12px; padding: 12px; text-align: center; transition: all 0.3s; ${vzhled}">
                <div style="font-size: 2rem; margin-bottom: 6px; text-shadow: 0 4px 10px rgba(0,0,0,0.2);">${m.ikona}</div>
                <div style="font-size: 0.8rem; font-weight: 800; margin-bottom: 4px; color: var(--t1);">${m.nazev}</div>
                <div style="font-size: 0.65rem; color: var(--t2); line-height: 1.4;">${m.popis}</div>
            </div>
        `;
    }).join('');
}

// ---- 6. ADMIN CMS PRO AKCE ----
window.otevritAdminAkce = async function() {
    document.getElementById('profileModal').style.display = 'none';
    document.getElementById('adminAkceModal').style.display = 'flex';
    nactiAdminAkceVypis();
};

window.nactiAdminAkceVypis = async function() {
    const list = document.getElementById('adminAkceList');
    list.innerHTML = '<div class="spin" style="margin: 20px auto;"></div>';
    
    try {
        const res = await (await fetch('/api/akce')).json();
        if (res.uspech) {
            if (res.data.length === 0) {
                list.innerHTML = '<p class="es" style="font-size:0.85rem;">Zatím nejsou v databázi žádné akce.</p>';
                return;
            }
            list.innerHTML = res.data.map(x => `
                <div style="background:rgba(0,0,0,0.15); border:1px solid var(--gbd); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="font-family:var(--fs); display:block; margin-bottom:4px;">${x.nazev}</strong>
                        <span style="font-size:0.75rem; color:var(--t2);">${x.datum} | ${x.misto}</span>
                    </div>
                    <button class="btn bgh" style="color:#ef4444; border:1px solid rgba(239,68,68,0.2); padding:6px 10px;" onclick="smazatAkci('${x._id}')" title="Smazat akci"><svg class="ti ti-trash" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-trash"></use></svg></button>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p>Chyba načítání databáze.</p>';
        }
    } catch(e) { list.innerHTML = '<p>Chyba spojení.</p>'; }
};

window.importovatAkciZJSON = function() {
    const input = prompt("Vložte JSON vygenerovaný umělou inteligencí (Mistral):");
    if (!input) return;

    try {
        // Bezpečnostní očištění od markdown formátování (pokud AI přidá ```json ... ```)
        const cleanInput = input.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanInput);

        if (data.nazev) document.getElementById('akceNazev').value = data.nazev;
        if (data.datum) document.getElementById('akceDatum').value = data.datum;
        if (data.misto) document.getElementById('akceMisto').value = data.misto;
        if (data.popis) document.getElementById('akcePopis').value = data.popis;
        if (data.logoUrl) document.getElementById('akceLogo').value = data.logoUrl;
        if (data.vstupenkyUrl) document.getElementById('akceVstupenky').value = data.vstupenkyUrl;

        // Vizuální notifikace pro admina
        const btn = document.querySelector('button[onclick="importovatAkciZJSON()"]');
        const origText = btn.innerHTML;
        btn.innerHTML = "✅ Úspěšně načteno!";
        btn.style.background = "rgba(16, 185, 129, 0.1)";
        btn.style.color = "#10b981";
        setTimeout(() => {
            btn.innerHTML = origText;
            btn.style.background = "";
            btn.style.color = "var(--a1)";
        }, 3000);

    } catch (e) {
        alert("Chyba při čtení JSONu. Ujistěte se, že vkládáte validní datový formát.\nDetail: " + e.message);
    }
};

window.ulozitNovouAkci = async function() {
    const data = {
        nazev: document.getElementById('akceNazev').value.trim(),
        datum: document.getElementById('akceDatum').value.trim(),
        misto: document.getElementById('akceMisto').value.trim(),
        popis: document.getElementById('akcePopis').value.trim(),
        logoUrl: document.getElementById('akceLogo').value.trim(),
        vstupenkyUrl: document.getElementById('akceVstupenky').value.trim()
    };
    
    if (!data.nazev || !data.datum || !data.popis) return alert('DoplĹte alespoĹ Název, Datum a Popis.');
    
    const btn = event.target;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<div class="spin" style="width:16px;height:16px;border-width:2px;"></div>';
    
    try {
        const res = await (await fetch('/api/admin/akce', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) })).json();
        if (res.uspech) {
            ['akceNazev','akceDatum','akceMisto','akcePopis','akceLogo','akceVstupenky'].forEach(id => document.getElementById(id).value = '');
            nactiAdminAkceVypis();
            nactiAkce();
            btn.innerHTML = oldHtml;
        } else {
            alert(res.chyba || 'Aplikace neschválila vložení.');
            btn.innerHTML = oldHtml;
        }
    } catch(e) { alert('Chyba spojení.'); btn.innerHTML = oldHtml; }
};

window.smazatAkci = async function(id) {
    if (!confirm('Opravdu smazat z databáze tuto akci? Klientům zmizí z nabídky.')) return;
    try {
        const res = await (await fetch('/api/admin/akce/' + id, { method: 'DELETE' })).json();
        if (res.uspech) {
            nactiAdminAkceVypis();
            nactiAkce(); 
        } else alert(res.chyba || 'Chyba mazání.');
    } catch(e) { alert('Nelze kontaktovat server.'); }
};


// 🗺️ FUNKCE PRO MAPUAVU VMťLETU (Edit-in-place)
let isEditingTrip = false;
async function toggleEditTrip() {
    const btn = document.getElementById('btnEditTrip');
    const title = document.getElementById('resTitle');
    const body = document.getElementById('resBody');
    const textKontejner = document.getElementById('resText');
    if (textKontejner && curDraft) textKontejner.innerHTML = curDraft.text || curDraft.itinerar || '';
    if (!isEditingTrip) {
        // ZAPNUTÍ REŽIMU ÚPRAV
        isEditingTrip = true;
        title.contentEditable = true;
        body.contentEditable = true;
        
        // Vizuální indikace
        title.style.borderBottom = "1px dashed var(--a1)";
        body.style.border = "1px dashed var(--a1)";
        body.style.padding = "10px";
        body.style.borderRadius = "10px";
        body.style.background = "rgba(0,0,0,0.2)";
        
        btn.innerHTML = "💾 Uložit úpravy";
        btn.style.width = "auto";
        btn.style.padding = "0 14px";
        btn.classList.replace("bgh", "bp"); // Zvýraznění tlačítka
        
    } else {
        // VYPNUTMĹ¤ A ULOĹ˝ENMĹ¤ MAPUAV
        isEditingTrip = false;
        title.contentEditable = false;
        body.contentEditable = false;
        
        // Vizuální návrat do normálu
        title.style.borderBottom = "none";
        body.style.border = "none";
        body.style.padding = "0";
        body.style.background = "transparent";
        
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
        btn.style.width = "38px";
        btn.style.padding = "0";
        btn.classList.replace("bp", "bgh");

        // Pokud jde o již uložený výlet v deníku, uložíme ho rovnou i na server
        if (curOpenTripId) {
            await fetch('/api/upravit-vylet', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    id: curOpenTripId,
                    lokace: title.innerText,
                    popis: body.innerHTML
                })
            });
            nactiDnik();
        } else if (curDraft) {
            // Pokud je to zatím jen návrh od AI, aktualizujeme proměnnou a čekáme, až dá "Uložit do deníku"
            curDraft.lokace = title.innerText;
        }
    }
}
window.onload=init;
// Registrace Service Workeru pro PWA (Android instalace)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW chyba:', err));
    });
}

// ---- 7. NOTIFIKACE A TOASTY ----
let znameNotifikace = new Set();
let timerNotifikaci = null;

async function spustitNotifikace() {
    await kontrolaNotifikaci(true);
    if(timerNotifikaci) clearInterval(timerNotifikaci);
    timerNotifikaci = setInterval(() => kontrolaNotifikaci(false), 10000); // 10 sekund polling
}

async function kontrolaNotifikaci(prvniStart) {
    try {
        const res = await (await fetch('/api/notifikace')).json();
        if(!res.uspech) return;
        
        const badge = document.getElementById('notifBadge');
        if (badge) {
            if(res.neprectenoLita > 0) {
                badge.style.display = 'flex';
                badge.innerText = res.neprectenoLita > 9 ? '9+' : res.neprectenoLita;
            } else {
                badge.style.display = 'none';
            }
        }
        
        const socBadge = document.getElementById('socialBadge');
        if (socBadge && res.data) {
            const nepZpravy = res.data.filter(x => x.typ === 'zprava' && !x.precteno).length;
            socBadge.style.display = nepZpravy > 0 ? 'flex' : 'none';
            if (nepZpravy > lastSocNeprecteno && !prvniStart) {
                const posledniZprava = res.data.filter(x => x.typ === 'zprava' && !x.precteno)[0];
                ukazToast('Nová zpráva', posledniZprava ? posledniZprava.text : 'Máte novou zprávu v Social Hubu.');
            }
            lastSocNeprecteno = nepZpravy;
        }
        
        const c = document.getElementById('notifikaceList');
        if(res.data.length === 0) {
            c.innerHTML = '<div class="es"><p>Zatím žádná upozornění.</p></div>';
        } else {
            c.innerHTML = res.data.map(n => `
                <div style="background:rgba(0,0,0,0.2); border-left:3px solid ${n.precteno ? 'var(--gbd)' : 'var(--a1)'}; border-radius:8px; padding:12px; display:flex; gap:12px; align-items:center;">
                    <div style="width:40px;height:40px;flex-shrink:0;border-radius:50%;background:url(${n.odesilatelAvatar||''}) center/cover var(--gb3);"><span style="display:${n.odesilatelAvatar?'none':'block'};color:#fff;text-align:center;line-height:40px;">${n.odesilatelJmeno.charAt(0)}</span></div>
                    <div>
                        <strong style="font-family:var(--fs);font-size:.9rem;color:var(--t1);">${n.odesilatelJmeno}</strong>
                        <span style="font-size:.75rem;color:var(--t2);"> ${n.typ === 'zprava' ? 'vám poslal zprávu' : 'okomentoval váš výlet'}</span>
                        <p style="font-size:.85rem;color:var(--t2);margin-top:4px;font-style:italic;">"${n.textPochoutka}"</p>
                    </div>
                </div>
            `).join('');
        }
        
        if(prvniStart) {
            res.data.forEach(n => znameNotifikace.add(n._id));
            return;
        }
        
        res.data.forEach(n => {
            if(!znameNotifikace.has(n._id)) {
                znameNotifikace.add(n._id);
                const msg = n.typ === 'zprava' ? 'Nová zpráva od ' + n.odesilatelJmeno : n.odesilatelJmeno + ' píše komentář:';
                ukazToast(msg, n.textPochoutka);
            }
        });
    } catch(e) {}
}

window.otevritNotifikaceModal = async function() {
    document.getElementById('notifikaceModal').style.display = 'flex';
    document.getElementById('notifBadge').style.display = 'none';
    await fetch('/api/precteno-notifikace', {method:'POST'});
    kontrolaNotifikaci(true);
};

function ukazToast(titulek, text) {
    const c = document.getElementById('toastContainer');
    if(!c) return;
    const t = document.createElement('div');
    t.style.cssText = 'background:linear-gradient(135deg,var(--gb2),var(--gb3)); border:1px solid var(--gbd); border-left:3px solid var(--a1); padding:16px 20px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5); min-width:280px; transform:translateY(100px); opacity:0; transition:all 0.4s cubic-bezier(0.175,0.885,0.32,1.275);';
    t.innerHTML = `
        <strong style="display:block; font-size:.9rem; margin-bottom:4px; color:var(--a1); font-family:var(--fs); letter-spacing:-0.02em;">${titulek}</strong>
        <span style="display:block; font-size:.8rem; color:var(--t1); line-height:1.4;">${text}</span>
    `;
    c.appendChild(t);
    setTimeout(() => { t.style.transform = 'translateY(0)'; t.style.opacity = '1'; }, 50);
    setTimeout(() => {
        t.style.transform = 'translateY(20px)';
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 400);
    }, 4500);
}
// --- INSTAGRAM EXPORT ---
async function exportovatNaInstagram(event, tripOverride = null) {
    const trip = tripOverride || curDraft;
    if (!trip) return alert('Nejdříve musíte mít vygenerovaný výlet.');
    
    // 1. Změna tlačítka na loading
    const btn = event.currentTarget;
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<div class="spin" style="width:16px;height:16px;border-width:2px;border-top-color:#d946ef;"></div>';
    
    try {
        // 2. Naplnění dat do IG šablony
        document.getElementById('igExportTitle').innerText = trip.lokace || 'Můj výlet';
        
        let zastavkyHtml = '';
        if (trip.etapy && trip.etapy.length > 0) {
            // Vezmeme max 4 zastávky, aby se to do obrázku hezky vešlo
            trip.etapy.slice(0, 4).forEach((e, i) => {
                zastavkyHtml += `
                <div style="display:flex; gap:16px; align-items:flex-start;">
                    <div style="width:40px; height:40px; border-radius:14px; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-family:'Space Mono', monospace; flex-shrink:0;">${i+1}</div>
                    <div style="padding-top:2px;">
                        <h4 style="font-size:1.2rem; font-weight:700; margin:0 0 4px 0;">${e.misto}</h4>
                        <p style="font-size:0.95rem; color:rgba(255,255,255,0.6); margin:0;">${e.cas}</p>
                    </div>
                </div>`;
            });
            if (trip.etapy.length > 4) {
                zastavkyHtml += `<p style="color:rgba(255,255,255,0.4); font-style:italic; margin-top:8px; font-size:0.95rem;">+ dalších ${trip.etapy.length - 4} zastávek v aplikaci...</p>`;
            }
        } else {
            zastavkyHtml = '<p style="color:rgba(255,255,255,0.8); font-size:1.1rem; line-height:1.6;">' + (trip.popis ? trip.popis.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...' : 'Krásný výlet do přírody.') + '</p>';
        }
        document.getElementById('igExportBody').innerHTML = zastavkyHtml;

        // 3. Počkáme chvilku na vykreslení DOMu
        await new Promise(r => setTimeout(r, 100));

        // 4. Vyrenderování obrázku přes html2canvas
        const exportFrame = document.getElementById('igExportFrame');
        const canvas = await html2canvas(exportFrame, {
            scale: 2, // 2x rozlišení pro hezkou ostrost
            backgroundColor: '#060810',
            logging: false,
            useCORS: true
        });
        
        // 5. Stažení obrázku
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Verona_Story_${document.getElementById('igExportTitle').innerText.replace(/\s+/g, '_')}.png`;
        link.href = imgData;
        link.click();
        
        ukazToast('Export dokončen', 'Obrázek byl stažen! Nyní ho můžete nahrát do Instagram Stories.');
    } catch (err) {
        alert('Chyba při exportu: ' + err.message);
    }
    
    // 6. Vrácení tlačítka do původního stavu
    btn.innerHTML = origHtml;
}

function renderovatAvatar(el, avatar, jmeno = 'U') {
    if(!el) return;
    if (avatar && avatar.startsWith('ti:')) {
        const iconClass = avatar.split(':')[1];
        el.style.backgroundImage = 'none';
        el.style.color = 'var(--a1)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.background = 'rgba(99,102,241,0.1)';
        el.innerHTML = `<i class="ti ${iconClass}" style="font-size: 1.2em;"></i>`;
    } else if (avatar) {
        el.style.backgroundImage = `url(${avatar})`;
        el.style.color = 'transparent';
        el.innerHTML = '';
    } else {
        el.style.backgroundImage = 'linear-gradient(135deg, var(--a1), var(--a3))';
        el.style.color = 'white';
        el.innerHTML = jmeno.charAt(0).toUpperCase();
    }
}

async function sdiletAchievementIG() {
    const card = document.querySelector('#achievementModal .achievement-card');
    if(!card) return;
    const btns = card.querySelectorAll('button');
    btns.forEach(b => b.style.visibility = 'hidden');
    try {
        const canvas = await html2canvas(card, { backgroundColor: '#060810', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `VERONA_Achievement_${document.getElementById('achTitle').innerText}.png`;
        link.href = imgData;
        link.click();
        alert('Obrázek pro Instagram Story byl vygenerován a stažen!');
    } catch(e) { alert('Chyba generování: ' + e.message); }
    btns.forEach(b => b.style.visibility = 'visible');
}

async function nastavitAchievementProfilovku() {
    const achTitle = document.getElementById('achTitle').innerText;
    try {
        const res = await (await fetch('/api/nastavit-avatar-achievement', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({achievementTitle: achTitle})
        })).json();
        if(res.uspech) {
            alert('Tvůj profilový obrázek byl aktualizován podle tvého nového úspěchu!');
            location.reload();
        }
    } catch(e) { alert('Chyba při nastavování profilovky.'); }
}

// SOCIAL HUB LOGIC
let curSocialTab = 'chat';
function otevritSocialHub() { 
    const modal = document.getElementById('socialHubModal');
    if(modal) modal.style.display = 'flex'; 
    prepniSocialTab(curSocialTab); 
}
function prepniSocialTab(tab) {
    if(!document.getElementById(`s-tab-${tab}`)) return;
    curSocialTab = tab;
    document.querySelectorAll('#socialHubModal .tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`s-tab-${tab}`).classList.add('active');
    if (tab === 'chat') nactiKonverzace();
    else nactiSeznamPratel();
}
async function nactiKonverzace() {
    const c = document.getElementById('socialContent'); if(!c) return;
    c.innerHTML = '<div class="spin" style="margin:20px auto;"></div>';
    try {
        const res = await (await fetch('/api/moje-konverzace')).json();
        if (res.uspech && res.data.length > 0) {
            c.innerHTML = res.data.map(k => {
                const avId = `av-soc-${k.id}`;
                setTimeout(() => renderovatAvatar(document.getElementById(avId), k.avatar, k.jmeno), 0);
                return `<div class="dc au" style="display:flex; align-items:center; gap:15px; margin-bottom:10px; cursor:pointer;" onclick="otevritChatV2('${k.id}', '${k.jmeno}')">
                    <div id="${avId}" class="av" style="width:45px; height:45px; border:2px solid ${k.neprecteno ? 'var(--a1)' : 'transparent'};"></div>
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between;"><strong style="font-size:0.95rem;">${k.jmeno}</strong><span style="font-size:0.65rem; color:var(--t2);">${k.datum ? new Date(k.datum).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span></div>
                        <p style="font-size:0.8rem; color:${k.neprecteno ? 'var(--t1)' : 'var(--t2)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px;">${k.posledniZprava || 'Zatím žádné zprávy'}</p>
                    </div>
                </div>`;
            }).join('');
        } else c.innerHTML = '<p style="text-align:center; padding:40px; color:var(--t2); font-size:0.9rem;">Zatím nemáte žádné konverzace.</p>';
    } catch (e) { c.innerHTML = '<p>Chyba načítání.</p>'; }
}
async function nactiSeznamPratel() {
    const c = document.getElementById('socialContent'); if(!c) return;
    c.innerHTML = `
        <div style="margin-bottom:20px; display:flex; flex-direction:column; gap:15px;">
            <div style="background:rgba(255,255,255,0.03); padding:16px; border-radius:18px; border:1px solid rgba(255,255,255,0.05);">
                <label style="display:block; font-size:0.7rem; color:var(--t2); margin-bottom:8px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">Tvůj kód pro přátele</label>
                <div style="display:flex; gap:10px;">
                    <input type="text" value="${mujProfil ? mujProfil._id : ''}" id="mujFriendlyCodeSocial" class="f" style="margin:0; font-family:'Space Mono'; text-align:center; font-weight:bold; letter-spacing:1px; background:rgba(0,0,0,0.2); font-size:0.8rem;" readonly>
                    <button class="btn bg bi" onclick="navigator.clipboard.writeText('${mujProfil ? mujProfil._id : ''}'); alert('Kód zkopírován!')" title="Kopírovat"><svg class="ti ti-copy" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-copy"></use></svg></button>
                </div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:16px; border-radius:18px; border:1px solid rgba(255,255,255,0.05);">
                <label style="display:block; font-size:0.7rem; color:var(--t2); margin-bottom:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">Najít přítele podle Gmailu</label>
                <div style="display:flex; gap:8px;">
                    <input type="text" id="gmailSearchIn" class="f" placeholder="example@gmail.com" style="margin:0; font-size:0.85rem;">
                    <button class="btn bp" style="padding:0 15px;" onclick="hledatPrateleGmail()"><svg class="ti ti-search" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-search"></use></svg></button>
                </div>
                <div id="gmailSearchResult" style="margin-top:12px;"></div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:16px; border-radius:18px; border:1px solid rgba(255,255,255,0.05);">
                <label style="display:block; font-size:0.7rem; color:var(--t2); margin-bottom:8px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">Přidat přítele přes kód</label>
                <div style="display:flex; gap:10px;">
                    <input type="text" id="friendCodeInSoc" class="f" placeholder="Vlož kód..." style="margin:0; font-size:0.85rem;">
                    <button class="btn bp" style="padding:0 15px;" onclick="pridatPritelePresKodSoc()">Přidat</button>
                </div>
            </div>
        </div>
        <h3 style="font-size:0.9rem; font-weight:800; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">Seznam přátel</h3>
        <div id="friendsListContainer"></div>
    `;
    nactiActualFriends();
}
async function hledatPrateleGmail() {
    const e = document.getElementById('gmailSearchIn').value.trim(), r = document.getElementById('gmailSearchResult'); if(!e) return;
    r.innerHTML = '<div class="spin" style="width:20px; height:20px; border-width:2px; margin:5px auto;"></div>';
    try {
        const res = await (await fetch('/api/hledat-podle-emailu?email=' + encodeURIComponent(e))).json();
        if (res.uspech) {
            const u = res.user, avId = `av-search-${u.id}`;
            setTimeout(() => renderovatAvatar(document.getElementById(avId), u.avatar, u.jmeno), 0);
            r.innerHTML = `<div class="dc au" style="display:flex; align-items:center; gap:12px; padding:10px; margin:0;"><div id="${avId}" class="av" style="width:34px; height:34px;"></div><div style="flex:1;"><span style="font-size:0.85rem; font-weight:700;">${u.jmeno}</span></div><button class="btn bp bi" onclick="pridatPriteleGmail('${u.id}')" style="width:32px; height:32px;"><svg class="ti ti-user-plus" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-user-plus"></use></svg></button></div>`;
        } else r.innerHTML = `<p style="font-size:0.75rem; color:#ef4444; margin:0;">${res.chyba}</p>`;
    } catch (err) { r.innerHTML = '<p>Chyba hledání.</p>'; }
}
async function pridatPriteleGmail(id) {
    try {
        const res = await (await fetch('/api/pridat-pritele', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({targetId: id}) })).json();
        if (res.uspech) { ukazToast('Přátelství', res.akce === 'pridano' ? 'Uživatel byl přidán do přátel.' : 'Uživatel byl odebrán z přátel.'); if (curSocialTab === 'friends') nactiSeznamPratel(); }
    } catch (err) { alert('Chyba přidání.'); }
}
async function nactiActualFriends() {
    const c = document.getElementById('friendsListContainer'); if(!c) return;
    try {
        const res = await (await fetch('/api/moji-pratele')).json();
        if (res.uspech && res.data.length > 0) {
            c.innerHTML = res.data.map(p => {
                const avId = `av-friend-${p.id}`;
                setTimeout(() => renderovatAvatar(document.getElementById(avId), p.avatar, p.jmeno), 0);
                return `<div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; background:rgba(255,255,255,0.02); padding:10px; border-radius:14px; border:1px solid rgba(255,255,255,0.03);">
                    <div id="${avId}" class="av" style="width:36px; height:36px; cursor:pointer;" onclick="otevritVerejnyProfil('${p.id}')"></div>
                    <div style="flex:1;"><strong style="font-size:0.85rem; display:block;">${p.jmeno}</strong></div>
                    <div style="display:flex; gap:6px;"><button class="btn bg bi" onclick="otevritChatV2('${p.id}', '${p.jmeno}')" style="width:32px; height:32px;"><svg class="ti ti-message" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-message"></use></svg></button><button class="btn bgh bi" onclick="pridatPriteleGmail('${p.id}')" style="width:32px; height:32px; color:#ef4444;" title="Odebrat"><svg class="ti ti-user-minus" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-user-minus"></use></svg></button></div>
                </div>`;
            }).join('');
        } else c.innerHTML = '<p style="text-align:center; padding:10px; color:var(--t2); font-size:0.8rem;">Nemáte zatím žádné přátele.</p>';
    } catch (err) { c.innerHTML = '<p>Chyba načítání seznamu.</p>'; }
}
async function pridatPritelePresKodSoc() {
    const k = document.getElementById('friendCodeInSoc').value.trim(); if(!k) return;
    try {
        const res = await (await fetch('/api/pridat-pritele-kod', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({kod:k}) })).json();
        if (res.uspech) { ukazToast('Přátelství', 'Nový přítel byl přidán přes kód!'); prepniSocialTab('friends'); }
        else alert(res.chyba || 'Neplatný kód nebo uživatel již existuje.')
    } catch(err) { alert('Chyba spojení.'); }
}
// otevritChatV2 je definována níže jako window.otevritChatV2

// --- FUNKCE PRO ZOBRAZENÍ DESIGN QR KÓDU ---
async function ukazatQR(tripId) {
    // 1. Vytvoření plovoucího okna
    const modal = document.createElement('div');
    modal.id = 'qrModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); z-index:100000; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.3s ease;';

    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, var(--gb2, #1a1c29), var(--gb3, #060810)); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; text-align: center; max-width: 90%; width: 340px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); transform: translateY(20px); transition: transform 0.3s ease;">
            <h3 style="color: white; font-size: 1.5rem; margin-bottom: 10px; font-weight: 800;">Sdílet výlet 🚀</h3>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px;">Ukaž tento kód kamarádovi. Stačí namířit foťák!</p>

            <div id="qrLoader" style="color: white; margin: 40px 0;">Generuji QR kód...</div>

            <img id="qrImage" src="" alt="QR Kód" style="display: none; width: 100%; border-radius: 12px; margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 10px;">

            <button onclick="document.getElementById('qrModal').remove()" style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: bold; width: 100%; transition: background 0.2s;">Zavřít</button>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('div').style.transform = 'translateY(0)';
    }, 10);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // 2. Načtení z backendu
    try {
        const response = await fetch(`/api/qr/${tripId}`);
        const data = await response.json();

        if (data.uspech) {
            document.getElementById('qrLoader').style.display = 'none';
            const img = document.getElementById('qrImage');
            img.src = data.qrData;
            img.style.display = 'block';
        } else {
            document.getElementById('qrLoader').innerText = '❌ Chyba při generování';
        }
    } catch (err) {
        document.getElementById('qrLoader').innerText = '❌ Nelze se spojit se serverem';
    }
}
// --- NOVÝ WIDGET PRO CHAT A PŘÁTELE ---
function toggleChatWidget() {
    if (!prihlaseno) return alert("Pro přístup k chatu se musíte přihlásit.");
    const w = document.getElementById('chatWidget');
    if (w.style.display === 'none') {
        w.style.display = 'flex';
        prepniCwTab('konverzace'); // Rovnou načte zprávy
    } else {
        w.style.display = 'none';
        document.getElementById('cwFriendSearch').style.display = 'none'; // Zavře i hledání, pokud bylo otevřené
    }
}

function zavritAktivniChat() {
    const hMain = document.getElementById('cwHeaderMain');
    const bMain = document.getElementById('cwBodyMain');
    const hActive = document.getElementById('cwHeaderActive');
    const bActive = document.getElementById('cwBodyActive');
    
    if (hMain) hMain.style.display = 'flex';
    if (bMain) bMain.style.display = 'block';
    if (hActive) hActive.style.display = 'none';
    if (bActive) bActive.style.display = 'none';
    
    if (window.chatRefreshInterval) clearInterval(window.chatRefreshInterval);
}

function toggleFriendSearch() {
    const s = document.getElementById('cwFriendSearch');
    s.style.display = s.style.display === 'none' ? 'block' : 'none';
    if (s.style.display === 'block') document.getElementById('cwSearchInput').focus();
}

function prepniCwTab(tab) {
    document.getElementById('cw-konverzace').style.display = 'none';
    document.getElementById('cw-pratele').style.display = 'none';
    document.getElementById('cwTab-konverzace').classList.remove('active');
    document.getElementById('cwTab-pratele').classList.remove('active');
    
    document.getElementById('cw-' + tab).style.display = 'block';
    document.getElementById('cwTab-' + tab).classList.add('active');
    
    if (tab === 'konverzace') nactiKonverzaceCw();
    else nactiPrateleCw();
}

// ŽIVÉ VYHLEDÁVÁNÍ PŘÁTEL PODLE JMÉNA (vyskakuje při psaní)
document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('cwSearchInput');
    const resList = document.getElementById('cwSearchResults');
    if(inp) {
        inp.addEventListener('input', async (e) => {
            const q = e.target.value.trim();
            if(q.length < 2) { resList.innerHTML = ''; return; }
            
            resList.innerHTML = '<div class="spin" style="width:16px;height:16px;border-width:2px;margin:10px auto;"></div>';
            try {
                const res = await (await fetch('/api/hledej-uzivatele?q=' + encodeURIComponent(q))).json();
                if(res.uspech && res.uzivatele.length > 0) {
                    resList.innerHTML = res.uzivatele.map(u => `
                        <div style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.03); border-radius:10px; margin-bottom:6px; cursor:pointer;" onclick="pridatPriteleGmail('${u._id}'); toggleFriendSearch();">
                            <div style="width:34px; height:34px; border-radius:50%; background:var(--a1); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold;">${u.jmeno.charAt(0)}</div>
                            <div style="flex:1; font-size:0.85rem; font-weight:bold;">${u.jmeno} ${u.prijmeni||''}</div>
                            <button class="btn bp bi" style="width:28px; height:28px; padding:0;"><svg class="ti ti-plus" width="1.2em" height="1.2em" aria-hidden="true" ><use href="#ti-plus"></use></svg></button>
                        </div>
                    `).join('');
                } else { resList.innerHTML = '<p style="font-size:0.75rem; color:var(--t2); text-align:center;">Nikoho jsme nenašli.</p>'; }
            } catch(err) { resList.innerHTML = ''; }
        });
    }
});

async function nactiKonverzaceCw() {
    if(!mujProfil) return;
    const c = document.getElementById('cw-konverzace'); 
    c.innerHTML = '<div class="spin" style="margin:20px auto;"></div>';
    try {
        const res = await (await fetch('/api/moje-konverzace')).json();
        if (res.uspech && res.data.length > 0) {
            c.innerHTML = res.data.map(k => `
                <div style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; transition:background 0.2s; border-radius:12px;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="otevritChatV2('${k.id}', '${k.jmeno}')">
                    <div style="width:42px; height:42px; border-radius:50%; background:var(--gb3); border:2px solid ${k.neprecteno ? 'var(--a1)' : 'transparent'};"></div>
                    <div style="flex:1;">
                        <strong style="font-size:0.9rem; display:block; margin-bottom:2px;">${k.jmeno}</strong>
                        <p style="font-size:0.75rem; color:${k.neprecteno ? 'var(--t1)' : 'var(--t2)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; margin:0;">${k.posledniZprava || 'Otevřít zprávy'}</p>
                    </div>
                </div>
            `).join('');
        } else c.innerHTML = '<p style="text-align:center; padding:20px; color:var(--t2); font-size:0.85rem;">Zatím nemáte žádné konverzace.</p>';
    } catch (e) { c.innerHTML = '<p style="text-align:center; color:var(--t2); font-size:0.85rem;">Chyba načítání.</p>'; }
}

async function nactiPrateleCw() {
    const c = document.getElementById('cw-pratele'); 
    c.innerHTML = '<div class="spin" style="margin:20px auto;"></div>';
    try {
        const res = await (await fetch('/api/moji-pratele')).json();
        if (res.uspech && res.data.length > 0) {
            c.innerHTML = res.data.map(p => `
                <div style="display:flex; align-items:center; gap:12px; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="width:36px; height:36px; border-radius:50%; background:var(--a1); color:white; display:flex; align-items:center; justify-content:center; font-size:0.9rem; font-weight:bold; cursor:pointer;" onclick="otevritVerejnyProfil('${p.id}')">${p.jmeno.charAt(0)}</div>
                    <div style="flex:1; font-size:0.9rem; font-weight:bold;">${p.jmeno}</div>
                    <button class="btnx" style="color:var(--a1);" onclick="otevritChatV2('${p.id}', '${p.jmeno}')"><svg class="ti ti-message-circle" width="1.2em" height="1.2em" aria-hidden="true"  style="font-size:1.4rem;"><use href="#ti-message-circle"></use></svg></button>
                </div>
            `).join('');
        } else c.innerHTML = '<p style="text-align:center; padding:20px; color:var(--t2); font-size:0.85rem;">Nemáte zatím žádné přátele. Přidejte si někoho přes ikonku <b>+</b> nahoře!</p>';
    } catch (err) { c.innerHTML = '<p style="text-align:center; color:var(--t2); font-size:0.85rem;">Chyba načítání.</p>'; }
}

window.otevritChatV2 = function(id, jmeno, avatar) {
    window.aktualniCiziProfilId = id;
    window.aktualniCiziProfilJmeno = jmeno;
    
    const widget = document.getElementById('chatWidget');
    widget.style.display = 'flex'; // Otevře widget, pokud je zavřený

    // Přepne zobrazení ze seznamu na samotné psaní zpráv
    document.getElementById('cwHeaderMain').style.display = 'none';
    document.getElementById('cwBodyMain').style.display = 'none';
    document.getElementById('cwHeaderActive').style.display = 'flex';
    document.getElementById('cwBodyActive').style.display = 'flex';
    
    document.getElementById('chatName').innerText = jmeno;
    renderovatAvatar(document.getElementById('chatAvatar'), avatar, jmeno);

    nactiChat();
    if(window.chatRefreshInterval) clearInterval(window.chatRefreshInterval);
    window.chatRefreshInterval = setInterval(nactiChat, 4000);
};
