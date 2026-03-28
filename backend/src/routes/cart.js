const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user's cart
router.get('/', authenticate, async (req, res) => {
  try {
    const [cartItems] = await promisePool.query(
      `SELECT 
        c.cart_id, c.quantity, c.added_at,
        b.book_id, b.isbn, b.title, b.price, b.discount_percentage,
        b.stock_quantity, b.cover_image_url,
        CONCAT(a.first_name, ' ', a.last_name) as author_name,
        ROUND(b.price * (1 - b.discount_percentage / 100), 2) as final_price,
        ROUND(b.price * (1 - b.discount_percentage / 100) * c.quantity, 2) as item_total
      FROM cart_items c
      JOIN books b ON c.book_id = b.book_id
      JOIN authors a ON b.author_id = a.author_id
      WHERE c.user_id = ? AND b.is_active = TRUE`,
      [req.user.user_id]
    );

    const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      data: {
        items: cartItems,
        summary: {
          itemCount,
          subtotal: subtotal.toFixed(2),
          tax: (subtotal * 0.08).toFixed(2), // 8% tax
          shipping: itemCount > 0 ? 5.99 : 0,
          total: (subtotal + subtotal * 0.08 + (itemCount > 0 ? 5.99 : 0)).toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
});

// Add item to cart
router.post('/', authenticate, [
  body('bookId').isInt(),
  body('quantity').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { bookId, quantity } = req.body;

    // Check if book exists and has stock
    const [books] = await promisePool.query(
      'SELECT stock_quantity FROM books WHERE book_id = ? AND is_active = TRUE',
      [bookId]
    );

    if (books.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    if (books[0].stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
        availableStock: books[0].stock_quantity
      });
    }

    // Check if item already in cart
    const [existingItems] = await promisePool.query(
      'SELECT cart_id, quantity FROM cart_items WHERE user_id = ? AND book_id = ?',
      [req.user.user_id, bookId]
    );

    if (existingItems.length > 0) {
      // Update quantity
      const newQuantity = existingItems[0].quantity + quantity;
      
      if (books[0].stock_quantity < newQuantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock for requested quantity',
          availableStock: books[0].stock_quantity
        });
      }

      await promisePool.query(
        'UPDATE cart_items SET quantity = ? WHERE cart_id = ?',
        [newQuantity, existingItems[0].cart_id]
      );
    } else {
      // Insert new item
      await promisePool.query(
        'INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?, ?, ?)',
        [req.user.user_id, bookId, quantity]
      );
    }

    res.json({ success: true, message: 'Item added to cart' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart' });
  }
});

// Update cart item quantity
router.put('/:cartId', authenticate, [
  body('quantity').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { quantity } = req.body;

    // Get cart item with book stock info
    const [cartItems] = await promisePool.query(
      `SELECT c.cart_id, c.book_id, b.stock_quantity
       FROM cart_items c
       JOIN books b ON c.book_id = b.book_id
       WHERE c.cart_id = ? AND c.user_id = ?`,
      [req.params.cartId, req.user.user_id]
    );

    if (cartItems.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    if (cartItems[0].stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
        availableStock: cartItems[0].stock_quantity
      });
    }

    await promisePool.query(
      'UPDATE cart_items SET quantity = ? WHERE cart_id = ?',
      [quantity, req.params.cartId]
    );

    res.json({ success: true, message: 'Cart updated successfully' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
});

// Remove item from cart
router.delete('/:cartId', authenticate, async (req, res) => {
  try {
    const [result] = await promisePool.query(
      'DELETE FROM cart_items WHERE cart_id = ? AND user_id = ?',
      [req.params.cartId, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item from cart' });
  }
});

// Clear cart
router.delete('/', authenticate, async (req, res) => {
  try {
    await promisePool.query(
      'DELETE FROM cart_items WHERE user_id = ?',
      [req.user.user_id]
    );

    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
});

module.exports = router;