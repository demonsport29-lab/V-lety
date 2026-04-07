// app.js - Inicializace a hlavní parametry
let curDraft=null,curOpenTripId=null,prihlaseno=false,mujProfil=null,pripraveneFotky=[],lastSocNeprecteno=0,vListBackup=[];
window.curDraft=curDraft; window.curOpenTripId=curOpenTripId; window.prihlaseno=prihlaseno; window.mujProfil=mujProfil; window.pripraveneFotky=pripraveneFotky; window.lastSocNeprecteno=lastSocNeprecteno; window.vListBackup=vListBackup;

// --- Produkční error logging ---
window.addEventListener("unhandledrejection", function(e) {
    console.error("[Verona] Neošetřená chyba:", e.reason);
});
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
async function poslatPrispevek(){document.getElementById('btnKoupit').innerHTML='<div class="spin" style="margin:0 auto"></div>';try{const d=await(await fetch('/api/vytvorit-platbu',{method:'POST'})).json();if(d.url)window.location.href=d.url;}catch(e){document.getElementById('btnKoupit').innerText='Zkusit znovu';}}
// Podpora pro tlačítko "Zpět" — funguje i pro hosty
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('v');
    const validni = ['komunita', 'planovac', 'verejne', 'akce', 'landing'];
    prepniTab(validni.includes(tab) ? tab : 'landing', false);
});
window.onload=init;
// Registrace Service Workeru pro PWA (Android instalace)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW chyba:', err));
    });
}

// Připojení věcí na window objekt
window.vyzadujePrihlaseni = vyzadujePrihlaseni;
window.init = init;
window.toggleContact = toggleContact;
window.toggleProfileDropdown = toggleProfileDropdown;
window.prepniRezim = prepniRezim;
window.zmenitAvatar = zmenitAvatar;
window.poslatPrispevek = poslatPrispevek;
window.nactiDnik = nactiDnik;
window.ulozitProfil = ulozitProfil;
window.smazat = window.smazat; // Většina je už jako window.neco
window.hodnoceniVyletu = hodnoceniVyletu;
window.vykresliHvezdicky = vykresliHvezdicky;
window.vykresliKomentare = vykresliKomentare;
window.odeslatKomentar = odeslatKomentar;
window.smazatKomentar = smazatKomentar;
window.upravitKomentar = upravitKomentar;
window.nactiFotkyDoFeedu = nactiFotkyDoFeedu;
window.odeslatDoFeedu = odeslatDoFeedu;
window.nactiFeed = nactiFeed;
window.smazatFeed = smazatFeed;
window.upravitFeed = upravitFeed;
window.generovat = generovat;
window.ulozitNovyAI = ulozitNovyAI;
window.ukazAchievementModal = ukazAchievementModal;
window.pridatEtapu = pridatEtapu;
window.ulozitVlastni = ulozitVlastni;
window.sdiletVylet = sdiletVylet;
window.otevritGoogleMaps = otevritGoogleMaps;
window.openGallery = openGallery;
window.doKalendare = doKalendare;
window.odeslatKontaktV2 = odeslatKontaktV2;
window.otevritDetailVyletu = otevritDetailVyletu;
window.zpracovatGPX = zpracovatGPX;
window.toggleLike = toggleLike;
window.otevritVerejnyProfil = otevritVerejnyProfil;
window.pridatOdebratPritele = pridatOdebratPritele;
window.nactiChat = nactiChat;
window.poslatZpravu = poslatZpravu;
window.prepnoutSoukromi = prepnoutSoukromi;
window.prepnoutStav = prepnoutStav;
window.vykreslitFriendHub = vykreslitFriendHub;
window.prepniTab = prepniTab;
window.nactiExplore = nactiExplore;
window.otevritDetailVyletuJSON = otevritDetailVyletuJSON;
window.nactiMujProfil = nactiMujProfil;
window.nactiAkce = nactiAkce;
window.prihlasitNewsletter = prihlasitNewsletter;
window.otevritMujProfil = otevritMujProfil;
window.vykresliGraf = vykresliGraf;
window.vykresliMedaile = vykresliMedaile;
window.toggleEditTrip = toggleEditTrip;
window.spustitNotifikace = spustitNotifikace;
window.kontrolaNotifikaci = kontrolaNotifikaci;
window.ukazToast = ukazToast;
window.exportovatNaInstagram = exportovatNaInstagram;
window.renderovatAvatar = renderovatAvatar;
window.sdiletAchievementIG = sdiletAchievementIG;
window.nastavitAchievementProfilovku = nastavitAchievementProfilovku;
window.otevritSocialHub = otevritSocialHub;
window.prepniSocialTab = prepniSocialTab;
window.nactiKonverzace = nactiKonverzace;
window.nactiSeznamPratel = nactiSeznamPratel;
window.hledatPrateleGmail = hledatPrateleGmail;
window.pridatPriteleGmail = pridatPriteleGmail;
window.nactiActualFriends = nactiActualFriends;
window.pridatPritelePresKodSoc = pridatPritelePresKodSoc;
window.ukazatQR = ukazatQR;
window.toggleChatWidget = toggleChatWidget;
window.zavritAktivniChat = zavritAktivniChat;
window.toggleFriendSearch = toggleFriendSearch;
window.prepniCwTab = prepniCwTab;
window.nactiKonverzaceCw = nactiKonverzaceCw;
window.nactiPrateleCw = nactiPrateleCw;
