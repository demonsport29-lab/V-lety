require('dotenv').config();
const mongoose = require('mongoose');
const Vylet = require('./models/Vylet');
const Komentar = require('./models/Komentar');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
      console.log('Connecting to DB for migration...');
      const vylety = await Vylet.find({});
      let zmigrovano = 0;
      for (const v of vylety) {
          if (v.komentare && v.komentare.length > 0) {
              for (const k of v.komentare) {
                  // zamezení duplikací při opakovaném spuštění
                  const existuje = await Komentar.findOne({ vyletId: v._id, oldId: k.id });
                  if (!existuje) {
                      await new Komentar({
                          vyletId: v._id,
                          oldId: k.id,
                          autorId: k.autorId,
                          autor: k.autor,
                          avatar: k.avatar,
                          text: k.text,
                          datum: k.datum
                      }).save();
                      zmigrovano++;
                  }
              }
              // Vyčistíme array z původních dokumentů, aby nezabíraly místo (optimalizace)
              await Vylet.updateOne({ _id: v._id }, { $set: { komentare: [] } });
          }
      }
      console.log(`Migrace komentářů kompletní. Zmigrováno kusů: ${zmigrovano}.`);
      process.exit(0);
  })
  .catch(err => {
      console.error(err);
      process.exit(1);
  });
