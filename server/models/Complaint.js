const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 1000 },
  submittedAt: { type: Date, default: Date.now }
}, { _id: false });

const responseSchema = new mongoose.Schema({
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  respondedAt: { type: Date, default: Date.now }
});

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true, enum: ['pending','under_review','in_progress','resolved','rejected','closed'] },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
  note: { type: String, maxlength: 500 }
});

const imageSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  originalname: { type: String },
  mimetype: { type: String }
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: 'text'
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [3000, 'Description cannot exceed 3000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['road','water','electricity','sanitation','sewage','public_transport','parks','noise','animals','other'],
      message: 'Invalid category'
    },
    index: true
  },
  status: {
    type: String,
    enum: ['pending','under_review','in_progress','resolved','rejected','closed'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low','medium','high','critical'],
    default: 'medium',
    index: true
  },
  images: { type: [imageSchema], default: [] },
  location: {
    address: { type: String, trim: true, maxlength: 500 },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    area: { type: String, trim: true, maxlength: 100, index: true },
    city: { type: String, trim: true, maxlength: 100, default: 'Jabalpur' },
    state: { type: String, trim: true, maxlength: 100, default: 'Madhya Pradesh' },
    pincode: { type: String, maxlength: 10 }
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Submitter is required'],
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  department: { type: String, trim: true },
  statusHistory: { type: [statusHistorySchema], default: [] },
  responses: { type: [responseSchema], default: [] },
  feedback: { type: feedbackSchema, default: null },
  aiDetectedCategory: { type: String },
  aiConfidence: { type: Number, min: 0, max: 100 },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
  similarComplaints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }],
  priorityScore: { type: Number, default: 0, index: true },
  viewCount: { type: Number, default: 0 },
  upvotes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  resolvedAt: { type: Date, default: null },
  estimatedResolutionDate: { type: Date, default: null },
  isPublic: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ category: 1, status: 1 });
complaintSchema.index({ submittedBy: 1, createdAt: -1 });
complaintSchema.index({ priorityScore: -1, createdAt: -1 });
complaintSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
complaintSchema.index({ createdAt: -1 });
// Text search index
complaintSchema.index({ title: 'text', description: 'text' });

// Virtual: resolution time in hours
complaintSchema.virtual('resolutionTimeHours').get(function() {
  if (!this.resolvedAt) return null;
  return Math.round((this.resolvedAt - this.createdAt) / (1000 * 60 * 60));
});

// Auto-generate complaint ID
complaintSchema.pre('save', async function(next) {
  if (!this.complaintId) {
    const count = await mongoose.model('Complaint').countDocuments();
    const year = new Date().getFullYear().toString().slice(-2);
    this.complaintId = `CMP${year}${String(count + 1).padStart(6, '0')}`;
  }
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

// Priority scoring
complaintSchema.methods.calculatePriorityScore = function() {
  let score = 0;
  const text = (this.title + ' ' + this.description).toLowerCase();

  const criticalKw = ['emergency','danger','hazard','flood','fire','collapse','accident','burst'];
  const highKw = ['urgent','severe','overflow','overflowing','outage','blackout','broken','damage'];
  const mediumKw = ['pothole','leaking','blocked','missing','faulty','dirty','smell'];

  criticalKw.forEach(kw => { if (text.includes(kw)) score += 35; });
  highKw.forEach(kw => { if (text.includes(kw)) score += 20; });
  mediumKw.forEach(kw => { if (text.includes(kw)) score += 10; });

  const upvoteCount = this.upvotes?.length || 0;
  if (upvoteCount >= 20) score += 30;
  else if (upvoteCount >= 10) score += 20;
  else if (upvoteCount >= 5) score += 10;

  const similarCount = this.similarComplaints?.length || 0;
  if (similarCount >= 5) score += 30;
  else if (similarCount >= 3) score += 20;
  else if (similarCount >= 1) score += 10;

  this.priorityScore = score;
  if (score >= 70) this.priority = 'critical';
  else if (score >= 45) this.priority = 'high';
  else if (score >= 20) this.priority = 'medium';
  else this.priority = 'low';

  return score;
};

module.exports = mongoose.model('Complaint', complaintSchema);
