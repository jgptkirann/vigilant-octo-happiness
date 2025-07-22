const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
  getPaginationParams,
  getPaginationMeta
} = require('../utils/helpers');

const router = express.Router();

// Validation middleware
const validateReviewCreation = [
  body('bookingId')
    .isInt({ min: 1 })
    .withMessage('Valid booking ID is required'),
  body('facilityId')
    .isInt({ min: 1 })
    .withMessage('Valid facility ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters')
    .trim()
];

const validateReviewUpdate = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters')
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

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private
router.post('/', authenticateToken, validateReviewCreation, handleValidationErrors, async (req, res) => {
  try {
    const { bookingId, facilityId, rating, comment } = req.body;
    const userId = req.user.id;

    // Verify booking exists and belongs to user
    const bookingResult = await query(
      'SELECT id, user_id, facility_id, status FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Booking not found')
      );
    }

    const booking = bookingResult.rows[0];

    // Check if booking belongs to user
    if (booking.user_id !== userId) {
      return res.status(403).json(
        errorResponse('You can only review bookings you made')
      );
    }

    // Check if booking is for the specified facility
    if (booking.facility_id !== facilityId) {
      return res.status(400).json(
        errorResponse('Booking does not match the specified facility')
      );
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json(
        errorResponse('You can only review completed bookings')
      );
    }

    // Check if review already exists
    const existingReviewResult = await query(
      'SELECT id FROM reviews WHERE user_id = $1 AND booking_id = $2',
      [userId, bookingId]
    );

    if (existingReviewResult.rows.length > 0) {
      return res.status(409).json(
        errorResponse('You have already reviewed this booking')
      );
    }

    const reviewData = await transaction(async (client) => {
      // Create review
      const reviewQuery = `
        INSERT INTO reviews (user_id, facility_id, booking_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, rating, comment, created_at
      `;

      const reviewResult = await client.query(reviewQuery, [
        userId, facilityId, bookingId, rating, comment
      ]);

      const review = reviewResult.rows[0];

      // Update facility rating
      const updateRatingQuery = `
        UPDATE facilities 
        SET 
          rating = (
            SELECT ROUND(AVG(rating)::numeric, 2) 
            FROM reviews 
            WHERE facility_id = $1
          ),
          total_reviews = (
            SELECT COUNT(*) 
            FROM reviews 
            WHERE facility_id = $1
          )
        WHERE id = $1
        RETURNING rating, total_reviews
      `;

      const facilityResult = await client.query(updateRatingQuery, [facilityId]);
      const facility = facilityResult.rows[0];

      return {
        review,
        facility
      };
    });

    res.status(201).json(
      successResponse(
        {
          review: {
            id: reviewData.review.id,
            rating: reviewData.review.rating,
            comment: reviewData.review.comment,
            createdAt: reviewData.review.created_at
          },
          facilityRating: {
            rating: parseFloat(reviewData.facility.rating),
            totalReviews: reviewData.facility.total_reviews
          }
        },
        'Review created successfully'
      )
    );

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json(
      errorResponse('Failed to create review')
    );
  }
});

// @route   GET /api/reviews/facility/:facilityId
// @desc    Get reviews for a facility
// @access  Public
router.get('/facility/:facilityId', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.facilityId);
    const { page, limit, offset } = getPaginationParams(req.query);
    const { sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    if (!facilityId || isNaN(facilityId)) {
      return res.status(400).json(
        errorResponse('Invalid facility ID')
      );
    }

    // Check if facility exists
    const facilityResult = await query(
      'SELECT id, name, rating, total_reviews FROM facilities WHERE id = $1',
      [facilityId]
    );

    if (facilityResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Facility not found')
      );
    }

    const facility = facilityResult.rows[0];

    // Build sort clause
    const validSortFields = {
      'created_at': 'r.created_at',
      'rating': 'r.rating'
    };

    const sortField = validSortFields[sortBy] || 'r.created_at';
    const orderClause = `${sortField} ${sortOrder.toUpperCase()}`;

    // Get reviews
    const reviewsQuery = `
      SELECT 
        r.id, r.rating, r.comment, r.is_verified, r.created_at,
        u.name as user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.facility_id = $1
      ORDER BY ${orderClause}
      LIMIT $2 OFFSET $3
    `;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reviews
      WHERE facility_id = $1
    `;

    // Execute queries
    const [reviewsResult, countResult] = await Promise.all([
      query(reviewsQuery, [facilityId, limit, offset]),
      query(countQuery, [facilityId])
    ]);

    // Get rating distribution
    const distributionQuery = `
      SELECT 
        rating,
        COUNT(*) as count
      FROM reviews
      WHERE facility_id = $1
      GROUP BY rating
      ORDER BY rating DESC
    `;

    const distributionResult = await query(distributionQuery, [facilityId]);

    const reviews = reviewsResult.rows.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      isVerified: review.is_verified,
      userName: review.user_name,
      createdAt: review.created_at
    }));

    const ratingDistribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };

    distributionResult.rows.forEach(row => {
      ratingDistribution[row.rating] = parseInt(row.count);
    });

    const total = parseInt(countResult.rows[0].total);
    const meta = getPaginationMeta(page, limit, total);

    res.json(
      successResponse(
        {
          facility: {
            id: facility.id,
            name: facility.name,
            rating: parseFloat(facility.rating || 0),
            totalReviews: facility.total_reviews || 0
          },
          reviews,
          ratingDistribution
        },
        'Reviews retrieved successfully',
        meta
      )
    );

  } catch (error) {
    console.error('Get facility reviews error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve reviews')
    );
  }
});

// @route   GET /api/reviews/user
// @desc    Get user's reviews
// @access  Private
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, offset } = getPaginationParams(req.query);

    // Get user's reviews
    const reviewsQuery = `
      SELECT 
        r.id, r.rating, r.comment, r.is_verified, r.created_at,
        f.id as facility_id, f.name as facility_name, f.address as facility_address,
        b.id as booking_id, b.booking_code
      FROM reviews r
      JOIN facilities f ON r.facility_id = f.id
      JOIN bookings b ON r.booking_id = b.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reviews
      WHERE user_id = $1
    `;

    // Execute queries
    const [reviewsResult, countResult] = await Promise.all([
      query(reviewsQuery, [userId, limit, offset]),
      query(countQuery, [userId])
    ]);

    const reviews = reviewsResult.rows.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      isVerified: review.is_verified,
      facility: {
        id: review.facility_id,
        name: review.facility_name,
        address: review.facility_address
      },
      booking: {
        id: review.booking_id,
        bookingCode: review.booking_code
      },
      createdAt: review.created_at
    }));

    const total = parseInt(countResult.rows[0].total);
    const meta = getPaginationMeta(page, limit, total);

    res.json(
      successResponse(
        { reviews },
        'User reviews retrieved successfully',
        meta
      )
    );

  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve user reviews')
    );
  }
});

// @route   GET /api/reviews/:id
// @desc    Get single review details
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);

    if (!reviewId || isNaN(reviewId)) {
      return res.status(400).json(
        errorResponse('Invalid review ID')
      );
    }

    const reviewQuery = `
      SELECT 
        r.id, r.rating, r.comment, r.is_verified, r.created_at, r.updated_at,
        u.name as user_name,
        f.id as facility_id, f.name as facility_name, f.address as facility_address,
        b.id as booking_id, b.booking_code, b.booking_date
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN facilities f ON r.facility_id = f.id
      JOIN bookings b ON r.booking_id = b.id
      WHERE r.id = $1
    `;

    const result = await query(reviewQuery, [reviewId]);

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Review not found')
      );
    }

    const review = result.rows[0];

    const reviewData = {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      isVerified: review.is_verified,
      userName: review.user_name,
      facility: {
        id: review.facility_id,
        name: review.facility_name,
        address: review.facility_address
      },
      booking: {
        id: review.booking_id,
        bookingCode: review.booking_code,
        bookingDate: review.booking_date
      },
      createdAt: review.created_at,
      updatedAt: review.updated_at
    };

    res.json(
      successResponse(
        { review: reviewData },
        'Review details retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get review details error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve review details')
    );
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update review
// @access  Private
router.put('/:id', authenticateToken, validateReviewUpdate, handleValidationErrors, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Get current review
    const currentReviewResult = await query(
      'SELECT id, user_id, facility_id, rating FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (currentReviewResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Review not found')
      );
    }

    const currentReview = currentReviewResult.rows[0];

    // Check if user owns the review
    if (currentReview.user_id !== userId) {
      return res.status(403).json(
        errorResponse('You can only update your own reviews')
      );
    }

    // Build update query
    const updates = [];
    const queryParams = [];
    let paramCount = 0;

    if (rating !== undefined) {
      paramCount++;
      updates.push(`rating = $${paramCount}`);
      queryParams.push(rating);
    }

    if (comment !== undefined) {
      paramCount++;
      updates.push(`comment = $${paramCount}`);
      queryParams.push(comment);
    }

    if (updates.length === 0) {
      return res.status(400).json(
        errorResponse('No valid fields provided for update')
      );
    }

    const reviewData = await transaction(async (client) => {
      // Update review
      paramCount++;
      queryParams.push(reviewId);

      const updateQuery = `
        UPDATE reviews 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING id, rating, comment, updated_at
      `;

      const reviewResult = await client.query(updateQuery, queryParams);
      const review = reviewResult.rows[0];

      // Update facility rating if rating was changed
      if (rating !== undefined && rating !== currentReview.rating) {
        const updateRatingQuery = `
          UPDATE facilities 
          SET rating = (
            SELECT ROUND(AVG(rating)::numeric, 2) 
            FROM reviews 
            WHERE facility_id = $1
          )
          WHERE id = $1
          RETURNING rating
        `;

        const facilityResult = await client.query(updateRatingQuery, [currentReview.facility_id]);
        
        return {
          review,
          newFacilityRating: facilityResult.rows[0].rating
        };
      }

      return { review };
    });

    res.json(
      successResponse(
        {
          review: {
            id: reviewData.review.id,
            rating: reviewData.review.rating,
            comment: reviewData.review.comment,
            updatedAt: reviewData.review.updated_at
          },
          ...(reviewData.newFacilityRating && {
            facilityRating: parseFloat(reviewData.newFacilityRating)
          })
        },
        'Review updated successfully'
      )
    );

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json(
      errorResponse('Failed to update review')
    );
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete review
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const userId = req.user.id;

    // Get current review
    const currentReviewResult = await query(
      'SELECT id, user_id, facility_id FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (currentReviewResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Review not found')
      );
    }

    const currentReview = currentReviewResult.rows[0];

    // Check if user owns the review or is admin
    if (currentReview.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json(
        errorResponse('You can only delete your own reviews')
      );
    }

    await transaction(async (client) => {
      // Delete review
      await client.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

      // Update facility rating
      const updateRatingQuery = `
        UPDATE facilities 
        SET 
          rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2) 
            FROM reviews 
            WHERE facility_id = $1
          ), 0),
          total_reviews = (
            SELECT COUNT(*) 
            FROM reviews 
            WHERE facility_id = $1
          )
        WHERE id = $1
      `;

      await client.query(updateRatingQuery, [currentReview.facility_id]);
    });

    res.json(
      successResponse(null, 'Review deleted successfully')
    );

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json(
      errorResponse('Failed to delete review')
    );
  }
});

// @route   PUT /api/reviews/:id/verify
// @desc    Verify review (Admin only)
// @access  Private (Admin)
router.put('/:id/verify', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);

    const result = await query(
      'UPDATE reviews SET is_verified = true WHERE id = $1 RETURNING id, is_verified',
      [reviewId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Review not found')
      );
    }

    res.json(
      successResponse(
        { reviewId, isVerified: true },
        'Review verified successfully'
      )
    );

  } catch (error) {
    console.error('Verify review error:', error);
    res.status(500).json(
      errorResponse('Failed to verify review')
    );
  }
});

// @route   GET /api/reviews/stats/facility/:facilityId
// @desc    Get review statistics for a facility
// @access  Public
router.get('/stats/facility/:facilityId', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.facilityId);

    if (!facilityId || isNaN(facilityId)) {
      return res.status(400).json(
        errorResponse('Invalid facility ID')
      );
    }

    // Get overall stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating)::numeric, 2) as average_rating,
        COUNT(*) FILTER (WHERE is_verified = true) as verified_reviews
      FROM reviews
      WHERE facility_id = $1
    `;

    // Get rating distribution
    const distributionQuery = `
      SELECT 
        rating,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 1) as percentage
      FROM reviews
      WHERE facility_id = $1
      GROUP BY rating
      ORDER BY rating DESC
    `;

    // Get recent trends (last 30 days)
    const trendsQuery = `
      SELECT 
        DATE(created_at) as review_date,
        COUNT(*) as daily_count,
        ROUND(AVG(rating)::numeric, 2) as daily_average
      FROM reviews
      WHERE facility_id = $1 
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY review_date
    `;

    // Execute queries
    const [statsResult, distributionResult, trendsResult] = await Promise.all([
      query(statsQuery, [facilityId]),
      query(distributionQuery, [facilityId]),
      query(trendsQuery, [facilityId])
    ]);

    const stats = statsResult.rows[0];
    
    const ratingDistribution = distributionResult.rows.reduce((acc, row) => {
      acc[row.rating] = {
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage)
      };
      return acc;
    }, {});

    const trends = trendsResult.rows.map(row => ({
      date: row.review_date,
      count: parseInt(row.daily_count),
      averageRating: parseFloat(row.daily_average)
    }));

    res.json(
      successResponse(
        {
          stats: {
            totalReviews: parseInt(stats.total_reviews) || 0,
            averageRating: parseFloat(stats.average_rating) || 0,
            verifiedReviews: parseInt(stats.verified_reviews) || 0
          },
          ratingDistribution,
          trends
        },
        'Review statistics retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get review statistics error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve review statistics')
    );
  }
});

module.exports = router;