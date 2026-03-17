const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    googleId: String, email: String, jmeno: String, prijmeni: String, prezdivka: String,
    vek: Number, telefon: String, bio: String, avatar: String, zajmy: [String],
    sleduji: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],    // Koho já sleduji (Following)
    sledujici: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],  // Kdo sleduje mě (Followers)
    pratele: [{ type: String }],
    isPremium: { type: Boolean, default: false }, isAdmin: { type: Boolean, default: false },
    achievementy: { type: Array, default: [] }, // [{ id, nazev, ikona, datumZisku }]
    statistiky: {
        celkemKm: { type: Number, default: 0 },
        vyletyPocet: { type: Number, default: 0 },
        aiVyletyPocet: { type: Number, default: 0 }
    },
    verejnyProfil: { type: Boolean, default: true }
});

module.exports = mongoose.model('User', userSchema);
