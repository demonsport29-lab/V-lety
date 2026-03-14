
import os

file_path = r'd:\Výlety\public\js\app.js'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Header: 1 to 957 (0-indexed: 0 to 956)
header = lines[:956] # Includes line 956 which is 957 in view_file

# Footer: 1046 to end (0-indexed: 1045 to end)
footer = lines[1045:]

# My Fix (including the rest of vykreslitFriendHub and the others)
fix = """        hubCont.style.display = 'none';
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
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(header)
    f.write(fix)
    f.writelines(footer)

print("File reconstructed successfully.")
