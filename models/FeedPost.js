const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
    autorId: String, autorJmeno: String, autorAvatar: String,
    text: String, fotky: [String], pripojenyVyletId: String, pripojenyVyletLokace: String,
    datum: String, timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FeedPost', feedSchema);
