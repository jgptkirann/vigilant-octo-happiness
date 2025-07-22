const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
  createError
} = require('../utils/helpers');

const router = express.Router();

// Validation middleware
const validatePaymentInitiation = [
  body('bookingId')
    .isInt({ min: 1 })
    .withMessage('Valid booking ID is required'),
  body('paymentMethod')
    .isIn(['esewa', 'bank_transfer', 'cash'])
    .withMessage('Payment method must be one of: esewa, bank_transfer, cash')
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

// @route   POST /api/payments/initiate
// @desc    Initiate payment for a booking
// @access  Private
router.post('/initiate', authenticateToken, validatePaymentInitiation, handleValidationErrors, async (req, res) => {
  try {
    const { bookingId, paymentMethod } = req.body;
    const userId = req.user.id;

    // Get booking details
    const bookingResult = await query(`
      SELECT 
        b.id, b.user_id, b.total_amount, b.status, b.booking_code,
        b.booking_date, b.start_time, b.end_time,
        f.name as facility_name
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Booking not found')
      );
    }

    const booking = bookingResult.rows[0];

    // Check if user owns the booking
    if (booking.user_id !== userId) {
      return res.status(403).json(
        errorResponse('You can only pay for your own bookings')
      );
    }

    // Check if booking is in correct status
    if (booking.status !== 'pending') {
      return res.status(400).json(
        errorResponse('Payment can only be made for pending bookings')
      );
    }

    // Check if payment already exists
    const existingPaymentResult = await query(
      'SELECT id, status FROM payments WHERE booking_id = $1',
      [bookingId]
    );

    if (existingPaymentResult.rows.length > 0) {
      const existingPayment = existingPaymentResult.rows[0];
      if (existingPayment.status === 'completed') {
        return res.status(400).json(
          errorResponse('Payment already completed for this booking')
        );
      }
      if (existingPayment.status === 'pending') {
        return res.status(400).json(
          errorResponse('Payment already in progress for this booking')
        );
      }
    }

    const paymentData = await transaction(async (client) => {
      // Create payment record
      const paymentQuery = `
        INSERT INTO payments (booking_id, user_id, amount, payment_method, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id, amount, status, created_at
      `;

      const paymentResult = await client.query(paymentQuery, [
        bookingId, userId, booking.total_amount, paymentMethod
      ]);

      const payment = paymentResult.rows[0];

      // Update booking with payment reference
      await client.query(
        'UPDATE bookings SET payment_id = $1 WHERE id = $2',
        [payment.id, bookingId]
      );

      return {
        paymentId: payment.id,
        amount: parseFloat(payment.amount),
        status: payment.status,
        createdAt: payment.created_at
      };
    });

    // Generate payment URLs/data based on method
    let paymentResponse = {
      paymentId: paymentData.paymentId,
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      amount: paymentData.amount,
      paymentMethod,
      status: paymentData.status
    };

    if (paymentMethod === 'esewa') {
      // Generate eSewa payment URL
      const esewaParams = {
        amt: paymentData.amount,
        pdc: 0, // Delivery charge
        psc: 0, // Service charge
        txAmt: 0, // Tax amount
        tAmt: paymentData.amount, // Total amount
        pid: `FB_${booking.booking_code}_${paymentData.paymentId}`, // Product ID
        scd: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST', // Service code
        su: `${process.env.FRONTEND_URL}/payment/success?payment_id=${paymentData.paymentId}`, // Success URL
        fu: `${process.env.FRONTEND_URL}/payment/failure?payment_id=${paymentData.paymentId}` // Failure URL
      };

      const esewaUrl = `${process.env.ESEWA_BASE_URL || 'https://uat.esewa.com.np/epay/main'}`;
      
      paymentResponse.esewaData = {
        url: esewaUrl,
        params: esewaParams
      };
    }

    res.status(201).json(
      successResponse(
        { payment: paymentResponse },
        'Payment initiated successfully'
      )
    );

  } catch (error) {
    console.error('Initiate payment error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(errorResponse(error.message));
    }
    res.status(500).json(
      errorResponse('Failed to initiate payment')
    );
  }
});

// @route   POST /api/payments/verify/esewa
// @desc    Verify eSewa payment
// @access  Private
router.post('/verify/esewa', authenticateToken, async (req, res) => {
  try {
    const { paymentId, refId, oid, amt } = req.body;

    if (!paymentId || !refId || !oid || !amt) {
      return res.status(400).json(
        errorResponse('Missing required payment verification parameters')
      );
    }

    // Get payment details
    const paymentResult = await query(`
      SELECT 
        p.id, p.booking_id, p.user_id, p.amount, p.status,
        b.booking_code
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.id = $1
    `, [paymentId]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Payment not found')
      );
    }

    const payment = paymentResult.rows[0];

    // Check if user owns the payment
    if (payment.user_id !== req.user.id) {
      return res.status(403).json(
        errorResponse('Unauthorized payment verification')
      );
    }

    // Check if payment is in pending status
    if (payment.status !== 'pending') {
      return res.status(400).json(
        errorResponse('Payment is not in pending status')
      );
    }

    // Validate amount
    if (parseFloat(amt) !== parseFloat(payment.amount)) {
      return res.status(400).json(
        errorResponse('Payment amount mismatch')
      );
    }

    // TODO: Verify with eSewa API
    // For now, we'll simulate verification
    const isVerified = true; // This should be actual eSewa API verification

    if (!isVerified) {
      // Update payment status to failed
      await query(
        'UPDATE payments SET status = \'failed\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [paymentId]
      );

      return res.status(400).json(
        errorResponse('Payment verification failed')
      );
    }

    await transaction(async (client) => {
      // Update payment status to completed
      await client.query(`
        UPDATE payments 
        SET status = 'completed', 
            esewa_ref_id = $1, 
            transaction_id = $2,
            payment_date = CURRENT_TIMESTAMP,
            metadata = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
        refId,
        oid,
        JSON.stringify({ refId, oid, amt, verifiedAt: new Date().toISOString() }),
        paymentId
      ]);

      // Update booking status to confirmed
      await client.query(
        'UPDATE bookings SET status = \'confirmed\', confirmed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [payment.booking_id]
      );

      // Create notification for user
      await client.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        payment.user_id,
        'Payment Successful',
        `Your payment for booking ${payment.booking_code} has been processed successfully.`,
        'payment',
        paymentId,
        'payment'
      ]);
    });

    res.json(
      successResponse(
        {
          paymentId,
          status: 'completed',
          transactionId: oid,
          esewaRefId: refId
        },
        'Payment verified and booking confirmed successfully'
      )
    );

  } catch (error) {
    console.error('Verify eSewa payment error:', error);
    res.status(500).json(
      errorResponse('Failed to verify payment')
    );
  }
});

// @route   POST /api/payments/:id/cancel
// @desc    Cancel pending payment
// @access  Private
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const userId = req.user.id;

    // Get payment details
    const paymentResult = await query(
      'SELECT id, user_id, booking_id, status FROM payments WHERE id = $1',
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Payment not found')
      );
    }

    const payment = paymentResult.rows[0];

    // Check if user owns the payment
    if (payment.user_id !== userId) {
      return res.status(403).json(
        errorResponse('You can only cancel your own payments')
      );
    }

    // Check if payment can be cancelled
    if (payment.status !== 'pending') {
      return res.status(400).json(
        errorResponse('Only pending payments can be cancelled')
      );
    }

    await transaction(async (client) => {
      // Update payment status to failed
      await client.query(
        'UPDATE payments SET status = \'failed\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [paymentId]
      );

      // Remove payment reference from booking
      await client.query(
        'UPDATE bookings SET payment_id = NULL WHERE id = $1',
        [payment.booking_id]
      );
    });

    res.json(
      successResponse(null, 'Payment cancelled successfully')
    );

  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(500).json(
      errorResponse('Failed to cancel payment')
    );
  }
});

// @route   GET /api/payments/:id
// @desc    Get payment details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const userId = req.user.id;

    const paymentQuery = `
      SELECT 
        p.id, p.amount, p.payment_method, p.status, p.transaction_id,
        p.esewa_ref_id, p.payment_date, p.metadata, p.created_at,
        b.id as booking_id, b.booking_code, b.booking_date, b.start_time, b.end_time,
        f.name as facility_name, f.address as facility_address
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN facilities f ON b.facility_id = f.id
      WHERE p.id = $1
    `;

    const result = await query(paymentQuery, [paymentId]);

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Payment not found')
      );
    }

    const payment = result.rows[0];

    // Check authorization (user or admin)
    if (req.user.role !== 'admin') {
      const userPaymentCheck = await query(
        'SELECT user_id FROM payments WHERE id = $1',
        [paymentId]
      );

      if (userPaymentCheck.rows[0].user_id !== userId) {
        return res.status(403).json(
          errorResponse('Access denied')
        );
      }
    }

    const paymentData = {
      id: payment.id,
      amount: parseFloat(payment.amount),
      paymentMethod: payment.payment_method,
      status: payment.status,
      transactionId: payment.transaction_id,
      esewaRefId: payment.esewa_ref_id,
      paymentDate: payment.payment_date,
      metadata: payment.metadata,
      booking: {
        id: payment.booking_id,
        bookingCode: payment.booking_code,
        bookingDate: payment.booking_date,
        startTime: payment.start_time,
        endTime: payment.end_time,
        facility: {
          name: payment.facility_name,
          address: payment.facility_address
        }
      },
      createdAt: payment.created_at
    };

    res.json(
      successResponse(
        { payment: paymentData },
        'Payment details retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve payment details')
    );
  }
});

// @route   GET /api/payments/user/history
// @desc    Get user's payment history
// @access  Private
router.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, paymentMethod, startDate, endDate } = req.query;

    // Build query conditions
    let whereConditions = ['p.user_id = $1'];
    let queryParams = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereConditions.push(`p.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (paymentMethod) {
      paramCount++;
      whereConditions.push(`p.payment_method = $${paramCount}`);
      queryParams.push(paymentMethod);
    }

    if (startDate) {
      paramCount++;
      whereConditions.push(`DATE(p.created_at) >= $${paramCount}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereConditions.push(`DATE(p.created_at) <= $${paramCount}`);
      queryParams.push(endDate);
    }

    const paymentsQuery = `
      SELECT 
        p.id, p.amount, p.payment_method, p.status, p.transaction_id,
        p.payment_date, p.created_at,
        b.id as booking_id, b.booking_code,
        f.name as facility_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN facilities f ON b.facility_id = f.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY p.created_at DESC
    `;

    const result = await query(paymentsQuery, queryParams);

    const payments = result.rows.map(payment => ({
      id: payment.id,
      amount: parseFloat(payment.amount),
      paymentMethod: payment.payment_method,
      status: payment.status,
      transactionId: payment.transaction_id,
      paymentDate: payment.payment_date,
      booking: {
        id: payment.booking_id,
        bookingCode: payment.booking_code,
        facilityName: payment.facility_name
      },
      createdAt: payment.created_at
    }));

    res.json(
      successResponse(
        { payments },
        'Payment history retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve payment history')
    );
  }
});

// @route   POST /api/payments/:id/refund
// @desc    Process refund (Admin only)
// @access  Private (Admin)
router.post('/:id/refund', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json(
        errorResponse('Only administrators can process refunds')
      );
    }

    const paymentId = parseInt(req.params.id);
    const { refundAmount, reason } = req.body;

    // Get payment details
    const paymentResult = await query(
      'SELECT id, amount, status, booking_id, user_id FROM payments WHERE id = $1',
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Payment not found')
      );
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'completed') {
      return res.status(400).json(
        errorResponse('Only completed payments can be refunded')
      );
    }

    const refundAmountToProcess = refundAmount || payment.amount;

    if (refundAmountToProcess > parseFloat(payment.amount)) {
      return res.status(400).json(
        errorResponse('Refund amount cannot exceed payment amount')
      );
    }

    await transaction(async (client) => {
      // Update payment with refund information
      await client.query(`
        UPDATE payments 
        SET status = 'refunded', 
            refund_amount = $1, 
            refund_date = CURRENT_TIMESTAMP,
            metadata = COALESCE(metadata, '{}')::jsonb || $2::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [
        refundAmountToProcess,
        JSON.stringify({ refundReason: reason, refundedBy: req.user.id }),
        paymentId
      ]);

      // Create notification for user
      await client.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        payment.user_id,
        'Refund Processed',
        `A refund of NPR ${refundAmountToProcess} has been processed for your payment.`,
        'payment',
        paymentId,
        'payment'
      ]);
    });

    res.json(
      successResponse(
        {
          paymentId,
          refundAmount: refundAmountToProcess,
          status: 'refunded'
        },
        'Refund processed successfully'
      )
    );

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json(
      errorResponse('Failed to process refund')
    );
  }
});

module.exports = router;