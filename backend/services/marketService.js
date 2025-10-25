const path = require('path');
const fs = require('fs');

const dataPath = path.join(__dirname, '..', 'data', 'marketDemand.json');
let marketData = [];

try {
  const raw = fs.readFileSync(dataPath, 'utf8');
  marketData = JSON.parse(raw);
} catch (err) {
  console.error('Failed to load market demand data:', err);
}

module.exports = {
  // Return market demand score (0-100) for a given skill name (case-insensitive)
  getDemandScore(skillName) {
    if (!skillName) return 0;
    const item = marketData.find(i => i.name.toLowerCase() === skillName.toLowerCase());
    return item ? item.demandScore : 50; // default medium score when unknown
  },

  // Return top N skills by demand that are not in the exclude list
  getTopSkills(exclude = [], limit = 5) {
    const excludeLower = exclude.map(s => s.toLowerCase());
    return marketData
      .filter(s => !excludeLower.includes(s.name.toLowerCase()))
      .sort((a, b) => b.demandScore - a.demandScore)
      .slice(0, limit);
  },

  // Return full market data (small dataset)
  getAll() {
    return marketData;
  }
};