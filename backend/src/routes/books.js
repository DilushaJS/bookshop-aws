const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { promisePool } = require('../config/database');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all books with filtering, sorting, and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isInt(),
  query('author').optional().isInt(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('search').optional().trim(),
  query('sort').optional().isIn(['price_asc', 'price_desc', 'rating', 'newest', 'popular']),
  query('featured').optional().isBoolean(),
  query('bestseller').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = ['b.is_active = TRUE'];
    let queryParams = [];

    if (req.query.category) {
      whereConditions.push('b.category_id = ?');
      queryParams.push(req.query.category);
    }

    if (req.query.author) {
      whereConditions.push('b.author_id = ?');
      queryParams.push(req.query.author);
    }

    if (req.query.minPrice) {
      whereConditions.push('b.price >= ?');
      queryParams.push(req.query.minPrice);
    }

    if (req.query.maxPrice) {
      whereConditions.push('b.price <= ?');
      queryParams.push(req.query.maxPrice);
    }

    if (req.query.search) {
      whereConditions.push('(b.title LIKE ? OR b.description LIKE ? OR CONCAT(a.first_name, " ", a.last_name) LIKE ?)');
      const searchTerm = `%${req.query.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (req.query.featured === 'true') {
      whereConditions.push('b.featured = TRUE');
    }

    if (req.query.bestseller === 'true') {
      whereConditions.push('b.bestseller = TRUE');
    }

    const whereClause = whereConditions.join(' AND ');

    // Build ORDER BY clause
    let orderBy = 'b.created_at DESC';
    switch (req.query.sort) {
      case 'price_asc':
        orderBy = 'b.price ASC';
        break;
      case 'price_desc':
        orderBy = 'b.price DESC';
        break;
      case 'rating':
        orderBy = 'b.rating_average DESC, b.rating_count DESC';
        break;
      case 'newest':
        orderBy = 'b.created_at DESC';
        break;
      case 'popular':
        orderBy = 'b.sales_count DESC, b.views DESC';
        break;
    }

    // Get total count
    const [countResult] = await promisePool.query(
      `SELECT COUNT(*) as total FROM books b
       JOIN authors a ON b.author_id = a.author_id
       WHERE ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get books
    const [books] = await promisePool.query(
      `SELECT 
        b.book_id, b.isbn, b.title, b.description, b.price, b.discount_percentage,
        b.stock_quantity, b.cover_image_url, b.format, b.pages, b.publication_date,
        b.rating_average, b.rating_count, b.featured, b.bestseller,
        CONCAT(a.first_name, ' ', a.last_name) as author_name,
        a.author_id,
        c.name as category_name,
        c.category_id,
        ROUND(b.price * (1 - b.discount_percentage / 100), 2) as final_price
      FROM books b
      JOIN authors a ON b.author_id = a.author_id
      JOIN categories c ON b.category_id = c.category_id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      success: true,
      data: books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch books' });
  }
});

// Get single book by ID
router.get('/:id', async (req, res) => {
  try {
    const [books] = await promisePool.query(
      `SELECT 
        b.*, 
        CONCAT(a.first_name, ' ', a.last_name) as author_name,
        a.biography as author_biography,
        a.nationality as author_nationality,
        c.name as category_name,
        c.slug as category_slug,
        ROUND(b.price * (1 - b.discount_percentage / 100), 2) as final_price
      FROM books b
      JOIN authors a ON b.author_id = a.author_id
      JOIN categories c ON b.category_id = c.category_id
      WHERE b.book_id = ? AND b.is_active = TRUE`,
      [req.params.id]
    );

    if (books.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Increment view count
    await promisePool.query(
      'UPDATE books SET views = views + 1 WHERE book_id = ?',
      [req.params.id]
    );

    // Get reviews for this book
    const [reviews] = await promisePool.query(
      `SELECT 
        r.review_id, r.rating, r.title, r.comment, r.verified_purchase,
        r.helpful_count, r.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as reviewer_name
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.book_id = ?
      ORDER BY r.helpful_count DESC, r.created_at DESC
      LIMIT 10`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...books[0],
        reviews
      }
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch book' });
  }
});

// Create new book (Admin only)
router.post('/', authenticate, isAdmin, [
  body('isbn').isISBN(),
  body('title').trim().notEmpty(),
  body('authorId').isInt(),
  body('categoryId').isInt(),
  body('price').isFloat({ min: 0 }),
  body('stockQuantity').isInt({ min: 0 }),
  body('description').optional().trim(),
  body('publisher').optional().trim(),
  body('publicationDate').optional().isISO8601(),
  body('pages').optional().isInt({ min: 1 }),
  body('format').optional().isIn(['Hardcover', 'Paperback', 'eBook', 'Audiobook'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      isbn, title, authorId, categoryId, publisher, publicationDate,
      pages, description, price, stockQuantity, format, coverImageUrl,
      featured, bestseller, discountPercentage
    } = req.body;

    const [result] = await promisePool.query(
      `INSERT INTO books 
       (isbn, title, author_id, category_id, publisher, publication_date, pages, 
        description, price, stock_quantity, cover_image_url, format, featured, 
        bestseller, discount_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [isbn, title, authorId, categoryId, publisher, publicationDate, pages,
       description, price, stockQuantity, coverImageUrl, format,
       featured || false, bestseller || false, discountPercentage || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      bookId: result.insertId
    });
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({ success: false, message: 'Failed to create book' });
  }
});

// Update book (Admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const updates = [];
    const values = [];

    const allowedFields = [
      'title', 'price', 'stock_quantity', 'description', 'discount_percentage',
      'featured', 'bestseller', 'cover_image_url', 'is_active'
    ];

    Object.keys(req.body).forEach(key => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        updates.push(`${snakeKey} = ?`);
        values.push(req.body[key]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    values.push(req.params.id);

    const [result] = await promisePool.query(
      `UPDATE books SET ${updates.join(', ')} WHERE book_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, message: 'Book updated successfully' });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ success: false, message: 'Failed to update book' });
  }
});

// Delete book (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const [result] = await promisePool.query(
      'UPDATE books SET is_active = FALSE WHERE book_id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete book' });
  }
});

// Get featured books
router.get('/featured/list', async (req, res) => {
  try {
    const [books] = await promisePool.query(
      `SELECT * FROM featured_books LIMIT 8`
    );

    res.json({ success: true, data: books });
  } catch (error) {
    console.error('Get featured books error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch featured books' });
  }
});

// Get bestselling books
router.get('/bestsellers/list', async (req, res) => {
  try {
    const [books] = await promisePool.query(
      `SELECT * FROM bestselling_books LIMIT 10`
    );

    res.json({ success: true, data: books });
  } catch (error) {
    console.error('Get bestsellers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bestsellers' });
  }
});

module.exports = router;