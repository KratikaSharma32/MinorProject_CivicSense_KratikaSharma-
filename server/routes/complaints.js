const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const { protect } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { detectCategory, detectPriority, findSimilarComplaints } = require('../utils/aiDetection');
const { sendNotification, notifyAdmins } = require('../utils/notifications');
const logger = require('../config/logger');

const router = express.Router();

// ─── Validation ───────────────────────────────────────────────────────────────
const complaintValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ min: 10, max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 20, max: 3000 }),
  body('category').isIn(['road','water','electricity','sanitation','sewage','public_transport','parks','noise','animals','other']).withMessage('Invalid category'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

// ─── POST /api/complaints  ── Submit new complaint ───────────────────────────
router.post('/', protect, upload.array('images', 5), handleUploadError, complaintValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }

    const { title, description, category, locationAddress, latitude, longitude, area, city, pincode } = req.body;

    // AI Detection
    const aiResult = detectCategory(title, description);
    const aiPriority = detectPriority(title, description);

    // Find similar complaints
    const similarComplaints = await findSimilarComplaints(title, description);

    // Process uploaded images
    const images = (req.files || []).map(file => ({
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      originalname: file.originalname,
      mimetype: file.mimetype
    }));

    const complaint = new Complaint({
      title,
      description,
      category,
      images,
      location: {
        address: locationAddress,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        area: area || null,
        city: city || 'Jabalpur',
        pincode: pincode || null
      },
      submittedBy: req.user._id,
      aiDetectedCategory: aiResult.category,
      aiConfidence: aiResult.confidence,
      priority: aiPriority,
      similarComplaints,
      statusHistory: [{
        status: 'pending',
        changedBy: req.user._id,
        note: 'Complaint submitted by citizen',
        changedAt: new Date()
      }]
    });

    complaint.calculatePriorityScore();
    await complaint.save();
    await complaint.populate('submittedBy', 'name email');

    logger.info(`Complaint created: ${complaint.complaintId} by ${req.user.email}`);

    // Notify all admins
    await notifyAdmins(
      `New ${complaint.priority} priority complaint: "${title}" [${category}]`,
      complaint.priority === 'critical' ? 'error' : 'info',
      complaint._id
    );

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint,
      ai: {
        detectedCategory: aiResult.category,
        confidence: aiResult.confidence,
        suggestedCategory: aiResult.confidence > 40 ? aiResult.category : null
      },
      duplicateWarning: similarComplaints.length > 0
        ? `${similarComplaints.length} similar complaint(s) already exist`
        : null
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/complaints/detect-category  ── AI detection endpoint ──────────
router.post('/detect-category', protect, async (req, res, next) => {
  try {
    const { title = '', description = '' } = req.body;
    const result = detectCategory(title, description);
    const priority = detectPriority(title, description);
    res.json({ success: true, ...result, suggestedPriority: priority });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/complaints/my  ── Citizen's own complaints ─────────────────────
router.get('/my', protect, async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 10, sort = '-createdAt' } = req.query;
    const query = { submittedBy: req.user._id };
    if (status) query.status = status;
    if (category) query.category = category;

    const allowedSorts = ['-createdAt', 'createdAt', '-priorityScore', 'status'];
    const sortField = allowedSorts.includes(sort) ? sort : '-createdAt';

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [total, complaints] = await Promise.all([
      Complaint.countDocuments(query),
      Complaint.find(query)
        .sort(sortField)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('assignedTo', 'name email')
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

// ─── GET /api/complaints/:id  ── Single complaint detail ─────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID' });
    }

    const complaint = await Complaint.findById(req.params.id)
      .populate('submittedBy', 'name email phone')
      .populate('assignedTo', 'name email department')
      .populate('responses.respondedBy', 'name role')
      .populate('statusHistory.changedBy', 'name role');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Citizens can only view their own complaints
    if (req.user.role === 'citizen' &&
        complaint.submittedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this complaint' });
    }

    // Increment view count (non-blocking)
    Complaint.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();

    res.json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/complaints/:id/upvote  ── Toggle upvote ───────────────────────
router.post('/:id/upvote', protect, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const idx = complaint.upvotes.findIndex(id => id.toString() === req.user._id.toString());
    let action;
    if (idx > -1) {
      complaint.upvotes.splice(idx, 1);
      action = 'removed';
    } else {
      complaint.upvotes.push(req.user._id);
      action = 'added';
    }

    complaint.calculatePriorityScore();
    await complaint.save();

    res.json({ success: true, action, upvotes: complaint.upvotes.length, priority: complaint.priority });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/complaints/:id/feedback  ── Rate resolved complaint ────────────
router.post('/:id/feedback', protect, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
  body('comment').optional().trim().isLength({ max: 1000 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (complaint.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the complaint owner can submit feedback' });
    }
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ success: false, message: 'Feedback can only be given after resolution' });
    }
    if (complaint.feedback?.rating) {
      return res.status(400).json({ success: false, message: 'Feedback already submitted' });
    }

    complaint.feedback = { rating: req.body.rating, comment: req.body.comment };
    await complaint.save();

    logger.info(`Feedback submitted for ${complaint.complaintId}: ${req.body.rating} stars`);
    res.json({ success: true, message: 'Feedback submitted successfully', feedback: complaint.feedback });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
