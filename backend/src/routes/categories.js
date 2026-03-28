const express = require('express');
const { promisePool } = require('../config/database');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const [categories] = await promisePool.query(
      `SELECT 
        c.category_id, c.name, c.description, c.slug,
        COUNT(b.book_id) as book_count
      FROM categories c
      LEFT JOIN books b ON c.category_id = b.category_id AND b.is_active = TRUE
      GROUP BY c.category_id
      ORDER BY c.name`
    );

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Get single category with books
router.get('/:slug', async (req, res) => {
  try {
    const [categories] = await promisePool.query(
      'SELECT * FROM categories WHERE slug = ?',
      [req.params.slug]
    );

    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const [books] = await promisePool.query(
      `SELECT 
        b.book_id, b.isbn, b.title, b.price, b.discount_percentage,
        b.cover_image_url, b.rating_average, b.rating_count,
        CONCAT(a.first_name, ' ', a.last_name) as author_name,
        ROUND(b.price * (1 - b.discount_percentage / 100), 2) as final_price
      FROM books b
      JOIN authors a ON b.author_id = a.author_id
      WHERE b.category_id = ? AND b.is_active = TRUE
      ORDER BY b.sales_count DESC
      LIMIT 20`,
      [categories[0].category_id]
    );

    res.json({
      success: true,
      data: {
        category: categories[0],
        books
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
});

module.exports = router;