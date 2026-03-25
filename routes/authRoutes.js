const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const User = require('../models/User');

const redirectUrl = process.env.MOJE_DOMENA ? `${process.env.MOJE_DOMENA}/oauth2callback` : 'http://localhost:3000/oauth2callback';
const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUrl);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'demonsport29@gmail.com'; 

router.get('/auth/google', (req, res) => res.redirect(oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ['email', 'profile'] })));

router.get('/oauth2callback', async (req, res) => {
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

router.get('/api/auth-status', async (req, res) => {
    if (!req.session.userId) return res.json({ prihlaseno: false });
    const user = await User.findById(req.session.userId);
    res.json({ prihlaseno: true, profil: user });
});

router.post('/api/ulozit-profil', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    await User.findByIdAndUpdate(req.session.userId, req.body);
    res.json({ uspech: true });
});


// --- SOCIÁLNÍ SÍŤ: Sledování uživatelů ---
router.post('/api/sleduj/:id', async (req, res) => {
    try {
        if (!req.session.userId) return res.json({ uspech: false, chyba: 'Musíš být přihlášen.' });
        
        const cilovyUzivatelId = req.params.id;
        const mujId = req.session.userId;

        if (cilovyUzivatelId === mujId) return res.json({ uspech: false, chyba: 'Nemůžeš sledovat sám sebe.' });

        const ja = await User.findById(mujId);
        const cil = await User.findById(cilovyUzivatelId);

        if (!ja || !cil) return res.json({ uspech: false, chyba: 'Uživatel nenalezen.' });

        // Je uživatel už v mém seznamu sledovaných?
        const uzSleduji = ja.sleduji.includes(cilovyUzivatelId);

        if (uzSleduji) {
            // UNFOLLOW (Odebrat)
            ja.sleduji.pull(cilovyUzivatelId);
            cil.sledujici.pull(mujId);
        } else {
            // FOLLOW (Přidat)
            ja.sleduji.push(cilovyUzivatelId);
            cil.sledujici.push(mujId);
        }

        await ja.save();
        await cil.save();

        res.json({ uspech: true, nyniSleduje: !uzSleduji });
    } catch (err) {
        console.error(err);
        res.json({ uspech: false, chyba: 'Chyba na serveru.' });
    }
});

router.get('/auth/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) console.error("Chyba při mazání session:", err);
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
});

module.exports = router;