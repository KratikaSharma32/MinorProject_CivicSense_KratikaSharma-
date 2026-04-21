const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { sendNotification, notifyAdmins, emitComplaintUpdate } = require('../utils/notifications');
const logger = require('../config/logger');

const router = express.Router();
router.use(protect);
router.use(authorize('admin', 'officer'));

// ─── GET /api/admin/complaints ── List all complaints ─────────────────────────
router.get('/complaints', async (req, res, next) => {
  try {
    const { status, category, priority, area, assignedTo, search, page = 1, limit = 15, sort = '-priorityScore' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (area) query['location.area'] = { $regex: area, $options: 'i' };
    if (assignedTo === 'unassigned') query.assignedTo = null;
    else if (assignedTo) query.assignedTo = mongoose.Types.ObjectId.isValid(assignedTo) ? assignedTo : undefined;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { complaintId: { $regex: search, $options: 'i' } }
      ];
    }

    const allowedSorts = ['-priorityScore', '-createdAt', 'createdAt', 'status', '-upvotes'];
    const sortField = allowedSorts.includes(sort) ? sort : '-priorityScore';
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const [total, complaints] = await Promise.all([
      Complaint.countDocuments(query),
      Complaint.find(query)
        .sort(sortField)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('submittedBy', 'name email phone')
        .populate('assignedTo', 'name email department')
        .lean()
    ]);

    res.json({
      success: true,
      complaints,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/complaints/:id ── Single complaint (admin view) ───────────
router.get('/complaints/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    const complaint = await Complaint.findById(req.params.id)
      .populate('submittedBy', 'name email phone address')
      .populate('assignedTo', 'name email department role')
      .populate('responses.respondedBy', 'name role department')
      .populate('statusHistory.changedBy', 'name role');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/complaints/:id/status ── Update status ───────────────────
router.put('/complaints/:id/status', [
  body('status').isIn(['pending','under_review','in_progress','resolved','rejected','closed']).withMessage('Invalid status'),
  body('note').optional().trim().isLength({ max: 500 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const complaint = await Complaint.findById(req.params.id).populate('submittedBy', '_id name email');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const { status, note } = req.body;
    const oldStatus = complaint.status;

    complaint.status = status;
    complaint.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note || `Status changed from ${oldStatus} to ${status} by ${req.user.name}`,
      changedAt: new Date()
    });

    if (status === 'resolved' && !complaint.resolvedAt) {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();
    await complaint.populate('assignedTo', 'name email');

    logger.info(`Complaint ${complaint.complaintId} status: ${oldStatus} → ${status} by ${req.user.email}`);

    // Citizen notification
    const statusMessages = {
      under_review: 'is now under review by officials',
      in_progress: 'is being actively worked on',
      resolved: 'has been resolved! Please share your feedback.',
      rejected: 'could not be processed at this time',
      closed: 'has been closed'
    };

    await sendNotification(
      complaint.submittedBy._id,
      `Your complaint "${complaint.title}" ${statusMessages[status] || 'has been updated'}`,
      status === 'resolved' ? 'success' : status === 'rejected' ? 'warning' : 'info',
      complaint._id
    );

    // Real-time broadcast
    emitComplaintUpdate(complaint._id, {
      status,
      updatedBy: req.user.name,
      complaintId: complaint.complaintId
    });

    res.json({ success: true, message: `Status updated to ${status}`, complaint });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/complaints/:id/assign ── Assign officer ──────────────────
router.put('/complaints/:id/assign', [
  body('officerId').optional({ nullable: true })
], async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const { officerId } = req.body;

    // Validate officer exists if provided
    if (officerId) {
      if (!mongoose.Types.ObjectId.isValid(officerId)) {
        return res.status(400).json({ success: false, message: 'Invalid officer ID' });
      }
      const officer = await User.findById(officerId);
      if (!officer || !['admin', 'officer'].includes(officer.role)) {
        return res.status(400).json({ success: false, message: 'Invalid officer' });
      }
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { assignedTo: officerId || null },
      { new: true }
    ).populate('assignedTo', 'name email department');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (officerId) {
      await sendNotification(
        officerId,
        `Complaint "${complaint.title}" [${complaint.complaintId}] has been assigned to you`,
        'info',
        complaint._id
      );
    }

    logger.info(`Complaint ${complaint.complaintId} assigned to officer ${officerId || 'unassigned'}`);
    res.json({ success: true, message: officerId ? 'Complaint assigned' : 'Assignment removed', complaint });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/complaints/:id/respond ── Add official response ──────────
router.post('/complaints/:id/respond', [
  body('message').trim().notEmpty().withMessage('Response message required').isLength({ max: 2000 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const complaint = await Complaint.findById(req.params.id).populate('submittedBy', '_id name');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.responses.push({
      message: req.body.message,
      respondedBy: req.user._id,
      respondedAt: new Date()
    });
    await complaint.save();

    await sendNotification(
      complaint.submittedBy._id,
      `An official response has been added to your complaint "${complaint.title}"`,
      'info',
      complaint._id
    );

    logger.info(`Response added to complaint ${complaint.complaintId} by ${req.user.email}`);
    res.json({ success: true, message: 'Response added', responses: complaint.responses });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/stats ── Dashboard statistics ────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      total, pending, underReview, inProgress, resolved, rejected, critical, todayCount, weekCount,
      avgResolutionResult, topCategories
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'pending' }),
      Complaint.countDocuments({ status: 'under_review' }),
      Complaint.countDocuments({ status: 'in_progress' }),
      Complaint.countDocuments({ status: 'resolved' }),
      Complaint.countDocuments({ status: 'rejected' }),
      Complaint.countDocuments({ priority: 'critical', status: { $nin: ['resolved','closed'] } }),
      Complaint.countDocuments({ createdAt: { $gte: today } }),
      Complaint.countDocuments({ createdAt: { $gte: weekAgo } }),
      Complaint.aggregate([
        { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
        { $project: { resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] } } },
        { $group: { _id: null, avgMs: { $avg: '$resolutionMs' } } }
      ]),
      Complaint.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 5 }
      ])
    ]);

    const avgResolutionHours = avgResolutionResult.length > 0
      ? Math.round(avgResolutionResult[0].avgMs / (1000 * 60 * 60))
      : 0;

    res.json({
      success: true,
      stats: {
        total, pending, underReview, inProgress, resolved, rejected, critical,
        todayCount, weekCount, avgResolutionHours,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        topCategories
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/officers ── List officers for assignment ──────────────────
router.get('/officers', async (req, res, next) => {
  try {
    const officers = await User.find({ role: { $in: ['admin', 'officer'] }, isActive: true })
      .select('name email department role')
      .sort('name');
    res.json({ success: true, officers });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/users ── List all users (admin only) ─────────────────────
router.get('/users', authorize('admin'), async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).select('-password -notifications').sort('-createdAt')
        .skip((pageNum - 1) * limitNum).limit(limitNum)
    ]);

    res.json({ success: true, users, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/users/:id/toggle ── Activate/deactivate user ──────────────
router.put('/users/:id/toggle', authorize('admin'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    logger.info(`User ${user.email} ${user.isActive ? 'activated' : 'deactivated'} by ${req.user.email}`);
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
