const mongoose = require('mongoose');

const vyletSchema = new mongoose.Schema({
    verejny: { type: Boolean, default: false },
    vlastnikId: String, lokace: String, popis: String, obtiznost: Number, typ: String,
    etapy: Array, dokonceno: { type: Boolean, default: false }, fotky: [String], 
    hodnoceni: { type: Number, default: 0 }, 
    datumUlozeni: String,
    gpxTrasa: { type: Array, default: [] },
    rozpocet: [{ kdo: String, zaCo: String, kolik: Number, id: String }],
    shareId: { type: String, unique: true, sparse: true }
});

module.exports = mongoose.model('Vylet', vyletSchema);
