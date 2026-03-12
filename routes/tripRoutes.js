const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vylet = require('../models/Vylet');
const Komentar = require('../models/Komentar');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

// AI GENERÁTOR
router.post('/api/vylet', async (req, res) => {
  try {
    const { misto, specifikace, vybraneFiltry } = req.body;
    const filtryText = vybraneFiltry && vybraneFiltry.length > 0 ? `STRIKTNĚ DODRŽ FILTRY A SPORT: ${vybraneFiltry.join(', ')}.` : "";
    const prompt = `Jsi architekt výletů VERONA. Navrhni výlet pro: ${misto}. Styl: ${specifikace}. ${filtryText}
    Vrať POUZE JSON: {"lokace": "Název", "etapy": [{"cas": "09:00", "misto": "Název", "popis": "Info", "lat": 50.08, "lng": 14.42}], "doporuceni": "Tip", "typ": "mesto", "obtiznost": 2}
    VŽDY vyplň reálné GPS souřadnice lat a lng!`;
    let text = (await model.generateContent(prompt)).response.text();
    const match = text.match(/\{[\s\S]*\}/); if (match) text = match[0];
    res.json({ uspech: true, data: JSON.parse(text) });
  } catch (e) { res.json({ uspech: false, chyba: e.message }); }
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
    await new Vylet({...req.body, vlastnikId: req.session.userId, datumUlozeni: new Date().toLocaleDateString('cs-CZ')}).save(); 
    res.json({ uspech: true });
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

// KOMENTÁŘE K VÝLETŮM (Zcela refaktorováno)
router.post('/api/pridat-komentar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    const user = await User.findById(req.session.userId);
    await new Komentar({
        vyletId: req.body.idVyletu,
        oldId: Date.now().toString(),
        autorId: user._id.toString(),
        autor: user.prezdivka || `${user.jmeno} ${user.prijmeni}`,
        avatar: user.avatar || '',
        text: req.body.text,
        datum: new Date().toLocaleDateString('cs-CZ') + ' ' + new Date().toLocaleTimeString('cs-CZ', {hour: '2-digit', minute:'2-digit'})
    }).save();
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

module.exports = router;
