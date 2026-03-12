let curDraft=null,curOpenTripId=null,prihlaseno=false,mainMap=null,markerCluster=null,mujProfil=null,pripraveneFotky=[],curPolyline=null

function toggleContact(){const w=document.getElementById('contactWin');if(w.style.display==='flex'){w.style.display='none';return;}w.style.display='flex';w.style.flexDirection='column';}

async function init(){
    try{
        const data=await(await fetch('/api/auth-status')).json();
        if(data.prihlaseno){
            prihlaseno=true;mujProfil=data.profil;
            document.getElementById('btnGoogle').innerHTML='<span>Přihlášen</span><span class="m-ico"><i class="ph ph-check-circle"></i></span>';
            document.getElementById('btnGoogle').onclick=e=>e.preventDefault();
            document.getElementById('btnProfil').style.display='inline-flex';
            document.getElementById('navTabsContainer').style.display='flex';
            if(window.innerWidth <= 768) document.getElementById('mobileTabsContainer').style.display='flex';
            // Zobrazení Newsletter okna s mírným zpožděním
            if(!localStorage.getItem('verona_news')) {
                setTimeout(() => {
                    document.getElementById('newsletterModal').style.display='flex';
                }, 1500);
            }
            
            // Dynamická změna úvodní obrazovky (Rozcestník)
            document.getElementById('landingActionBtns').innerHTML = `
                <button class="btn bp blg" onclick="prepniTab('planovac')">Otevřít můj deník</button>
                <button class="btn bg blg" onclick="prepniTab('verejne')">Procházet inspiraci</button>
                <button class="btn bg blg" onclick="prepniTab('komunita')">Komunitní chat</button>
            `;
            
            const hash = window.location.hash.replace('#', '');
            prepniTab(['komunita', 'planovac', 'verejne'].includes(hash) ? hash : 'landing', false);
        } else {
            prepniTab('landing');
        }
    }catch(e){
        prepniTab('landing');
    }
    await nactiDnik(); await nactiFeed(); await nactiVerejneVylety(); await nactiAkce();
    // --- NOVÉ: Zpracování odkazu ze sdílení (Deep Linking) ---
    const urlParams = new URLSearchParams(window.location.search);
    const sdilenyId = urlParams.get('vylet');
    if (sdilenyId) {
        try {
            const res = await (await fetch('/api/sdileny-vylet/' + sdilenyId)).json();
            if (res.uspech) {
                setTimeout(() => {
                    prepniTab('planovac'); // Přepne na záložku s mapou
                    otevritDetailVyletu(res.data); // Vykreslí trasu a itinerář
                }, 500);
            } else {
                alert('Odkaz na výlet nefunguje: ' + res.chyba);
            }
            // Vyčistí URL adresu (aby po případném obnovení stránky odkaz zmizel)
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch(e) {}
    }
    // ---------------------------------------------------------
}

function prepniTab(tab, updateUrl = true){
    ['landing', 'planovac', 'verejne', 'komunita'].forEach(t=>{
        const btn = document.getElementById(`t-${t}`);
        if(btn) btn.classList.remove('active');
        const m = document.getElementById(`mt-${t}`);
        if(m) m.classList.remove('active');
        
        const viewId = t === 'landing' ? 'viewLanding' : t === 'planovac' ? 'viewPlanovac' : t === 'verejne' ? 'viewVerejne' : 'viewKomunita';
        const view = document.getElementById(viewId);
        if(view) view.classList.add('hidden');
    });
    
    if (tab !== 'landing' || prihlaseno) {
        const activeBtn = document.getElementById(`t-${tab}`);
        if(activeBtn) activeBtn.classList.add('active');
        const activeM = document.getElementById(`mt-${tab}`);
        if(activeM) activeM.classList.add('active');
    }
    
    const activeViewId = tab === 'landing' ? 'viewLanding' : tab === 'planovac' ? 'viewPlanovac' : tab === 'verejne' ? 'viewVerejne' : 'viewKomunita';
    const activeView = document.getElementById(activeViewId);
    if(activeView) activeView.classList.remove('hidden');
    
    if(tab==='planovac'&&mainMap)setTimeout(()=>mainMap.invalidateSize(),200);

    if (updateUrl) {
        history.pushState(null, '', tab === 'landing' ? '/' : '#' + tab);
    }
}

window.addEventListener('popstate', () => {
    if (!prihlaseno) return;
    const hash = window.location.hash.replace('#', '');
    prepniTab(['komunita', 'planovac', 'verejne'].includes(hash) ? hash : 'landing', false);
});
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
        const sh = Array.from({length:5}, (_,j) => `<span class="star${j<(x.hodnoceni||0)?' lit':''}">★</span>`).join('');
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
            <div class="sr"><div><span class="sl">Hodnocení</span><div>${sh}</div></div><div style="text-align:right;"><span class="sl">Komentáře</span><span class="sv">${x.komentare?.length||0}</span></div></div>
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
function prepniRezim(){document.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');}

function zmenitAvatar(){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=e=>{const r=new FileReader();r.onloadend=()=>{mujProfil.avatar=r.result;document.getElementById('profAvatar').style.backgroundImage=`url(${r.result})`;document.getElementById('profAvatar').innerText='';};r.readAsDataURL(e.target.files[0]);};i.click();}
async function ulozitProfil(){await fetch('/api/ulozit-profil',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prezdivka:document.getElementById('profPrezdivka').value,vek:document.getElementById('profVek').value,telefon:document.getElementById('profTelefon').value,bio:document.getElementById('profBio').value,avatar:mujProfil.avatar||''})});document.getElementById('profileModal').style.display='none';alert('Profil uložen!');location.reload();}
async function poslatPrispevek(){document.getElementById('btnKoupit').innerHTML='<div class="spin" style="margin:0 auto"></div>';try{const d=await(await fetch('/api/vytvorit-platbu',{method:'POST'})).json();if(d.url)window.location.href=d.url;}catch(e){document.getElementById('btnKoupit').innerText='Zkusit znovu';}}

function aktualizovatMapu(v){
    if(!mainMap){mainMap=L.map('globalMap').setView([49.8,15.5],5);L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:18}).addTo(mainMap);markerCluster=L.markerClusterGroup({chunkedLoading:true,spiderfyOnMaxZoom:true});mainMap.addLayer(markerCluster);}
    markerCluster.clearLayers();const pts=[];
    const icon=L.divIcon({className:'custom-map-marker',iconSize:[11,11],iconAnchor:[5,5]});
    v.forEach(x=>{if(x.etapy&&x.etapy[0]?.lat){const m=L.marker([x.etapy[0].lat,x.etapy[0].lng],{icon});m.bindPopup(`<div style="text-align:center;padding:4px;"><h4 style="margin:0 0 8px;">${x.lokace}</h4><button onclick="otevritGoogleMaps('${x.id}')" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:6px 14px;border-radius:9px;cursor:pointer;font-weight:700;font-size:.78rem;">Navigovat k cíli</button></div>`);markerCluster.addLayer(m);pts.push([x.etapy[0].lat,x.etapy[0].lng]);}});
    if(pts.length)mainMap.fitBounds(L.latLngBounds(pts).pad(0.15));
}

async function nactiDnik(){
    const v=await(await fetch('/api/ulozene-vylety')).json();
    aktualizovatMapu(v);
    const d=document.getElementById('diary'),sel=document.getElementById('feedTripSelect');
    sel.innerHTML='<option value="">Bez navázaného výletu</option>';
    if(!v.length){d.innerHTML=`<div class="es"><p style="font-size:.9rem;">Deník je prázdný. Vygenerujte svůj první výlet v plánovači.</p></div>`;return;}
    d.innerHTML='';
    v.forEach((x,i)=>{
        sel.innerHTML+=`<option value="${x.id}">${x.lokace}</option>`;
        const k=document.createElement('div');k.className=`dc au${x.dokonceno?' done':''}`;k.style.animationDelay=`${i*.05}s`;k.dataset.id=x.id;
        const sh=Array.from({length:5},(_,j)=>`<span class="star${j<(x.hodnoceni||0)?' lit':''}">★</span>`).join('');
        const fh=x.fotky?.length?`<div class="ps">${x.fotky.map(f=>`<img src="${f}" class="pt2" onclick="event.stopPropagation();openGallery('${f}')">`).join('')}</div>`:'';
        const ab=(!x.fotky||x.fotky.length<3)?`<button class="btn bg bi" onclick="event.stopPropagation();upload('${x.id}')" style="border-radius:10px; font-size:0.75rem;">Foto</button>`:'';
        k.innerHTML=`
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
                <div><h3 style="font-size:1.15rem;font-weight:800;letter-spacing:-.02em;margin-bottom:3px;">${x.lokace}</h3><p style="font-family:var(--fm);font-size:.62rem;color:var(--t2);">${x.datumUlozeni||''}</p></div>
                <button class="btnx" onclick="event.stopPropagation(); window.smazat('${x.id}')">✕</button>
            </div>
            <div class="pr"><span class="chip ${x.verejny?'ci':'cm'}">${x.verejny?'Veřejný':'Soukromý'}</span><button class="btn bgh" style="padding:4px 11px;font-size:.7rem;border-radius:8px;" onclick="event.stopPropagation();prepnoutSoukromi('${x.id}',${!x.verejny})">Změnit</button></div>
            <div class="sr"><div><span class="sl">Hodnocení</span><div>${sh}</div></div><div style="text-align:right;"><span class="sl">Komentáře</span><span class="sv">${x.komentare?.length||0}</span></div></div>
            ${fh}
            <div class="ar">${ab}<button class="btn bg bi" onclick="event.stopPropagation();sdiletVylet('${x.id}','${x.lokace}')" style="border-radius:10px; font-size:0.75rem;" title="Sdílet s přáteli"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg></button><button class="btn bg bi" onclick="event.stopPropagation();otevritGoogleMaps('${x.id}')" style="border-radius:10px; font-size:0.75rem;">Mapa</button><button class="btn ${x.dokonceno?'bgh':'bp'}" style="flex:1;font-size:.8rem;border-radius:10px;" onclick="event.stopPropagation();prepnoutStav('${x.id}',${!x.dokonceno})">${x.dokonceno?'Zrušit':'Splněno'}</button></div>`;
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

function otevritDetailVyletu(v){curOpenTripId=v.id;document.getElementById('resTitle').innerText=v.lokace;document.getElementById('resDiffText').innerText='Uloženo: '+(v.datumUlozeni||'');document.getElementById('btnSaveAI').style.display='none';document.getElementById('resBody').innerHTML=v.popis;vykresliHvezdicky(v.id,v.hodnoceni||0);vykresliKomentare(v.komentare||[]);curDraft=v;document.getElementById('resCard').style.display='block';window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});}
function vykresliHvezdicky(id,h){document.getElementById('resTopRating').innerHTML=Array.from({length:5},(_,i)=>`<span class="star${i<h?' lit':''}" onclick="ohodnotitVylet('${id}',${i+1})">★</span>`).join('');}
async function ohodnotitVylet(id,h){await fetch('/api/upravit-vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,hodnoceni:h})});vykresliHvezdicky(id,h);nactiDnik();}

function vykresliKomentare(k){
    document.getElementById('commentsSection').style.display='block';
    const l=document.getElementById('commentsList');
    if(!k.length){l.innerHTML=`<p style="color:var(--t2);font-size:.85rem;text-align:center;padding:20px;">Zatím žádné komentáře.</p>`;return;}
    l.innerHTML=k.map(c=>{
        const av=c.avatar?`background-image:url(${c.avatar});color:transparent;`:'';
        const io=prihlaseno&&mujProfil&&(c.autorId===mujProfil._id||mujProfil.isAdmin);
        const ak=io?`<div style="display:flex;gap:5px;"><button class="btn bgh bi" style="width:26px;height:26px;border-radius:6px;font-size:.75rem;" onclick="upravitKomentar('${c.id}','${encodeURIComponent(c.text)}')">Upravit</button><button class="btn bgh bi" style="width:26px;height:26px;border-radius:6px;font-size:.75rem;" onclick="smazatKomentar('${c.id}')">Smazat</button></div>`:'';
        return `<div class="ci2"><div class="av" style="${av};width:34px;height:34px;font-size:.78rem;">${c.autor?.charAt(0).toUpperCase()||'U'}</div><div style="flex:1;"><div class="cm2"><div><span class="cn">${c.autor}</span><span class="cd" style="margin-left:8px;">${c.datum}</span></div>${ak}</div><p class="ct">${c.text}</p></div></div>`;
    }).join('');
}

async function odeslatKomentar(){if(!prihlaseno)return alert('Pro komentování se prosím přihlaste.');if(!curOpenTripId)return;const t=document.getElementById('newCommentText').value.trim();if(!t)return;document.getElementById('newCommentText').value='';await fetch('/api/pridat-komentar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idVyletu:curOpenTripId,text:t})});const v=await(await fetch('/api/ulozene-vylety')).json();vykresliKomentare(v.find(x=>x.id===curOpenTripId)?.komentare||[]);nactiDnik();}
async function smazatKomentar(cid){if(!confirm('Smazat komentář?'))return;await fetch('/api/smazat-komentar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tripId:curOpenTripId,commentId:cid})});const v=await(await fetch('/api/ulozene-vylety')).json();vykresliKomentare(v.find(x=>x.id===curOpenTripId)?.komentare||[]);}
async function upravitKomentar(cid,enc){const s=decodeURIComponent(enc),n=prompt('Upravit komentář:',s);if(n&&n.trim()&&n!==s){await fetch('/api/upravit-komentar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tripId:curOpenTripId,commentId:cid,text:n})});const v=await(await fetch('/api/ulozene-vylety')).json();vykresliKomentare(v.find(x=>x.id===curOpenTripId)?.komentare||[]);}}

function nactiFotkyDoFeedu(i){const p=document.getElementById('feedPhotoPreview');p.innerHTML='';pripraveneFotky=[];Array.from(i.files).slice(0,4).forEach(f=>{const r=new FileReader();r.onloadend=()=>{pripraveneFotky.push(r.result);p.innerHTML+=`<img src="${r.result}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;border:1px solid var(--gbd);">`;};r.readAsDataURL(f);});}
async function odeslatDoFeedu(){if(!prihlaseno)return alert('Pro publikování se prosím přihlaste.');const t=document.getElementById('feedText').value.trim();if(!t&&!pripraveneFotky.length)return alert('Příspěvek nemůže být prázdný.');const sel=document.getElementById('feedTripSelect'),btn=document.getElementById('btnOdeslatFeed');btn.innerHTML='<div class="spin"></div>';await fetch('/api/pridat-do-feedu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t,fotky:pripraveneFotky,pripojenyVyletId:sel.value,pripojenyVyletLokace:sel.value?sel.options[sel.selectedIndex].text:null})});document.getElementById('feedText').value='';document.getElementById('feedPhotoPreview').innerHTML='';pripraveneFotky=[];btn.innerText='Publikovat v komunitě';nactiFeed();}

async function nactiFeed(){
    const f=await(await fetch('/api/feed')).json();const c=document.getElementById('feedStream');
    if(!f.length){c.innerHTML=`<div class="es"><p style="font-size:.88rem;">Komunita je zatím prázdná. Buďte první, kdo sdílí svůj výlet!</p></div>`;return;}
    c.innerHTML=f.map((p,i)=>{
        const av=p.autorAvatar?`background-image:url(${p.autorAvatar});color:transparent;`:'';
        const fh=p.fotky?.length?`<div class="ps" style="margin-bottom:10px;">${p.fotky.map(img=>`<img src="${img}" class="pt2" style="width:110px;height:80px;" onclick="openGallery('${img}')">`).join('')}</div>`:'';
        const th=p.pripojenyVyletId?`<div class="lt"><div><p class="ll">Sdílený výlet</p><p class="ln">${p.pripojenyVyletLokace}</p></div><button class="btn bp" style="font-size:.76rem;padding:7px 13px;" onclick="otevritGoogleMaps('${p.pripojenyVyletId}')">Mapa</button></div>`:'';
        const io=prihlaseno&&mujProfil&&(p.autorId===mujProfil._id||mujProfil.isAdmin);
        const ak=io?`<div style="display:flex;gap:5px;"><button class="btn bgh bi" style="width:auto;padding:0 8px;border-radius:8px;font-size:.75rem;" onclick="upravitFeed('${p._id}','${encodeURIComponent(p.text)}')">Upravit</button><button class="btn bgh bi" style="width:auto;padding:0 8px;border-radius:8px;font-size:.75rem;" onclick="smazatFeed('${p._id}')">Smazat</button></div>`:'';
        return `<div class="fp" style="animation-delay:${i*.06}s;"><div class="ph"><div class="pa"><div class="av" style="${av}">${p.autorJmeno?.charAt(0).toUpperCase()||'U'}</div><div><p class="an">${p.autorJmeno}</p><p class="pd">${p.datum}</p></div></div>${ak}</div><p class="pt">${p.text}</p>${fh}${th}</div>`;
    }).join('');
}

async function smazatFeed(id){if(confirm('Opravdu chcete příspěvek smazat?')){await fetch(`/api/smazat-feed/${id}`,{method:'DELETE'});nactiFeed();}}
async function upravitFeed(id,enc){const s=decodeURIComponent(enc),n=prompt('Upravit příspěvek:',s);if(n&&n.trim()&&n!==s){await fetch('/api/upravit-feed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:id,text:n})});nactiFeed();}}

async function generovat(){
    if(!prihlaseno)return alert('Pro plánování výletů se prosím přihlaste.');
    const misto=document.getElementById('mistoIn').value.trim();if(!misto)return alert('Zadejte prosím destinaci.');
    const filtry=Array.from(document.querySelectorAll('.ai-filter:checked')).map(c=>c.value);
    const btn=document.getElementById('genBtn');btn.innerHTML='<div class="spin"></div> Zpracovávám…';btn.disabled=true;
    try{
        const res=await(await fetch('/api/vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({misto,specifikace:document.getElementById('specIn').value,vybraneFiltry:filtry})})).json();
        if(res.uspech){
            curDraft=res.data;curOpenTripId=null;
            document.getElementById('resTitle').innerText=curDraft.lokace;
            document.getElementById('resDiffText').innerText='AI Koncept — Náročnost '+(curDraft.obtiznost||2);
            document.getElementById('resTopRating').innerHTML='<span style="font-family:var(--fm);font-size:.65rem;color:var(--t2);">Pro hodnocení nejprve uložte</span>';
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
            
            // BEZPEČNÉ SKRYTÍ TLAČÍTKA SDÍLENÍ
            const shareBtn = document.getElementById('btnShareTrip');
            if(shareBtn) shareBtn.style.display = 'none';
            
            document.getElementById('resCard').style.display='block';
            window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});
        }else alert('Chyba: '+(res.chyba||'Neznámý problém při komunikaci s AI.'));
    }catch(e){alert('Chyba spojení: '+e.message);}
    btn.innerHTML='Sestavit itinerář AI';btn.disabled=false;
}

async function ulozitNovyAI(){if(!curDraft)return;await fetch('/api/ulozit-vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lokace:curDraft.lokace,popis:document.getElementById('resBody').innerHTML,obtiznost:curDraft.obtiznost,typ:'ai',etapy:curDraft.etapy})});document.getElementById('resCard').style.display='none';nactiDnik();alert('Itinerář byl úspěšně uložen do deníku.');}

function pridatEtapu(){const d=document.createElement('div');d.className='man-etapa';d.style.cssText='display:flex;gap:7px;margin-bottom:7px;align-items:center;';d.innerHTML=`<input type="time" class="f e-cas" style="width:108px;margin:0;" value="12:00"><input type="text" class="f e-misto" placeholder="Místo" style="flex:1;margin:0;"><input type="text" class="f e-popis" placeholder="Popis" style="flex:2;margin:0;"><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--t2);font-size:1rem;">✕</button>`;document.getElementById('manEtapy').appendChild(d);}
async function ulozitVlastni(){const l=document.getElementById('manLokace').value.trim();if(!l)return alert('Zadejte název výletu.');const etapyEls=Array.from(document.querySelectorAll('.man-etapa'));let h='<div class="tl">';etapyEls.forEach((e,i)=>{const isLast=i===etapyEls.length-1;h+=`<div class="tr"><div class="t-left"><div class="td">${String(i+1).padStart(2,'0')}</div><div class="tt">${e.querySelector('.e-cas').value}</div></div><div class="tc"><h4>${e.querySelector('.e-misto').value}</h4><p>${e.querySelector('.e-popis').value}</p></div></div>`;if(!isLast)h+=`<div class="tr-line"></div>`;});h+='</div>';await fetch('/api/ulozit-vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lokace:l,popis:h,obtiznost:parseInt(document.getElementById('manObtiznost').value),typ:'vlastni',etapy:[]})});document.getElementById('manualModal').style.display='none';nactiDnik();}
// NATIVNÍ SDÍLENÍ (Nyní odkazuje na konkrétní výlet)
async function sdiletVylet(id, lokace) {
    const shareData = {
        title: `Výlet: ${lokace} | VERONA`,
        text: `Koukni na můj výlet "${lokace}" v aplikaci VERONA! 🌍\nPlánuj cesty s umělou inteligencí a objevuj nová místa.`,
        url: window.location.origin + '/?vylet=' + id
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
            alert('Text a odkaz zkopírován do schránky! Můžete ho vložit do zprávy.');
        }
    } catch (err) {
        console.log('Sdílení bylo zrušeno nebo selhalo.');
    }
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
            detailniPopis += `🕒 ${e.cas} — ${e.misto}\n📝 ${e.popis}\n\n`;
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

async function odeslatKontaktV2(){const pe=document.getElementById('kontaktPredmet'),ze=document.getElementById('kontaktZprava');if(!pe.value||!ze.value)return alert('Vyplňte prosím všechna pole.');const btn=event.target,orig=btn.innerText;btn.innerHTML='<div class="spin" style="margin:0 auto"></div>';btn.disabled=true;try{const r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:'c8ed8521-b2ea-4c17-ad1a-2379968a739e',subject:`VERONA: ${pe.value}`,from_name:'Uživatel VERONA',message:ze.value})});const res=await r.json();if(res.success){alert('Vaše zpráva byla úspěšně odeslána. Děkujeme.');document.getElementById('contactWin').style.display='none';pe.value='';ze.value='';}else alert('Došlo k chybě: '+res.message);}catch(e){alert('Chyba při komunikaci se serverem.');}btn.innerText=orig;btn.disabled=false;}
// 1. UPRAVENÁ FUNKCE PRO DETAIL - Zavolá kreslení mapy
function otevritDetailVyletu(v){
    curOpenTripId=v.id;
    
    // BEZPEČNÉ ZOBRAZENÍ TLAČÍTKA SDÍLENÍ
    const shareBtn = document.getElementById('btnShareTrip');
    if(shareBtn) shareBtn.style.display = 'inline-flex';
    
    document.getElementById('resTitle').innerText=v.lokace;
    document.getElementById('resDiffText').innerText='Uloženo: '+(v.datumUlozeni||'');
    document.getElementById('btnSaveAI').style.display='none';
    document.getElementById('resBody').innerHTML=v.popis;
    vykresliHvezdicky(v.id,v.hodnoceni||0);
    vykresliKomentare(v.komentare||[]);
    curDraft=v;
    document.getElementById('resCard').style.display='block';
    window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});
    
    // Novinka: Nakreslí trasu!
    vykresliTrasuNaMape(v);
}

// 2. ZCELA NOVÁ FUNKCE - Kreslí polyline trasu na mapu
function vykresliTrasuNaMape(v) {
    if (!mainMap) return;
    if (curPolyline) { mainMap.removeLayer(curPolyline); curPolyline = null; } // Smaže předchozí trasu
    
    const pts = [];
    if (v.etapy && v.etapy.length > 0) {
        v.etapy.forEach(e => {
            if (e.lat && e.lng) pts.push([e.lat, e.lng]);
        });
    }
    
    if (pts.length > 1) {
        // Vykreslí fialovou, přerušovanou, tlustou čáru
        curPolyline = L.polyline(pts, {color: '#6366f1', weight: 4, opacity: 0.9, dashArray: '8, 8'}).addTo(mainMap);
        // Odzoomuje mapu tak, aby byla vidět celá trasa
        mainMap.fitBounds(curPolyline.getBounds(), {padding: [40, 40]});
    } else if (pts.length === 1) {
        mainMap.setView(pts[0], 12);
    }
}

// 3. UPRAVENÝ FEED - Dělá jména a avatary klikací
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

        const av=p.autorAvatar?`background-image:url(${p.autorAvatar});color:transparent;`:'';
        const fh=p.fotky?.length?`<div class="ps" style="margin-bottom:10px;">${p.fotky.map(img=>`<img src="${img}" class="pt2" style="width:110px;height:80px;" onclick="openGallery('${img}')">`).join('')}</div>`:'';
        const th=p.pripojenyVyletId?`<div class="lt"><div><p class="ll">Sdílený výlet</p><p class="ln">${p.pripojenyVyletLokace}</p></div><button class="btn bp" style="font-size:.76rem;padding:7px 13px;" onclick="otevritGoogleMaps('${p.pripojenyVyletId}')">Mapa</button></div>`:'';
        const ak=isMine||(prihlaseno&&mujProfil&&mujProfil.isAdmin)?`<div style="display:flex;gap:5px;"><button class="btn bgh bi" style="width:auto;padding:0 8px;border-radius:8px;font-size:.75rem;" onclick="upravitFeed('${p._id}','${encodeURIComponent(p.text)}')">Upravit</button><button class="btn bgh bi" style="width:auto;padding:0 8px;border-radius:8px;font-size:.75rem;" onclick="smazatFeed('${p._id}')">Smazat</button></div>`:'';
        
        return `<div class="fp" style="max-width:85%; ${chatStyle} animation-delay:${i*.06}s;">
            <div class="ph"><div class="pa" style="cursor:pointer;" onclick="otevritVerejnyProfil('${p.autorId}')" title="Zobrazit profil"><div class="av" style="${av}">${p.autorJmeno?.charAt(0).toUpperCase()||'U'}</div><div><p class="an" style="transition:color .2s;" onmouseover="this.style.color='var(--a1)'" onmouseout="this.style.color='currentColor'">${p.autorJmeno}</p><p class="pd">${p.datum}</p></div></div>${ak}</div>
            <p class="pt">${p.text}</p>${fh}${th}
        </div>`;
    }).join('');
}

// 4. ZCELA NOVÉ FUNKCE PRO VEŘEJNÉ PROFILY
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
// AKTUALIZOVANÁ FUNKCE PRO PŘEPÍNÁNÍ TABŮ (Nyní zná záložku 'akce')
function prepniTab(tab, updateUrl = true){
    ['landing', 'planovac', 'verejne', 'akce', 'komunita'].forEach(t=>{
        const btn = document.getElementById(`t-${t}`);
        if(btn) btn.classList.remove('active');
        const m = document.getElementById(`mt-${t}`);
        if(m) m.classList.remove('active');
        
        const viewId = t === 'landing' ? 'viewLanding' : t === 'planovac' ? 'viewPlanovac' : t === 'verejne' ? 'viewVerejne' : t === 'akce' ? 'viewAkce' : 'viewKomunita';
        const view = document.getElementById(viewId);
        if(view) view.classList.add('hidden');
    });
    
    if (tab !== 'landing' || prihlaseno) {
        const activeBtn = document.getElementById(`t-${tab}`);
        if(activeBtn) activeBtn.classList.add('active');
        const activeM = document.getElementById(`mt-${tab}`);
        if(activeM) activeM.classList.add('active');
    }
    
    const activeViewId = tab === 'landing' ? 'viewLanding' : tab === 'planovac' ? 'viewPlanovac' : tab === 'verejne' ? 'viewVerejne' : tab === 'akce' ? 'viewAkce' : 'viewKomunita';
    const activeView = document.getElementById(activeViewId);
    if(activeView) activeView.classList.remove('hidden');
    
    if(tab==='planovac'&&mainMap)setTimeout(()=>mainMap.invalidateSize(),200);

    if (updateUrl) {
        history.pushState(null, '', tab === 'landing' ? '/' : '#' + tab);
    }
}

// Podpora pro tlačítko "Zpět"
window.addEventListener('popstate', () => {
    if (!prihlaseno) return;
    const hash = window.location.hash.replace('#', '');
    prepniTab(['komunita', 'planovac', 'verejne', 'akce'].includes(hash) ? hash : 'landing', false);
});

// VYKRESLENÍ AKCÍ (S perfektně vycentrovanými SVG ikonami)
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
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block; margin-top:-1px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span style="display:block; transform:translateY(1px);">${x.datum}</span>
                    </div>
                    
                    <div style="color:var(--t1); font-weight:600; font-size:.85rem; display:flex; align-items:center; gap:6px; line-height:1;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--a3)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span style="display:block; transform:translateY(1px);">${x.misto}</span>
                    </div>
                </div>
                <p style="font-size:.85rem; color:var(--t2); margin-bottom:18px; line-height:1.6;">${x.popis}</p>
                
                <a href="${x.vstupenkyUrl}" target="_blank" class="btn bp bf" style="text-decoration:none; margin-top:auto; display:flex; align-items:center; justify-content:center; gap:8px; line-height:1; padding:12px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block; margin-top:-1px;"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V6z"></path><line x1="9" y1="8" x2="15" y2="8"></line><line x1="9" y1="16" x2="15" y2="16"></line></svg>
                    <span style="display:block; transform:translateY(1px);">Koupit vstupenky</span>
                </a>
            </div>
        </div>
    `).join('');
}

// Nezapomeň přidat `await nactiAkce();` do funkce init() hned vedle `await nactiVerejneVylety();`!
function prihlasitNewsletter() {
    const btn = document.getElementById('btnNews');
    btn.innerHTML = '✓ Jste na seznamu!';
    btn.style.background = 'var(--a4)'; 
    localStorage.setItem('verona_news', '1'); 
    setTimeout(() => { document.getElementById('newsletterModal').style.display='none'; }, 2000);
}
let mujChart = null; // Proměnná pro uchování grafu, aby se nenačítal přes sebe

async function otevritMujProfil() {
    // 1. Zobrazíme okno
    document.getElementById('profileModal').style.display = 'flex';
    
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


// ✏️ FUNKCE PRO ÚPRAVU VÝLETU (Edit-in-place)
let isEditingTrip = false;
async function toggleEditTrip() {
    const btn = document.getElementById('btnEditTrip');
    const title = document.getElementById('resTitle');
    const body = document.getElementById('resBody');
    
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
        // VYPNUTÍ A ULOŽENÍ ÚPRAV
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
