const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    googleId: String, email: String, jmeno: String, prijmeni: String, prezdivka: String,
    vek: Number, telefon: String, bio: String, avatar: String, zajmy: [String],
    isPremium: { type: Boolean, default: false }, isAdmin: { type: Boolean, default: false } 
});

module.exports = mongoose.model('User', userSchema);
