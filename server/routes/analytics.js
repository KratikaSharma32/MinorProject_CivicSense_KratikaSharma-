const express = require('express');
const Complaint = require('../models/Complaint');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.use(authorize('admin', 'officer'));

// ─── GET /api/analytics/monthly ── Last 12 months trend ─────────────────────
router.get('/monthly', async (req, res, next) => {
  try {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (11 - i));
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      };
    });

    const data = await Promise.all(months.map(async ({ label, start, end }) => {
      const [total, resolved, critical] = await Promise.all([
        Complaint.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        Complaint.countDocuments({ status: 'resolved', createdAt: { $gte: start, $lte: end } }),
        Complaint.countDocuments({ priority: 'critical', createdAt: { $gte: start, $lte: end } })
      ]);
      return { month: label, total, resolved, critical };
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/category ── By category breakdown ────────────────────
router.get('/category', async (req, res, next) => {
  try {
    const data = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
          avgUpvotes: { $avg: { $size: '$upvotes' } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/resolution-time ── Avg resolution time by category ───
router.get('/resolution-time', async (req, res, next) => {
  try {
    const data = await Complaint.aggregate([
      { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
      {
        $project: {
          category: 1,
          resolutionHours: {
            $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60]
          }
        }
      },
      {
        $group: {
          _id: '$category',
          avgHours: { $avg: '$resolutionHours' },
          minHours: { $min: '$resolutionHours' },
          maxHours: { $max: '$resolutionHours' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          avgDays: { $round: [{ $divide: ['$avgHours', 24] }, 1] },
          avgHours: { $round: ['$avgHours', 1] },
          minHours: { $round: ['$minHours', 1] },
          maxHours: { $round: ['$maxHours', 1] },
          count: 1
        }
      },
      { $sort: { avgHours: 1 } }
    ]);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/priority ── Priority distribution ────────────────────
router.get('/priority', async (req, res, next) => {
  try {
    const data = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/area ── Complaints by area ───────────────────────────
router.get('/area', async (req, res, next) => {
  try {
    const data = await Complaint.aggregate([
      { $match: { 'location.area': { $ne: null, $exists: true } } },
      {
        $group: {
          _id: '$location.area',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 15 }
    ]);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/officer-performance ── Officer stats ──────────────────
router.get('/officer-performance', async (req, res, next) => {
  try {
    const data = await Complaint.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          avgResolutionHours: {
            $avg: {
              $cond: [
                { $ne: ['$resolvedAt', null] },
                { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60] },
                null
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'officer'
        }
      },
      { $unwind: { path: '$officer', preserveNullAndEmpty: false } },
      {
        $project: {
          name: '$officer.name',
          email: '$officer.email',
          department: '$officer.department',
          total: 1, resolved: 1,
          resolutionRate: {
            $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }, 0]
          },
          avgResolutionHours: { $round: ['$avgResolutionHours', 1] }
        }
      },
      { $sort: { resolved: -1 } }
    ]);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
