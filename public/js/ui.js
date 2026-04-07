// ui.js - Utility a UI elementy
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
    const shareBtn = document.getElementById('btnAchShare');
    if (shareBtn) shareBtn.style.display = allowShare ? 'inline-flex' : 'none';
    
    document.getElementById('achievementModal').style.display = 'flex';
    console.log("Achievement UNLOCKED:", ach.nazev);
}
function openGallery(s){document.getElementById('lightboxImg').src=s;document.getElementById('lightbox').style.display='flex';}
async function odeslatKontaktV2(){const pe=document.getElementById('kontaktPredmet'),ze=document.getElementById('kontaktZprava');if(!pe.value||!ze.value)return alert('VyplĹte prosím všechna pole.');const btn=event.target,orig=btn.innerText;btn.innerHTML='<div class="spin" style="margin:0 auto"></div>';btn.disabled=true;try{const r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:'c8ed8521-b2ea-4c17-ad1a-2379968a739e',subject:`VERONA: ${pe.value}`,from_name:'Uživatel VERONA',message:ze.value})});const res=await r.json();if(res.success){alert('Vaše zpráva byla úspěšně odeslána. Děkujeme.');document.getElementById('contactWin').style.display='none';pe.value='';ze.value='';}else alert('Došlo k chybě: '+res.message);}catch(e){alert('Chyba při komunikaci se serverem.');}btn.innerText=orig;btn.disabled=false;}
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
    if(tab==='planovac'){ nactiDnik(); }
    if(tab==='verejne'){ nactiExplore(); }
    if(tab==='komunita'){ nactiFeed(); vykreslitFriendHub(); }
    if(tab==='profil'){ nactiMujProfil(); }

    if(updateUrl) history.pushState({tab}, '', `?v=${tab}`);
    window.scrollTo(0, 0);
    setTimeout(aktualizujIndikator, 50);
}
function prihlasitNewsletter() {
    const btn = document.getElementById('btnNews');
    btn.innerHTML = '✅ Jste na seznamu!';
    btn.style.background = 'var(--a4)'; 
    localStorage.setItem('verona_news', '1'); 
    setTimeout(() => { document.getElementById('newsletterModal').style.display='none'; }, 2000);
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
