/**
 * AI Detection Utility
 * Keyword-based category detection + text similarity for duplicate detection.
 * In production, replace detectCategory with a real ML API call (e.g. Hugging Face, OpenAI).
 */

const CATEGORY_KEYWORDS = {
  road: ['road','pothole','pavement','highway','footpath','sidewalk','traffic','signal','bridge','crack','bump','divider','asphalt','tar','lane','crossing','intersection','street'],
  water: ['water','pipe','leaking','supply','drinking','tap','flush','overflow','flood','waterlogging','canal','tube','borewell','handpump','connection'],
  electricity: ['electric','electricity','power','light','streetlight','outage','wire','transformer','voltage','blackout','pole','spark','shock','cable','short','circuit'],
  sanitation: ['garbage','waste','trash','litter','dirty','cleaning','sweep','bin','dumping','filth','hygiene','odor','smell','compost','disposal','collection'],
  sewage: ['sewage','sewer','drain','blocked','overflow','manhole','stench','wastewater','gutter','septic','toilet','latrine'],
  public_transport: ['bus','transport','route','stop','metro','auto','taxi','fare','overcrowded','schedule','rickshaw','vehicle','commute'],
  parks: ['park','garden','playground','tree','green','bench','equipment','maintenance','grass','flower','recreation','swing','slide','fountain'],
  noise: ['noise','loud','sound','disturbance','music','horn','construction','night','nuisance','honking','blast','speaker'],
  animals: ['dog','animal','stray','cattle','cow','buffalo','mosquito','pest','rat','insect','bird','snake','monkey','bite'],
};

const PRIORITY_KEYWORDS = {
  critical: ['emergency','danger','dangerous','hazard','accident','fire','flood','collapse','burst','electrocution','death','injury','urgent','sos'],
  high: ['severe','major','serious','overflowing','outage','blackout','broken','damage','contaminated','unsafe','threat'],
  medium: ['pothole','leaking','blocked','missing','faulty','dirty','smell','irregular','delay'],
  low: ['minor','small','request','suggestion','improve','paint','signage'],
};

/**
 * Detect category from text
 * @returns {{ category: string, confidence: number, scores: Object }}
 */
const detectCategory = (title = '', description = '') => {
  const text = (title + ' ' + description).toLowerCase();
  const scores = {};
  let maxScore = 0;
  let detectedCategory = 'other';

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    keywords.forEach(kw => {
      // Whole word match gets higher score
      const wholeWord = new RegExp(`\\b${kw}\\b`, 'i');
      if (wholeWord.test(text)) score += 2;
      else if (text.includes(kw)) score += 1;
    });
    scores[category] = score;
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = category;
    }
  }

  const confidence = maxScore > 0 ? Math.min(Math.round((maxScore / 8) * 100), 97) : 0;
  return { category: detectedCategory, confidence, scores };
};

/**
 * Detect priority from text
 * @returns {string} priority level
 */
const detectPriority = (title = '', description = '') => {
  const text = (title + ' ' + description).toLowerCase();
  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(text))) {
      return priority;
    }
  }
  return 'medium';
};

/**
 * Calculate Jaccard similarity between two strings
 * @returns {number} 0–1 similarity score
 */
const jaccardSimilarity = (text1, text2) => {
  const tokenize = (str) => new Set(
    str.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
  const set1 = tokenize(text1);
  const set2 = tokenize(text2);
  if (set1.size === 0 || set2.size === 0) return 0;
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
};

/**
 * Find similar complaints to detect duplicates
 * @param {string} title
 * @param {string} description
 * @param {string|null} excludeId - Complaint ID to exclude (for updates)
 * @returns {Promise<ObjectId[]>} Array of similar complaint IDs
 */
const findSimilarComplaints = async (title, description, excludeId = null) => {
  const Complaint = require('../models/Complaint');
  const searchText = title + ' ' + description;

  // Only check recent unresolved complaints for efficiency
  const recentComplaints = await Complaint.find({
    status: { $nin: ['resolved', 'closed', 'rejected'] },
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // last 30 days
    ...(excludeId && { _id: { $ne: excludeId } })
  })
    .limit(100)
    .select('title description _id');

  const similar = [];
  for (const complaint of recentComplaints) {
    const compText = complaint.title + ' ' + complaint.description;
    const similarity = jaccardSimilarity(searchText, compText);
    if (similarity >= 0.3) {
      similar.push({ id: complaint._id, similarity });
    }
  }

  return similar
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)
    .map(s => s.id);
};

module.exports = { detectCategory, detectPriority, findSimilarComplaints, jaccardSimilarity };
