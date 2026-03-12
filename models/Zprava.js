const mongoose = require('mongoose');

const zpravaSchema = new mongoose.Schema({
    odesilatelId: { type: String, required: true },
    prijemceId: { type: String, required: true },
    text: { type: String, required: true },
    datum: { type: String, default: () => new Date().toLocaleString('cs-CZ') },
    precteno: { type: Boolean, default: false }
});

module.exports = mongoose.model('Zprava', zpravaSchema);
