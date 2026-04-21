const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true, maxlength: 500 },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  read: { type: Boolean, default: false },
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,4})+$/, 'Please enter a valid email address'],
    maxlength: [150, 'Email too long']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: { values: ['citizen', 'admin', 'officer'], message: 'Role must be citizen, admin, or officer' },
    default: 'citizen'
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [15, 'Phone number too long']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address too long']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [150, 'Department name too long']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  notifications: {
    type: [notificationSchema],
    default: [],
    validate: {
      validator: function(v) { return v.length <= 100; },
      message: 'Max 100 notifications stored'
    }
  },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get unread notification count
userSchema.methods.getUnreadCount = function() {
  return this.notifications.filter(n => !n.read).length;
};

// Add notification (trim old ones)
userSchema.methods.addNotification = function(message, type, complaintId) {
  this.notifications.push({ message, type, complaintId });
  if (this.notifications.length > 100) {
    this.notifications = this.notifications.slice(-100);
  }
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
