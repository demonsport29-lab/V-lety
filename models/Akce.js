const mongoose = require('mongoose');

const akceSchema = new mongoose.Schema({
    nazev: { type: String, required: true },
    datum: { type: String, required: true },
    misto: { type: String, required: true },
    popis: { type: String, required: true },
    logoUrl: { type: String, required: true },
    vstupenkyUrl: { type: String, required: true },
    vytvoreno: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Akce', akceSchema);
