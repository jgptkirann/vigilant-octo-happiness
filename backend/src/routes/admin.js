const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
  getPaginationParams,
  getPaginationMeta,
  hashPassword
} = require('../utils/helpers');

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticateToken);
router.use(authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin)
router.get('/dashboard', async (req, res) => {
  try {
    // Get user statistics
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'user') as regular_users,
        COUNT(*) FILTER (WHERE role = 'owner') as facility_owners,
        COUNT(*) FILTER (WHERE is_verified = true) as verified_users,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d
      FROM users
    `;

    // Get facility statistics
    const facilityStatsQuery = `
      SELECT 
        COUNT(*) as total_facilities,
        COUNT(*) FILTER (WHERE is_active = true) as active_facilities,
        COUNT(*) FILTER (WHERE is_verified = true) as verified_facilities,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_facilities_30d,
        ROUND(AVG(rating), 2) as average_rating
      FROM facilities
    `;

    // Get booking statistics
    const bookingStatsQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_bookings_30d,
        SUM(total_amount) FILTER (WHERE status IN ('confirmed', 'completed')) as total_revenue,
        SUM(commission_amount) FILTER (WHERE status IN ('confirmed', 'completed')) as total_commission
      FROM bookings
    `;

    // Get payment statistics
    const paymentStatsQuery = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_payments,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
        SUM(amount) FILTER (WHERE status = 'completed') as total_payment_amount
      FROM payments
    `;

    // Get recent activity
    const recentActivityQuery = `
      (SELECT 'booking' as type, id, created_at, 
        CONCAT('New booking #', booking_code) as description
       FROM bookings ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'facility' as type, id, created_at,
        CONCAT('New facility: ', name) as description
       FROM facilities ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'user' as type, id, created_at,
        CONCAT('New user: ', name) as description
       FROM users ORDER BY created_at DESC LIMIT 5)
      ORDER BY created_at DESC LIMIT 10
    `;

    // Execute all queries
    const [userStats, facilityStats, bookingStats, paymentStats, recentActivity] = await Promise.all([
      query(userStatsQuery),
      query(facilityStatsQuery),
      query(bookingStatsQuery),
      query(paymentStatsQuery),
      query(recentActivityQuery)
    ]);

    const dashboardData = {
      users: {
        total: parseInt(userStats.rows[0].total_users) || 0,
        regular: parseInt(userStats.rows[0].regular_users) || 0,
        owners: parseInt(userStats.rows[0].facility_owners) || 0,
        verified: parseInt(userStats.rows[0].verified_users) || 0,
        newThisMonth: parseInt(userStats.rows[0].new_users_30d) || 0
      },
      facilities: {
        total: parseInt(facilityStats.rows[0].total_facilities) || 0,
        active: parseInt(facilityStats.rows[0].active_facilities) || 0,
        verified: parseInt(facilityStats.rows[0].verified_facilities) || 0,
        newThisMonth: parseInt(facilityStats.rows[0].new_facilities_30d) || 0,
        averageRating: parseFloat(facilityStats.rows[0].average_rating) || 0
      },
      bookings: {
        total: parseInt(bookingStats.rows[0].total_bookings) || 0,
        pending: parseInt(bookingStats.rows[0].pending_bookings) || 0,
        confirmed: parseInt(bookingStats.rows[0].confirmed_bookings) || 0,
        completed: parseInt(bookingStats.rows[0].completed_bookings) || 0,
        cancelled: parseInt(bookingStats.rows[0].cancelled_bookings) || 0,
        newThisMonth: parseInt(bookingStats.rows[0].new_bookings_30d) || 0
      },
      revenue: {
        totalRevenue: parseFloat(bookingStats.rows[0].total_revenue) || 0,
        totalCommission: parseFloat(bookingStats.rows[0].total_commission) || 0,
        totalPayments: parseFloat(paymentStats.rows[0].total_payment_amount) || 0,
        successfulPayments: parseInt(paymentStats.rows[0].successful_payments) || 0,
        failedPayments: parseInt(paymentStats.rows[0].failed_payments) || 0
      },
      recentActivity: recentActivity.rows.map(activity => ({
        type: activity.type,
        id: activity.id,
        description: activity.description,
        timestamp: activity.created_at
      }))
    };

    res.json(
      successResponse(
        { dashboard: dashboardData },
        'Dashboard data retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve dashboard data')
    );
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Private (Admin)
router.get('/users', async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { role, isVerified, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      whereConditions.push(`role = $${paramCount}`);
      queryParams.push(role);
    }

    if (isVerified !== undefined) {
      paramCount++;
      whereConditions.push(`is_verified = $${paramCount}`);
      queryParams.push(isVerified === 'true');
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(name ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build sort clause
    const validSortFields = {
      'created_at': 'created_at',
      'name': 'name',
      'email': 'email',
      'role': 'role'
    };

    const sortField = validSortFields[sortBy] || 'created_at';
    const orderClause = `${sortField} ${sortOrder.toUpperCase()}`;

    // Get users
    const usersQuery = `
      SELECT 
        id, name, email, phone, role, is_verified, profile_image,
        address, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;

    // Execute queries
    const [usersResult, countResult] = await Promise.all([
      query(usersQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2))
    ]);

    const users = usersResult.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.is_verified,
      profileImage: user.profile_image,
      address: user.address,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    const total = parseInt(countResult.rows[0].total);
    const meta = getPaginationMeta(page, limit, total);

    res.json(
      successResponse(
        { users },
        'Users retrieved successfully',
        meta
      )
    );

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve users')
    );
  }
});

// @route   GET /api/admin/facilities
// @desc    Get all facilities with filters
// @access  Private (Admin)
router.get('/facilities', async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { isActive, isVerified, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (isActive !== undefined) {
      paramCount++;
      whereConditions.push(`f.is_active = $${paramCount}`);
      queryParams.push(isActive === 'true');
    }

    if (isVerified !== undefined) {
      paramCount++;
      whereConditions.push(`f.is_verified = $${paramCount}`);
      queryParams.push(isVerified === 'true');
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(f.name ILIKE $${paramCount} OR f.address ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build sort clause
    const validSortFields = {
      'created_at': 'f.created_at',
      'name': 'f.name',
      'rating': 'f.rating',
      'pricing': 'f.pricing_per_hour'
    };

    const sortField = validSortFields[sortBy] || 'f.created_at';
    const orderClause = `${sortField} ${sortOrder.toUpperCase()}`;

    // Get facilities
    const facilitiesQuery = `
      SELECT 
        f.id, f.name, f.description, f.address, f.latitude, f.longitude,
        f.phone, f.email, f.pricing_per_hour, f.rating, f.total_reviews,
        f.is_active, f.is_verified, f.created_at, f.updated_at,
        u.name as owner_name, u.email as owner_email
      FROM facilities f
      JOIN users u ON f.owner_id = u.id
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM facilities f
      JOIN users u ON f.owner_id = u.id
      ${whereClause}
    `;

    // Execute queries
    const [facilitiesResult, countResult] = await Promise.all([
      query(facilitiesQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2))
    ]);

    const facilities = facilitiesResult.rows.map(facility => ({
      id: facility.id,
      name: facility.name,
      description: facility.description,
      address: facility.address,
      coordinates: {
        latitude: facility.latitude,
        longitude: facility.longitude
      },
      contact: {
        phone: facility.phone,
        email: facility.email
      },
      pricing: {
        perHour: parseFloat(facility.pricing_per_hour)
      },
      rating: parseFloat(facility.rating || 0),
      totalReviews: facility.total_reviews || 0,
      isActive: facility.is_active,
      isVerified: facility.is_verified,
      owner: {
        name: facility.owner_name,
        email: facility.owner_email
      },
      createdAt: facility.created_at,
      updatedAt: facility.updated_at
    }));

    const total = parseInt(countResult.rows[0].total);
    const meta = getPaginationMeta(page, limit, total);

    res.json(
      successResponse(
        { facilities },
        'Facilities retrieved successfully',
        meta
      )
    );

  } catch (error) {
    console.error('Get admin facilities error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve facilities')
    );
  }
});

// @route   PUT /api/admin/facilities/:id/verify
// @desc    Verify facility
// @access  Private (Admin)
router.put('/facilities/:id/verify', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.id);

    const result = await query(
      'UPDATE facilities SET is_verified = true WHERE id = $1 RETURNING id, name, is_verified',
      [facilityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Facility not found')
      );
    }

    const facility = result.rows[0];

    res.json(
      successResponse(
        {
          facilityId: facility.id,
          name: facility.name,
          isVerified: facility.is_verified
        },
        'Facility verified successfully'
      )
    );

  } catch (error) {
    console.error('Verify facility error:', error);
    res.status(500).json(
      errorResponse('Failed to verify facility')
    );
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings with filters
// @access  Private (Admin)
router.get('/bookings', async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { status, facilityId, userId, startDate, endDate, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereConditions.push(`b.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (facilityId) {
      paramCount++;
      whereConditions.push(`b.facility_id = $${paramCount}`);
      queryParams.push(parseInt(facilityId));
    }

    if (userId) {
      paramCount++;
      whereConditions.push(`b.user_id = $${paramCount}`);
      queryParams.push(parseInt(userId));
    }

    if (startDate) {
      paramCount++;
      whereConditions.push(`b.booking_date >= $${paramCount}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereConditions.push(`b.booking_date <= $${paramCount}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build sort clause
    const validSortFields = {
      'created_at': 'b.created_at',
      'booking_date': 'b.booking_date',
      'total_amount': 'b.total_amount',
      'status': 'b.status'
    };

    const sortField = validSortFields[sortBy] || 'b.created_at';
    const orderClause = `${sortField} ${sortOrder.toUpperCase()}`;

    // Get bookings
    const bookingsQuery = `
      SELECT 
        b.id, b.booking_date, b.start_time, b.end_time, b.duration,
        b.total_amount, b.commission_amount, b.status, b.booking_code,
        b.created_at, b.updated_at,
        u.name as user_name, u.email as user_email,
        f.name as facility_name, f.address as facility_address,
        p.status as payment_status
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN facilities f ON b.facility_id = f.id
      LEFT JOIN payments p ON b.payment_id = p.id
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN facilities f ON b.facility_id = f.id
      ${whereClause}
    `;

    // Execute queries
    const [bookingsResult, countResult] = await Promise.all([
      query(bookingsQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2))
    ]);

    const bookings = bookingsResult.rows.map(booking => ({
      id: booking.id,
      bookingCode: booking.booking_code,
      bookingDate: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      duration: booking.duration,
      totalAmount: parseFloat(booking.total_amount),
      commissionAmount: parseFloat(booking.commission_amount),
      status: booking.status,
      user: {
        name: booking.user_name,
        email: booking.user_email
      },
      facility: {
        name: booking.facility_name,
        address: booking.facility_address
      },
      paymentStatus: booking.payment_status,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    }));

    const total = parseInt(countResult.rows[0].total);
    const meta = getPaginationMeta(page, limit, total);

    res.json(
      successResponse(
        { bookings },
        'Bookings retrieved successfully',
        meta
      )
    );

  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve bookings')
    );
  }
});

// @route   GET /api/admin/analytics/revenue
// @desc    Get revenue analytics
// @access  Private (Admin)
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { period = 'month', year, month } = req.query;

    let dateFilter = '';
    let groupBy = '';
    
    if (period === 'year') {
      groupBy = "EXTRACT(YEAR FROM created_at)";
      dateFilter = year ? `AND EXTRACT(YEAR FROM created_at) = ${parseInt(year)}` : '';
    } else if (period === 'month') {
      groupBy = "DATE_TRUNC('month', created_at)";
      if (year && month) {
        dateFilter = `AND EXTRACT(YEAR FROM created_at) = ${parseInt(year)} AND EXTRACT(MONTH FROM created_at) = ${parseInt(month)}`;
        groupBy = "DATE(created_at)";
      } else if (year) {
        dateFilter = `AND EXTRACT(YEAR FROM created_at) = ${parseInt(year)}`;
      }
    } else {
      groupBy = "DATE(created_at)";
      dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    const revenueQuery = `
      SELECT 
        ${groupBy} as period,
        COUNT(*) as booking_count,
        SUM(total_amount) as total_revenue,
        SUM(commission_amount) as total_commission
      FROM bookings
      WHERE status IN ('confirmed', 'completed') ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period
    `;

    const topFacilitiesQuery = `
      SELECT 
        f.id, f.name,
        COUNT(b.id) as booking_count,
        SUM(b.total_amount) as revenue,
        SUM(b.commission_amount) as commission
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.id
      WHERE b.status IN ('confirmed', 'completed') ${dateFilter}
      GROUP BY f.id, f.name
      ORDER BY revenue DESC
      LIMIT 10
    `;

    const [revenueResult, topFacilitiesResult] = await Promise.all([
      query(revenueQuery),
      query(topFacilitiesQuery)
    ]);

    const revenueData = revenueResult.rows.map(row => ({
      period: row.period,
      bookingCount: parseInt(row.booking_count),
      totalRevenue: parseFloat(row.total_revenue),
      totalCommission: parseFloat(row.total_commission)
    }));

    const topFacilities = topFacilitiesResult.rows.map(facility => ({
      id: facility.id,
      name: facility.name,
      bookingCount: parseInt(facility.booking_count),
      revenue: parseFloat(facility.revenue),
      commission: parseFloat(facility.commission)
    }));

    res.json(
      successResponse(
        {
          revenueData,
          topFacilities,
          period
        },
        'Revenue analytics retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve revenue analytics')
    );
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private (Admin)
router.put('/users/:id/role', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!['user', 'owner', 'admin'].includes(role)) {
      return res.status(400).json(
        errorResponse('Invalid role. Must be one of: user, owner, admin')
      );
    }

    const result = await query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, role',
      [role, userId]
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
          userId: user.id,
          name: user.name,
          role: user.role
        },
        'User role updated successfully'
      )
    );

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json(
      errorResponse('Failed to update user role')
    );
  }
});

// @route   POST /api/admin/users
// @desc    Create new user (Admin)
// @access  Private (Admin)
router.post('/users', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['user', 'owner', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(
        errorResponse('Validation failed', errors.array())
      );
    }

    const { name, email, phone, password, role } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json(
        errorResponse('User already exists with this email or phone')
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await query(`
      INSERT INTO users (name, email, phone, password_hash, role, is_verified)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, name, email, phone, role, is_verified, created_at
    `, [name, email, phone, hashedPassword, role]);

    const user = result.rows[0];

    res.status(201).json(
      successResponse(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.is_verified,
            createdAt: user.created_at
          }
        },
        'User created successfully'
      )
    );

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json(
      errorResponse('Failed to create user')
    );
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (Admin)
// @access  Private (Admin)
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const userResult = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    const user = userResult.rows[0];

    // Prevent deleting other admins
    if (user.role === 'admin' && user.id !== req.user.id) {
      return res.status(403).json(
        errorResponse('Cannot delete other admin users')
      );
    }

    // Check for active bookings
    const activeBookingsResult = await query(
      'SELECT COUNT(*) as count FROM bookings WHERE user_id = $1 AND status IN (\'pending\', \'confirmed\') AND booking_date >= CURRENT_DATE',
      [userId]
    );

    const activeBookingsCount = parseInt(activeBookingsResult.rows[0].count);

    if (activeBookingsCount > 0) {
      return res.status(400).json(
        errorResponse(`Cannot delete user with ${activeBookingsCount} active booking(s)`)
      );
    }

    // Soft delete - deactivate user
    await query(
      'UPDATE users SET is_verified = false, email = CONCAT(email, \'_deleted_\', id), phone = CONCAT(phone, \'_deleted_\', id) WHERE id = $1',
      [userId]
    );

    res.json(
      successResponse(null, 'User deleted successfully')
    );

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json(
      errorResponse('Failed to delete user')
    );
  }
});

// @route   GET /api/admin/settings
// @desc    Get platform settings
// @access  Private (Admin)
router.get('/settings', async (req, res) => {
  try {
    const result = await query(
      'SELECT setting_key, setting_value, description FROM platform_settings ORDER BY setting_key'
    );

    const settings = result.rows.reduce((acc, setting) => {
      acc[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
      return acc;
    }, {});

    res.json(
      successResponse(
        { settings },
        'Platform settings retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get platform settings error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve platform settings')
    );
  }
});

// @route   PUT /api/admin/settings
// @desc    Update platform settings
// @access  Private (Admin)
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json(
        errorResponse('Settings object is required')
      );
    }

    await transaction(async (client) => {
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          'UPDATE platform_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2',
          [value, key]
        );
      }
    });

    res.json(
      successResponse(null, 'Platform settings updated successfully')
    );

  } catch (error) {
    console.error('Update platform settings error:', error);
    res.status(500).json(
      errorResponse('Failed to update platform settings')
    );
  }
});

module.exports = router;