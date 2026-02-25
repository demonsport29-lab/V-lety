require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 
const path = require('path');

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
        id: String, // NOVÉ: ID komentáře
        autorId: String, // NOVÉ: Kdo to napsal
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
const redirectUrl = process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/oauth2callback` : 'http://localhost:3000/oauth2callback';
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
app.post('/api/upravit-vylet', async (req, res) => { await Vylet.findByIdAndUpdate(req.body.id, req.body); res.json({ uspech: true }); });
app.delete('/api/smazat-vylet/:id', async (req, res) => { await Vylet.findByIdAndDelete(req.params.id); res.json({ uspech: true }); });
if (req.body.verejny !== undefined) {
        vylet.verejny = req.body.verejny;
    }
// Přidání komentáře
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
// Smazání komentáře
app.post('/api/smazat-komentar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    const user = await User.findById(req.session.userId);
    const trip = await Vylet.findById(req.body.tripId);
    const k = trip.komentare.find(x => x.id === req.body.commentId);
    if (k && (k.autorId === user._id.toString() || user.isAdmin)) {
        trip.komentare = trip.komentare.filter(x => x.id !== req.body.commentId);
        await trip.save(); return res.json({ uspech: true });
    }
    res.json({ uspech: false });
});
// Úprava komentáře
app.post('/api/upravit-komentar', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    const user = await User.findById(req.session.userId);
    const trip = await Vylet.findById(req.body.tripId);
    const k = trip.komentare.find(x => x.id === req.body.commentId);
    if (k && (k.autorId === user._id.toString() || user.isAdmin)) {
        k.text = req.body.text; await trip.save(); return res.json({ uspech: true });
    }
    res.json({ uspech: false });
});

// ==========================================
// 5. KOMUNITA (FEED) A MAZÁNÍ/ÚPRAVY
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
// Smazání z feedu
app.delete('/api/smazat-feed/:id', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    const user = await User.findById(req.session.userId);
    const post = await FeedPost.findById(req.params.id);
    if (post && (post.autorId === user._id.toString() || user.isAdmin)) {
        await FeedPost.findByIdAndDelete(req.params.id); return res.json({ uspech: true });
    }
    res.json({ uspech: false });
});
// Úprava z feedu
app.post('/api/upravit-feed', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    const user = await User.findById(req.session.userId);
    const post = await FeedPost.findById(req.body.postId);
    if (post && (post.autorId === user._id.toString() || user.isAdmin)) {
        post.text = req.body.text; await post.save(); return res.json({ uspech: true });
    }
    res.json({ uspech: false });
});

// Platby
app.post('/api/vytvorit-platbu', async (req, res) => {
    try { const session = await stripe.checkout.sessions.create({ payment_method_types: ['card'], line_items: [{ price_data: { currency: 'czk', product_data: { name: 'VERONA Premium' }, unit_amount: 9900 }, quantity: 1 }], mode: 'payment', success_url: `${req.headers.origin}/?platba=uspech`, cancel_url: `${req.headers.origin}/?platba=zrusena` }); res.json({ url: session.url }); } catch (e) { res.status(500).json({ chyba: e.message }); }
});

app.listen(port, () => console.log(`🚀 VERONA běží na portu ${port}`));