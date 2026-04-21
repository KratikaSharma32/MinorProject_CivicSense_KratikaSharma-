const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Send a notification to a specific user (DB + socket)
 * @param {string|ObjectId} userId
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {string|null} complaintId
 */
const sendNotification = async (userId, message, type = 'info', complaintId = null) => {
  try {
    const notification = {
      message,
      type,
      read: false,
      complaintId,
      createdAt: new Date()
    };

    // Persist to DB (keep last 50)
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          $each: [notification],
          $position: 0,
          $slice: 50
        }
      }
    });

    // Emit via Socket.io if user is online
    if (global.io) {
      global.io.to(userId.toString()).emit('notification', {
        ...notification,
        complaintId: complaintId?.toString()
      });
    }

    logger.debug(`Notification sent to user ${userId}: ${message}`);
  } catch (err) {
    logger.error(`Failed to send notification to user ${userId}: ${err.message}`);
  }
};

/**
 * Notify all admins and officers (DB + admin socket room)
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {string|null} complaintId
 */
const notifyAdmins = async (message, type = 'info', complaintId = null) => {
  try {
    const admins = await User.find({
      role: { $in: ['admin', 'officer'] },
      isActive: true
    }).select('_id');

    if (admins.length === 0) return;

    await Promise.allSettled(
      admins.map(admin => sendNotification(admin._id, message, type, complaintId))
    );

    // Broadcast to admin socket room
    if (global.io) {
      global.io.to('admin-room').emit('admin-notification', {
        message,
        type,
        complaintId: complaintId?.toString(),
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    logger.error(`Failed to notify admins: ${err.message}`);
  }
};

/**
 * Emit a real-time complaint update event
 * @param {string} complaintId
 * @param {object} data
 */
const emitComplaintUpdate = (complaintId, data) => {
  if (global.io) {
    global.io.emit('complaint-updated', {
      complaintId: complaintId.toString(),
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { sendNotification, notifyAdmins, emitComplaintUpdate };
