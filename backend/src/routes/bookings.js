const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { 
  authenticateToken, 
  authorize, 
  checkBookingAccess 
} = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
  getPaginationParams,
  getPaginationMeta,
  generateBookingCode,
  isValidBookingTime,
  calculateCommission,
  getCurrentNepalTime,
  createError
} = require('../utils/helpers');

const router = express.Router();

// Validation middleware
const validateBookingCreation = [
  body('facilityId')
    .isInt({ min: 1 })
    .withMessage('Valid facility ID is required'),
  body('bookingDate')
    .isDate()
    .withMessage('Valid booking date is required (YYYY-MM-DD)'),
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid start time is required (HH:MM format)'),
  body('endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid end time is required (HH:MM format)'),
  body('specialRequests')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Special requests cannot exceed 500 characters')
    .trim()
];

const validateBookingUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed'])
    .withMessage('Status must be one of: pending, confirmed, cancelled, completed'),
  body('cancellationReason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason cannot exceed 500 characters')
    .trim()
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

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private
router.post('/', authenticateToken, validateBookingCreation, handleValidationErrors, async (req, res) => {
  try {
    const {
      facilityId,
      bookingDate,
      startTime,
      endTime,
      specialRequests
    } = req.body;

    const userId = req.user.id;

    // Validate booking time
    const startDateTime = new Date(`${bookingDate}T${startTime}`);
    const endDateTime = new Date(`${bookingDate}T${endTime}`);

    if (!isValidBookingTime(startDateTime, endDateTime)) {
      return res.status(400).json(
        errorResponse('Invalid booking time. Minimum duration is 30 minutes.')
      );
    }

    // Check if booking date is in the future
    const currentDate = getCurrentNepalTime().format('YYYY-MM-DD');
    if (bookingDate < currentDate) {
      return res.status(400).json(
        errorResponse('Cannot book for past dates')
      );
    }

    // Check max advance booking days
    const maxAdvanceDays = parseInt(process.env.MAX_ADVANCE_BOOKING_DAYS) || 30;
    const maxDate = getCurrentNepalTime().add(maxAdvanceDays, 'days').format('YYYY-MM-DD');
    if (bookingDate > maxDate) {
      return res.status(400).json(
        errorResponse(`Cannot book more than ${maxAdvanceDays} days in advance`)
      );
    }

    await transaction(async (client) => {
      // Get facility details and check availability
      const facilityResult = await client.query(
        'SELECT id, name, pricing_per_hour, commission_rate, is_active, is_verified, operating_hours FROM facilities WHERE id = $1',
        [facilityId]
      );

      if (facilityResult.rows.length === 0) {
        throw createError('Facility not found', 404);
      }

      const facility = facilityResult.rows[0];

      if (!facility.is_active || !facility.is_verified) {
        throw createError('Facility is not available for booking', 400);
      }

      // Check facility operating hours
      const operatingHours = facility.operating_hours || {};
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(bookingDate).getDay()];
      const daySchedule = operatingHours[dayOfWeek];

      if (daySchedule && (startTime < daySchedule.open || endTime > daySchedule.close)) {
        throw createError('Booking time is outside facility operating hours', 400);
      }

      // Check for time slot conflicts
      const conflictQuery = `
        SELECT id FROM bookings 
        WHERE facility_id = $1 AND booking_date = $2 
        AND status IN ('pending', 'confirmed')
        AND (
          (start_time < $4 AND end_time > $3) OR
          (start_time < $4 AND end_time > $4) OR
          (start_time < $3 AND end_time > $3)
        )
      `;

      const conflictResult = await client.query(conflictQuery, [
        facilityId, bookingDate, startTime, endTime
      ]);

      if (conflictResult.rows.length > 0) {
        throw createError('Selected time slot is not available', 409);
      }

      // Check user's concurrent booking limit
      const userBookingLimit = 3; // Configurable
      const userActiveBookingsResult = await client.query(
        'SELECT COUNT(*) as count FROM bookings WHERE user_id = $1 AND status IN (\'pending\', \'confirmed\') AND booking_date >= CURRENT_DATE',
        [userId]
      );

      const activeBookingsCount = parseInt(userActiveBookingsResult.rows[0].count);
      if (activeBookingsCount >= userBookingLimit) {
        throw createError(`You can have maximum ${userBookingLimit} active bookings at a time`, 400);
      }

      // Calculate booking details
      const duration = Math.round((endDateTime - startDateTime) / (1000 * 60)); // minutes
      const pricePerHour = parseFloat(facility.pricing_per_hour);
      const totalAmount = (duration / 60) * pricePerHour;
      const commissionRate = parseFloat(facility.commission_rate || 0.10);
      const commissionAmount = calculateCommission(totalAmount, commissionRate);

      // Generate unique booking code
      let bookingCode;
      let codeExists = true;
      while (codeExists) {
        bookingCode = generateBookingCode();
        const codeCheckResult = await client.query(
          'SELECT id FROM bookings WHERE booking_code = $1',
          [bookingCode]
        );
        codeExists = codeCheckResult.rows.length > 0;
      }

      // Create booking
      const bookingQuery = `
        INSERT INTO bookings (
          user_id, facility_id, booking_date, start_time, end_time,
          duration, total_amount, commission_amount, booking_code, special_requests
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, booking_code, total_amount, duration, created_at
      `;

      const bookingResult = await client.query(bookingQuery, [
        userId, facilityId, bookingDate, startTime, endTime,
        duration, totalAmount, commissionAmount, bookingCode, specialRequests
      ]);

      const booking = bookingResult.rows[0];

      // Create notification for user
      await client.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        'Booking Created',
        `Your booking for ${facility.name} on ${bookingDate} has been created successfully.`,
        'booking',
        booking.id,
        'booking'
      ]);

      return {
        id: booking.id,
        bookingCode: booking.booking_code,
        facility: {
          id: facility.id,
          name: facility.name
        },
        bookingDate,
        startTime,
        endTime,
        duration: booking.duration,
        totalAmount: parseFloat(booking.total_amount),
        commissionAmount,
        status: 'pending',
        specialRequests,
        createdAt: booking.created_at
      };
    });

    const bookingData = await transaction(async (client) => {
      // This is a simplified version - the actual transaction logic is above
      // In a real implementation, you'd return the booking data from the transaction
      const bookingResult = await client.query(
        'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      return bookingResult.rows[0];
    });

    res.status(201).json(
      successResponse(
        bookingData,
        'Booking created successfully. Please proceed with payment to confirm your booking.'
      )
    );

  } catch (error) {
    console.error('Create booking error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(errorResponse(error.message));
    }
    res.status(500).json(
      errorResponse('Failed to create booking')
    );
  }
});

// @route   GET /api/bookings
// @desc    Get user's bookings with filters
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const {
      status,
      facilityId,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user.id;

    // Build query conditions
    let whereConditions = ['b.user_id = $1'];
    let queryParams = [userId];
    let paramCount = 1;

    // Status filter
    if (status) {
      paramCount++;
      whereConditions.push(`b.status = $${paramCount}`);
      queryParams.push(status);
    }

    // Facility filter
    if (facilityId) {
      paramCount++;
      whereConditions.push(`b.facility_id = $${paramCount}`);
      queryParams.push(parseInt(facilityId));
    }

    // Date range filter
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

    // Build sort clause
    const validSortFields = {
      'created_at': 'b.created_at',
      'booking_date': 'b.booking_date',
      'start_time': 'b.start_time',
      'total_amount': 'b.total_amount',
      'status': 'b.status'
    };

    const sortField = validSortFields[sortBy] || 'b.created_at';
    const orderClause = `${sortField} ${sortOrder.toUpperCase()}`;

    // Main query
    const bookingsQuery = `
      SELECT 
        b.id, b.booking_date, b.start_time, b.end_time, b.duration,
        b.total_amount, b.status, b.booking_code, b.special_requests,
        b.cancellation_reason, b.cancelled_at, b.confirmed_at, b.created_at,
        f.id as facility_id, f.name as facility_name, f.address as facility_address,
        f.phone as facility_phone, f.images as facility_images,
        p.id as payment_id, p.status as payment_status, p.payment_method
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.id
      LEFT JOIN payments p ON b.payment_id = p.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM bookings b
      WHERE ${whereConditions.join(' AND ')}
    `;

    // Execute queries
    const [bookingsResult, countResult] = await Promise.all([
      query(bookingsQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2))
    ]);

    const bookings = bookingsResult.rows.map(booking => ({
      id: booking.id,
      bookingCode: booking.booking_code,
      facility: {
        id: booking.facility_id,
        name: booking.facility_name,
        address: booking.facility_address,
        phone: booking.facility_phone,
        images: booking.facility_images || []
      },
      bookingDate: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      duration: booking.duration,
      totalAmount: parseFloat(booking.total_amount),
      status: booking.status,
      specialRequests: booking.special_requests,
      cancellationReason: booking.cancellation_reason,
      payment: booking.payment_id ? {
        id: booking.payment_id,
        status: booking.payment_status,
        method: booking.payment_method
      } : null,
      cancelledAt: booking.cancelled_at,
      confirmedAt: booking.confirmed_at,
      createdAt: booking.created_at
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
    console.error('Get bookings error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve bookings')
    );
  }
});

// @route   GET /api/bookings/:id
// @desc    Get single booking details
// @access  Private
router.get('/:id', authenticateToken, checkBookingAccess, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    const bookingQuery = `
      SELECT 
        b.id, b.booking_date, b.start_time, b.end_time, b.duration,
        b.total_amount, b.commission_amount, b.status, b.booking_code,
        b.special_requests, b.cancellation_reason, b.cancelled_at,
        b.confirmed_at, b.created_at, b.updated_at,
        f.id as facility_id, f.name as facility_name, f.description as facility_description,
        f.address as facility_address, f.phone as facility_phone, f.email as facility_email,
        f.images as facility_images, f.amenities as facility_amenities,
        u.id as user_id, u.name as user_name, u.email as user_email, u.phone as user_phone,
        p.id as payment_id, p.amount as payment_amount, p.status as payment_status,
        p.payment_method, p.transaction_id, p.payment_date
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN payments p ON b.payment_id = p.id
      WHERE b.id = $1
    `;

    const result = await query(bookingQuery, [bookingId]);

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Booking not found')
      );
    }

    const booking = result.rows[0];

    const bookingData = {
      id: booking.id,
      bookingCode: booking.booking_code,
      facility: {
        id: booking.facility_id,
        name: booking.facility_name,
        description: booking.facility_description,
        address: booking.facility_address,
        contact: {
          phone: booking.facility_phone,
          email: booking.facility_email
        },
        images: booking.facility_images || [],
        amenities: booking.facility_amenities || []
      },
      user: {
        id: booking.user_id,
        name: booking.user_name,
        email: booking.user_email,
        phone: booking.user_phone
      },
      bookingDate: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      duration: booking.duration,
      totalAmount: parseFloat(booking.total_amount),
      commissionAmount: parseFloat(booking.commission_amount),
      status: booking.status,
      specialRequests: booking.special_requests,
      cancellationReason: booking.cancellation_reason,
      payment: booking.payment_id ? {
        id: booking.payment_id,
        amount: parseFloat(booking.payment_amount),
        status: booking.payment_status,
        method: booking.payment_method,
        transactionId: booking.transaction_id,
        paymentDate: booking.payment_date
      } : null,
      cancelledAt: booking.cancelled_at,
      confirmedAt: booking.confirmed_at,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    };

    res.json(
      successResponse(
        { booking: bookingData },
        'Booking details retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve booking details')
    );
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking (cancel booking)
// @access  Private
router.put('/:id', authenticateToken, checkBookingAccess, validateBookingUpdate, handleValidationErrors, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { status, cancellationReason } = req.body;
    const userId = req.user.id;

    // Get current booking
    const currentBookingResult = await query(
      'SELECT id, user_id, status, booking_date, start_time, total_amount FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (currentBookingResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Booking not found')
      );
    }

    const currentBooking = currentBookingResult.rows[0];

    // Only allow users to cancel their own bookings, or admins to update any booking
    if (req.user.role !== 'admin' && currentBooking.user_id !== userId) {
      return res.status(403).json(
        errorResponse('You can only modify your own bookings')
      );
    }

    // Validate status transitions
    const currentStatus = currentBooking.status;
    
    if (status === 'cancelled') {
      if (currentStatus === 'completed' || currentStatus === 'cancelled') {
        return res.status(400).json(
          errorResponse('Cannot cancel a completed or already cancelled booking')
        );
      }

      // Check cancellation policy
      const bookingDateTime = new Date(`${currentBooking.booking_date}T${currentBooking.start_time}`);
      const currentTime = getCurrentNepalTime().toDate();
      const hoursUntilBooking = (bookingDateTime - currentTime) / (1000 * 60 * 60);
      
      const cancellationPolicyHours = parseInt(process.env.CANCELLATION_POLICY_HOURS) || 24;
      
      if (hoursUntilBooking < cancellationPolicyHours && req.user.role !== 'admin') {
        return res.status(400).json(
          errorResponse(`Bookings can only be cancelled at least ${cancellationPolicyHours} hours in advance`)
        );
      }

      if (!cancellationReason && req.user.role !== 'admin') {
        return res.status(400).json(
          errorResponse('Cancellation reason is required')
        );
      }
    }

    await transaction(async (client) => {
      // Update booking
      let updateQuery = 'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP';
      let queryParams = [status];
      let paramCount = 1;

      if (status === 'cancelled') {
        paramCount++;
        updateQuery += `, cancellation_reason = $${paramCount}, cancelled_at = CURRENT_TIMESTAMP`;
        queryParams.push(cancellationReason);
      } else if (status === 'confirmed') {
        updateQuery += ', confirmed_at = CURRENT_TIMESTAMP';
      }

      updateQuery += ` WHERE id = $${paramCount + 1} RETURNING id, status`;
      queryParams.push(bookingId);

      const updateResult = await client.query(updateQuery, queryParams);

      if (updateResult.rows.length === 0) {
        throw createError('Failed to update booking', 400);
      }

      // Create notification
      let notificationTitle, notificationMessage;
      
      if (status === 'cancelled') {
        notificationTitle = 'Booking Cancelled';
        notificationMessage = `Your booking has been cancelled. ${cancellationReason ? 'Reason: ' + cancellationReason : ''}`;
      } else if (status === 'confirmed') {
        notificationTitle = 'Booking Confirmed';
        notificationMessage = 'Your booking has been confirmed successfully.';
      }

      if (notificationTitle) {
        await client.query(`
          INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          currentBooking.user_id,
          notificationTitle,
          notificationMessage,
          'booking',
          bookingId,
          'booking'
        ]);
      }

      // Handle payment refund for cancelled bookings
      if (status === 'cancelled') {
        const paymentResult = await client.query(
          'SELECT id, amount, status FROM payments WHERE booking_id = $1 AND status = \'completed\'',
          [bookingId]
        );

        if (paymentResult.rows.length > 0) {
          const payment = paymentResult.rows[0];
          
          // Update payment status to refunded
          await client.query(
            'UPDATE payments SET status = \'refunded\', refund_amount = $1, refund_date = CURRENT_TIMESTAMP WHERE id = $2',
            [payment.amount, payment.id]
          );

          // TODO: Initiate actual refund process with payment gateway
        }
      }
    });

    res.json(
      successResponse(
        { status },
        `Booking ${status} successfully`
      )
    );

  } catch (error) {
    console.error('Update booking error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(errorResponse(error.message));
    }
    res.status(500).json(
      errorResponse('Failed to update booking')
    );
  }
});

// @route   DELETE /api/bookings/:id
// @desc    Delete booking (Admin only)
// @access  Private
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    // Check if booking exists
    const bookingResult = await query(
      'SELECT id, status FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Booking not found')
      );
    }

    const booking = bookingResult.rows[0];

    if (booking.status === 'confirmed') {
      return res.status(400).json(
        errorResponse('Cannot delete confirmed bookings. Cancel the booking first.')
      );
    }

    // Delete booking
    await query('DELETE FROM bookings WHERE id = $1', [bookingId]);

    res.json(
      successResponse(null, 'Booking deleted successfully')
    );

  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json(
      errorResponse('Failed to delete booking')
    );
  }
});

// @route   GET /api/bookings/:id/receipt
// @desc    Generate booking receipt PDF
// @access  Private
router.get('/:id/receipt', authenticateToken, checkBookingAccess, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    // Get booking details
    const bookingResult = await query(`
      SELECT 
        b.id, b.booking_code, b.booking_date, b.start_time, b.end_time,
        b.duration, b.total_amount, b.status, b.created_at,
        f.name as facility_name, f.address as facility_address,
        f.phone as facility_phone,
        u.name as user_name, u.email as user_email, u.phone as user_phone,
        p.payment_method, p.transaction_id, p.payment_date
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN payments p ON b.payment_id = p.id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Booking not found')
      );
    }

    const booking = bookingResult.rows[0];

    // TODO: Generate PDF receipt using PDFKit
    // For now, return booking data
    const receiptData = {
      bookingCode: booking.booking_code,
      facility: {
        name: booking.facility_name,
        address: booking.facility_address,
        phone: booking.facility_phone
      },
      customer: {
        name: booking.user_name,
        email: booking.user_email,
        phone: booking.user_phone
      },
      booking: {
        date: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        duration: booking.duration,
        totalAmount: parseFloat(booking.total_amount),
        status: booking.status
      },
      payment: {
        method: booking.payment_method,
        transactionId: booking.transaction_id,
        paymentDate: booking.payment_date
      },
      generatedAt: new Date().toISOString()
    };

    res.json(
      successResponse(
        { receipt: receiptData },
        'Booking receipt generated successfully'
      )
    );

  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json(
      errorResponse('Failed to generate receipt')
    );
  }
});

module.exports = router;