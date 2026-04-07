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

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Připojeno!'))
  .catch(err => console.error('❌ Chyba DB:', err));



const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const feedRoutes = require('./routes/feedRoutes');
const miscRoutes = require('./routes/miscRoutes');

// Statické stránky
app.get('/soukromi', (req, res) => res.sendFile(path.join(__dirname, 'public', 'soukromi.html')));
app.get('/podminky', (req, res) => res.sendFile(path.join(__dirname, 'public', 'podminky.html')));

app.use(authRoutes);
app.use(tripRoutes);
app.use(feedRoutes);
app.use(miscRoutes);

// START SERVERU
app.listen(port, () => console.log(`🚀 VERONA běží na portu ${port}`));