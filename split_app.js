const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'public', 'js', 'app.js');
const lines = fs.readFileSync(appPath, 'utf8').split('\n');

const getLines = (start, end) => lines.slice(start - 1, end).join('\n') + '\n';

const mapJs = 
`// map.js - Mapa a vykreslování
` + getLines(9, 37) + getLines(224, 242) + getLines(755, 781) + getLines(966, 993) + getLines(995, 1036);

const uiJs = 
`// ui.js - Utility a UI elementy
` + getLines(39, 39) + getLines(41, 61) + getLines(178, 178) + getLines(180, 194) + getLines(196, 211) + getLines(213, 218) + getLines(466, 476) + getLines(783, 783) + getLines(857, 857) + getLines(1360, 1386) + getLines(1543, 1549) + getLines(1770, 1860);

const socialJs = 
`// social.js - Chat, Feed a Přátelé
` + getLines(319, 340) + getLines(342, 348) + getLines(1038, 1092) + getLines(1094, 1226) + getLines(1228, 1282) + getLines(1322, 1358) + getLines(1433, 1490) + getLines(1550, 1624) + getLines(1924, 1944) + getLines(1946, 1976) + getLines(1978, 2086) + getLines(2138, 2266) + getLines(220, 221);

const tripsJs = 
`// trips.js - Plánovač a výlety
` + getLines(134, 167) + getLines(169, 176) + getLines(244, 277) + getLines(279, 307) + getLines(309, 317) + getLines(350, 442) + getLines(444, 464) + getLines(478, 479) + getLines(480, 494) + getLines(497, 503) + getLines(505, 546) + getLines(548, 565) + getLines(567, 651) + getLines(653, 686) + getLines(688, 746) + getLines(748, 754) + getLines(784, 855) + getLines(858, 939) + getLines(941, 963) + getLines(1284, 1320) + getLines(1388, 1431) + getLines(1501, 1540) + getLines(1626, 1698) + getLines(1701, 1761) + getLines(1861, 1922) + getLines(2090, 2137);

const appJs = 
`// app.js - Inicializace a hlavní parametry
let curDraft=null,curOpenTripId=null,prihlaseno=false,mainMap=null,markerCluster=null,mujProfil=null,pripraveneFotky=[],curPolyline=null,lastSocNeprecteno=0,vListBackup=[];
window.curDraft=curDraft; window.curOpenTripId=curOpenTripId; window.prihlaseno=prihlaseno; window.mainMap=mainMap; window.markerCluster=markerCluster; window.mujProfil=mujProfil; window.pripraveneFotky=pripraveneFotky; window.curPolyline=curPolyline; window.lastSocNeprecteno=lastSocNeprecteno; window.vListBackup=vListBackup;

` + getLines(2, 5) + getLines(63, 129) + getLines(222, 222) + getLines(1493, 1499) + getLines(1762, 1768) + 
`
// Připojení věcí na window objekt
window.vyzadujePrihlaseni = vyzadujePrihlaseni;
window.init = init;
window.toggleContact = toggleContact;
window.toggleProfileDropdown = toggleProfileDropdown;
window.prepniRezim = prepniRezim;
window.zmenitAvatar = zmenitAvatar;
window.poslatPrispevek = poslatPrispevek;
window.loadMapDependencies = loadMapDependencies;
window.aktualizovatMapu = aktualizovatMapu;
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
window.ulozitCiziVylet = ulozitCiziVylet;
window.vykresliTrasuNaMape = vykresliTrasuNaMape;
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
`;

fs.writeFileSync(path.join(__dirname, 'public', 'js', 'map.js'), mapJs);
fs.writeFileSync(path.join(__dirname, 'public', 'js', 'ui.js'), uiJs);
fs.writeFileSync(path.join(__dirname, 'public', 'js', 'social.js'), socialJs);
fs.writeFileSync(path.join(__dirname, 'public', 'js', 'trips.js'), tripsJs);
fs.writeFileSync(path.join(__dirname, 'public', 'js', 'app.js'), appJs);
console.log('Soubory úspěšně rozděleny.');
