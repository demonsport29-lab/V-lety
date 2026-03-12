const mongoose = require('mongoose');

const notifikaceSchema = new mongoose.Schema({
    prijemceId: { type: String, required: true },
    odesilatelId: { type: String, required: true },
    odesilatelJmeno: { type: String, required: true },
    odesilatelAvatar: { type: String },
    typ: { type: String, enum: ['komentar', 'zprava'], required: true },
    textPochoutka: { type: String, required: true }, // Náhled ze zprávy nebo komentáře
    precteno: { type: Boolean, default: false },
    vytvoreno: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notifikace', notifikaceSchema);
