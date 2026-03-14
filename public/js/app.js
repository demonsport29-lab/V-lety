let curDraft=null,curOpenTripId=null,prihlaseno=false,mainMap=null,markerCluster=null,mujProfil=null,pripraveneFotky=[],curPolyline=null

function toggleContact(){const w=document.getElementById('contactWin');if(w.style.display==='flex'){w.style.display='none';return;}w.style.display='flex';w.style.flexDirection='column';}

// --- HELPER: OchrannĂˇ funkce pro akce vyĹľadujĂ­cĂ­ pĹ™ihlĂˇĹˇenĂ­ ---
function vyzadujePrihlaseni() {
    if (prihlaseno) return true;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    modal.innerHTML = `
        <div style="background:linear-gradient(160deg,var(--gb2),var(--gb3));border:1px solid var(--gbd);border-radius:20px;padding:40px;max-width:360px;text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:16px;">đź”</div>
            <h3 style="font-size:1.3rem;font-weight:800;margin-bottom:10px;">Pro tuto akci je potĹ™eba ĂşÄŤet</h3>
            <p style="color:var(--t2);font-size:.9rem;line-height:1.6;margin-bottom:24px;">PĹ™ihlaste se zdarma pĹ™es Google a odemknÄ›te plnou funkÄŤnost â€” denĂ­k vĂ˝letĹŻ, AI plĂˇnovaÄŤ, chat a mnohem vĂ­ce.</p>
            <button class="btn bp bf" onclick="location.href='/auth/google'" style="width:100%;margin-bottom:10px;">PĹ™ihlĂˇsit se pĹ™es Google</button>
            <button class="btn bgh" onclick="this.closest('[style*=fixed]').remove()" style="width:100%;border:none;">PokraÄŤovat jako host</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
    return false;
}

async function init(){
    // ZĂˇloĹľky a data dostupnĂˇ ihned pro vĹˇechny (i hosty)
    document.getElementById('navTabsContainer').style.display='flex';
    if(window.innerWidth <= 768) document.getElementById('mobileTabsContainer').style.display='flex';

    try{
        const data=await(await fetch('/api/auth-status')).json();
        if(data.prihlaseno){
            prihlaseno=true;mujProfil=data.profil;
            document.getElementById('btnGoogle').innerHTML='<span>PĹ™ihlĂˇĹˇen</span><span class="m-ico"><i class="ti ti-check"></i></span>';
            document.getElementById('btnGoogle').onclick=e=>e.preventDefault();
            document.getElementById('btnProfil').style.display='inline-flex';
            document.getElementById('btnNotif').style.display='inline-flex';

            // Notifikace jen pro pĹ™ihlĂˇĹˇenĂ©
            spustitNotifikace();

            // Newsletter
            if(!localStorage.getItem('verona_news')) {
                setTimeout(() => { document.getElementById('newsletterModal').style.display='flex'; }, 1500);
            }

            // RozcestnĂ­k pro pĹ™ihlĂˇĹˇenĂ©ho
            document.getElementById('landingActionBtns').innerHTML = `
                <button class="btn bp blg" onclick="prepniTab('planovac')">OtevĹ™Ă­t mĹŻj denĂ­k</button>
                <button class="btn bg blg" onclick="prepniTab('verejne')">ProchĂˇzet inspiraci</button>
                <button class="btn bg blg" onclick="prepniTab('komunita')">KomunitnĂ­ chat</button>
            `;
        } else {
            // Host: RozcestnĂ­k se zachovanou moĹľnostĂ­ prohlĂ­ĹľenĂ­
            document.getElementById('landingActionBtns').innerHTML = `
                <button class="btn bp blg" onclick="location.href='/auth/google'">PĹ™ihlĂˇsit se a zaÄŤĂ­t</button>
                <button class="btn bg blg" onclick="prepniTab('verejne')">ProchĂˇzet vĂ˝lety</button>
                <button class="btn bg blg" onclick="prepniTab('akce')">Zobrazit akce</button>
            `;
        }
    }catch(e){console.error('Auth status chyba:', e);}

    // Hash routing funguje pro vĹˇechny
    const hash = window.location.hash.replace('#', '');
    const validniTaby = ['komunita', 'planovac', 'verejne', 'akce'];
    if (validniTaby.includes(hash)) {
        prepniTab(hash, false);
    } else {
        prepniTab('landing', false);
    }

    // NaÄŤĂ­st veĹ™ejnĂˇ data (pro vĹˇechny)
    await nactiVerejneVylety();
    await nactiAkce();
    await nactiFeed(); // Feed je veĹ™ejnĂ˝, vidĂ­ ho i hostĂ©
    // NaÄŤĂ­st privĂˇtnĂ­ data jen pokud pĹ™ihlĂˇĹˇen
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
                alert('Odkaz na vĂ˝let nefunguje: ' + res.chyba);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch(e) {}
    }
}
// prepniTab() je definovĂˇna nĂ­Ĺľe (aktuĂˇlnĂ­ verze s podporou Friend Hub)

// popstate listener je definovĂˇn nĂ­Ĺľe (novÄ›jĹˇĂ­ verze)

async function nactiVerejneVylety() {
    const res = await fetch('/api/verejne-vylety');
    const data = await res.json();
    const c = document.getElementById('verejneStream');
    if (!c) return;
    
    if (!data.uspech || !data.data.length) {
        c.innerHTML = '<div class="es"><p>ZatĂ­m zde nejsou ĹľĂˇdnĂ© veĹ™ejnĂ© vĂ˝lety. BuÄŹte prvnĂ­!</p></div>';
        return;
    }
    
    window.verejneVyletyData = data.data; // UloĹľenĂ­ pro prokliky
    
    c.innerHTML = data.data.map((x, i) => {
        const sh = Array.from({length:5}, (_,j) => `<span class="star${j<(x.hodnoceni||0)?' lit':''}">â…</span>`).join('');
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
            <div class="sr"><div><span class="sl">HodnocenĂ­</span><div>${sh}</div></div><div style="text-align:right;"><span class="sl">KomentĂˇĹ™e</span><span class="sv">${x.komentare?.length||0}</span></div></div>
        </div>`;
    }).join('');
}

window.otevritDetailVerejnehoVyletuZListu = function(id) {
    const trip = window.verejneVyletyData.find(t => t.id === id);
    if (trip) {
        prepniTab('planovac'); // HodĂ­ tÄ› k mapÄ›
        otevritDetailVyletu(trip); // NakreslĂ­ ÄŤĂˇru na mapu a ukĂˇĹľe itinerĂˇĹ™
    }
};

function toggleAcc(wid,bid){const w=document.getElementById(wid),b=document.getElementById(bid),o=w.classList.toggle('open');b.style.maxHeight=o?'380px':'0';}
function prepniRezim(){
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    if(window._lastMapData) { aktualizovatMapu(window._lastMapData); }
}

function zmenitAvatar(){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=e=>{const r=new FileReader();r.onloadend=()=>{mujProfil.avatar=r.result;document.getElementById('profAvatar').style.backgroundImage=`url(${r.result})`;document.getElementById('profAvatar').innerText='';};r.readAsDataURL(e.target.files[0]);};i.click();}
async function ulozitProfil(){await fetch('/api/ulozit-profil',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prezdivka:document.getElementById('profPrezdivka').value,vek:document.getElementById('profVek').value,telefon:document.getElementById('profTelefon').value,bio:document.getElementById('profBio').value,avatar:mujProfil.avatar||''})});document.getElementById('profileModal').style.display='none';alert('Profil uloĹľen!');location.reload();}
async function poslatPrispevek(){document.getElementById('btnKoupit').innerHTML='<div class="spin" style="margin:0 auto"></div>';try{const d=await(await fetch('/api/vytvorit-platbu',{method:'POST'})).json();if(d.url)window.location.href=d.url;}catch(e){document.getElementById('btnKoupit').innerText='Zkusit znovu';}}

function aktualizovatMapu(v){
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
    v.forEach(x=>{if(x.etapy&&x.etapy[0]?.lat){const m=L.marker([x.etapy[0].lat,x.etapy[0].lng],{icon});m.bindPopup(`<div style="text-align:center;padding:4px;"><h4 style="margin:0 0 8px;">${x.lokace}</h4><button onclick="otevritGoogleMaps('${x.id}')" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:6px 14px;border-radius:9px;cursor:pointer;font-weight:700;font-size:.78rem;">Navigovat k cĂ­li</button></div>`);markerCluster.addLayer(m);pts.push([x.etapy[0].lat,x.etapy[0].lng]);}});
    if(pts.length)mainMap.fitBounds(L.latLngBounds(pts).pad(0.15));
}

async function nactiDnik(){
    const v=await(await fetch('/api/ulozene-vylety')).json();
    aktualizovatMapu(v);
    const d=document.getElementById('diary'),sel=document.getElementById('feedTripSelect');
    sel.innerHTML='<option value="">Bez navĂˇzanĂ©ho vĂ˝letu</option>';
    if(!v.length){d.innerHTML=`<div class="es"><p style="font-size:.9rem;">DenĂ­k je prĂˇzdnĂ˝. Vygenerujte svĹŻj prvnĂ­ vĂ˝let v plĂˇnovaÄŤi.</p></div>`;return;}
    d.innerHTML='';
    v.forEach((x,i)=>{
        sel.innerHTML+=`<option value="${x.id}">${x.lokace}</option>`;
        const k=document.createElement('div');k.className=`dc au${x.dokonceno?' done':''}`;k.style.animationDelay=`${i*.05}s`;k.dataset.id=x.id;
        const sh=Array.from({length:5},(_,j)=>`<span class="star${j<(x.hodnoceni||0)?' lit':''}">â…</span>`).join('');
        const fh=x.fotky?.length?`<div class="ps">${x.fotky.map(f=>`<img src="${f}" class="pt2" onclick="event.stopPropagation();openGallery('${f}')">`).join('')}</div>`:'';
        
        k.innerHTML=`
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
                <div><h3 style="font-size:1.15rem;font-weight:800;letter-spacing:-.02em;margin-bottom:3px;">${x.lokace}</h3><p style="font-family:var(--fm);font-size:.62rem;color:var(--t2);">${x.datumUlozeni||''}</p></div>
                <div style="display:flex; gap:6px;">
                    <button class="btn bgh bi" style="width:28px; height:28px; border-radius:8px;" onclick="event.stopPropagation(); window.smazat('${x.id}')" title="Smazat">âś•</button>
                </div>
            </div>
            <div class="pr"><span class="chip ${x.verejny?'ci':'cm'}">${x.verejny?'VeĹ™ejnĂ˝':'SoukromĂ˝'}</span><button class="btn bgh" style="padding:4px 11px;font-size:.7rem;border-radius:8px;" onclick="event.stopPropagation();prepnoutSoukromi('${x.id}',${!x.verejny})">ZmÄ›nit</button></div>
            <div class="sr"><div><span class="sl">HodnocenĂ­</span><div>${sh}</div></div><div style="text-align:right;"><span class="sl">KomentĂˇĹ™e</span><span class="sv">${x.komentare?.length||0}</span></div></div>
            ${fh}
            <div class="ar-unified" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px; margin-top:16px;">
                <button class="btn bg bi" onclick="event.stopPropagation();sdiletVylet('${x.id}','${x.lokace}')" style="justify-content:center; border-radius:10px;"><i class="ti ti-share"></i> Odkaz</button>
                <button class="btn bg bi btn-qr" onclick="event.stopPropagation();generovatQRVyletu('${x.shareId}')" style="justify-content:center; border-radius:10px;"><i class="ti ti-qrcode"></i> QR KĂłd</button>
                <button class="btn bg bi btn-ig" onclick="event.stopPropagation();exportovatNaInstagramZListu('${x.id}')" style="justify-content:center; border-radius:10px;"><i class="ti ti-brand-instagram"></i> Instagram</button>
                <button class="btn bg bi btn-strava" onclick="event.stopPropagation();upload('${x.id}')" style="justify-content:center; border-radius:10px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg> Strava</button>
                <button class="btn bg bi" onclick="event.stopPropagation();otevritGoogleMaps('${x.id}')" style="justify-content:center; border-radius:10px;"><i class="ti ti-map-2"></i> Mapa</button>
                <button class="btn ${x.dokonceno?'bgh':'bp'}" style="justify-content:center; border-radius:10px;" onclick="event.stopPropagation();prepnoutStav('${x.id}',${!x.dokonceno})">${x.dokonceno?'Hotovo':'Splnit'}</button>
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
            <p style="font-weight:800;font-size:1rem;text-align:center;">Opravdu smazat vĂ˝let?</p>
            <div style="display:flex;gap:10px;">
                <button class="btn bp" onclick="event.stopPropagation(); window._smazatAPI('${id}')">Ano, smazat</button>
                <button class="btn bgh" onclick="event.stopPropagation(); nactiDnik()">ZruĹˇit</button>
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
            alert('Chyba pĹ™i mazĂˇnĂ­: ' + (data.chyba || 'NeznĂˇmĂ˝ problĂ©m.'));
        }
    } catch(e) {
        alert('Chyba spojenĂ­: ' + e.message);
    }
};

function otevritDetailVyletu(v){curOpenTripId=v.id;document.getElementById('resTitle').innerText=v.lokace;document.getElementById('resDiffText').innerText='UloĹľeno: '+(v.datumUlozeni||'');document.getElementById('btnSaveAI').style.display='none';document.getElementById('resBody').innerHTML=v.popis;vykresliHvezdicky(v.id,v.hodnoceni||0);vykresliKomentare(v.komentare||[]);curDraft=v;document.getElementById('resCard').style.display='block';window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});}
async function hodnoceniVyletu(id, val){
    await fetch('/api/upravit-vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,hodnoceni:val})});
    vykresliHvezdicky(id,val);nactiDnik();
}
function vykresliHvezdicky(id, cur=0){
    let h='';for(let i=1;i<=5;i++){h+=`<i class="ti ti-star${i<=cur?' ti-star-filled':''} star ${i<=cur?'lit':''}" onclick="hodnoceniVyletu('${id}',${i})"></i>`;}
    document.getElementById('resTopRating').innerHTML=h;
}

function vykresliKomentare(k){
    document.getElementById('commentsSection').style.display='block';
    const l=document.getElementById('commentsList');
    if(!k.length){l.innerHTML=`<p style="color:var(--t2);font-size:.85rem;text-align:center;padding:20px;">ZatĂ­m ĹľĂˇdnĂ© komentĂˇĹ™e.</p>`;return;}
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

async function odeslatKomentar(){if(!prihlaseno)return alert('Pro komentovĂˇnĂ­ se prosĂ­m pĹ™ihlaste.');if(!curOpenTripId)return;const t=document.getElementById('newCommentText').value.trim();if(!t)return;document.getElementById('newCommentText').value='';await fetch('/api/pridat-komentar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idVyletu:curOpenTripId,text:t})});const v=await(await fetch('/api/ulozene-vylety')).json();vykresliKomentare(v.find(x=>x.id===curOpenTripId)?.komentare||[]);nactiDnik();}
async function smazatKomentar(cid){if(!confirm('Smazat komentĂˇĹ™?'))return;await fetch('/api/smazat-komentar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tripId:curOpenTripId,commentId:cid})});const v=await(await fetch('/api/ulozene-vylety')).json();vykresliKomentare(v.find(x=>x.id===curOpenTripId)?.komentare||[]);}
async function upravitKomentar(cid,enc){const s=decodeURIComponent(enc),n=prompt('Upravit komentĂˇĹ™:',s);if(n&&n.trim()&&n!==s){await fetch('/api/upravit-komentar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tripId:curOpenTripId,commentId:cid,text:n})});const v=await(await fetch('/api/ulozene-vylety')).json();vykresliKomentare(v.find(x=>x.id===curOpenTripId)?.komentare||[]);}}

function nactiFotkyDoFeedu(i){const p=document.getElementById('feedPhotoPreview');p.innerHTML='';pripraveneFotky=[];Array.from(i.files).slice(0,4).forEach(f=>{const r=new FileReader();r.onloadend=()=>{pripraveneFotky.push(r.result);p.innerHTML+=`<img src="${r.result}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;border:1px solid var(--gbd);">`;};r.readAsDataURL(f);});}
async function odeslatDoFeedu(){if(!prihlaseno)return alert('Pro publikovĂˇnĂ­ se prosĂ­m pĹ™ihlaste.');const t=document.getElementById('feedText').value.trim();if(!t&&!pripraveneFotky.length)return alert('PĹ™Ă­spÄ›vek nemĹŻĹľe bĂ˝t prĂˇzdnĂ˝.');const sel=document.getElementById('feedTripSelect'),btn=document.getElementById('btnOdeslatFeed');btn.innerHTML='<div class="spin"></div>';await fetch('/api/pridat-do-feedu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t,fotky:pripraveneFotky,pripojenyVyletId:sel.value,pripojenyVyletLokace:sel.value?sel.options[sel.selectedIndex].text:null})});document.getElementById('feedText').value='';document.getElementById('feedPhotoPreview').innerHTML='';pripraveneFotky=[];btn.innerText='Publikovat v komunitÄ›';nactiFeed();}
// nactiFeed() je definovĂˇna nĂ­Ĺľe (aktuĂˇlnĂ­ verze s lajky, chat stylem a klikatelnĂ˝mi profily)


async function smazatFeed(id){if(confirm('Opravdu chcete pĹ™Ă­spÄ›vek smazat?')){await fetch(`/api/smazat-feed/${id}`,{method:'DELETE'});nactiFeed();}}
async function upravitFeed(id,enc){const s=decodeURIComponent(enc),n=prompt('Upravit pĹ™Ă­spÄ›vek:',s);if(n&&n.trim()&&n!==s){await fetch('/api/upravit-feed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:id,text:n})});nactiFeed();}}

async function generovat(){
    if(!prihlaseno)return alert('Pro plĂˇnovĂˇnĂ­ vĂ˝letĹŻ se prosĂ­m pĹ™ihlaste.');
    const misto=document.getElementById('mistoIn').value.trim();if(!misto)return alert('Zadejte prosĂ­m destinaci.');
    const filtry=Array.from(document.querySelectorAll('.ai-filter:checked')).map(c=>c.value);
    const posuvnik = document.getElementById('inpLide');
    if(posuvnik) filtry.push(`PoÄŤet osob: ${posuvnik.value}`);
    const btn=document.getElementById('genBtn');btn.innerHTML='<div class="spin"></div> ZpracovĂˇvĂˇmâ€¦';btn.disabled=true;
    try{
        const res=await(await fetch('/api/vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({misto,specifikace:document.getElementById('specIn').value,vybraneFiltry:filtry})})).json();
        if(res.uspech){
            curDraft=res.data;curOpenTripId=null;
            document.getElementById('resTitle').innerText=curDraft.lokace;
            document.getElementById('resDiffText').innerText='AI Koncept â€” NĂˇroÄŤnost '+(curDraft.obtiznost||2);
            document.getElementById('resTopRating').innerHTML='<span style="font-family:var(--fm);font-size:.65rem;color:var(--t2);">Pro hodnocenĂ­ nejprve uloĹľte</span>';
            
            // Render Widgetu PoÄŤasĂ­
            const wBox = document.getElementById('resWeather');
            if (curDraft.pocasi && curDraft.pocasi.teplota !== undefined) {
                const wmoKody = {
                    0: {i:'ti-sun wa-spin wa-sun', t:'Jasno'}, 
                    1: {i:'ti-cloud-sun wa-float', t:'Polojasno'}, 
                    2: {i:'ti-cloud wa-float wa-cloud', t:'OblaÄŤno'}, 
                    3: {i:'ti-cloud wa-float wa-cloud', t:'ZataĹľeno'},
                    45: {i:'ti-mist wa-pulse', t:'Mlha'}, 
                    48: {i:'ti-mist wa-pulse', t:'NĂˇmrazovĂˇ mlha'},
                    51:{i:'ti-cloud-rain wa-pulse wa-rain', t:'SlabĂ© mrholenĂ­'}, 
                    53:{i:'ti-cloud-rain wa-pulse wa-rain', t:'MrholenĂ­'}, 
                    55:{i:'ti-cloud-rain wa-pulse wa-rain', t:'SilnĂ© mrholenĂ­'},
                    61:{i:'ti-cloud-rain wa-pulse wa-rain', t:'SlabĂ˝ dĂ©ĹˇĹĄ'}, 
                    63:{i:'ti-cloud-rain wa-pulse wa-rain', t:'DĂ©ĹˇĹĄ'}, 
                    65:{i:'ti-cloud-rain wa-pulse wa-rain', t:'SilnĂ˝ dĂ©ĹˇĹĄ'},
                    71:{i:'ti-snowflake wa-spin wa-snow', t:'SlabĂ© snÄ›ĹľenĂ­'}, 
                    73:{i:'ti-snowflake wa-spin wa-snow', t:'SnÄ›ĹľenĂ­'}, 
                    75:{i:'ti-snowflake wa-spin wa-snow', t:'SilnĂ© snÄ›ĹľenĂ­'},
                    80:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'PĹ™ehĂˇĹky'}, 
                    81:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'SilnĂ© pĹ™ehĂˇĹky'}, 
                    82:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'PĹ™Ă­valovĂ© srĂˇĹľky'},
                    95:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'BouĹ™ka'}, 
                    96:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'SilnĂˇ bouĹ™ka'}, 
                    99:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'BouĹ™ka a kroupy'}
                };
                const wip = wmoKody[curDraft.pocasi.wmo] || {i:'ti-cloud-sun wa-float', t:'NeznĂˇmĂ©'};
                wBox.innerHTML = `
                    <div style="display:flex; align-items:center; gap:16px; background:rgba(255,255,255,0.06); padding:12px 18px; border-radius:18px; border:1px solid rgba(255,255,255,0.1); width:max-content; margin-top:14px; box-shadow:0 8px 32px rgba(0,0,0,0.15);">
                        <i class="ti ${wip.i} wa" style="font-size:2.6rem; display:block;"></i>
                        <div>
                            <div style="font-size:1.6rem; font-weight:800; font-family:var(--fm); line-height:1; margin-bottom:4px;">${curDraft.pocasi.teplota}Â°C</div>
                            <div style="font-size:0.75rem; color:var(--t2); font-weight:600;">${wip.t} &nbsp;â€˘&nbsp; VĂ­tr ${curDraft.pocasi.vitr} km/h</div>
                        </div>
                    </div>`;
                wBox.style.display = 'block';
            } else { wBox.style.display = 'none'; }
            document.getElementById('commentsSection').style.display='none';
            document.getElementById('btnSaveAI').style.display='inline-flex';
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
            
            // BEZPEÄŚNĂ‰ SKRYTĂŤ TLAÄŚĂŤTKA SDĂŤLENĂŤ
            const shareBtn = document.getElementById('btnShareTrip');
            if(shareBtn) shareBtn.style.display = 'none';
            
            document.getElementById('resCard').style.display='block';
            window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});
        }else alert('Chyba: '+(res.chyba||'NeznĂˇmĂ˝ problĂ©m pĹ™i komunikaci s AI.'));
    }catch(e){alert('Chyba spojenĂ­: '+e.message);}
    btn.innerHTML='Sestavit itinerĂˇĹ™ AI';btn.disabled=false;
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
            ukazAchievementModal(res.awarded[0]); 
        } else {
            alert('ItinerĂˇĹ™ byl ĂşspÄ›ĹˇnÄ› uloĹľen do denĂ­ku.');
        }
    } catch(e) { alert('Chyba pĹ™i uklĂˇdĂˇnĂ­.'); }
}

function ukazAchievementModal(ach) {
    document.getElementById('achIcon').className = `ti ${ach.ikona}`;
    document.getElementById('achTitle').innerText = ach.nazev;
    document.getElementById('achDesc').innerText = ach.popis;
    document.getElementById('achievementModal').style.display = 'flex';
    // Spustit konfety (pokud mĂˇme libku, nebo aspoĹ visual feedback)
    console.log("Achievement UNLOCKED:", ach.nazev);
}

function pridatEtapu(){const d=document.createElement('div');d.className='man-etapa';d.style.cssText='display:flex;gap:7px;margin-bottom:7px;align-items:center;';d.innerHTML=`<input type="time" class="f e-cas" style="width:108px;margin:0;" value="12:00"><input type="text" class="f e-misto" placeholder="MĂ­sto" style="flex:1;margin:0;"><input type="text" class="f e-popis" placeholder="Popis" style="flex:2;margin:0;"><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--t2);font-size:1rem;">âś•</button>`;document.getElementById('manEtapy').appendChild(d);}
async function ulozitVlastni(){const l=document.getElementById('manLokace').value.trim();if(!l)return alert('Zadejte nĂˇzev vĂ˝letu.');const etapyEls=Array.from(document.querySelectorAll('.man-etapa'));let h='<div class="tl">';etapyEls.forEach((e,i)=>{const isLast=i===etapyEls.length-1;h+=`<div class="tr"><div class="t-left"><div class="td">${String(i+1).padStart(2,'0')}</div><div class="tt">${e.querySelector('.e-cas').value}</div></div><div class="tc"><h4>${e.querySelector('.e-misto').value}</h4><p>${e.querySelector('.e-popis').value}</p></div></div>`;if(!isLast)h+=`<div class="tr-line"></div>`;});h+='</div>';await fetch('/api/ulozit-vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lokace:l,popis:h,obtiznost:parseInt(document.getElementById('manObtiznost').value),typ:'vlastni',etapy:[]})});document.getElementById('manualModal').style.display='none';nactiDnik();}
// NATIVNĂŤ SDĂŤLENĂŤ (NynĂ­ odkazuje na konkrĂ©tnĂ­ vĂ˝let)
async function sdiletVylet(id, lokace) {
    const res = await (await fetch('/api/ulozit-vylet-share-id/' + id)).json(); // PotĹ™ebujeme shareId
    const sid = res.shareId || id;
    const url = window.location.origin + '/s/' + sid;
    
    if (navigator.share) {
        navigator.share({ title: `VĂ˝let: ${lokace}`, url });
    } else {
        await navigator.clipboard.writeText(url);
        alert('Odkaz zkopĂ­rovĂˇn do schrĂˇnky!');
    }
}

async function generovatQRVyletu(shareId) {
    if(!shareId) return alert('Tento vĂ˝let zatĂ­m nemĂˇ unikĂˇtnĂ­ odkaz pro QR.');
    const res = await (await fetch('/api/generovat-qr?text=' + encodeURIComponent(window.location.origin + '/s/' + shareId))).json();
    if(res.data) {
        document.getElementById('lightboxImg').src = res.data;
        document.getElementById('lightbox').style.display = 'flex';
    }
}

async function exportovatNaInstagramZListu(id) {
    // Toto vyĹľaduje detail vĂ˝letu k vyrenderovĂˇnĂ­ do canvasu (viz existujĂ­cĂ­ Instagram export)
    // Pro jednoduchost teÄŹ otevĹ™eme detail a pak trigger
    fetch('/api/ulozene-vylety').then(r=>r.json()).then(v=>{
        const x = v.find(t=>t.id===id);
        if(x) {
            otevritDetailVyletu(x);
            setTimeout(() => {
                if (window.exportovatInstagram) window.exportovatInstagram();
            }, 500);
        }
    });
}
function otevritGoogleMaps(id) {
    fetch('/api/ulozene-vylety').then(r => r.json()).then(v => {
        const x = v.find(x => x.id === id);
        if (!x?.etapy?.[0]?.lat) return alert('U tohoto vĂ˝letu chybĂ­ navigaÄŤnĂ­ data.');
        
        const o = `${x.etapy[0].lat},${x.etapy[0].lng}`;
        const d = `${x.etapy[x.etapy.length - 1].lat},${x.etapy[x.etapy.length - 1].lng}`;
        const wp = x.etapy.length > 2 ? '&waypoints=' + x.etapy.slice(1, -1).map(e => `${e.lat},${e.lng}`).join('|') : '';
        
        // ChytrĂˇ detekce mĂłdu dopravy podle textu vĂ˝letu
        let tm = 'driving'; // VĂ˝chozĂ­ stav (auto)
        const text = (x.lokace + ' ' + x.popis).toLowerCase();
        if (text.includes('kolo') || text.includes('cyklistika') || text.includes('mtb') || text.includes('cyklo')) {
            tm = 'bicycling'; // Kolo
        } else if (text.includes('prochĂˇzka') || text.includes('turistika') || text.includes('pÄ›ĹˇĂ­')) {
            tm = 'walking'; // PÄ›ĹˇĂ­
        }
        
        // Zcela novĂˇ, ÄŤistĂˇ a oficiĂˇlnĂ­ URL pro Google Maps Directions API
        const url = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}${wp}&travelmode=${tm}`;
        window.open(url, '_blank');
    });
}

function openGallery(s){document.getElementById('lightboxImg').src=s;document.getElementById('lightbox').style.display='flex';}
async function doKalendare() {
    const d = document.getElementById('dateIn').value;
    if (!d) return alert('Vyberte prosĂ­m datum.');

    const btn = document.getElementById('btnKalendarModal');
    const origText = btn.innerText;
    btn.innerText = 'ZpracovĂˇvĂˇm...';

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
            else if (text.includes('prochĂˇzka') || text.includes('turistika') || text.includes('pÄ›ĹˇĂ­')) tm = 'walking';

            ml = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d2}${wp}&travelmode=${tm}`;
        }
    }

    let detailniPopis = `ItinerĂˇĹ™ vĂ˝letu: ${document.getElementById('resTitle').innerText}\n\n`;
    if (typeof curDraft !== 'undefined' && curDraft?.etapy) {
        curDraft.etapy.forEach(e => {
            detailniPopis += `đź•’ ${e.cas} â€” ${e.misto}\nđź“ť ${e.popis}\n\n`;
        });
    }
    if (typeof curDraft !== 'undefined' && curDraft?.doporuceni) {
        detailniPopis += `đź’ˇ Tip architekta: ${curDraft.doporuceni}\n\n`;
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
            alert(data.chyba || 'DoĹˇlo k chybÄ› pĹ™i vytvĂˇĹ™enĂ­ kalendĂˇĹ™e.');
        }
    } catch (e) {
        btn.innerText = origText;
        alert('Chyba: ' + e.message);
    }
}

async function odeslatKontaktV2(){const pe=document.getElementById('kontaktPredmet'),ze=document.getElementById('kontaktZprava');if(!pe.value||!ze.value)return alert('VyplĹte prosĂ­m vĹˇechna pole.');const btn=event.target,orig=btn.innerText;btn.innerHTML='<div class="spin" style="margin:0 auto"></div>';btn.disabled=true;try{const r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:'c8ed8521-b2ea-4c17-ad1a-2379968a739e',subject:`VERONA: ${pe.value}`,from_name:'UĹľivatel VERONA',message:ze.value})});const res=await r.json();if(res.success){alert('VaĹˇe zprĂˇva byla ĂşspÄ›ĹˇnÄ› odeslĂˇna. DÄ›kujeme.');document.getElementById('contactWin').style.display='none';pe.value='';ze.value='';}else alert('DoĹˇlo k chybÄ›: '+res.message);}catch(e){alert('Chyba pĹ™i komunikaci se serverem.');}btn.innerText=orig;btn.disabled=false;}
// 1. UPRAVENĂ FUNKCE PRO DETAIL - ZavolĂˇ kreslenĂ­ mapy
function otevritDetailVyletu(v){
    curOpenTripId=v.id;
    
    // BEZPEÄŚNĂ‰ ZOBRAZENĂŤ TLAÄŚĂŤTKA SDĂŤLENĂŤ
    const shareBtn = document.getElementById('btnShareTrip');
    if(shareBtn) shareBtn.style.display = 'inline-flex';
    
    document.getElementById('resTitle').innerText=v.lokace;
    document.getElementById('resDiffText').innerText='UloĹľeno: '+(v.datumUlozeni||'');
    document.getElementById('btnSaveAI').style.display='none';
    
    // Novinka: TlaÄŤĂ­tko pro kopĂ­rovĂˇnĂ­ cizĂ­ch vĂ˝letĹŻ a schovĂˇnĂ­ Ăşpravy
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
            0: {i:'ti-sun wa-spin wa-sun', t:'Jasno'}, 
            1: {i:'ti-cloud-sun wa-float', t:'Polojasno'}, 
            2: {i:'ti-cloud wa-float wa-cloud', t:'OblaÄŤno'}, 
            3: {i:'ti-cloud wa-float wa-cloud', t:'ZataĹľeno'},
            45: {i:'ti-mist wa-pulse', t:'Mlha'}, 
            48: {i:'ti-mist wa-pulse', t:'NĂˇmrazovĂˇ mlha'},
            51:{i:'ti-cloud-rain wa-pulse wa-rain', t:'SlabĂ© mrholenĂ­'}, 
            53:{i:'ti-cloud-rain wa-pulse wa-rain', t:'MrholenĂ­'}, 
            55:{i:'ti-cloud-rain wa-pulse wa-rain', t:'SilnĂ© mrholenĂ­'},
            61:{i:'ti-cloud-rain wa-pulse wa-rain', t:'SlabĂ˝ dĂ©ĹˇĹĄ'}, 
            63:{i:'ti-cloud-rain wa-pulse wa-rain', t:'DĂ©ĹˇĹĄ'}, 
            65:{i:'ti-cloud-rain wa-pulse wa-rain', t:'SilnĂ˝ dĂ©ĹˇĹĄ'},
            71:{i:'ti-snowflake wa-spin wa-snow', t:'SlabĂ© snÄ›ĹľenĂ­'}, 
            73:{i:'ti-snowflake wa-spin wa-snow', t:'SnÄ›ĹľenĂ­'}, 
            75:{i:'ti-snowflake wa-spin wa-snow', t:'SilnĂ© snÄ›ĹľenĂ­'},
            80:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'PĹ™ehĂˇĹky'}, 
            81:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'SilnĂ© pĹ™ehĂˇĹky'}, 
            82:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'PĹ™Ă­valovĂ© srĂˇĹľky'},
            95:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'BouĹ™ka'}, 
            96:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'SilnĂˇ bouĹ™ka'}, 
            99:{i:'ti-cloud-storm wa-pulse wa-bolt', t:'BouĹ™ka a kroupy'}
        };
        const wip = wmoKody[v.pocasi.wmo] || {i:'ti-cloud-sun wa-float', t:'NeznĂˇmĂ©'};
        wBox.innerHTML = `
            <div style="display:flex; align-items:center; gap:16px; background:rgba(255,255,255,0.06); padding:12px 18px; border-radius:18px; border:1px solid rgba(255,255,255,0.1); width:max-content; margin-top:14px; box-shadow:0 8px 32px rgba(0,0,0,0.15);">
                <i class="ti ${wip.i} wa" style="font-size:2.6rem; display:block;"></i>
                <div>
                    <div style="font-size:1.6rem; font-weight:800; font-family:var(--fm); line-height:1; margin-bottom:4px;">${v.pocasi.teplota}Â°C</div>
                    <div style="font-size:0.75rem; color:var(--t2); font-weight:600;">${wip.t} &nbsp;â€˘&nbsp; VĂ­tr ${v.pocasi.vitr} km/h</div>
                </div>
            </div>`;
        wBox.style.display = 'block';
    } else { wBox.style.display = 'none'; }

    vykresliHvezdicky(v.id,v.hodnoceni||0);
    vykresliKomentare(v.komentare||[]);
    curDraft=v;
    document.getElementById('resCard').style.display='block';
    window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});
    
    // Novinka: NakreslĂ­ trasu!
    vykresliTrasuNaMape(v);
}

async function ulozitCiziVylet() {
    if (!prihlaseno) return alert('MusĂ­te bĂ˝t pĹ™ihlĂˇĹˇeni.');
    if (!curOpenTripId) return;
    const btn = document.getElementById('btnSavePublic');
    btn.innerHTML = '<div class="spin"></div> KopĂ­ruji...';
    try {
        const res = await (await fetch('/api/ulozit-cizi-vylet', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idVyletu: curOpenTripId})})).json();
        if (res.uspech) {
            alert('VĂ˝let ĂşspÄ›ĹˇnÄ› uloĹľen do vaĹˇeho sekce MĹŻj DenĂ­k!');
            nactiDnik();
            btn.innerHTML = 'UloĹľeno <i class="ph-fill ph-check"></i>';
            setTimeout(() => btn.style.display = 'none', 3000);
        } else {
            alert('Chyba: ' + res.chyba);
            btn.innerHTML = 'UloĹľit do mĂ©ho denĂ­ku <i class="ph-fill ph-bookmark-simple" style="margin-left:5px;"></i>';
        }
    } catch(e) { 
        alert('SpojenĂ­ selhalo.'); 
        btn.innerHTML = 'UloĹľit do mĂ©ho denĂ­ku <i class="ph-fill ph-bookmark-simple" style="margin-left:5px;"></i>';
    }
}

// 2. ZCELA NOVĂ FUNKCE - KreslĂ­ polyline trasu na mapu
function vykresliTrasuNaMape(v) {
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
            // OmezenĂ­ bodĹŻ trasy na max 300 bodĹŻ pro zĂˇchranu db kvĂłt
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
                btn.innerHTML = '<i class="ti ti-circle-check-filled" style="color:#10b981;font-size:1.1rem;"></i>';
                setTimeout(() => btn.innerHTML = origHtml, 3000);
            } else alert("Chyba DB uloĹľenĂ­: " + res.chyba);
        } catch(err) { alert("Chyba pĹ™i ÄŤtenĂ­ XML souboru GPX."); btn.innerHTML = origHtml; }
    };
    reader.readAsText(file);
}

// 3. UPRAVENĂť FEED - DÄ›lĂˇ jmĂ©na a avatary klikacĂ­
async function nactiFeed(){
    const f=await(await fetch('/api/feed')).json();const c=document.getElementById('feedStream');
    if(!f.length){c.innerHTML=`<div class="es"><p style="font-size:.88rem;">Komunita je zatĂ­m prĂˇzdnĂˇ. NapiĹˇte prvnĂ­ zprĂˇvu!</p></div>`;return;}
    
    // ZmÄ›na nĂˇzvĹŻ v poli pro psanĂ­
    document.querySelector('.clabel').innerText = '// Chat s komunitou';
    document.getElementById('btnOdeslatFeed').innerText = 'Odeslat do chatu';
    
    c.innerHTML=f.map((p,i)=>{
        const isMine = prihlaseno && mujProfil && p.autorId === mujProfil._id;
        // Pokud je zprĂˇva tvĂˇ, zarovnĂˇ se doprava a zĂ­skĂˇ lehce fialovĂ˝ nĂˇdech jako iMessage
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
            <div class="ph"><div class="pa" style="cursor:pointer;" onclick="otevritVerejnyProfil('${p.autorId}')" title="Zobrazit profil"><div id="${avId}" class="av"></div><div><p class="an" style="transition:color .2s;" onmouseover="this.style.color='var(--a1)'" onmouseout="this.style.color='currentColor'">${p.autorJmeno}</p><p class="pd">${p.datum}</p></div></div>${ak}</div>
            <p class="pt">${p.text}</p>${fh}${th}
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
    if(!prihlaseno) return alert('Pro lajkovĂˇnĂ­ se musĂ­te pĹ™ihlĂˇsit.');
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

// 4. ZCELA NOVĂ‰ FUNKCE PRO VEĹEJNĂ‰ PROFILY
window.pubTripsData = []; // ZĂˇloĹľnĂ­ ĂşloĹľiĹˇtÄ› pro prokliky
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
            document.getElementById('pubBio').innerText = p.bio || 'Tento cestovatel o sobÄ› zatĂ­m nic nenapsal.';
            const avDiv = document.getElementById('pubAvatar');
            if (p.avatar) { avDiv.style.backgroundImage = `url(${p.avatar})`; avDiv.innerText = ''; } 
            else { avDiv.style.backgroundImage = 'linear-gradient(135deg,var(--a1),var(--a3))'; avDiv.innerText = p.jmeno.charAt(0).toUpperCase(); }
            
            // Logika pĹ™ĂˇtelstvĂ­ a Chat zobrazenĂ­ pouze pro pĹ™ihlĂˇĹˇenĂ©ho klienta (Ne na svĂ©m vlastnĂ­m profilu)
            const pubActions = document.getElementById('pubActions');
            if (prihlaseno && mujProfil && mujProfil._id !== id) {
                pubActions.style.display = 'flex';
                window.aktualniCiziProfilId = id;
                window.aktualniCiziProfilJmeno = p.jmeno;
                window.aktualniCiziProfilAvatar = p.avatar;
                
                const btnFriend = document.getElementById('btnPridatPritele');
                if (p.jePritel) {
                    btnFriend.innerHTML = '<i class="ti ti-user-minus" style="margin-right:4px;"></i> <span>Odebrat</span>';
                    btnFriend.className = 'btn bgh';
                } else {
                    btnFriend.innerHTML = '<i class="ti ti-user-plus" style="margin-right:4px;"></i> <span>PĹ™idat pĹ™Ă­tele</span>';
                    btnFriend.className = 'btn bg';
                }
            } else { pubActions.style.display = 'none'; }
            
            const c = document.getElementById('pubTrips');
            if (!window.pubTripsData.length) {
                c.innerHTML = '<p style="color:var(--t2);font-size:.85rem;text-align:center;padding:20px;">ZatĂ­m ĹľĂˇdnĂ© veĹ™ejnĂ© vĂ˝lety.</p>';
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
        } else { document.getElementById('pubTrips').innerHTML = '<p>Chyba naÄŤĂ­tĂˇnĂ­ profilu.</p>'; }
    } catch(e) { document.getElementById('pubTrips').innerHTML = '<p>Chyba spojenĂ­.</p>'; }
}

window.otevritDetailVerejnehoVyletu = function(id) {
    const trip = window.pubTripsData.find(t => t.id === id);
    if (trip) {
        document.getElementById('publicProfileModal').style.display = 'none';
        prepniTab('planovac'); // HodĂ­me uĹľivatele na hlavnĂ­ obrazovku k mapÄ›
        otevritDetailVyletu(trip); // A vykreslĂ­me cizĂ­ trasu i s ÄŤĂˇrou!
    }
};

// --- CHAT A PĹĂTELĂ‰ LOGIKA ---
async function pridatOdebratPritele() {
    if(!window.aktualniCiziProfilId) return;
    try {
        const res = await (await fetch('/api/pridat-pritele', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ targetId: window.aktualniCiziProfilId }) })).json();
        if(res.uspech) { otevritVerejnyProfil(window.aktualniCiziProfilId); } // Znovu vyrenderuje tlaÄŤĂ­tka
    } catch(e) { console.error(e); }
}

window.chatRefreshInterval = null;
async function otevritChat() {
    document.getElementById('publicProfileModal').style.display='none';
    document.getElementById('chatModal').style.display='flex';
    document.getElementById('chatName').innerText = window.aktualniCiziProfilJmeno;
    
    const av = document.getElementById('chatAvatar');
    if(window.aktualniCiziProfilAvatar) { av.style.backgroundImage = `url(${window.aktualniCiziProfilAvatar})`; av.innerText = ''; }
    else { av.style.backgroundImage = 'linear-gradient(135deg,var(--a1),var(--a3))'; av.innerText = window.aktualniCiziProfilJmeno.charAt(0).toUpperCase(); }
    
    nactiChat();
    // Auto-refresh chatu
    if(window.chatRefreshInterval) clearInterval(window.chatRefreshInterval);
    window.chatRefreshInterval = setInterval(nactiChat, 4000);
}

// PĹ™i zavĹ™enĂ­ chatu vypnout ping
document.querySelector('#chatModal .btnx').addEventListener('click', () => { clearInterval(window.chatRefreshInterval); });

async function nactiChat() {
    if(document.getElementById('chatModal').style.display === 'none') return;
    try {
        const res = await (await fetch('/api/zpravy/' + window.aktualniCiziProfilId)).json();
        if(res.uspech) {
            const hist = document.getElementById('chatHistory');
            // ZjiĹˇtÄ›nĂ­ zda jsme byli vespod
            const isScrolledToBottom = hist.scrollHeight - hist.clientHeight <= hist.scrollTop + 20;

            if(res.data.length === 0) hist.innerHTML = '<div class="es"><p>ZatĂ­m ĹľĂˇdnĂ© zprĂˇvy. ZaÄŤnÄ›te konverzaci!</p></div>';
            else {
                hist.innerHTML = res.data.map((z, i) => {
                    const isMine = z.odesilatelId === mujProfil._id;
                    const bSty = isMine ? 'background: linear-gradient(135deg, var(--a1), var(--a2)); color: white; margin-left: auto; border-bottom-right-radius: 4px;' : 'background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.05); margin-right: auto; border-bottom-left-radius: 4px;';
                    return `
                    <div style="max-width:75%; padding:10px 15px; border-radius:16px; font-size:0.9rem; line-height:1.5; ${bSty} animation: fadeIn 0.3s ease;">
                        ${z.text}
                        <div style="font-size:0.55rem; opacity:0.6; text-align:${isMine?'right':'left'}; margin-top:4px;">${z.datum}</div>
                    </div>`;
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

// ZmÄ›na soukromĂ­ vĂ˝letu (VeĹ™ejnĂ˝ <-> SoukromĂ˝)
async function prepnoutSoukromi(id, stav) {
    try {
        const r = await fetch('/api/upravit-vylet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, verejny: stav })
        });
        const data = await r.json();
        if (data.uspech) {
            nactiDnik(); // PĹ™ekreslĂ­ denĂ­k a aktualizuje ĹˇtĂ­tek
        } else {
            alert('Chyba pĹ™i zmÄ›nÄ› soukromĂ­.');
        }
    } catch(e) {
        alert('Chyba spojenĂ­.');
    }
}

// ZmÄ›na stavu vĂ˝letu (SplnÄ›no <-> ZruĹˇit)
async function prepnoutStav(id, stav) {
    try {
        const r = await fetch('/api/upravit-vylet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, dokonceno: stav })
        });
        const data = await r.json();
        if (data.uspech) {
            nactiDnik(); // PĹ™ekreslĂ­ denĂ­k a zbarvĂ­ okraj vĂ˝letu
        } else {
            alert('Chyba pĹ™i zmÄ›nÄ› stavu.');
        }
    } catch(e) {
        alert('Chyba spojenĂ­.');
    }
}

// 5. FRIENDLY-CODE a PĹĂTELĂ‰ HUB
function kopirovatMujKod() {
    const input = document.getElementById('mujFriendlyCode');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value);
    
    const btn = input.nextElementSibling;
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-check" style="color:#10b981;"></i>';
    setTimeout(() => { btn.innerHTML = origHtml; }, 2000);
}

async function pridatPriteleKod() {
    const input = document.getElementById('inputFriendCode');
    const kod = input.value.trim();
    if(!kod) return;
    
    const btn = input.nextElementSibling;
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<div class="spin" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></div>';
    
    try {
        const res = await (await fetch('/api/pridat-pritele-kod', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ kod }) })).json();
        if(res.uspech) {
            btn.innerHTML = '<i class="ti ti-check" style="color:#fff;"></i>';
            btn.className = 'btn bg';
            input.value = '';
            setTimeout(() => { btn.innerHTML = origHtml; btn.className = 'btn bp'; }, 2000);
            if (document.getElementById('viewKomunita').classList.contains('hidden') === false) {
                vykreslitFriendHub();
            }
        } else {
            alert(res.chyba || "Chyba pĹ™i pĹ™idĂˇvĂˇnĂ­.");
            btn.innerHTML = origHtml;
        }
    } catch(e) { 
        alert("DoĹˇlo k chybÄ›. KĂłd je neplatnĂ˝."); 
        btn.innerHTML = origHtml;
    }
}

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
}

async function nactiExplore() {
    const c = document.getElementById('exploreGrid');
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
                            <div style="display:flex; gap:4px;">${Array.from({length:5},(_,j)=>`<span style="color:${j<(x.hodnoceni||0)?'#fbbf24': 'rgba(255,255,255,0.1)'}; font-size:0.7rem;">★</span>`).join('')}</div>
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
                        <button class="btn bgh" onclick="prepniProfilPrihlaseni()" title="OdhlĂˇsit se"><i class="ti ti-logout" style="font-size:1.2rem;"></i></button>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;">
                        <div class="dc au" style="text-align:center; padding:16px; border-radius:20px;">
                            <span style="font-size:1.5rem; font-weight:900; color:var(--a1); display:block;">${stats.pocetVyletu}</span>
                            <span style="font-size:0.65rem; color:var(--t2); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">VĂ˝lety</span>
                        </div>
                        <div class="dc au" style="text-align:center; padding:16px; border-radius:20px;">
                            <span style="font-size:1.5rem; font-weight:900; color:var(--a1); display:block;">${stats.ujetaVzdalenost}</span>
                            <span style="font-size:0.65rem; color:var(--t2); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">Kilometry</span>
                        </div>
                        <div class="dc au" style="text-align:center; padding:16px; border-radius:20px;">
                            <span style="font-size:1.5rem; font-weight:900; color:var(--a1); display:block;">${u.achievementy?.length || 0}</span>
                            <span style="font-size:0.65rem; color:var(--t2); text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">ĂšspÄ›chy</span>
                        </div>
                    </div>

                    <div>
                        <h3 style="margin-bottom:16px; font-weight:800;">TvĂ© odznaky</h3>
                        <div style="display:flex; flex-wrap:wrap; gap:12px;" id="achievementsGrid">
                            ${(u.achievementy || []).map(ach => `
                                <div class="dc au" style="width:80px; text-align:center; padding:12px; border-radius:20px; background:rgba(99,102,241,0.05);">
                                    <i class="ti ${ach.ikona}" style="font-size:1.8rem; color:var(--a1); display:block; margin-bottom:6px;"></i>
                                    <span style="font-size:0.55rem; font-weight:700; line-height:1.2; display:block;">${ach.nazev}</span>
                                </div>
                            `).join('') || '<p style="color:var(--t2); font-size:0.85rem; padding-left:10px;">ZatĂ­m ĹľĂˇdnĂ© ĂşspÄ›chy. Vyraz na prvnĂ­ vĂ˝let!</p>'}
                        </div>
                    </div>
                </div>
            `;
        }
    } catch(e) { c.innerHTML = '<p>Chyba naÄŤĂ­tĂˇnĂ­ profilu.</p>'; }
}


// Podpora pro tlaÄŤĂ­tko "ZpÄ›t"
window.addEventListener('popstate', () => {
    if (!prihlaseno) return;
    const hash = window.location.hash.replace('#', '');
    prepniTab(['komunita', 'planovac', 'verejne', 'akce'].includes(hash) ? hash : 'landing', false);
});

// VYKRESLENĂŤ AKCĂŤ (S perfektnÄ› vycentrovanĂ˝mi SVG ikonami)
async function nactiAkce() {
    const res = await fetch('/api/akce');
    const data = await res.json();
    const c = document.getElementById('akceStream');
    if (!c) return;
    
    if (!data.uspech || !data.data.length) {
        c.innerHTML = '<div class="es"><p>ZatĂ­m zde nejsou ĹľĂˇdnĂ© plĂˇnovanĂ© akce.</p></div>';
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

// NezapomeĹ pĹ™idat `await nactiAkce();` do funkce init() hned vedle `await nactiVerejneVylety();`!
function prihlasitNewsletter() {
    const btn = document.getElementById('btnNews');
    btn.innerHTML = 'âś“ Jste na seznamu!';
    btn.style.background = 'var(--a4)'; 
    localStorage.setItem('verona_news', '1'); 
    setTimeout(() => { document.getElementById('newsletterModal').style.display='none'; }, 2000);
}
let mujChart = null; // PromÄ›nnĂˇ pro uchovĂˇnĂ­ grafu, aby se nenaÄŤĂ­tal pĹ™es sebe

async function otevritMujProfil() {
    // 1. ZobrazĂ­me okno
    document.getElementById('profileModal').style.display = 'flex';
    document.getElementById('mujFriendlyCode').value = mujProfil._id;
    
    // ZobrazenĂ­ tlaÄŤĂ­tka pro speciĂˇlnĂ­ administrĂˇtorskou sekci
    if (mujProfil.isAdmin || (mujProfil.email && mujProfil.email === 'demonsport29@gmail.com')) {
        document.getElementById('adminPanelWrapper').style.display = 'block';
    } else {
        document.getElementById('adminPanelWrapper').style.display = 'none';
    }
    
    // 2. StĂˇhneme data ze serveru
    try {
        const res = await (await fetch('/api/moje-staty')).json();
        if (res.uspech) {
            vykresliGraf(res.staty);
            vykresliMedaile(res.medaile);
        }
    } catch(e) { console.error('Chyba naÄŤĂ­tĂˇnĂ­ statistik:', e); }
}

function vykresliGraf(staty) {
    const ctx = document.getElementById('profilGraf').getContext('2d');
    
    // Pokud uĹľ tam starĂ˝ graf je, zniÄŤĂ­me ho, aĹĄ nedÄ›lĂˇ neplechu
    if (mujChart) mujChart.destroy();

    const barvaTextu = document.documentElement.getAttribute('data-theme') === 'light' ? '#333' : '#a5b4fc';

    mujChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['UloĹľenĂ© vĂ˝lety', 'SplnÄ›no', 'ZprĂˇv v komunitÄ›'],
            datasets: [{
                label: 'PoÄŤet',
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
        // Pokud je medaile zĂ­skanĂˇ, svĂ­tĂ­ barevnÄ›. Pokud ne, je zaĹˇedlĂˇ a prĹŻhlednĂˇ.
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
                list.innerHTML = '<p class="es" style="font-size:0.85rem;">ZatĂ­m nejsou v databĂˇzi ĹľĂˇdnĂ© akce.</p>';
                return;
            }
            list.innerHTML = res.data.map(x => `
                <div style="background:rgba(0,0,0,0.15); border:1px solid var(--gbd); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="font-family:var(--fs); display:block; margin-bottom:4px;">${x.nazev}</strong>
                        <span style="font-size:0.75rem; color:var(--t2);">${x.datum} | ${x.misto}</span>
                    </div>
                    <button class="btn bgh" style="color:#ef4444; border:1px solid rgba(239,68,68,0.2); padding:6px 10px;" onclick="smazatAkci('${x._id}')" title="Smazat akci"><i class="ti ti-trash"></i></button>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p>Chyba naÄŤĂ­tĂˇnĂ­ databĂˇze.</p>';
        }
    } catch(e) { list.innerHTML = '<p>Chyba spojenĂ­.</p>'; }
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
    
    if (!data.nazev || !data.datum || !data.popis) return alert('DoplĹte alespoĹ NĂˇzev, Datum a Popis.');
    
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
            alert(res.chyba || 'Aplikace neschvĂˇlila vloĹľenĂ­.');
            btn.innerHTML = oldHtml;
        }
    } catch(e) { alert('Chyba spojenĂ­.'); btn.innerHTML = oldHtml; }
};

window.smazatAkci = async function(id) {
    if (!confirm('Opravdu smazat z databĂˇze tuto akci? KlientĹŻm zmizĂ­ z nabĂ­dky.')) return;
    try {
        const res = await (await fetch('/api/admin/akce/' + id, { method: 'DELETE' })).json();
        if (res.uspech) {
            nactiAdminAkceVypis();
            nactiAkce(); 
        } else alert(res.chyba || 'Chyba mazĂˇnĂ­.');
    } catch(e) { alert('Nelze kontaktovat server.'); }
};


// âśŹď¸Ź FUNKCE PRO ĂšPRAVU VĂťLETU (Edit-in-place)
let isEditingTrip = false;
async function toggleEditTrip() {
    const btn = document.getElementById('btnEditTrip');
    const title = document.getElementById('resTitle');
    const body = document.getElementById('resBody');
    
    if (!isEditingTrip) {
        // ZAPNUTĂŤ REĹ˝IMU ĂšPRAV
        isEditingTrip = true;
        title.contentEditable = true;
        body.contentEditable = true;
        
        // VizuĂˇlnĂ­ indikace
        title.style.borderBottom = "1px dashed var(--a1)";
        body.style.border = "1px dashed var(--a1)";
        body.style.padding = "10px";
        body.style.borderRadius = "10px";
        body.style.background = "rgba(0,0,0,0.2)";
        
        btn.innerHTML = "đź’ľ UloĹľit Ăşpravy";
        btn.style.width = "auto";
        btn.style.padding = "0 14px";
        btn.classList.replace("bgh", "bp"); // ZvĂ˝raznÄ›nĂ­ tlaÄŤĂ­tka
        
    } else {
        // VYPNUTĂŤ A ULOĹ˝ENĂŤ ĂšPRAV
        isEditingTrip = false;
        title.contentEditable = false;
        body.contentEditable = false;
        
        // VizuĂˇlnĂ­ nĂˇvrat do normĂˇlu
        title.style.borderBottom = "none";
        body.style.border = "none";
        body.style.padding = "0";
        body.style.background = "transparent";
        
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
        btn.style.width = "38px";
        btn.style.padding = "0";
        btn.classList.replace("bp", "bgh");

        // Pokud jde o jiĹľ uloĹľenĂ˝ vĂ˝let v denĂ­ku, uloĹľĂ­me ho rovnou i na server
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
            // Pokud je to zatĂ­m jen nĂˇvrh od AI, aktualizujeme promÄ›nnou a ÄŤekĂˇme, aĹľ dĂˇ "UloĹľit do denĂ­ku"
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
        if(res.neprectenoLita > 0) {
            badge.style.display = 'flex';
            badge.innerText = res.neprectenoLita > 9 ? '9+' : res.neprectenoLita;
        } else {
            badge.style.display = 'none';
        }
        
        const c = document.getElementById('notifikaceList');
        if(res.data.length === 0) {
            c.innerHTML = '<div class="es"><p>ZatĂ­m ĹľĂˇdnĂˇ upozornÄ›nĂ­.</p></div>';
        } else {
            c.innerHTML = res.data.map(n => `
                <div style="background:rgba(0,0,0,0.2); border-left:3px solid ${n.precteno ? 'var(--gbd)' : 'var(--a1)'}; border-radius:8px; padding:12px; display:flex; gap:12px; align-items:center;">
                    <div style="width:40px;height:40px;flex-shrink:0;border-radius:50%;background:url(${n.odesilatelAvatar||''}) center/cover var(--gb3);"><span style="display:${n.odesilatelAvatar?'none':'block'};color:#fff;text-align:center;line-height:40px;">${n.odesilatelJmeno.charAt(0)}</span></div>
                    <div>
                        <strong style="font-family:var(--fs);font-size:.9rem;color:var(--t1);">${n.odesilatelJmeno}</strong>
                        <span style="font-size:.75rem;color:var(--t2);"> ${n.typ === 'zprava' ? 'vĂˇm poslal zprĂˇvu' : 'okomentoval vĂˇĹˇ vĂ˝let'}</span>
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
                const msg = n.typ === 'zprava' ? 'NovĂˇ zprĂˇva od ' + n.odesilatelJmeno : n.odesilatelJmeno + ' pĂ­Ĺˇe komentĂˇĹ™:';
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
async function exportovatNaInstagram(event) {
    if (typeof curDraft === 'undefined' || !curDraft) return alert('NejdĹ™Ă­ve musĂ­te mĂ­t vygenerovanĂ˝ vĂ˝let.');
    
    // 1. ZmÄ›na tlaÄŤĂ­tka na loading
    const btn = event.currentTarget;
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<div class="spin" style="width:16px;height:16px;border-width:2px;border-top-color:#d946ef;"></div>';
    
    try {
        // 2. NaplnÄ›nĂ­ dat do IG Ĺˇablony
        document.getElementById('igExportTitle').innerText = document.getElementById('resTitle').innerText;
        
        let zastavkyHtml = '';
        if (curDraft.etapy && curDraft.etapy.length > 0) {
            // Vezmeme max 4 zastĂˇvky, aby se to do obrĂˇzku hezky veĹˇlo
            curDraft.etapy.slice(0, 4).forEach((e, i) => {
                zastavkyHtml += `
                <div style="display:flex; gap:16px; align-items:flex-start;">
                    <div style="width:40px; height:40px; border-radius:14px; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-family:'Space Mono', monospace; flex-shrink:0;">${i+1}</div>
                    <div style="padding-top:2px;">
                        <h4 style="font-size:1.2rem; font-weight:700; margin:0 0 4px 0;">${e.misto}</h4>
                        <p style="font-size:0.95rem; color:rgba(255,255,255,0.6); margin:0;">${e.cas}</p>
                    </div>
                </div>`;
            });
            if (curDraft.etapy.length > 4) {
                zastavkyHtml += `<p style="color:rgba(255,255,255,0.4); font-style:italic; margin-top:8px; font-size:0.95rem;">+ dalĹˇĂ­ch ${curDraft.etapy.length - 4} zastĂˇvek v aplikaci...</p>`;
            }
        } else {
            zastavkyHtml = '<p style="color:rgba(255,255,255,0.8); font-size:1.1rem; line-height:1.6;">' + (curDraft.popis ? curDraft.popis.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...' : 'KrĂˇsnĂ˝ vĂ˝let do pĹ™Ă­rody.') + '</p>';
        }
        document.getElementById('igExportBody').innerHTML = zastavkyHtml;

        // 3. PoÄŤkĂˇme chvilku na vykreslenĂ­ DOMu
        await new Promise(r => setTimeout(r, 100));

        // 4. VyrenderovĂˇnĂ­ obrĂˇzku pĹ™es html2canvas
        const exportFrame = document.getElementById('igExportFrame');
        const canvas = await html2canvas(exportFrame, {
            scale: 2, // 2x rozliĹˇenĂ­ pro hezkou ostrost
            backgroundColor: '#060810',
            logging: false,
            useCORS: true
        });
        
        // 5. StaĹľenĂ­ obrĂˇzku
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Verona_Story_${document.getElementById('igExportTitle').innerText.replace(/\s+/g, '_')}.png`;
        link.href = imgData;
        link.click();
        
        ukazToast('Export dokonÄŤen', 'ObrĂˇzek byl staĹľen! NynĂ­ ho mĹŻĹľete nahrĂˇt do Instagram Stories.');
    } catch (err) {
        alert('Chyba pĹ™i exportu: ' + err.message);
    }
    
    // 6. VrĂˇcenĂ­ tlaÄŤĂ­tka do pĹŻvodnĂ­ho stavu
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
