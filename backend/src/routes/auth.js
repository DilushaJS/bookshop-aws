const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').optional().trim(),
    body('address').optional()
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { email, password, firstName, lastName, phone, address } = req.body;

      // Check if user exists
      const [existingUsers] = await promisePool.query(
        'SELECT user_id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert user
      const [result] = await promisePool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, 
         address_line1, city, state, postal_code, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          email,
          passwordHash,
          firstName,
          lastName,
          phone || null,
          address?.addressLine1 || null,
          address?.city || null,
          address?.state || null,
          address?.postalCode || null,
          address?.country || 'USA'
        ]
      );

      // Generate JWT token
      const token = jwt.sign(
        { userId: result.insertId, email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          userId: result.insertId,
          email,
          firstName,
          lastName
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }
);

// Login user
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Get user
      const [users] = await promisePool.query(
        `SELECT user_id, email, password_hash, first_name, last_name, role, is_active 
         FROM users WHERE email = ?`,
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const user = users[0];

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive. Please contact support.'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update last login
      await promisePool.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = ?',
        [user.user_id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.user_id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          userId: user.user_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }
);

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const [users] = await promisePool.query(
      `SELECT user_id, email, first_name, last_name, phone, 
       address_line1, address_line2, city, state, postal_code, country, 
       role, created_at, last_login
       FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Update user profile
router.put(
  '/profile',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('address').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { firstName, lastName, phone, address } = req.body;

      await promisePool.query(
        `UPDATE users SET 
         first_name = COALESCE(?, first_name),
         last_name = COALESCE(?, last_name),
         phone = COALESCE(?, phone),
         address_line1 = COALESCE(?, address_line1),
         address_line2 = COALESCE(?, address_line2),
         city = COALESCE(?, city),
         state = COALESCE(?, state),
         postal_code = COALESCE(?, postal_code),
         country = COALESCE(?, country)
         WHERE user_id = ?`,
        [
          firstName,
          lastName,
          phone,
          address?.addressLine1,
          address?.addressLine2,
          address?.city,
          address?.state,
          address?.postalCode,
          address?.country,
          req.user.user_id
        ]
      );

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }
);

module.exports = router;