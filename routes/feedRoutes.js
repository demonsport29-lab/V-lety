const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FeedPost = require('../models/FeedPost');

router.get('/api/feed', async (req, res) => {
    try { res.json(await FeedPost.find().sort({ timestamp: -1 }).limit(50)); } catch(e) { res.json([]); }
});

router.post('/api/pridat-do-feedu', async (req, res) => {
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

router.delete('/api/smazat-feed/:id', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const user = await User.findById(req.session.userId);
        const post = await FeedPost.findById(req.params.id);
        if (!post) return res.json({ uspech: false, chyba: 'Příspěvek nenalezen.' });
        if (post.autorId !== req.session.userId.toString() && !user.isAdmin) return res.status(403).json({ uspech: false, chyba: 'Nemáš oprávnění.' });
        await FeedPost.findByIdAndDelete(req.params.id);
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

router.post('/api/upravit-feed', async (req, res) => {
    if (!req.session.userId) return res.json({ uspech: false });
    try {
        const { postId, text } = req.body;
        if (!text || !text.trim()) return res.json({ uspech: false, chyba: 'Text nesmí být prázdný.' });
        const user = await User.findById(req.session.userId);
        const post = await FeedPost.findById(postId);
        if (!post) return res.json({ uspech: false, chyba: 'Příspěvek nenalezen.' });
        if (post.autorId !== req.session.userId.toString() && !user.isAdmin) return res.status(403).json({ uspech: false, chyba: 'Nemáš oprávnění.' });
        await FeedPost.findByIdAndUpdate(postId, { text: text.trim() });
        res.json({ uspech: true });
    } catch (e) { res.json({ uspech: false, chyba: e.message }); }
});

module.exports = router;
