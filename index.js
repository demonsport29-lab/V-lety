require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 
const path = require('path');

// Fix pro fetch (aby to fungovalo i na starších verzích Node.js)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' })); 
app.use(express.static('public'));

app.use(session({
    secret: 'tajny-verona-klic',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 30 }
}));

// ==========================================
// 1. DATABÁZE A SCHÉMATA
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Připojeno!'))
  .catch(err => console.error('❌ Chyba DB:', err));

const userSchema = new mongoose.Schema({
    googleId: String, email: String, jmeno: String, prijmeni: String, prezdivka: String,
    vek: Number, telefon: String, bio: String, avatar: String, zajmy: [String],
    isPremium: { type: Boolean, default: false }, isAdmin: { type: Boolean, default: false } 
});
const User = mongoose.model('User', userSchema);

const vyletSchema = new mongoose.Schema({
    verejny: { type: Boolean, default: false },
    vlastnikId: String, lokace: String, popis: String, obtiznost: Number, typ: String,
    etapy: Array, dokonceno: { type: Boolean, default: false }, fotky: [String], 
    hodnoceni: { type: Number, default: 0 }, 
    komentare: [{ 
        id: String, 
        autorId: String, 
        autor: String, avatar: String, text: String, datum: String 
    }],
    datumUlozeni: String
});
const Vylet = mongoose.model('Vylet', vyletSchema);

const feedSchema = new mongoose.Schema({
    autorId: String, autorJmeno: String, autorAvatar: String,
    text: String, fotky: [String], pripojenyVyletId: String, pripojenyVyletLokace: String,
    datum: String, timestamp: { type: Date, default: Date.now }
});
const FeedPost = mongoose.model('FeedPost', feedSchema);

// ==========================================
// 2. GOOGLE PŘIHLÁŠENÍ & ADMIN
// ==========================================
// Použijeme vlastní proměnnou MOJE_DOMENA, kterou nám Render nebude přepisovat
const redirectUrl = process.env.MOJE_DOMENA ? `${process.env.MOJE_DOMENA}/oauth2callback` : 'http://localhost:3000/oauth2callback';
const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUrl);
const ADMIN_EMAIL = 'demonsport29@gmail.com'; 

app.get('/auth/google', (req, res) => res.redirect(oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ['email', 'profile'] })));

app.get('/oauth2callback', async (req, res) => {
  try { 
      const { tokens } = await oauth2Client.getToken(req.query.code);
      oauth2Client.setCredentials(tokens); 
      const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
      const userInfo = await oauth2.userinfo.get();
      const jeToAdmin = (userInfo.data.email === ADMIN_EMAIL);

      let user = await User.findOne({ googleId: userInfo.data.id });
      if (!user) {
          user = new User({ googleId: userInfo.data.id, email: userInfo.data.email, jmeno: userInfo.data.given_name, prijmeni: userInfo.data.family_name, isPremium: jeToAdmin, isAdmin: jeToAdmin });
          await user.save();
      } else if (jeToAdmin && (!user.isAdmin || !user.isPremium)) {
          user.isAdmin = true; user.isPremium = true; await user.save();
      }
      req.session.userId = user._id; 
      res.redirect('/'); 
  } catch (e) { res.send("Chyba přihlášení."); }
});

app.get('/api/auth-status', async (req, res) => {
    if (!req.session.userId) return res.json({ prihlaseno: false });
    const user = await User.findById(req.session.userId);
    res.json({ prihlaseno: true, profil: user });
});

app.post('/api/ulozit-profil', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    await User.findByIdAndUpdate(req.session.userId, req.body);
    res.json({ uspech: true });
});

// ==========================================
// 3. AI GENERÁTOR
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

app.post('/api/vylet', async (req, res) => {
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

// ==========================================
// 4. DENÍK, VÝLETY A KOMENTÁŘE
// ==========================================
app.get('/api/ulozene-vylety', async (req, res) => {
    if (!req.session.userId) return res.json([]);
    try { 
        const user = await User.findById(req.session.userId);
        let vylety = (user && user.isAdmin) ? await Vylet.find() : await Vylet.find({ vlastnikId: req.session.userId });
        res.json(vylety.map(doc => ({ ...doc._doc, id: doc._id }))); 
    } catch(e) { res.json([]); }
});

app.post('/api/ulozit-vylet', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    await new Vylet({...req.body, vlastnikId: req.session.userId, datumUlozeni: new Date().toLocaleDateString('cs-CZ')}).save(); 
    res.json({ uspech: true });
});

app.post('/api/upravit-vylet', async (req, res) => { 
    await Vylet.findByIdAndUpdate(req.body.id, req.body); 
    res.json({ uspech: true }); 
});

// BEZPEČNÉ MAZÁNÍ VÝLETU Z DENÍKU
app.delete('/api/smazat-vylet/:id', async (req, res) => { 
    try {
        if (!req.session.userId) return res.json({ uspech: false, chyba: "Nejste přihlášeni." });
        
        const vylet = await Vylet.findById(req.params.id);
        if (!vylet) return res.json({ uspech: false, chyba: "Výlet se v databázi nenašel." });

        const user = await User.findById(req.session.userId);
        
        // Smazat může jen autor nebo admin
        if (vylet.vlastnikId === user._id.toString() || user.isAdmin) {
            await Vylet.findByIdAndDelete(req.params.id);
            res.json({ uspech: true });
        } else {
            res.json({ uspech: false, chyba: "Nemáte oprávnění smazat tento výlet." });
        }
    } catch (e) {
        console.error("Chyba při mazání výletu:", e);
        res.json({ uspech: false, chyba: e.message });
    }
});

app.post('/api/pridat-komentar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    const user = await User.findById(req.session.userId);
    const k = { 
        id: Date.now().toString(), autorId: user._id.toString(),
        autor: user.prezdivka || `${user.jmeno} ${user.prijmeni}`, avatar: user.avatar || '', 
        text: req.body.text, datum: new Date().toLocaleDateString('cs-CZ') + ' ' + new Date().toLocaleTimeString('cs-CZ', {hour: '2-digit', minute:'2-digit'}) 
    };
    await Vylet.findByIdAndUpdate(req.body.idVyletu, { $push: { komentare: k } });
    res.json({ uspech: true });
});

app.post('/api/smazat-komentar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const { tripId, commentId } = req.body;
        const user = await User.findById(req.session.userId);
        const vylet = await Vylet.findById(tripId);
        if (!vylet) return res.json({ uspech: false, chyba: 'Výlet nenalezen.' });
        const komentar = vylet.komentare.find(k => k.id === commentId);
        if (!komentar) return res.json({ uspech: false, chyba: 'Komentář nenalezen.' });
        if (komentar.autorId !== req.session.userId.toString() && !user.isAdmin) {
            return res.status(403).json({ uspech: false, chyba: 'Nemáš oprávnění.' });
        }
        await Vylet.findByIdAndUpdate(tripId, { $pull: { komentare: { id: commentId } } });
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

app.post('/api/upravit-komentar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const { tripId, commentId, text } = req.body;
        if (!text || !text.trim()) return res.json({ uspech: false, chyba: 'Text nesmí být prázdný.' });
        const user = await User.findById(req.session.userId);
        const vylet = await Vylet.findById(tripId);
        if (!vylet) return res.json({ uspech: false, chyba: 'Výlet nenalezen.' });
        const komentar = vylet.komentare.find(k => k.id === commentId);
        if (!komentar) return res.json({ uspech: false, chyba: 'Komentář nenalezen.' });
        if (komentar.autorId !== req.session.userId.toString() && !user.isAdmin) {
            return res.status(403).json({ uspech: false, chyba: 'Nemáš oprávnění.' });
        }
        await Vylet.updateOne(
            { _id: tripId, 'komentare.id': commentId },
            { $set: { 'komentare.$.text': text.trim() } }
        );
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

// ==========================================
// 5. KOMUNITA (FEED)
// ==========================================
app.get('/api/feed', async (req, res) => {
    try { res.json(await FeedPost.find().sort({ timestamp: -1 }).limit(50)); } catch(e) { res.json([]); }
});

app.post('/api/pridat-do-feedu', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const user = await User.findById(req.session.userId);
        await new FeedPost({
            autorId: user._id.toString(), autorJmeno: user.prezdivka || `${user.jmeno} ${user.prijmeni}`, autorAvatar: user.avatar || '',
            text: req.body.text, fotky: req.body.fotky || [], pripojenyVyletId: req.body.pripojenyVyletId || null, pripojenyVyletLokace: req.body.pripojenyVyletLokace || '',
            datum: new Date().toLocaleDateString('cs-CZ') + ' ' + new Date().toLocaleTimeString('cs-CZ', {hour: '2-digit', minute:'2-digit'})
        }).save();
        res.json({ uspech: true });
    } catch(e) { res.json({ uspech: false }); }
});

app.delete('/api/smazat-feed/:id', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const user = await User.findById(req.session.userId);
        const post = await FeedPost.findById(req.params.id);
        if (!post) return res.json({ uspech: false, chyba: 'Příspěvek nenalezen.' });
        if (post.autorId !== req.session.userId.toString() && !user.isAdmin) {
            return res.status(403).json({ uspech: false, chyba: 'Nemáš oprávnění.' });
        }
        await FeedPost.findByIdAndDelete(req.params.id);
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

app.post('/api/upravit-feed', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const { postId, text } = req.body;
        if (!text || !text.trim()) return res.json({ uspech: false, chyba: 'Text nesmí být prázdný.' });
        const user = await User.findById(req.session.userId);
        const post = await FeedPost.findById(postId);
        if (!post) return res.json({ uspech: false, chyba: 'Příspěvek nenalezen.' });
        if (post.autorId !== req.session.userId.toString() && !user.isAdmin) {
            return res.status(403).json({ uspech: false, chyba: 'Nemáš oprávnění.' });
        }
        await FeedPost.findByIdAndUpdate(postId, { text: text.trim() });
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

// Platby
app.post('/api/vytvorit-platbu', async (req, res) => {
    try { const session = await stripe.checkout.sessions.create({ payment_method_types: ['card'], line_items: [{ price_data: { currency: 'czk', product_data: { name: 'VERONA Premium' }, unit_amount: 9900 }, quantity: 1 }], mode: 'payment', success_url: `${req.headers.origin}/?platba=uspech`, cancel_url: `${req.headers.origin}/?platba=zrusena` }); res.json({ url: session.url }); } catch (e) { res.status(500).json({ chyba: e.message }); }
});

// ==========================================
// 6. KONTAKTNÍ FORMULÁŘ (API BRÁNA WEB3FORMS)
// ==========================================
app.post('/api/kontakt', async (req, res) => {
    const { predmet, zprava } = req.body;

    let odesilatel = "Neznámý uživatel";
    if (req.session.userId) {
        const user = await User.findById(req.session.userId);
        if (user) odesilatel = user.prezdivka || user.email;
    }

    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                access_key: process.env.WEB3FORMS_KEY,
                subject: `VERONA Kontakt: ${predmet}`,
                from_name: odesilatel,
                message: zprava
            })
        });

        const result = await response.json();
        if (result.success) {
            res.json({ uspech: true });
        } else {
            throw new Error(result.message || "Chyba API Web3Forms");
        }
    } catch (error) {
        console.error("Chyba API odesílání:", error);
        res.json({ uspech: false, chyba: error.message });
    }
});

// ==========================================
// 7. KALENDÁŘ (Google Calendar)
// ==========================================
app.post('/api/kalendar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false, chyba: 'Nepřihlášen.' });
    try {
        const { lokace, popis, datum, mapaLink, startMisto } = req.body;
        if (!lokace || !datum) return res.json({ uspech: false, chyba: 'Chybí lokace nebo datum.' });

        const datumObj = new Date(datum);
        const start = datumObj.toISOString().split('T')[0]; // YYYY-MM-DD
        const end   = new Date(datumObj.getTime() + 86400000).toISOString().split('T')[0];

        // Sloučení hezkého popisu z frontendu a mapového odkazu
        const popisFull = mapaLink
            ? `${popis}\n\n📍 Odkaz na mapu a navigaci k trase:\n${mapaLink}`
            : popis;

        // Otevře Google Calendar s předvyplněnými daty
        let gcalUrl = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent('🗺 ' + lokace)}&dates=${start.replace(/-/g,'')}/${end.replace(/-/g,'')}&details=${encodeURIComponent(popisFull)}&sf=true`;

        // Pokud je zadané startovní místo, zapíšeme ho do kolonky "Místo" v kalendáři
        if (startMisto) {
            gcalUrl += `&location=${encodeURIComponent(startMisto)}`;
        }

        res.json({ uspech: true, url: gcalUrl });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});
// ==========================================
// 8. VEŘEJNÉ PROFILY A DENÍKY
// ==========================================
app.get('/api/profil/:id', async (req, res) => {
    try {
        // Vytáhneme jen necitlivá data (vynecháme email, isPremium apod.)
        const user = await User.findById(req.params.id, 'jmeno prijmeni prezdivka avatar bio');
        if (!user) return res.json({ uspech: false, chyba: 'Uživatel nenalezen.' });
        
        // Najdeme všechny výlety tohoto uživatele, které mají přepínač "veřejný" na true
        const verejneVylety = await Vylet.find({ vlastnikId: req.params.id, verejny: true }).sort({_id: -1});
        
        res.json({
            uspech: true,
            profil: {
                jmeno: user.prezdivka || `${user.jmeno} ${user.prijmeni}`,
                avatar: user.avatar,
                bio: user.bio
            },
            vylety: verejneVylety.map(doc => ({ ...doc._doc, id: doc._id }))
        });
    } catch (e) {
        res.json({ uspech: false, chyba: e.message });
    }
});
// VEŘEJNÉ VÝLETY VŠECH UŽIVATELŮ (Inspirace)
app.get('/api/verejne-vylety', async (req, res) => {
    try {
        const vylety = await Vylet.find({ verejny: true }).sort({_id: -1});
        const users = await User.find({}, '_id prezdivka jmeno prijmeni avatar');
        
        // Vytvoříme si mapu uživatelů pro rychlé přiřazení jmen k výletům
        const userMap = {};
        users.forEach(u => {
            userMap[u._id.toString()] = { 
                jmeno: u.prezdivka || `${u.jmeno} ${u.prijmeni}`, 
                avatar: u.avatar 
            };
        });

        const data = vylety.map(doc => {
            const autor = userMap[doc.vlastnikId] || { jmeno: 'Neznámý', avatar: '' };
            return { ...doc._doc, id: doc._id, autorJmeno: autor.jmeno, autorAvatar: autor.avatar };
        });
        
        res.json({ uspech: true, data });
    } catch (e) {
        res.json({ uspech: false, chyba: e.message });
    }
});
const seznamAkci = [
    {
        nazev: "Imagine Dragons - LOOM Tour",
        datum: "9. Června 2026",
        misto: "Letňany, Praha",
        popis: "Epická show jedné z nejpopulárnějších kapel současnosti pod širým nebem.",
        // Zde vložíš URL adresu konkrétní velké fotky (ta se roztáhne na pozadí názvu)
        logoUrl: "https://upload.wikimedia.org/wikipedia/en/0/00/Loom_World_Tour.png", 
        // Zde vložíš přímý odkaz na nákup lístků
        vstupenkyUrl: "https://www.ticketportal.cz/event/IMAGINE-DRAGONS-LOOM-World-Tour" 
    },
    {
        nazev: "COMIC-CON",
        datum: "13. Března 2026",
        misto: "O2 Universum, Praha",
        popis: "VComic-Con Prague 2026 přijede o měsíc dřív! Amanda Tapping z Hvězdné brány mezi prvními potvrzenými hvězdami",
        logoUrl: "https://sttpczprodcdn.azureedge.net////images/podujatie/-2147476029/orig_Comic_Con_Prague_2026_FRIDAY_202510712526.jpg?tag=7E6A76FD21CFE6BC2F9C6BD668119E7A&tag=",
        vstupenkyUrl: "https://www.ticketportal.cz/event/Comic-Con-Prague-2026?imedium=timeline"
    }
];

// Odeslání seznamu aplikaci
app.get('/api/akce', (req, res) => {
    res.json({ uspech: true, data: seznamAkci });
});

// START SERVERU
app.listen(port, () => console.log(`🚀 VERONA běží na portu ${port}`));