const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vylet = require('../models/Vylet');
const FeedPost = require('../models/FeedPost');
const Komentar = require('../models/Komentar');
const Zprava = require('../models/Zprava');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Platby
router.post('/api/vytvorit-platbu', async (req, res) => {
    try { const session = await stripe.checkout.sessions.create({ payment_method_types: ['card'], line_items: [{ price_data: { currency: 'czk', product_data: { name: 'VERONA Premium' }, unit_amount: 9900 }, quantity: 1 }], mode: 'payment', success_url: `${req.headers.origin}/?platba=uspech`, cancel_url: `${req.headers.origin}/?platba=zrusena` }); res.json({ url: session.url }); } catch (e) { res.status(500).json({ chyba: e.message }); }
});

// Kontakt
router.post('/api/kontakt', async (req, res) => {
    const { predmet, zprava } = req.body;
    let odesilatel = "Neznámý uživatel";
    if (req.session.userId) {
        const user = await User.findById(req.session.userId);
        if (user) odesilatel = user.prezdivka || user.email;
    }
    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ access_key: process.env.WEB3FORMS_KEY, subject: `VERONA Kontakt: ${predmet}`, from_name: odesilatel, message: zprava })
        });
        const result = await response.json();
        if (result.success) res.json({ uspech: true }); else throw new Error(result.message || "Chyba API Web3Forms");
    } catch (error) { res.json({ uspech: false, chyba: error.message }); }
});

// Kalendář
router.post('/api/kalendar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: 'Nepřihlášen.' });
    try {
        const { lokace, popis, datum, mapaLink, startMisto } = req.body;
        if (!lokace || !datum) return res.json({ uspech: false, chyba: 'Chybí lokace nebo datum.' });
        const datumObj = new Date(datum);
        const start = datumObj.toISOString().split('T')[0];
        const end   = new Date(datumObj.getTime() + 86400000).toISOString().split('T')[0];
        const popisFull = mapaLink ? `${popis}\n\n📍 Odkaz na mapu a navigaci k trase:\n${mapaLink}` : popis;
        let gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('🗺 ' + lokace)}&dates=${start.replace(/-/g,'')}/${end.replace(/-/g,'')}&details=${encodeURIComponent(popisFull)}&sf=true`;
        if (startMisto) gcalUrl += `&location=${encodeURIComponent(startMisto)}`;
        res.json({ uspech: true, url: gcalUrl });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

// Veřejné profily a sdílení
router.get('/api/sdileny-vylet/:id', async (req, res) => {
    try {
        const vylet = await Vylet.findById(req.params.id);
        if (!vylet) return res.json({ uspech: false, chyba: 'Výlet se nenašel.' });
        if (!vylet.verejny) return res.json({ uspech: false, chyba: 'Výlet je soukromý.' });
        const autor = await User.findById(vylet.vlastnikId, 'prezdivka jmeno prijmeni avatar');
        const autorJmeno = autor ? (autor.prezdivka || `${autor.jmeno} ${autor.prijmeni}`) : 'Neznámý';
        
        const vsechnyKomentare = await Komentar.find({ vyletId: vylet._id });
        const komentare = vsechnyKomentare.map(k => ({
            id: k.oldId || k._id.toString(), autorId: k.autorId, autor: k.autor, avatar: k.avatar, text: k.text, datum: k.datum
        }));
        
        res.json({ uspech: true, data: { ...vylet._doc, id: vylet._id, komentare, autorJmeno, autorAvatar: autor ? autor.avatar : '' } });
    } catch (e) { res.json({ uspech: false, chyba: 'Špatný formát odkazu.' }); }
});

router.get('/api/profil/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id, 'jmeno prijmeni prezdivka avatar bio pratele');
        if (!user) return res.json({ uspech: false, chyba: 'Uživatel nenalezen.' });
        const verejneVylety = await Vylet.find({ vlastnikId: req.params.id, verejny: true }).sort({_id: -1});
        
        let jePritel = false;
        if (req.session.userId) {
            const me = await User.findById(req.session.userId);
            if (me && me.pratele && me.pratele.includes(req.params.id)) jePritel = true;
        }

        res.json({ uspech: true, profil: { jmeno: user.prezdivka || `${user.jmeno} ${user.prijmeni}`, avatar: user.avatar, bio: user.bio, jePritel }, vylety: verejneVylety.map(doc => ({ ...doc._doc, id: doc._id })) });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

// PŘÁTELSTVÍ
router.post('/api/pridat-pritele', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: "Nepřihlášen" });
    try {
        const user = await User.findById(req.session.userId);
        const { targetId } = req.body;
        if (!user.pratele) user.pratele = [];
        
        if (user.pratele.includes(targetId)) {
            user.pratele = user.pratele.filter(id => id !== targetId);
            await user.save();
            res.json({ uspech: true, akce: 'odebrano' });
        } else {
            user.pratele.push(targetId);
            await user.save();
            res.json({ uspech: true, akce: 'pridano' });
        }
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

// SOUKROMÉ ZPRÁVY (DM)
router.get('/api/zpravy/:prijemceId', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: "Nepřihlášen" });
    try {
        const mojeId = req.session.userId;
        const jehoId = req.params.prijemceId;
        const zpravy = await Zprava.find({
            $or: [
                { odesilatelId: mojeId, prijemceId: jehoId },
                { odesilatelId: jehoId, prijemceId: mojeId }
            ]
        }).sort({ _id: 1 }); // od nejstarší po nejnovější
        res.json({ uspech: true, data: zpravy });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

router.post('/api/poslat-zpravu', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: "Nepřihlášen" });
    try {
        const { prijemceId, text } = req.body;
        if(!text.trim()) return res.json({ uspech: false, chyba: "Prázdná zpráva" });
        const zprava = new Zprava({ odesilatelId: req.session.userId, prijemceId, text });
        await zprava.save();
        res.json({ uspech: true, zprava });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});


router.get('/api/verejne-vylety', async (req, res) => {
    try {
        const vylety = await Vylet.find({ verejny: true }).sort({_id: -1});
        const users = await User.find({}, '_id prezdivka jmeno prijmeni avatar');
        
        const vyletyIds = vylety.map(v => v._id);
        const vsechnyKomentare = await Komentar.find({ vyletId: { $in: vyletyIds } });
        
        const userMap = {};
        users.forEach(u => { userMap[u._id.toString()] = { jmeno: u.prezdivka || `${u.jmeno} ${u.prijmeni}`, avatar: u.avatar }; });
        const data = vylety.map(doc => { 
            const autor = userMap[doc.vlastnikId] || { jmeno: 'Neznámý', avatar: '' }; 
            const komentare = vsechnyKomentare.filter(k => k.vyletId.toString() === doc._id.toString()).map(k => ({
                id: k.oldId || k._id.toString(), autorId: k.autorId, autor: k.autor, avatar: k.avatar, text: k.text, datum: k.datum
            }));
            return { ...doc._doc, id: doc._id, komentare, autorJmeno: autor.jmeno, autorAvatar: autor.avatar }; 
        });
        res.json({ uspech: true, data });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

const seznamMedaili = [
    { id: 'start', nazev: 'Průzkumník', popis: 'Uložil si svůj první výlet do deníku.', ikona: '<i class="ph-fill ph-map-trifold"></i>', podminka: (s) => s.pocetVyletu >= 1 },
    { id: 'znalec', nazev: 'Světem protřelý', popis: 'Zapsal 10 výletů do deníku.', ikona: '<i class="ph-fill ph-backpack"></i>', podminka: (s) => s.pocetVyletu >= 10 },
    { id: 'krok', nazev: 'Akční hrdina', popis: 'Fyzicky splnil svůj první výlet.', ikona: '<i class="ph-fill ph-boot"></i>', podminka: (s) => s.pocetSplnenych >= 1 },
    { id: 'dobyvatel', nazev: 'Dobyvatel', popis: 'Fyzicky splnil 5 výletů.', ikona: '<i class="ph-fill ph-mountains"></i>', podminka: (s) => s.pocetSplnenych >= 5 },
    { id: 'komunita', nazev: 'Hlas komunity', popis: 'Napsal první příspěvek do chatu.', ikona: '<i class="ph-fill ph-megaphone"></i>', podminka: (s) => s.pocetFeed >= 1 }
];

router.get('/api/moje-staty', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const pocetVyletu = await Vylet.countDocuments({ vlastnikId: req.session.userId });
        const pocetSplnenych = await Vylet.countDocuments({ vlastnikId: req.session.userId, dokonceno: true });
        const pocetFeed = await FeedPost.countDocuments({ autorId: req.session.userId });
        const staty = { pocetVyletu, pocetSplnenych, pocetFeed };
        res.json({ uspech: true, staty, medaile: seznamMedaili.map(m => ({ nazev: m.nazev, popis: m.popis, ikona: m.ikona, ziskana: m.podminka(staty) })) });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

const seznamAkci = [
    { nazev: "Majáles 2026", datum: "24. Května 2026", misto: "Letňany, Praha", popis: "Největší studentský festival.", logoUrl: "https://praha.majales.cz/static/img/favicons/OG.jpg", vstupenkyUrl: "https://praha.majales.cz/program-vstupenky/" },
    { nazev: "PORSCHE DAY", datum: "19. Dubna 2026", misto: "Autodrom, Most", popis: "Sraz fanoušků vozů Porsche.", logoUrl: "https://sttpczprodcdn.azureedge.net////images/podujatie/1206609/orig_2025124132024_PORSCHE_DAY.jpg?tag=10F686AC2C2CB613114660346CEF049D&tag=0286B4CD20444748C3C0121F891E510B", vstupenkyUrl: "https://www.ticketportal.cz/event/PORSCHE-DAY?imedium=timeline" },
    { nazev: "OKTAGON 87", datum: "25. Dubna 2026", misto: "Home Credit Arena, Liberec", popis: "OKTAGON se vrací.", logoUrl: "https://sttpczprodcdn.azureedge.net////images/podujatie/-13699798/orig_2026218162632_OKTAGON_87_.jpg?tag=C9C4893EDBE45CF7904342D185732A95&tag=29F989C096512F133BF8C7AF12B55261", vstupenkyUrl: "https://www.ticketportal.cz/event/OKTAGON-87?imedium=timeline" },
    { nazev: "Cyklohráček", datum: "7. Března 2026", misto: "Praha - Zlonice", popis: "Zaměřen na rodiny s dětmi.", logoUrl: "https://cdn.kudyznudy.cz/files/d6/d6f37ee3-a214-4709-a35b-5445596cdf41.webp?v=20260209152021", vstupenkyUrl: "https://www.cd.cz/nase-vlaky/cyklohracek" },
    { nazev: "OBŘI OCEÁNŮ", datum: "11. Dubna 2026", misto: "Westfield Černý Most", popis: "Impozantní podmořská výstava.", logoUrl: "https://static.ticketportal.cz//images/podujatie/1208824/orig_OBRI_OCEANU___IMPOZANTNI_VYSTAVA_shakeexhibitions2025_2026_202634.jpg?tag=547131A3BE56C8E57ADBFCF84F8F90B4&tag=103A2D0EA302821116E5377B4E902866", vstupenkyUrl: "https://www.ticketportal.cz" },
    { nazev: "Nesem vám noviny", datum: "18. Března 2026", misto: "Rock Café, Praha", popis: "Komici Underground Comedy.", logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9dd3qF9UJeO4NsNtZx5RK6X0zn6I0tEDqdw&s", vstupenkyUrl: "https://goout.net" }
];

router.get('/api/akce', (req, res) => { res.json({ uspech: true, data: seznamAkci }); });

module.exports = router;
