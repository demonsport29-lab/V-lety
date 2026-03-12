const mongoose = require('mongoose');

const komentarSchema = new mongoose.Schema({
    vyletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vylet', index: true },
    oldId: String, // původní unikátní ID komentáře (kvůli kompatibilitě frontendového listu)
    autorId: String,
    autor: String,
    avatar: String,
    text: String,
    datum: String
});

module.exports = mongoose.model('Komentar', komentarSchema);
