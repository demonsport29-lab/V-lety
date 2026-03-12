const mongoose = require('mongoose');

const vyletSchema = new mongoose.Schema({
    verejny: { type: Boolean, default: false },
    vlastnikId: String, lokace: String, popis: String, obtiznost: Number, typ: String,
    etapy: Array, dokonceno: { type: Boolean, default: false }, fotky: [String], 
    hodnoceni: { type: Number, default: 0 }, 
    datumUlozeni: String,
    gpxTrasa: { type: Array, default: [] }
});

module.exports = mongoose.model('Vylet', vyletSchema);
