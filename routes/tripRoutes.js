const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vylet = require('../models/Vylet');
const Komentar = require('../models/Komentar');
const Notifikace = require('../models/Notifikace');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { checkAchievements } = require('../utils/achievementManager');
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// V roce 2026 používáme stabilní model Gemini 2.0 Flash na verzi v1beta
const model = genAI.getGenerativeModel({ model: "gemini-pro" }, { apiVersion: 'v1beta' });

// AI GENERÁTOR
router.post('/api/vylet', async (req, res) => {
  try {
    const { misto, specifikace, vybraneFiltry } = req.body;
    
    // 1. Zjištění počasí z Open-Meteo (Volné API bez klíče)
    let pocasiInfo = "Data o počasí nejsou nyní k dispozici.";
    try {
        const geoReq = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(misto)}&count=1&language=cs`);
        const geoRes = await geoReq.json();
        if (geoRes.results && geoRes.results.length > 0) {
            const loc = geoRes.results[0];
            const weatherReq = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
            const weatherRes = await weatherReq.json();
            if (weatherRes.current_weather) {
                const cw = weatherRes.current_weather;
                pocasiInfo = `Tvá JSON odpověď pro klíč pocasi MUSÍ mít tento striktní formát: {"teplota": ${cw.temperature}, "vitr": ${cw.windspeed}, "wmo": ${cw.weathercode}}. Vygeneruj zbytek JSONu podle toho s ohledem na navržený itinerář.`;
            }
        }
    } catch (err) {
        console.error("Open-Meteo selhalo:", err.message);
    }
    
    // 2. Modifikace promptu pro Gemini
    const filtryText = vybraneFiltry && vybraneFiltry.length > 0 ? `STRIKTNĚ DODRŽ FILTRY A SPORT: ${vybraneFiltry.join(', ')}.` : "";
    const prompt = `Jsi architekt výletů VERONA. Navrhni výlet pro: ${misto}. Styl: ${specifikace}. ${filtryText}
    ${pocasiInfo}
    Vrať POUZE VALIDNÍ JSON formát: {"lokace": "Název", "etapy": [{"cas": "09:00", "misto": "Název zastávky", "popis": "Co tam dělat", "lat": 50.08, "lng": 14.42}], "doporuceni": "Tip Architekta na cestu (oblečení apod.)", "pocasi": {"teplota": 0, "vitr": 0, "wmo": 0}, "typ": "mesto", "obtiznost": 2}
    VŽDY vyplň reálné GPS souřadnice lat a lng pro vykreslení trasy v mapě! Použij data o počasí z kontextu výše pro klíč "pocasi". Smaž veškeré formátování textu (ani zpětné uvozovky). JSON musí jít ihned parsovat!`;
    
    let text = (await model.generateContent(prompt)).response.text();
    const match = text.match(/\{[\s\S]*\}/); if (match) text = match[0];
    const generatedData = JSON.parse(text);

    // Update stats if logged in
    if (req.session.userId) {
        await User.findByIdAndUpdate(req.session.userId, { $inc: { 'statistiky.aiVyletyPocet': 1 } });
        await checkAchievements(req.session.userId, 'ai_gen');
    }

    res.json({ uspech: true, data: generatedData });
  } catch (e) {
      console.error(e);
      res.json({ uspech: false, chyba: e.message }); 
  }
});

// DENÍK A VÝLETY
router.get('/api/ulozene-vylety', async (req, res) => {
    if (!req.session.userId) return res.json([]);
    try { 
        const user = await User.findById(req.session.userId);
        let vylety = (user && user.isAdmin) ? await Vylet.find() : await Vylet.find({ vlastnikId: req.session.userId });
        
        // Přidání oddělených komentářů ke každému výletu
        const vyletyIds = vylety.map(v => v._id);
        const vsechnyKomentare = await Komentar.find({ vyletId: { $in: vyletyIds } });
        
        const data = vylety.map(doc => {
            const komentare = vsechnyKomentare.filter(k => k.vyletId.toString() === doc._id.toString()).map(k => ({
                id: k.oldId || k._id.toString(), autorId: k.autorId, autor: k.autor, avatar: k.avatar, text: k.text, datum: k.datum
            }));
            return { ...doc._doc, id: doc._id, komentare };
        });
        
        res.json(data); 
    } catch(e) { res.json([]); }
});

router.post('/api/ulozit-vylet', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    const shareId = nanoid(10);
    const novyVylet = new Vylet({
        ...req.body, 
        vlastnikId: req.session.userId, 
        datumUlozeni: new Date().toLocaleDateString('cs-CZ'),
        shareId
    });
    await novyVylet.save();
    
    // Stats & Achievements
    await User.findByIdAndUpdate(req.session.userId, { $inc: { 'statistiky.vyletyPocet': 1 } });
    const awarded = await checkAchievements(req.session.userId, 'save_trip');
    
    res.json({ uspech: true, awarded });
});

router.post('/api/upravit-vylet', async (req, res) => { 
    await Vylet.findByIdAndUpdate(req.body.id, req.body); 
    res.json({ uspech: true }); 
});

router.delete('/api/smazat-vylet/:id', async (req, res) => { 
    try {
        if (!req.session.userId) return res.json({ uspech: false, chyba: "Nejste přihlášeni." });
        const vylet = await Vylet.findById(req.params.id);
        if (!vylet) return res.json({ uspech: false, chyba: "Výlet se nenašel." });
        const user = await User.findById(req.session.userId);
        if (vylet.vlastnikId === user._id.toString() || user.isAdmin) {
            await Vylet.findByIdAndDelete(req.params.id);
            await Komentar.deleteMany({ vyletId: req.params.id }); 
            res.json({ uspech: true });
        } else {
            res.json({ uspech: false, chyba: "Nemáte oprávnění." });
        }
    } catch (e) {
        console.error(e); res.json({ uspech: false, chyba: e.message });
    }
});

router.post('/api/ulozit-cizi-vylet', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: 'Nejste přihlášeni.' });
    try {
        const { idVyletu } = req.body;
        const org = await Vylet.findById(idVyletu);
        if (!org || !org.verejny) return res.json({ uspech: false, chyba: 'Výlet nelze zkopírovat.' });
        
        const novy = new Vylet({
            verejny: false, vlastnikId: req.session.userId,
            lokace: org.lokace, popis: org.popis, obtiznost: org.obtiznost, typ: org.typ,
            etapy: org.etapy, dokonceno: false, fotky: [], hodnoceni: 0, 
            datumUlozeni: new Date().toLocaleDateString('cs-CZ')
        });
        // Pozor override vlastnikId v obj
        novy.vlastnikId = req.session.userId;
        await novy.save();
        
        res.json({ uspech: true, newId: novy._id });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

// KOMENTÁŘE K VÝLETŮM (Zcela refaktorováno)
router.post('/api/pridat-komentar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    const user = await User.findById(req.session.userId);
    const textKomentare = req.body.text;
    
    await new Komentar({
        vyletId: req.body.idVyletu,
        oldId: Date.now().toString(),
        autorId: user._id.toString(),
        autor: user.prezdivka || `${user.jmeno} ${user.prijmeni}`,
        avatar: user.avatar || '',
        text: textKomentare,
        datum: new Date().toLocaleDateString('cs-CZ') + ' ' + new Date().toLocaleTimeString('cs-CZ', {hour: '2-digit', minute:'2-digit'})
    }).save();
    
    // Spuštení Notifikace (Oznámení majiteli výletu)
    try {
        const vylet = await Vylet.findById(req.body.idVyletu);
        if (vylet && vylet.vlastnikId && vylet.vlastnikId !== req.session.userId) { // Nesmí upozorňovat sám na sebe
            const zkrText = textKomentare.length > 30 ? textKomentare.substring(0, 27) + '...' : textKomentare;
            await new Notifikace({
                prijemceId: vylet.vlastnikId,
                odesilatelId: user._id.toString(),
                odesilatelJmeno: user.prezdivka || `${user.jmeno} ${user.prijmeni}`,
                odesilatelAvatar: user.avatar,
                typ: 'komentar',
                textPochoutka: zkrText
            }).save();
        }
    } catch(e) { console.error("Chyba tvorby notifikace při komentáři:", e); }

    res.json({ uspech: true });
});

router.post('/api/smazat-komentar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const { tripId, commentId } = req.body;
        const user = await User.findById(req.session.userId);
        let kom = await Komentar.findOne({ vyletId: tripId, oldId: commentId }) || await Komentar.findById(commentId);
        
        if (!kom) return res.json({ uspech: false, chyba: 'Komentář nenalezen.' });
        if (kom.autorId !== req.session.userId.toString() && !user.isAdmin) return res.status(403).json({ uspech: false, chyba: 'Nemáš oprávnění.' });
        
        await Komentar.findByIdAndDelete(kom._id);
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

router.post('/api/upravit-komentar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const { tripId, commentId, text } = req.body;
        if (!text || !text.trim()) return res.json({ uspech: false, chyba: 'Text nesmí být prázdný.' });
        const user = await User.findById(req.session.userId);
        let kom = await Komentar.findOne({ vyletId: tripId, oldId: commentId }) || await Komentar.findById(commentId);
        
        if (!kom) return res.json({ uspech: false, chyba: 'Komentář nenalezen.' });
        if (kom.autorId !== req.session.userId.toString() && !user.isAdmin) return res.status(403).json({ uspech: false, chyba: 'Nemáš oprávnění.' });
        
        kom.text = text.trim();
        await kom.save();
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

// EXPLORE - Veřejné výlety
router.get('/api/explore', async (req, res) => {
    try {
        const vylety = await Vylet.find({ verejny: true }).limit(20).sort({ datumUlozeni: -1 });
        res.json(vylety);
    } catch (e) { res.json([]); }
});

// RAW DATA PRO VEŘEJNÝ VÝLET (včetně meta dat)
router.get('/api/public-trip/:shareId', async (req, res) => {
    try {
        const v = await Vylet.findOne({ shareId: req.params.shareId });
        if (!v) return res.status(404).json({ uspech: false });
        res.json({ uspech: true, data: v });
    } catch (e) { res.status(500).json({ uspech: false }); }
});

// VEŘEJNÝ PROFIL - Data
router.get('/api/u/:prezdivka', async (req, res) => {
    try {
        const u = await User.findOne({ prezdivka: req.params.prezdivka, verejnyProfil: true });
        if (!u) return res.status(404).json({ uspech: false });
        
        // Vrátíme jen bezpečné info
        res.json({
            uspech: true,
            data: {
                jmeno: u.jmeno,
                prijmeni: u.prijmeni,
                prezdivka: u.prezdivka,
                avatar: u.avatar,
                bio: u.bio,
                achievementy: u.achievementy,
                statistiky: u.statistiky
            }
        });
    } catch (e) { res.status(500).json({ uspech: false }); }
});

// GENEROVÁNÍ QR KÓDU
router.post('/api/generovat-qr', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.json({ uspech: false });
        const qr = await QRCode.toDataURL(url);
        res.json({ uspech: true, qr });
    } catch (e) { res.json({ uspech: false }); }
});

// SOCIAL PREVIEW HANDLERS (Minimal HTML for SEO)
router.get('/s/:shareId', async (req, res) => {
    try {
        const v = await Vylet.findOne({ shareId: req.params.shareId });
        if (!v) return res.redirect('/');
        
        // Minimal HTML with OG tags for social networks
        const html = `
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <title>Verona | ${v.lokace}</title>
            <meta property="og:title" content="Výlet: ${v.lokace}">
            <meta property="og:description" content="${v.popis || 'Podívej se na můj itinerář výletu na Verona Trip Architect!'}">
            <meta property="og:image" content="https://verona-app.example/static/og-preview.jpg"> <!-- Placeholder -->
            <meta property="og:type" content="website">
            <meta http-equiv="refresh" content="0; url=/?s=${req.params.shareId}">
        </head>
        <body>Přesměrovávám na výlet...</body>
        </html>`;
        res.send(html);
    } catch (e) { res.redirect('/'); }
});

router.get('/u/:prezdivka', async (req, res) => {
    try {
        const u = await User.findOne({ prezdivka: req.params.prezdivka, verejnyProfil: true });
        if (!u) return res.redirect('/');
        
        const html = `
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <title>Verona | Profil ${u.prezdivka}</title>
            <meta property="og:title" content="Profil cestovatele: ${u.prezdivka}">
            <meta property="og:description" content="Sleduj moje výlety a úspěchy ve Verona Trip Architect.">
            <meta property="og:image" content="${u.avatar || ''}">
            <meta http-equiv="refresh" content="0; url=/?u=${req.params.prezdivka}">
        </head>
        <body>Přesměrovávám na profil...</body>
        </html>`;
        res.send(html);
    } catch (e) { res.redirect('/'); }
});

module.exports = router;
