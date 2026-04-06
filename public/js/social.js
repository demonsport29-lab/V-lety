// social.js - Chat, Feed a Přátelé
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
function zmenitAvatar(){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=e=>{const r=new FileReader();r.onloadend=()=>{mujProfil.avatar=r.result;document.getElementById('profAvatar').style.backgroundImage=`url(${r.result})`;document.getElementById('profAvatar').innerText='';};r.readAsDataURL(e.target.files[0]);};i.click();}
async function ulozitProfil(){await fetch('/api/ulozit-profil',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prezdivka:document.getElementById('profPrezdivka').value,vek:document.getElementById('profVek').value,telefon:document.getElementById('profTelefon').value,bio:document.getElementById('profBio').value,avatar:mujProfil.avatar||''})});document.getElementById('profileModal').style.display='none';alert('Profil uložen!');location.reload();}
