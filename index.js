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
    secret: process.env.SESSION_SECRET || 'tajny-verona-klic',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 30 }
}));



const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const feedRoutes = require('./routes/feedRoutes');
const miscRoutes = require('./routes/miscRoutes');

app.use(authRoutes);
app.use(tripRoutes);
app.use(feedRoutes);
app.use(miscRoutes);

// START SERVERU
app.listen(port, () => console.log(`🚀 VERONA běží na portu ${port}`));