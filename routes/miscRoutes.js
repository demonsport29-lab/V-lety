const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vylet = require('../models/Vylet');
const FeedPost = require('../models/FeedPost');
const Komentar = require('../models/Komentar');
const Zprava = require('../models/Zprava');
const Akce = require('../models/Akce');
const Notifikace = require('../models/Notifikace');
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

router.post('/api/pridat-pritele-kod', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: "Nepřihlášen" });
    try {
        const { kod } = req.body;
        if (!kod) return res.json({ uspech: false, chyba: "Kód chybí" });
        if (kod === req.session.userId) return res.json({ uspech: false, chyba: "Nemůžete si přidat sami sebe." });

        const target = await User.findById(kod);
        if (!target) return res.json({ uspech: false, chyba: "Uživatel s tímto kódem neexistuje." });

        const me = await User.findById(req.session.userId);
        if (!me.pratele) me.pratele = [];
        
        if (me.pratele.includes(kod)) {
            return res.json({ uspech: false, chyba: "Tento uživatel už ve vašich přátelích je." });
        }
        
        me.pratele.push(kod);
        await me.save();
        res.json({ uspech: true, profil: { id: target._id, jmeno: target.prezdivka || `${target.jmeno} ${target.prijmeni}`, avatar: target.avatar } });
    } catch (e) { res.json({ uspech: false, chyba: "Neplatný kód." }); }
});

router.get('/api/moji-pratele', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: "Nepřihlášen" });
    try {
        const user = await User.findById(req.session.userId);
        if (!user || !user.pratele || user.pratele.length === 0) return res.json({ uspech: true, data: [] });
        
        const prateleIds = user.pratele;
        const prateleData = await User.find({ '_id': { $in: prateleIds } }, '_id jmeno prijmeni prezdivka avatar');
        
        const data = prateleData.map(p => ({
            id: p._id,
            jmeno: p.prezdivka || `${p.jmeno} ${p.prijmeni}`,
            avatar: p.avatar
        }));
        
        res.json({ uspech: true, data });
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
        
        // Vytvoření notifikace
        const user = await User.findById(req.session.userId);
        if (user) {
            const zkrPochoutka = text.length > 30 ? text.substring(0,27)+'...' : text;
            await new Notifikace({
                prijemceId: prijemceId,
                odesilatelId: req.session.userId,
                odesilatelJmeno: user.prezdivka || `${user.jmeno} ${user.prijmeni}`,
                odesilatelAvatar: user.avatar,
                typ: 'zprava',
                textPochoutka: zkrPochoutka
            }).save();
        }
        
        res.json({ uspech: true, zprava });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

// NOTIFIKACE (Čtení + Označení přečtených)
router.get('/api/notifikace', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const d = await Notifikace.find({ prijemceId: req.session.userId }).sort({_id: -1}).limit(20);
        const nepS = d.filter(x => !x.precteno).length;
        res.json({ uspech: true, data: d, neprectenoLita: nepS });
    } catch (e) { res.json({ uspech: false }); }
});

router.post('/api/precteno-notifikace', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        await Notifikace.updateMany({ prijemceId: req.session.userId, precteno: false }, { precteno: true });
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false }); }
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
    { id: 'start', nazev: 'Průzkumník', popis: 'Uložil si svůj první výlet do deníku.', ikona: 'ti-map-2', podminka: (s) => s.pocetVyletu >= 1 },
    { id: 'znalec', nazev: 'Světem protřelý', popis: 'Zapsal 10 výletů do deníku.', ikona: 'ti-backpack', podminka: (s) => s.pocetVyletu >= 10 },
    { id: 'krok', nazev: 'Akční hrdina', popis: 'Fyzicky splnil svůj první výlet.', ikona: 'ti-shoe', podminka: (s) => s.pocetSplnenych >= 1 },
    { id: 'dobyvatel', nazev: 'Dobyvatel', popis: 'Fyzicky splnil 5 výletů.', ikona: 'ti-mountain', podminka: (s) => s.pocetSplnenych >= 5 },
    { id: 'komunita', nazev: 'Hlas komunity', popis: 'Napsal první příspěvek do chatu.', ikona: 'ti-message-2', podminka: (s) => s.pocetFeed >= 1 }
];

router.get('/api/moje-info', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: 'Nepřihlášen.' });
    try {
        const user = await User.findById(req.session.userId);
        const pocetVyletu = await Vylet.countDocuments({ vlastnikId: req.session.userId });
        const pocetSplnenych = await Vylet.countDocuments({ vlastnikId: req.session.userId, dokonceno: true });
        const pocetFeed = await FeedPost.countDocuments({ autorId: req.session.userId });
        
        const statistiky = { pocetVyletu, pocetSplnenych, pocetFeed, ujetaVzdalenost: pocetSplnenych * 12 }; // Simulace km
        const achievementy = seznamMedaili.filter(m => m.podminka(statistiky));
        
        res.json({ uspech: true, user: { ...user._doc, statistiky, achievementy } });
    } catch(e) { res.json({ uspech: false, chyba: e.message }); }
});

router.post('/api/nastavit-avatar-achievement', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const { achievementTitle } = req.body;
        const medaile = seznamMedaili.find(m => m.nazev === achievementTitle);
        // V reálu bychom potřebovali URL ikony, ale ti- ikona je font. 
        // Budeme ukládat 'ti:ti-nazev' do avatar pole a frontend to pozná.
        if (medaile) {
            await User.findByIdAndUpdate(req.session.userId, { avatar: `ti:${medaile.ikona}` });
            res.json({ uspech: true });
        } else {
            res.json({ uspech: false, chyba: 'Medaile nenalezena.' });
        }
    } catch(e) { res.json({ uspech: false }); }
});

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

router.get('/api/akce', async (req, res) => { 
    try {
        const akce = await Akce.find().sort({ vytvoreno: -1 });
        res.json({ uspech: true, data: akce });
    } catch (e) {
        res.json({ uspech: false, chyba: e.message });
    } 
});

router.post('/api/admin/akce', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: "Nepřihlášen" });
    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.email !== process.env.ADMIN_EMAIL) return res.json({ uspech: false, chyba: "Nedostatečná oprávnění" });
        
        const novaAkce = new Akce({
            nazev: req.body.nazev,
            datum: req.body.datum,
            misto: req.body.misto,
            popis: req.body.popis,
            logoUrl: req.body.logoUrl,
            vstupenkyUrl: req.body.vstupenkyUrl
        });
        await novaAkce.save();
        res.json({ uspech: true, data: novaAkce });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

router.delete('/api/admin/akce/:id', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: "Nepřihlášen" });
    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.email !== process.env.ADMIN_EMAIL) return res.json({ uspech: false, chyba: "Nedostatečná oprávnění" });
        
        await Akce.findByIdAndDelete(req.params.id);
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});
module.exports = router;
