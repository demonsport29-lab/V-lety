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
const lamp = document.getElementById('veronaLampScene');
            if(lamp) lamp.classList.add('light-on');

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
    const sdilenyId = urlParams.get('vylet') || urlParams.get('trip');
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
// FÁZE 1: MAGIC GLOW CARDS - Sledování pozice kurzoru
document.addEventListener('mousemove', function(e) {
    document.querySelectorAll('.glow-card').forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

if (typeof window.toggleBudgetWidget !== 'function') {
    window.toggleBudgetWidget = function() {
        const w = document.getElementById('budgetWidget');
        if (!w) return;
        const skryto = w.style.display === 'none' || !w.style.display;
        w.style.display = skryto ? 'flex' : 'none';
        if (skryto && typeof vykreslitRozpocet === 'function') vykreslitRozpocet();
    };
}

if (typeof window.toggleAcc !== 'function') {
    window.toggleAcc = function(accId, bodyId) {
        const acc = document.getElementById(accId);
        const body = document.getElementById(bodyId);
        if (!acc || !body) return;
        acc.classList.toggle('open');
        body.style.maxHeight = acc.classList.contains('open') ? '380px' : '0px';
    };
}
const VZOROVE_TRASY = [
    {
        id: 'demo-snezka',
        lokace: 'Sněžka přes Obří důl (Krkonoše)',
        doprava: 'Pěšky',
        vzdalenost: '14,2 km',
        cas: '5 hod 15 min',
        popis: 'Klasický horský výstup z Pece pod Sněžkou malebným Obřím dolem až na nejvyšší vrchol ČR (1 603 m n. m.) s návratem přes Růžohorky.',
        zastavky: [
            { nazev: 'Pec pod Sněžkou – Kaplička', popis: 'Start trasy, možnost ranní kávy a doplnění vody.', lat: 50.6934, lng: 15.7335 },
            { nazev: 'Bouda pod Sněžkou & Obří důl', popis: 'Výhledy na ledovcový kar a bývalou kovárnu.', lat: 50.7225, lng: 15.7311 },
            { nazev: 'Vrchol Sněžky (1 603 m)', popis: 'Poštovna Anežka, panoramatické výhledy do Polska i ČR.', lat: 50.7360, lng: 15.7398 },
            { nazev: 'Růžohorky', popis: 'Zastávka na oběd v horské boudě cestou dolů.', lat: 50.7138, lng: 15.7485 }
        ]
    },
    {
        id: 'demo-cesky-raj',
        lokace: 'Prachovské skály s dětmi (Český ráj)',
        doprava: 'Pěšky / Rodinný výlet',
        vzdalenost: '7,0 km',
        cas: '3 hod 30 min',
        popis: 'Nenáročný okruh mezi pískovcovými věžemi vhodný pro děti s vyhlídkami Českého ráje a zastávkou na oběd.',
        zastavky: [
            { nazev: 'Turistická chata Prachov', popis: 'Výchozí bod okruhu, občerstvení a dětské zázemí.', lat: 50.4675, lng: 15.2856 },
            { nazev: 'Vyhlídka Českého ráje', popis: 'Nejznámější pohled na skalní věže a Trosky v dálce.', lat: 50.4698, lng: 15.2812 },
            { nazev: 'Císařská chodba', popis: 'Chladná soutěska mezi vysokými pískovcovými stěnami.', lat: 50.4712, lng: 15.2839 }
        ]
    },
    {
        id: 'demo-sumava-pes',
        lokace: 'Povydří a Antýgl se psem (Šumava)',
        doprava: 'Pěšky se psem',
        vzdalenost: '11,0 km',
        cas: '3 hod 45 min',
        popis: 'Pohodová trasa podél balvanitého řečiště řeky Vydry bez prudkých stoupání, ideální pro výlet se psem.',
        zastavky: [
            { nazev: 'Antýgl – bývalý královácký dvorec', popis: 'Start trasy u soutoku Hamerského potoka a Vydry.', lat: 49.0558, lng: 13.5042 },
            { nazev: 'Turnerova chata', popis: 'Tradiční šumavská chata uprostřed lesů, venkovní posezení se psem.', lat: 49.0681, lng: 13.5015 },
            { nazev: 'Čeňkova Pila', popis: 'Soutok Vydry a Křemelné, možnost návratu autobusem nebo pěšky.', lat: 49.0928, lng: 13.4956 }
        ]
    }
];

window.nacistVzorovyVylet = function(index) {
    const trasa = VZOROVE_TRASY[index];
    if (!trasa) return;
    window.curDraft = trasa;
    if (typeof otevritDetailVyletu === 'function') {
        otevritDetailVyletu(trasa);
    }
};

window.spustitGenerovaniSDemem = async function() {
    const jePrihlasen = Boolean(typeof prihlaseno !== 'undefined' && prihlaseno);
    if (jePrihlasen) {
        if (typeof generovat === 'function') return generovat();
        return;
    }

    if (localStorage.getItem('verona_free_demo_used') === '1') {
        alert('Svůj 1 zkušební výlet bez registrace už máte vyčerpaný. Přihlaste se přes Google pro neomezené plánování a ukládání.');
        if (typeof vyzadujePrihlaseni === 'function') vyzadujePrihlaseni();
        return;
    }

    localStorage.setItem('verona_free_demo_used', '1');
    const hint = document.getElementById('demoQuotaHint');
    if (hint) hint.innerText = 'Zkušební výlet využit – pro trvalé uložení do deníku se přihlaste';

    if (typeof generovat === 'function') {
        await generovat(true);
        if (window.curDraft) {
            try { localStorage.setItem('verona_demo_trip', JSON.stringify(window.curDraft)); } catch (e) {}
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const jePrihlasen = Boolean(typeof prihlaseno !== 'undefined' && prihlaseno);
    if (!jePrihlasen) {
        try {
            const savedDemo = localStorage.getItem('verona_demo_trip');
            if (savedDemo && !window.curDraft) {
                const trip = JSON.parse(savedDemo);
                window.curDraft = trip;
                if (typeof otevritDetailVyletu === 'function') otevritDetailVyletu(trip);
            }
        } catch (e) {}
    }
});