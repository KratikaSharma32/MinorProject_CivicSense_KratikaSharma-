const express = require('express');
const Complaint = require('../models/Complaint');
const logger = require('../config/logger');

const router = express.Router();

// ─── GET /api/public/complaints ── Public complaint board ─────────────────────
router.get('/complaints', async (req, res, next) => {
  try {
    const { category, status, area, page = 1, limit = 20 } = req.query;
    const query = { isPublic: true };
    if (category) query.category = category;
    if (status) query.status = status;
    if (area) query['location.area'] = { $regex: area, $options: 'i' };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [total, complaints] = await Promise.all([
      Complaint.countDocuments(query),
      Complaint.find(query)
        .select('title complaintId category status priority location createdAt upvotes resolvedAt images')
        .sort('-createdAt')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean()
    ]);

    // Strip sensitive data from location
    const sanitized = complaints.map(c => ({
      ...c,
      location: {
        area: c.location?.area,
        city: c.location?.city,
        address: c.location?.address,
        latitude: c.location?.latitude,
        longitude: c.location?.longitude
      }
    }));

    res.json({ success: true, complaints: sanitized, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/public/map-data ── Geo data for heatmap ───────────────────────
router.get('/map-data', async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      isPublic: true,
      'location.latitude': { $ne: null, $exists: true },
      'location.longitude': { $ne: null, $exists: true }
    })
      .select('location.latitude location.longitude category status priority title complaintId')
      .limit(500)
      .lean();

    res.json({ success: true, count: complaints.length, complaints });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/public/stats ── Public statistics ───────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [total, resolved, byCategory, byStatus, byArea, recentTrend] = await Promise.all([
      Complaint.countDocuments({ isPublic: true }),
      Complaint.countDocuments({ isPublic: true, status: 'resolved' }),
      Complaint.aggregate([
        { $match: { isPublic: true } },
        { $group: { _id: '$category', count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } } } },
        { $sort: { count: -1 } }
      ]),
      Complaint.aggregate([
        { $match: { isPublic: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Complaint.aggregate([
        { $match: { isPublic: true, 'location.area': { $ne: null } } },
        { $group: { _id: '$location.area', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 }
      ]),
      // Last 7 days trend
      Complaint.aggregate([
        { $match: { isPublic: true, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        total, resolved,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        byCategory, byStatus, byArea, recentTrend
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
