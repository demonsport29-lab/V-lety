require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

let isMaintenanceMode = false;

app.use(express.json({ limit: '50mb' })); 
app.use(express.static('public'));

app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

// 1. Secret switch route
app.get('/tajny-vypinac/verona/:stav', (req, res) => {
    const { stav } = req.params;
    if (stav === 'zapnout') {
        isMaintenanceMode = true;
        return res.send('Udrzba ZAPNUTA');
    } else if (stav === 'vypnout') {
        isMaintenanceMode = false;
        return res.send('Udrzba VYPNUTA');
    }
    res.status(400).send('Neplatný stav');
});

// 2. Maintenance middleware
app.use((req, res, next) => {
    // Pokud je aktivní údržba a uživatel nemíří na vypínač
    if (isMaintenanceMode && !req.path.startsWith('/tajny-vypinac/verona')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        return res.sendFile(path.join(__dirname, 'public', 'maintenance.html'));
    }
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'tajny-verona-klic',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        maxAge: 1000 * 60 * 60 * 24 * 30 
    }
}));

if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('✅ Databáze připojena.'))
        .catch(err => console.error('❌ Chyba DB:', err.message));
} else {
    console.warn('⚠️ POZOR: MONGODB_URI není definována. Server běží v režimu bez databáze.');
}



const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const feedRoutes = require('./routes/feedRoutes');
const miscRoutes = require('./routes/miscRoutes');
const Akce = require('./models/Akce');

// Statické stránky
app.get('/soukromi', (req, res) => res.sendFile(path.join(__dirname, 'public', 'soukromi.html')));
app.get('/podminky', (req, res) => res.sendFile(path.join(__dirname, 'public', 'podminky.html')));


app.use(authRoutes);
app.use(tripRoutes);
app.use(feedRoutes);
app.use(miscRoutes);

// START SERVERU
// Veřejná SEO stránka výletu pro vyhledávače (Google / Seznam)
app.get('/vylet/:id', async (req, res) => {
    try {
        const tripId = req.params.id;
        let vylet = null;

        if (typeof Vylet !== 'undefined') {
            vylet = await Vylet.findOne({ $or: [{ id: tripId }, { _id: tripId }, { shareCode: tripId }] }).lean();
        } else if (typeof Trip !== 'undefined') {
            vylet = await Trip.findOne({ $or: [{ id: tripId }, { _id: tripId }, { shareCode: tripId }] }).lean();
        } else if (Array.isArray(global.ulozeneVylety)) {
            vylet = global.ulozeneVylety.find(v => v.id === tripId || v.shareCode === tripId);
        }

        if (!vylet) {
            return res.redirect('/?vylet=' + encodeURIComponent(tripId));
        }

        const esc = (s) => String(s || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
        const nazev = esc(vylet.lokace || 'Naplánovaný výlet');
        const popis = esc(vylet.popis || `Itinerář výletu ${vylet.lokace} naplánovaný v aplikaci VERONA.`);
        const zastavkyHtml = (vylet.zastavky || []).map((z, i) => `
            <li style="margin-bottom:14px; padding:14px; border:1px solid #e2e8f0; border-radius:12px;">
                <strong>${i + 1}. ${esc(z.nazev)}</strong>
                <p style="margin:6px 0 0 0; color:#475569;">${esc(z.popis || '')}</p>
            </li>
        `).join('');

        res.send(`<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${nazev} – Itinerář výletu | VERONA</title>
    <meta name="description" content="${popis}">
    <meta property="og:title" content="${nazev} – Itinerář výletu | VERONA">
    <meta property="og:description" content="${popis}">
    <meta property="og:type" content="article">
    <link rel="canonical" href="https://veronaapp.eu/vylet/${encodeURIComponent(tripId)}">
</head>
<body style="font-family:system-ui,-apple-system,sans-serif; max-width:780px; margin:0 auto; padding:24px 16px; color:#0f172a; line-height:1.6;">
    <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <a href="/" style="font-weight:900; font-size:1.2rem; text-decoration:none; color:#0f172a;">VERONA</a>
        <a href="/?vylet=${encodeURIComponent(tripId)}" style="background:#6366f1; color:#fff; padding:10px 16px; border-radius:10px; text-decoration:none; font-weight:700;">Otevřít v interaktivní mapě</a>
    </header>
    <main>
        <p style="font-size:0.85rem; color:#6366f1; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Veřejný itinerář výletu</p>
        <h1 style="font-size:2rem; margin:0 0 12px 0;">${nazev}</h1>
        <p style="font-size:1.05rem; color:#334155; margin-bottom:24px;">${popis}</p>
        <h2 style="font-size:1.25rem; margin-bottom:12px;">Zastávky na trase</h2>
        <ol style="list-style:none; padding:0; margin:0 0 28px 0;">${zastavkyHtml}</ol>
        <a href="/?vylet=${encodeURIComponent(tripId)}" style="display:inline-block; background:#0f172a; color:#fff; padding:14px 22px; border-radius:12px; text-decoration:none; font-weight:700;">
            Upravit trasu a zobrazit mapu v plánovači →
        </a>
    </main>
</body>
</html>`);
    } catch (err) {
        res.redirect('/?vylet=' + encodeURIComponent(req.params.id));
    }
});
app.listen(port, () => console.log(`🚀 VERONA běží na portu ${port}`));