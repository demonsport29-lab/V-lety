const User = require('../models/User');

const ACHIEVEMENTS = [
    { id: 'first_trail', nazev: 'První stopa', ikona: 'ti-map-2', popis: 'Uložil jsi svůj první výlet.' },
    { id: 'conqueror', nazev: 'Dobyvatel', ikona: 'ti-trophy', popis: 'Dokončil jsi 10 výletů.' },
    { id: 'planner', nazev: 'Plánovač', ikona: 'ti-brain', popis: 'Vygeneroval jsi 5 AI výletů.' },
    { id: 'socialite', nazev: 'Sdíleč', ikona: 'ti-share', popis: 'Sdílel jsi výlet veřejně.' }
];

async function checkAchievements(userId, trigger) {
    try {
        const user = await User.findById(userId);
        if (!user) return [];

        let newAchievements = [];
        const currentIds = user.achievementy.map(a => a.id);

        // 1. První stopa
        if (trigger === 'save_trip' && !currentIds.includes('first_trail')) {
            newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'first_trail'));
        }

        // 2. Dobyvatel (10 dokončených)
        if (trigger === 'complete_trip' && !currentIds.includes('conqueror')) {
            if (user.statistiky.tripCount >= 10) {
                newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'conqueror'));
            }
        }

        // 3. Plánovač (5 AI vygenerovaných)
        if (trigger === 'ai_gen' && !currentIds.includes('planner')) {
            if (user.statistiky.aiVyletyPocet >= 5) {
                newAchievements.push(ACHIEVEMENTS.find(a => a.id === 'planner'));
            }
        }

        if (newAchievements.length > 0) {
            const datum = new Date().toLocaleDateString('cs-CZ');
            const toAdd = newAchievements.map(a => ({ ...a, datumZisku: datum }));
            
            await User.findByIdAndUpdate(userId, {
                $push: { achievementy: { $each: toAdd } }
            });
            return toAdd;
        }

        return [];
    } catch (e) {
        console.error("Chyba při kontrole achievementů:", e);
        return [];
    }
}

module.exports = { checkAchievements, ACHIEVEMENTS };
