const express = require('express');
const { body, query: validateQuery, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { 
  authenticateToken, 
  authorize, 
  checkFacilityOwnership, 
  optionalAuth 
} = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
  getPaginationParams,
  getPaginationMeta,
  calculateDistance,
  createError
} = require('../utils/helpers');

const router = express.Router();

// Validation middleware
const validateFacilityCreation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .trim(),
  body('address')
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters')
    .trim(),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate'),
  body('phone')
    .optional()
    .isMobilePhone('ne-NP')
    .withMessage('Please provide a valid Nepal phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('pricingPerHour')
    .isFloat({ min: 0 })
    .withMessage('Pricing per hour must be a positive number'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('operatingHours')
    .optional()
    .isObject()
    .withMessage('Operating hours must be an object')
];

const validateFacilityUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .trim(),
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters')
    .trim(),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid coordinate'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid coordinate'),
  body('phone')
    .optional()
    .isMobilePhone('ne-NP')
    .withMessage('Please provide a valid Nepal phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('pricingPerHour')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Pricing per hour must be a positive number'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('operatingHours')
    .optional()
    .isObject()
    .withMessage('Operating hours must be an object'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
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

// @route   GET /api/facilities
// @desc    Get all facilities with search and filters
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const {
      search,
      latitude,
      longitude,
      maxDistance = 50, // km
      minPrice,
      maxPrice,
      amenities,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    // Build query conditions
    let whereConditions = ['f.is_active = true', 'f.is_verified = true'];
    let queryParams = [];
    let paramCount = 0;

    // Search by name or address
    if (search) {
      paramCount++;
      whereConditions.push(`(f.name ILIKE $${paramCount} OR f.address ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    // Price range filter
    if (minPrice) {
      paramCount++;
      whereConditions.push(`f.pricing_per_hour >= $${paramCount}`);
      queryParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      paramCount++;
      whereConditions.push(`f.pricing_per_hour <= $${paramCount}`);
      queryParams.push(parseFloat(maxPrice));
    }

    // Amenities filter
    if (amenities) {
      const amenityArray = Array.isArray(amenities) ? amenities : [amenities];
      paramCount++;
      whereConditions.push(`f.amenities && $${paramCount}`);
      queryParams.push(amenityArray);
    }

    // Build sort clause
    let orderClause = '';
    switch (sortBy) {
      case 'price':
        orderClause = `f.pricing_per_hour ${sortOrder.toUpperCase()}`;
        break;
      case 'rating':
        orderClause = `f.rating ${sortOrder.toUpperCase()}, f.total_reviews DESC`;
        break;
      case 'name':
        orderClause = `f.name ${sortOrder.toUpperCase()}`;
        break;
      case 'distance':
        if (latitude && longitude) {
          orderClause = `distance ASC`;
        } else {
          orderClause = 'f.rating DESC';
        }
        break;
      default:
        orderClause = 'f.rating DESC, f.total_reviews DESC';
    }

    // Build main query
    let selectClause = `
      f.id, f.name, f.description, f.address, f.latitude, f.longitude,
      f.phone, f.email, f.amenities, f.pricing_per_hour, f.images,
      f.operating_hours, f.rating, f.total_reviews, f.created_at,
      u.name as owner_name
    `;

    // Add distance calculation if coordinates provided
    if (latitude && longitude) {
      selectClause += `,
        (6371 * acos(cos(radians($${paramCount + 1})) * cos(radians(f.latitude)) * 
        cos(radians(f.longitude) - radians($${paramCount + 2})) + 
        sin(radians($${paramCount + 1})) * sin(radians(f.latitude)))) as distance
      `;
      queryParams.push(parseFloat(latitude), parseFloat(longitude));
      paramCount += 2;

      // Add distance filter
      if (maxDistance) {
        whereConditions.push(`
          (6371 * acos(cos(radians($${paramCount - 1})) * cos(radians(f.latitude)) * 
          cos(radians(f.longitude) - radians($${paramCount})) + 
          sin(radians($${paramCount - 1})) * sin(radians(f.latitude)))) <= ${maxDistance}
        `);
      }
    }

    const facilitiesQuery = `
      SELECT ${selectClause}
      FROM facilities f
      JOIN users u ON f.owner_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM facilities f
      JOIN users u ON f.owner_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    // Execute queries
    const [facilitiesResult, countResult] = await Promise.all([
      query(facilitiesQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
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
      amenities: facility.amenities || [],
      images: facility.images || [],
      operatingHours: facility.operating_hours || {},
      rating: parseFloat(facility.rating || 0),
      totalReviews: facility.total_reviews || 0,
      ownerName: facility.owner_name,
      distance: facility.distance ? parseFloat(facility.distance).toFixed(2) : null,
      createdAt: facility.created_at
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
    console.error('Get facilities error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve facilities')
    );
  }
});

// @route   GET /api/facilities/:id
// @desc    Get single facility details
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const facilityId = parseInt(req.params.id);

    if (!facilityId || isNaN(facilityId)) {
      return res.status(400).json(
        errorResponse('Invalid facility ID')
      );
    }

    const facilityQuery = `
      SELECT 
        f.id, f.name, f.description, f.address, f.latitude, f.longitude,
        f.phone, f.email, f.amenities, f.pricing_per_hour, f.images,
        f.operating_hours, f.rating, f.total_reviews, f.is_active,
        f.created_at, f.updated_at,
        u.name as owner_name, u.phone as owner_phone, u.email as owner_email
      FROM facilities f
      JOIN users u ON f.owner_id = u.id
      WHERE f.id = $1 AND f.is_active = true
    `;

    const result = await query(facilityQuery, [facilityId]);

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Facility not found')
      );
    }

    const facility = result.rows[0];

    // Get recent reviews
    const reviewsQuery = `
      SELECT 
        r.id, r.rating, r.comment, r.created_at,
        u.name as user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.facility_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `;

    const reviewsResult = await query(reviewsQuery, [facilityId]);

    const facilityData = {
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
      amenities: facility.amenities || [],
      images: facility.images || [],
      operatingHours: facility.operating_hours || {},
      rating: parseFloat(facility.rating || 0),
      totalReviews: facility.total_reviews || 0,
      isActive: facility.is_active,
      owner: {
        name: facility.owner_name,
        phone: facility.owner_phone,
        email: facility.owner_email
      },
      recentReviews: reviewsResult.rows.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        userName: review.user_name,
        createdAt: review.created_at
      })),
      createdAt: facility.created_at,
      updatedAt: facility.updated_at
    };

    res.json(
      successResponse(
        { facility: facilityData },
        'Facility details retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get facility details error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve facility details')
    );
  }
});

// @route   GET /api/facilities/:id/slots
// @desc    Get available time slots for a facility
// @access  Public
router.get('/:id/slots', async (req, res) => {
  try {
    const facilityId = parseInt(req.params.id);
    const { date } = req.query;

    if (!facilityId || isNaN(facilityId)) {
      return res.status(400).json(
        errorResponse('Invalid facility ID')
      );
    }

    if (!date) {
      return res.status(400).json(
        errorResponse('Date parameter is required')
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json(
        errorResponse('Date must be in YYYY-MM-DD format')
      );
    }

    // Check if facility exists and is active
    const facilityResult = await query(
      'SELECT id, operating_hours FROM facilities WHERE id = $1 AND is_active = true',
      [facilityId]
    );

    if (facilityResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Facility not found')
      );
    }

    const facility = facilityResult.rows[0];

    // Get existing bookings for the date
    const bookingsQuery = `
      SELECT start_time, end_time
      FROM bookings
      WHERE facility_id = $1 AND booking_date = $2 AND status IN ('pending', 'confirmed')
      ORDER BY start_time
    `;

    const bookingsResult = await query(bookingsQuery, [facilityId, date]);
    const bookedSlots = bookingsResult.rows;

    // Generate available slots based on operating hours
    const operatingHours = facility.operating_hours || {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' },
      thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' },
      saturday: { open: '06:00', close: '22:00' },
      sunday: { open: '06:00', close: '22:00' }
    };

    const requestedDate = new Date(date);
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][requestedDate.getDay()];
    const daySchedule = operatingHours[dayName];

    if (!daySchedule || !daySchedule.open || !daySchedule.close) {
      return res.json(
        successResponse(
          { slots: [] },
          'Facility is closed on this day'
        )
      );
    }

    // Generate 30-minute slots
    const slots = [];
    const openTime = daySchedule.open;
    const closeTime = daySchedule.close;

    let currentTime = openTime;
    while (currentTime < closeTime) {
      const [hours, minutes] = currentTime.split(':').map(Number);
      const nextTime = new Date(2000, 0, 1, hours, minutes + 30);
      const nextTimeString = nextTime.toTimeString().slice(0, 5);

      if (nextTimeString > closeTime) break;

      // Check if slot is available
      const isBooked = bookedSlots.some(booking => {
        return currentTime < booking.end_time && nextTimeString > booking.start_time;
      });

      slots.push({
        startTime: currentTime,
        endTime: nextTimeString,
        isAvailable: !isBooked,
        duration: 30 // minutes
      });

      currentTime = nextTimeString;
    }

    res.json(
      successResponse(
        { 
          date,
          dayOfWeek: dayName,
          operatingHours: daySchedule,
          slots 
        },
        'Time slots retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get facility slots error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve time slots')
    );
  }
});

// @route   POST /api/facilities
// @desc    Create a new facility (Owner only)
// @access  Private
router.post('/', authenticateToken, authorize('owner', 'admin'), validateFacilityCreation, handleValidationErrors, async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      latitude,
      longitude,
      phone,
      email,
      pricingPerHour,
      amenities = [],
      operatingHours = {}
    } = req.body;

    const ownerId = req.user.id;

    // Create facility
    const facilityQuery = `
      INSERT INTO facilities (
        owner_id, name, description, address, latitude, longitude,
        phone, email, pricing_per_hour, amenities, operating_hours
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, name, description, address, latitude, longitude, pricing_per_hour, created_at
    `;

    const result = await query(facilityQuery, [
      ownerId, name, description, address, latitude, longitude,
      phone, email, pricingPerHour, amenities, JSON.stringify(operatingHours)
    ]);

    const facility = result.rows[0];

    res.status(201).json(
      successResponse(
        {
          facility: {
            id: facility.id,
            name: facility.name,
            description: facility.description,
            address: facility.address,
            coordinates: {
              latitude: facility.latitude,
              longitude: facility.longitude
            },
            pricing: {
              perHour: parseFloat(facility.pricing_per_hour)
            },
            createdAt: facility.created_at
          }
        },
        'Facility created successfully. It will be activated after verification.'
      )
    );

  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json(
      errorResponse('Failed to create facility')
    );
  }
});

// @route   PUT /api/facilities/:id
// @desc    Update facility (Owner/Admin only)
// @access  Private
router.put('/:id', authenticateToken, authorize('owner', 'admin'), checkFacilityOwnership, validateFacilityUpdate, handleValidationErrors, async (req, res) => {
  try {
    const facilityId = parseInt(req.params.id);
    const updates = req.body;

    // Remove undefined fields
    const validUpdates = Object.entries(updates)
      .filter(([key, value]) => value !== undefined)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json(
        errorResponse('No valid fields provided for update')
      );
    }

    // Build dynamic update query
    const updateFields = [];
    const queryParams = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(validUpdates)) {
      paramCount++;
      const dbField = {
        'name': 'name',
        'description': 'description',
        'address': 'address',
        'latitude': 'latitude',
        'longitude': 'longitude',
        'phone': 'phone',
        'email': 'email',
        'pricingPerHour': 'pricing_per_hour',
        'amenities': 'amenities',
        'operatingHours': 'operating_hours',
        'isActive': 'is_active'
      }[key];

      if (dbField) {
        updateFields.push(`${dbField} = $${paramCount}`);
        
        if (key === 'operatingHours') {
          queryParams.push(JSON.stringify(value));
        } else {
          queryParams.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json(
        errorResponse('No valid fields provided for update')
      );
    }

    paramCount++;
    queryParams.push(facilityId);

    const updateQuery = `
      UPDATE facilities 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, name, description, address, latitude, longitude, 
                pricing_per_hour, amenities, operating_hours, is_active, updated_at
    `;

    const result = await query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Facility not found')
      );
    }

    const facility = result.rows[0];

    res.json(
      successResponse(
        {
          facility: {
            id: facility.id,
            name: facility.name,
            description: facility.description,
            address: facility.address,
            coordinates: {
              latitude: facility.latitude,
              longitude: facility.longitude
            },
            pricing: {
              perHour: parseFloat(facility.pricing_per_hour)
            },
            amenities: facility.amenities || [],
            operatingHours: facility.operating_hours || {},
            isActive: facility.is_active,
            updatedAt: facility.updated_at
          }
        },
        'Facility updated successfully'
      )
    );

  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json(
      errorResponse('Failed to update facility')
    );
  }
});

// @route   DELETE /api/facilities/:id
// @desc    Delete facility (Owner/Admin only)
// @access  Private
router.delete('/:id', authenticateToken, authorize('owner', 'admin'), checkFacilityOwnership, async (req, res) => {
  try {
    const facilityId = parseInt(req.params.id);

    // Check for active bookings
    const activeBookingsResult = await query(
      'SELECT COUNT(*) as count FROM bookings WHERE facility_id = $1 AND status IN (\'pending\', \'confirmed\') AND booking_date >= CURRENT_DATE',
      [facilityId]
    );

    const activeBookingsCount = parseInt(activeBookingsResult.rows[0].count);

    if (activeBookingsCount > 0) {
      return res.status(400).json(
        errorResponse(`Cannot delete facility with ${activeBookingsCount} active booking(s)`)
      );
    }

    // Soft delete - just deactivate the facility
    const result = await query(
      'UPDATE facilities SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [facilityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('Facility not found')
      );
    }

    res.json(
      successResponse(null, 'Facility deactivated successfully')
    );

  } catch (error) {
    console.error('Delete facility error:', error);
    res.status(500).json(
      errorResponse('Failed to delete facility')
    );
  }
});

module.exports = router;