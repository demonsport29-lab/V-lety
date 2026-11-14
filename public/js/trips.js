// trips.js - Plánovač a výlety
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
        <div class="dc au"  onclick="otevritDetailVerejnehoVyletuZListu('${x.id}')">
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
    if (window.spustitAnimaciKaret) setTimeout(window.spustitAnimaciKaret, 50);
}
window.otevritDetailVerejnehoVyletuZListu = function(id) {
    const trip = window.verejneVyletyData.find(t => t.id === id);
    if (trip) {
        prepniTab('planovac');
        otevritDetailVyletu(trip);
    }

};
async function nactiDnik(){
    const v=await(await fetch('/api/ulozene-vylety')).json();
    vListBackup = v;
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
window.aktualizujObtiznostUI = function(val) {
    const lbl = document.getElementById('lblObtiznost');
    if (!lbl) return;
    const v = parseInt(val, 10) || 2;
    const map = {
        1: { text: '1 — Lehká', cls: 'diff-1' },
        2: { text: '2 — Střední', cls: 'diff-2' },
        3: { text: '3 — Náročná', cls: 'diff-3' }
    };
    lbl.innerText = map[v].text;
    lbl.className = `diff-badge ${map[v].cls}`;
};

async function normalizujNazevMesta(surovyVstup) {
    let text = surovyVstup.trim()
        .replace(/^(někde|někam|kdysi|přímo|asi|zhruba|okolo|kolem|poblíž|blízko|v okolí|do okolí|centrum|město|města)\s+/gi, '')
        .replace(/^(v|ve|do|z|ze|na|u|k|ke|po|o|od|před|za|nad|pod|mezi)\s+/gi, '')
        .trim();

    if (!text) text = surovyVstup.trim();

    // Vygenerujeme kandidáty pro přesné vyhledání (původní tvar + oříznutý český pád)
    const kandidati = [text];
    if (text.length > 4) {
        kandidati.push(text.replace(/(ách|ech|emi|ami|ovi|ích|ou|ům|ím|em|om|u|i|e|ě|y|a)$/i, ''));
    }

    for (const dotaz of kandidati) {
        if (dotaz.length < 2) continue;
        try {
            const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(dotaz)}&count=1&language=cs&format=json`);
            const data = await r.json();
            if (data.results && data.results.length > 0 && data.results[0].name) {
                return data.results[0].name;
            }
        } catch (e) {}
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatujMinutyNaCas(celkemMinut) {
    const m = ((celkemMinut % 1440) + 1440) % 1440;
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return `${hh}:${mm}`;
}

function parsujCasNaMinuty(casStr) {
    if (!casStr) return null;
    const match = String(casStr).match(/(\d{1,2})[:.](\d{2})/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function zajistiStartAHarmonogram(etapy, cistyStart, cistyCil, dopravy) {
    const seznam = Array.isArray(etapy) ? [...etapy] : [];
    const dopravaPopis = dopravy.length ? dopravy.join(', ') : 'dle zvolené dopravy';
    const startLower = cistyStart.toLowerCase();

    // 1. První zastávka musí vždy popisovat, odkud se pojede
    const prvniObsahujeStart = seznam.length > 0 && (
        (seznam[0].misto || '').toLowerCase().includes(startLower) ||
        (seznam[0].popis || '').toLowerCase().includes(`z ${startLower}`) ||
        (seznam[0].popis || '').toLowerCase().includes(`odjezd`)
    );

    if (!prvniObsahujeStart) {
        const casPrvniCile = seznam.length > 0 ? parsujCasNaMinuty(seznam[0].cas) : null;
        const vychoziOdjezdMin = (casPrvniCile !== null && casPrvniCile >= 540) ? casPrvniCile - 75 : 510; // 08:30
        seznam.unshift({
            cas: formatujMinutyNaCas(vychoziOdjezdMin),
            misto: `Odjezd: ${cistyStart}`,
            popis: `Výchozí bod cesty z města ${cistyStart} směrem do destinace ${cistyCil} (${dopravaPopis}).`
        });
    } else if (!seznam[0].misto.toLowerCase().startsWith('odjezd')) {
        seznam[0].misto = `Odjezd: ${cistyStart} (${seznam[0].misto})`;
    }

    // 2. Kontrola a srovnání realistického časového harmonogramu
    let predchoziMin = parsujCasNaMinuty(seznam[0].cas);
    if (predchoziMin === null) {
        predchoziMin = 510; // 08:30
        seznam[0].cas = formatujMinutyNaCas(predchoziMin);
    }

    for (let i = 1; i < seznam.length; i++) {
        let aktualniMin = parsujCasNaMinuty(seznam[i].cas);
        const minimalniRozestup = (i === 1) ? 60 : 50; // 1. přesun mezi městy min. 60 min, další zastávky min. 50 min

        if (aktualniMin === null || aktualniMin < predchoziMin + minimalniRozestup) {
            aktualniMin = predchoziMin + minimalniRozestup;
            seznam[i].cas = formatujMinutyNaCas(aktualniMin);
        }
        predchoziMin = aktualniMin;
    }

    return seznam;
}

async function generovat(){
    if(!prihlaseno)return alert('Pro plánování výletů se prosím přihlaste.');
    const startRaw=document.getElementById('startIn').value.trim();
    const cilRaw=document.getElementById('cilIn').value.trim();
    if(!startRaw || !cilRaw)return alert('Zadejte prosím odkud a kam chcete jet.');

    const btn=document.getElementById('genBtn');btn.innerHTML='<div class="spin"></div> Zpracov\xE1v\xE1m...';btn.disabled=true;

    // Přesné dohledání názvů měst (např. "někde v plzni" -> "Plzeň", výsledek "Praha - Plzeň")
    const [cistyStart, cistyCil] = await Promise.all([
        normalizujNazevMesta(startRaw),
        normalizujNazevMesta(cilRaw)
    ]);
    const misto = `${cistyStart} - ${cistyCil}`;

    const filtry=Array.from(document.querySelectorAll('.ai-filter:checked')).map(c=>c.value);
    const posuvnik = document.getElementById('inpLide');
    if(posuvnik) filtry.push(`Počet osob: ${posuvnik.value}`);
    const posuvnikZ = document.getElementById('inpZastavky');
    if(posuvnikZ) filtry.push(`Počet zastávek: ${posuvnikZ.value}`);

    const obtiznostVal = parseInt(document.getElementById('inpObtiznost')?.value || '2', 10);
    const obtiznostNazvy = { 1: 'Lehká', 2: 'Střední', 3: 'Náročná' };
    filtry.push(`Obtížnost cesty: ${obtiznostNazvy[obtiznostVal]}`);

    const uzivatelSpec = document.getElementById('specIn').value.trim();
    const instrukceProAI = `Pojmenuj výlet přesně "${misto}". První zastávka v harmonogramu musí být odjezd z místa "${cistyStart}" s popisem cesty do "${cistyCil}" a časy všech zastávek musí tvořit realistický chronologický harmonogram včetně doby přesunu.${uzivatelSpec ? ' Další přání: ' + uzivatelSpec : ''}`;

    try{
        const res=await(await fetch('/api/vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({misto,specifikace:instrukceProAI,obtiznost:obtiznostVal,vybraneFiltry:filtry})})).json();
        if(res.uspech){
            curDraft=res.data;curOpenTripId=null;
            curDraft.lokace = misto;
            curDraft.obtiznost = obtiznostVal;
            curDraft.pocetOsobRozpocet = parseInt(posuvnik?.value || '2', 10);

            const vybraneDopravy = Array.from(document.querySelectorAll('#w-doprava .ai-filter:checked')).map(c=>c.value);
            curDraft.etapy = zajistiStartAHarmonogram(curDraft.etapy, cistyStart, cistyCil, vybraneDopravy);

            document.getElementById('resTitle').innerText=curDraft.lokace;
            document.getElementById('resDiffText').innerText = `AI Koncept — Náročnost ${obtiznostVal} (${obtiznostNazvy[obtiznostVal]})`;

            // Render Widgetu Počasí
            nactiPocasiOpenMeteo(curDraft.lokace);
            
            document.getElementById('commentsSection').style.display='none';
            document.getElementById('btnSaveAI').style.display='inline-flex';
            
            // Tlačítka okamžitě viditelná po generování
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
            if (typeof vykreslitDopravu === 'function') vykreslitDopravu(curDraft);
            
            const shareBtn = document.getElementById('btnShareTrip');
            if(shareBtn) shareBtn.style.display = 'inline-flex';
            const qrBtn = document.getElementById('btnShowQR');
            if(qrBtn) qrBtn.style.display = 'inline-flex';
            
            document.getElementById('resCard').style.display='block';
            document.getElementById('budgetWidget').style.display='none';
            vykreslitRozpocet();
            window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});
        } else if (res.chyba === 'AI_OVERLOADED') {
            ukazToast('Přetížení AI', res.zprava);
        } else alert('Chyba: '+(res.chyba||'Neznámý problém při komunikaci s AI.'));
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
function pridatEtapu(){const d=document.createElement('div');d.className='man-etapa';d.style.cssText='display:flex;gap:7px;margin-bottom:7px;align-items:center;';d.innerHTML=`<input type="time" class="f e-cas" style="width:108px;margin:0;" value="12:00"><input type="text" class="f e-misto" placeholder="Místo" style="flex:1;margin:0;"><input type="text" class="f e-popis" placeholder="Popis" style="flex:2;margin:0;"><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--t2);font-size:1rem;">✕</button>`;document.getElementById('manEtapy').appendChild(d);}
async function ulozitVlastni(){const l=document.getElementById('manLokace').value.trim();if(!l)return alert('Zadejte název výletu.');const etapyEls=Array.from(document.querySelectorAll('.man-etapa'));let h='<div class="tl">';etapyEls.forEach((e,i)=>{const isLast=i===etapyEls.length-1;h+=`<div class="tr"><div class="t-left"><div class="td">${String(i+1).padStart(2,'0')}</div><div class="tt">${e.querySelector('.e-cas').value}</div></div><div class="tc"><h4>${e.querySelector('.e-misto').value}</h4><p>${e.querySelector('.e-popis').value}</p></div></div>`;if(!isLast)h+=`<div class="tr-line"></div>`;});h+='</div>';await fetch('/api/ulozit-vylet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lokace:l,popis:h,obtiznost:parseInt(document.getElementById('manObtiznost').value),typ:'vlastni',etapy:[]})});document.getElementById('manualModal').style.display='none';nactiDnik();}
// NATIVNÍ SDÍLENÍ (Nyní odkazuje na konkrétní výlet)

async function sdiletVylet(tripId, nazevVyletu) {
    if (!curDraft) return alert('Nejprve vygenerujte nebo otevřete výlet.');

    let aktivniId = tripId || curOpenTripId;

    if (!aktivniId && typeof ulozitVylet === 'function') {
        try {
            await ulozitVylet(true);
            aktivniId = curOpenTripId;
        } catch (e) {}
    }

    const kod = aktivniId
        ? `VRN-${String(aktivniId).slice(-6).toUpperCase()}`
        : `VRN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const sdileciUrl = `${window.location.origin}${window.location.pathname}?trip=${encodeURIComponent(aktivniId || kod)}`;
    curDraft.shareCode = kod;

    let modal = document.getElementById('shareCodeModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'shareCodeModal';
        modal.className = 'social-modal-backdrop';
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="social-modal-card" style="max-width:440px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <div>
                    <p class="ey" style="margin:0 0 4px 0;">Sdílení výletu</p>
                    <h3 style="margin:0; font-size:1.25rem;">${nazevVyletu || curDraft.lokace}</h3>
                </div>
                <button type="button" class="btnx" onclick="document.getElementById('shareCodeModal').style.display='none'">✕</button>
            </div>
            <p style="font-size:0.88rem; color:var(--t2); margin-bottom:14px;">Pošli tento kód nebo odkaz přátelům:</p>

            <div class="share-code-box">
                <span class="sl">Kód výletu</span>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:4px;">
                    <strong style="font-family:var(--fm); font-size:1.35rem; letter-spacing:0.08em; color:var(--a1);">${kod}</strong>
                    <button type="button" class="btn bp" onclick="kopirovatText('${kod}', 'Kód zkopírován')">Kopírovat kód</button>
                </div>
            </div>

            <div style="display:flex; gap:8px; margin-top:12px;">
                <input type="text" readonly class="f" value="${sdileciUrl}" style="margin:0; font-size:0.82rem;">
                <button type="button" class="btn bg" onclick="kopirovatText('${sdileciUrl}', 'Odkaz zkopírován')">Odkaz</button>
            </div>

            <button type="button" class="btn bp bf" style="margin-top:14px;" onclick="document.getElementById('shareCodeModal').style.display='none'; if(typeof sdiletVyletDoChatu==='function') sdiletVyletDoChatu('${(nazevVyletu || curDraft.lokace).replace(/'/g, '')}', '${kod}')">
                Poslat příteli do chatu
            </button>
        </div>
    `;
}

window.kopirovatText = function(text, hlaska) {
    navigator.clipboard.writeText(text).then(() => {
        if (typeof ukazToast === 'function') ukazToast('Hotovo', hlaska);
        else alert(hlaska);
    });
};
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
window.zmenitPocetOsobRozpocet = function(delta) {
    if (!curDraft) curDraft = {};
    const aktualni = curDraft.pocetOsobRozpocet || parseInt(document.getElementById('inpLide')?.value || '2', 10) || 2;
    curDraft.pocetOsobRozpocet = Math.max(1, Math.min(50, aktualni + delta));
    vykreslitRozpocet();
};

function vykreslitRozpocet() {
    const listEl = document.getElementById('budgetList');
    const splitEl = document.getElementById('budgetSplit');
    const totalEl = document.getElementById('budgetTotalVal');
    const peopleEl = document.getElementById('budgetPeopleCount');
    const perPersonEl = document.getElementById('budgetPerPersonVal');

    const polozky = (curDraft && Array.isArray(curDraft.rozpocet)) ? curDraft.rozpocet : [];
    let celkem = 0;
    const utratyLidi = {};

    polozky.forEach(v => {
        celkem += v.kolik;
        if (!utratyLidi[v.kdo]) utratyLidi[v.kdo] = 0;
        utratyLidi[v.kdo] += v.kolik;
    });

    const jmenaPlatcu = Object.keys(utratyLidi);
    const vychoziOsoby = parseInt(document.getElementById('inpLide')?.value || '2', 10) || 2;
    if (curDraft && !curDraft.pocetOsobRozpocet) {
        curDraft.pocetOsobRozpocet = Math.max(vychoziOsoby, jmenaPlatcu.length || 1);
    }
    const pocetOsob = Math.max((curDraft?.pocetOsobRozpocet || vychoziOsoby), jmenaPlatcu.length || 1);
    const naOsobu = pocetOsob > 0 ? Math.round(celkem / pocetOsob) : celkem;

    if (totalEl) totalEl.innerText = `${celkem.toLocaleString('cs-CZ')} Kč`;
    if (peopleEl) peopleEl.innerText = pocetOsob;
    if (perPersonEl) perPersonEl.innerText = `${naOsobu.toLocaleString('cs-CZ')} Kč`;

    if (polozky.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:18px; border:1px dashed var(--gbd2); border-radius:14px; color:var(--t2); font-size:0.86rem;">Zatím žádné výdaje. Přidejte první položku výše a celková částka se automaticky rozpočítá na osobu.</div>';
        if (splitEl) splitEl.innerHTML = '';
        return;
    }

    let html = `<p class="ey" style="margin-bottom:10px;">Položky výdajů (${polozky.length})</p><div style="display:flex; flex-direction:column; gap:8px;">`;
    polozky.forEach(v => {
        const iniciala = (v.kdo || '?').charAt(0).toUpperCase();
        html += `
        <div class="budget-item-row">
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="av" style="width:34px; height:34px; font-size:0.8rem;">${iniciala}</div>
                <div>
                    <div style="font-weight:700; font-size:0.92rem; color:var(--t1);">${v.zaCo}</div>
                    <div style="font-size:0.75rem; color:var(--t2);">Platil(a): <strong style="color:var(--a1);">${v.kdo}</strong></div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-weight:800; font-family:var(--fm); font-size:0.95rem; color:var(--t1);">${v.kolik.toLocaleString('cs-CZ')} Kč</span>
                <button type="button" class="btn bgh bi" style="width:30px; height:30px; border-radius:8px; border-color:rgba(239,68,68,0.25);" aria-label="Smazat výdaj" onclick="smazatVydaj('${v.id}')">
                    <span style="color:#ef4444; font-weight:bold; font-size:0.8rem;">✕</span>
                </button>
            </div>
        </div>`;
    });
    html += '</div>';
    listEl.innerHTML = html;

    if (!splitEl) return;

    // Rozpočítání mezi všechny účastníky (i když někteří nezadali žádný výdaj)
    const ucastnici = [...jmenaPlatcu];
    const chybejiciOsoby = pocetOsob - ucastnici.length;
    for (let k = 1; k <= chybejiciOsoby; k++) {
        const oznaceni = chybejiciOsoby === 1 ? 'Další účastník' : `Účastník #${ucastnici.length + 1}`;
        ucastnici.push(oznaceni);
        utratyLidi[oznaceni] = 0;
    }

    if (ucastnici.length <= 1) {
        splitEl.innerHTML = '';
        return;
    }

    const prumer = celkem / ucastnici.length;
    const bilance = ucastnici.map(osoba => ({ kdo: osoba, rozdil: utratyLidi[osoba] - prumer }));
    const dluznici = bilance.filter(b => b.rozdil < -0.5).sort((a, b) => a.rozdil - b.rozdil);
    const veritele = bilance.filter(b => b.rozdil > 0.5).sort((a, b) => b.rozdil - a.rozdil);

    let vyrovnaniHtml = `<p class="ey" style="margin-bottom:10px;">Vyrovnání mezi účastníky (${naOsobu.toLocaleString('cs-CZ')} Kč / osoba)</p><div style="display:flex; flex-direction:column; gap:8px;">`;
    let i = 0, j = 0;
    while (i < dluznici.length && j < veritele.length) {
        const dl = dluznici[i];
        const ve = veritele[j];
        const castka = Math.min(Math.abs(dl.rozdil), ve.rozdil);
        vyrovnaniHtml += `
        <div class="budget-settle-item">
            <span><strong style="color:#ef4444;">${dl.kdo}</strong> pošle <strong style="color:#10b981; font-family:var(--fm); font-size:1.02rem;">${Math.round(castka).toLocaleString('cs-CZ')} Kč</strong> → <strong style="color:var(--t1);">${ve.kdo}</strong></span>
        </div>`;
        dl.rozdil += castka;
        ve.rozdil -= castka;
        if (Math.abs(dl.rozdil) < 0.5) i++;
        if (ve.rozdil < 0.5) j++;
    }
    vyrovnaniHtml += `</div>`;
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
// 1. UPRAVENĂ  FUNKCE PRO DETAIL - Zavolá kreslení mapy
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

    nactiPocasiOpenMeteo(v.lokace);

    vykresliKomentare(v.komentare||[]);
    curDraft=v;

    // VYKRESLENÍ ZASTÁVEK (Oprava mizejících etap)
    let h='<div class="tl">';
    if (curDraft.etapy && curDraft.etapy.length > 0) {
        curDraft.etapy.forEach((e,i)=>{
            const isLast=i===curDraft.etapy.length-1;
            h+=`<div class="tr">`;
            h+=`<div class="t-left"><div class="td">${String(i+1).padStart(2,'0')}</div><div class="tt">${e.cas || ''}</div></div>`;
            h+=`<div class="tc"><h4 style="font-size:1.1rem; margin-bottom:4px; font-weight:800;">${e.misto}</h4><p style="color:var(--t2); line-height:1.5;">${e.popis}</p></div>`;
            h+=`</div>`;
            if(!isLast) h+=`<div class="tr-line"></div>`;
        });
    } else if (curDraft.popis) {
        h += curDraft.popis; // Záloha
    }
    h+='</div>';
    if(curDraft.doporuceni) h+=`<div class="ait" style="margin-top:20px; padding:16px; background:rgba(255,255,255,0.05); border-radius:16px; border:1px solid rgba(255,255,255,0.1);"><span style="color:#0071e3; font-weight:900; margin-right:8px;">💡 Tip architekta:</span><span>${curDraft.doporuceni}</span></div>`;
    
    document.getElementById('resBody').innerHTML = h;

    if (typeof nactiPocasiOpenMeteo === 'function' && curDraft.lokace) nactiPocasiOpenMeteo(curDraft.lokace);
    if (typeof vykreslitDopravu === 'function') vykreslitDopravu(curDraft);
    document.getElementById('resCard').style.display='block';
    document.getElementById('budgetWidget').style.display='none';
    vykreslitRozpocet();
    window.scrollTo({top:document.getElementById('resCard').offsetTop-80,behavior:'smooth'});
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
                
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: auto; padding-top: 15px;">
                    
                    ${x.odkazSpoj ? `
                    <div style="background: linear-gradient(145deg, #1c1c1e, #060810); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 15px 35px rgba(0,0,0,0.5); margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="margin: 0 0 4px 0; font-size: 0.65rem; color: #86868b; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;">Doprava k výletu</p>
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 600; color: #f5f5f7;">${x.lokace || 'Cíl výletu'}</h3>
                        </div>
                        <a href="${x.odkazSpoj}" target="_blank" style="background: #0071e3; color: white; padding: 10px 18px; border-radius: 98px; font-weight: 600; text-decoration: none; font-size: 0.85rem; transition: transform 0.2s; white-space: nowrap; margin-left: 10px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            Zobrazit trasu
                        </a>
                    </div>` : ''}

                    ${x.odkazRegiojet ? `
                    <a href="${x.odkazRegiojet}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #FFD600; color: #000000; text-decoration: none; padding: 14px 20px; border-radius: 98px; font-weight: 700; font-size: 0.9rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        Najít spoj s RegioJet
                    </a>` : ''}

                    ${x.odkazLeo ? `
                    <a href="${x.odkazLeo}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #000000; border: 1px solid rgba(255,215,0,0.4); color: #FFD700; text-decoration: none; padding: 14px 20px; border-radius: 98px; font-weight: 700; font-size: 0.9rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        Koupit lístky s Leo Express
                    </a>` : ''}

                    ${(x.odkazListky || x.vstupenkyUrl) ? `
                    <a href="${x.odkazListky || x.vstupenkyUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 98px; font-weight: 600; font-size: 0.9rem; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12a1.5 1.5 0 0 1-1.5 1.5v3a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-3a1.5 1.5 0 0 1 0-3v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a1.5 1.5 0 0 1 1.5 1.5z"></path></svg>
                        Koupit lístky
                    </a>` : ''}

                </div>
            </div>
        </div>
    `).join('');
    if (window.spustitAnimaciKaret) setTimeout(window.spustitAnimaciKaret, 50);
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

window.nactiPocasiOpenMeteo = async function(nazevLokace) {
    const wBox = document.getElementById('resWeather');
    if (!wBox) return;
    wBox.style.display = 'none';
    if (!nazevLokace) return;

    try {
        const oddelovac = nazevLokace.includes('->') ? '->' : (nazevLokace.includes(' - ') ? ' - ' : null);
        const ciloveMisto = oddelovac ? nazevLokace.split(oddelovac).pop().trim() : nazevLokace.trim();
        const geoReq = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciloveMisto)}&count=1&language=cs&format=json`);
        const geoRes = await geoReq.json();
        
        if (geoRes.results && geoRes.results.length > 0) {
            const lat = geoRes.results[0].latitude;
            const lon = geoRes.results[0].longitude;
            
            const weatherReq = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const weatherRes = await weatherReq.json();
            
            if (weatherRes.current_weather) {
                const cw = weatherRes.current_weather;
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
                const wip = wmoKody[cw.weathercode] || {i:'ph-cloud-sun wa-float', t:'Neznámé'};

                wBox.innerHTML = `
                    <div style="display:flex; align-items:center; gap:16px; background:rgba(255,255,255,0.06); padding:12px 18px; border-radius:18px; border:1px solid rgba(255,255,255,0.1); width:max-content; margin-top:14px; box-shadow:0 8px 32px rgba(0,0,0,0.15);">
                        <i class="ph ${wip.i} wa" style="font-size:2.6rem; display:block;"></i>
                        <div>
                            <div style="font-size:1.6rem; font-weight:800; font-family:var(--fm); line-height:1; margin-bottom:4px;">${Math.round(cw.temperature)}°C</div>
                            <div style="font-size:0.75rem; color:var(--t2); font-weight:600;">${wip.t} &nbsp;&nbsp; Vítr ${Math.round(cw.windspeed)} km/h</div>
                        </div>
                    </div>`;
                wBox.style.display = 'block';
            }
        }
    } catch (err) {
        console.error('API Počasí selhalo a nezdařilo se načíst data přímo od klienta:', err);
    }
}



function vykreslitDopravu(draft) {
    const d = document.getElementById('resDoprava');
    if (!d) return;

    if (draft) {
        let start = 'Praha';
        let cil = draft.lokace || draft.mesto || 'Cíl výletu';

        const sep = draft.lokace?.includes('->') ? '->' : (draft.lokace?.includes(' - ') ? ' - ' : null);
        if (draft.lokace && sep) {
            const parts = draft.lokace.split(sep);
            start = parts[0].trim();
            cil = parts[1].trim();
        }

        if (draft.doprava && draft.doprava.z) start = draft.doprava.z;
        if (draft.doprava && draft.doprava.do) cil = draft.doprava.do;

        const vybraneDopravy = Array.from(document.querySelectorAll('.ai-filter:checked')).map(c => c.value);
        const jeAutobus = vybraneDopravy.includes('Doprava autobusem');
        const jeVlak = vybraneDopravy.includes('Doprava vlakem');
        const idosTyp = (jeAutobus && !jeVlak) ? 'autobusy' : (jeAutobus && jeVlak ? 'vlakyautobusymhdvse' : 'vlaky');

        const datum = (draft.doprava && draft.doprava.datumFormatovane) ? `&date=${draft.doprava.datumFormatovane}` : '';
        const idosLink = `https://idos.idnes.cz/${idosTyp}/spojeni/?f=${encodeURIComponent(start)}&t=${encodeURIComponent(cil)}${datum}`;

        d.innerHTML = `
            <div style="background: linear-gradient(145deg, #1c1c1e, #060810); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 15px 35px rgba(0,0,0,0.5); margin: 24px 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div>
                    <p style="margin: 0 0 4px 0; font-size: 0.65rem; color: #86868b; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;">Doporučený spoj</p>
                    <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600; color: #f5f5f7;">${start} <span style="color:#0071e3; margin:0 5px;">→</span> ${cil}</h3>
                </div>
                <a href="${idosLink}" target="_blank" style="background: #0071e3; color: white; padding: 10px 18px; border-radius: 98px; font-weight: 600; text-decoration: none; font-size: 0.85rem; transition: transform 0.2s; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6"/><path d="M4 15l2-2h12l2 2"/><path d="M6 13v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/></svg>
                    Najít spoj
                </a>
            </div>
        `;
        d.style.display = 'block';
    } else {
        d.style.display = 'none';
        d.innerHTML = '';
    }
}
