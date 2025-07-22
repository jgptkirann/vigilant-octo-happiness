const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
  hashPassword,
  comparePassword,
  isValidPhoneNumber,
  sanitizePhone,
  getPaginationParams,
  getPaginationMeta
} = require('../utils/helpers');

const router = express.Router();

// Validation middleware
const validateProfileUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('phone')
    .optional()
    .custom((value) => {
      if (value && !isValidPhoneNumber(value)) {
        throw new Error('Please provide a valid Nepal phone number');
      }
      return true;
    }),
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters')
    .trim(),
  body('dateOfBirth')
    .optional()
    .isDate()
    .withMessage('Please provide a valid date of birth')
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      errorResponse('Validation failed', errors.array())
    );
  }
  next();
};

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, role, is_verified, profile_image, address, date_of_birth, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    const user = result.rows[0];

    res.json(
      successResponse(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.is_verified,
            profileImage: user.profile_image,
            address: user.address,
            dateOfBirth: user.date_of_birth,
            createdAt: user.created_at
          }
        },
        'Profile retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve profile')
    );
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, validateProfileUpdate, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Remove undefined fields and email (email cannot be updated here)
    const validUpdates = Object.entries(updates)
      .filter(([key, value]) => value !== undefined && key !== 'email')
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json(
        errorResponse('No valid fields provided for update')
      );
    }

    // Sanitize phone number if provided
    if (validUpdates.phone) {
      validUpdates.phone = sanitizePhone(validUpdates.phone);
      
      // Check if phone number already exists for another user
      const phoneCheck = await query(
        'SELECT id FROM users WHERE phone = $1 AND id != $2',
        [validUpdates.phone, userId]
      );

      if (phoneCheck.rows.length > 0) {
        return res.status(409).json(
          errorResponse('Phone number already exists')
        );
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const queryParams = [];
    let paramCount = 0;

    const fieldMap = {
      'name': 'name',
      'phone': 'phone',
      'address': 'address',
      'dateOfBirth': 'date_of_birth'
    };

    for (const [key, value] of Object.entries(validUpdates)) {
      const dbField = fieldMap[key];
      if (dbField) {
        paramCount++;
        updateFields.push(`${dbField} = $${paramCount}`);
        queryParams.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json(
        errorResponse('No valid fields provided for update')
      );
    }

    paramCount++;
    queryParams.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, name, email, phone, role, is_verified, profile_image, address, date_of_birth, updated_at
    `;

    const result = await query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    const user = result.rows[0];

    res.json(
      successResponse(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.is_verified,
            profileImage: user.profile_image,
            address: user.address,
            dateOfBirth: user.date_of_birth,
            updatedAt: user.updated_at
          }
        },
        'Profile updated successfully'
      )
    );

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json(
      errorResponse('Failed to update profile')
    );
  }
});

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticateToken, validatePasswordChange, handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user password
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json(
        errorResponse('Current password is incorrect')
      );
    }

    // Check if new password is different from current
    const isSamePassword = await comparePassword(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json(
        errorResponse('New password must be different from current password')
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json(
      successResponse(null, 'Password changed successfully')
    );

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json(
      errorResponse('Failed to change password')
    );
  }
});

// @route   GET /api/users/bookings-summary
// @desc    Get user's booking summary statistics
// @access  Private
router.get('/bookings-summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get booking counts by status
    const summaryResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) as total_bookings,
        SUM(total_amount) FILTER (WHERE status IN ('confirmed', 'completed')) as total_spent
      FROM bookings 
      WHERE user_id = $1
    `, [userId]);

    // Get upcoming bookings
    const upcomingResult = await query(`
      SELECT COUNT(*) as upcoming_count
      FROM bookings 
      WHERE user_id = $1 
      AND status IN ('pending', 'confirmed') 
      AND booking_date >= CURRENT_DATE
    `, [userId]);

    // Get favorite facilities (most booked)
    const favoritesResult = await query(`
      SELECT 
        f.id, f.name, f.address, f.images,
        COUNT(b.id) as booking_count
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.id
      WHERE b.user_id = $1
      GROUP BY f.id, f.name, f.address, f.images
      ORDER BY booking_count DESC
      LIMIT 3
    `, [userId]);

    const summary = summaryResult.rows[0];
    const upcoming = upcomingResult.rows[0];

    const bookingSummary = {
      totalBookings: parseInt(summary.total_bookings) || 0,
      pendingBookings: parseInt(summary.pending_count) || 0,
      confirmedBookings: parseInt(summary.confirmed_count) || 0,
      completedBookings: parseInt(summary.completed_count) || 0,
      cancelledBookings: parseInt(summary.cancelled_count) || 0,
      upcomingBookings: parseInt(upcoming.upcoming_count) || 0,
      totalSpent: parseFloat(summary.total_spent) || 0,
      favoriteFacilities: favoritesResult.rows.map(facility => ({
        id: facility.id,
        name: facility.name,
        address: facility.address,
        images: facility.images || [],
        bookingCount: facility.booking_count
      }))
    };

    res.json(
      successResponse(
        { summary: bookingSummary },
        'Booking summary retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get booking summary error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve booking summary')
    );
  }
});

// @route   GET /api/users/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { isRead } = req.query;
    const userId = req.user.id;

    // Build query conditions
    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramCount = 1;

    if (isRead !== undefined) {
      paramCount++;
      whereConditions.push(`is_read = $${paramCount}`);
      queryParams.push(isRead === 'true');
    }

    // Get notifications
    const notificationsQuery = `
      SELECT id, title, message, type, is_read, related_id, related_type, created_at
      FROM notifications
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE ${whereConditions.join(' AND ')}
    `;

    // Execute queries
    const [notificationsResult, countResult] = await Promise.all([
      query(notificationsQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const meta = getPaginationMeta(page, limit, total);

    res.json(
      successResponse(
        { 
          notifications: notificationsResult.rows.map(notification => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            isRead: notification.is_read,
            relatedId: notification.related_id,
            relatedType: notification.related_type,
            createdAt: notification.created_at
          }))
        },
        'Notifications retrieved successfully',
        meta
      )
    );

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve notifications')
    );
  }
});

// @route   PUT /api/users/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Notification not found')
      );
    }

    res.json(
      successResponse(null, 'Notification marked as read')
    );

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json(
      errorResponse('Failed to mark notification as read')
    );
  }
});

// @route   PUT /api/users/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING id',
      [userId]
    );

    res.json(
      successResponse(
        { updatedCount: result.rows.length },
        'All notifications marked as read'
      )
    );

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json(
      errorResponse('Failed to mark all notifications as read')
    );
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check for active bookings
    const activeBookingsResult = await query(
      'SELECT COUNT(*) as count FROM bookings WHERE user_id = $1 AND status IN (\'pending\', \'confirmed\') AND booking_date >= CURRENT_DATE',
      [userId]
    );

    const activeBookingsCount = parseInt(activeBookingsResult.rows[0].count);

    if (activeBookingsCount > 0) {
      return res.status(400).json(
        errorResponse(`Cannot delete account with ${activeBookingsCount} active booking(s). Please cancel them first.`)
      );
    }

    // For futsal owners, check for facilities with active bookings
    if (req.user.role === 'owner') {
      const facilitiesWithBookingsResult = await query(`
        SELECT COUNT(*) as count 
        FROM facilities f
        JOIN bookings b ON f.id = b.facility_id
        WHERE f.owner_id = $1 
        AND b.status IN ('pending', 'confirmed') 
        AND b.booking_date >= CURRENT_DATE
      `, [userId]);

      const facilitiesWithBookingsCount = parseInt(facilitiesWithBookingsResult.rows[0].count);

      if (facilitiesWithBookingsCount > 0) {
        return res.status(400).json(
          errorResponse(`Cannot delete account. Your facilities have ${facilitiesWithBookingsCount} active booking(s).`)
        );
      }
    }

    // Soft delete - deactivate user account
    await query(
      'UPDATE users SET is_verified = false, email = CONCAT(email, \'_deleted_\', id), phone = CONCAT(phone, \'_deleted_\', id) WHERE id = $1',
      [userId]
    );

    res.json(
      successResponse(null, 'Account deleted successfully')
    );

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json(
      errorResponse('Failed to delete account')
    );
  }
});

module.exports = router;