const express = require('express');
const { body, validationResult } = require('express-validator');
const { promisePool } = require('../config/database');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Generate order number
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `ORD-${year}-${random}`;
};

// Create order from cart
router.post('/', authenticate, [
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal', 'stripe', 'cod']),
  body('shippingAddress').isObject(),
  body('shippingAddress.addressLine1').trim().notEmpty(),
  body('shippingAddress.city').trim().notEmpty(),
  body('shippingAddress.state').trim().notEmpty(),
  body('shippingAddress.postalCode').trim().notEmpty(),
  body('shippingAddress.country').trim().notEmpty()
], async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { paymentMethod, shippingAddress, notes } = req.body;

    // Get cart items
    const [cartItems] = await connection.query(
      `SELECT c.book_id, c.quantity, b.price, b.discount_percentage, b.stock_quantity
       FROM cart_items c
       JOIN books b ON c.book_id = b.book_id
       WHERE c.user_id = ? AND b.is_active = TRUE`,
      [req.user.user_id]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Check stock availability
    for (const item of cartItems) {
      if (item.stock_quantity < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for one or more items`
        });
      }
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
      const finalPrice = item.price * (1 - item.discount_percentage / 100);
      return sum + finalPrice * item.quantity;
    }, 0);

    const taxAmount = subtotal * 0.08; // 8% tax
    const shippingCost = 5.99;
    const totalAmount = subtotal + taxAmount + shippingCost;

    // Create order
    const orderNumber = generateOrderNumber();
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, order_number, total_amount, tax_amount, shipping_cost,
       payment_method, shipping_address_line1, shipping_address_line2, shipping_city,
       shipping_state, shipping_postal_code, shipping_country, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        orderNumber,
        totalAmount.toFixed(2),
        taxAmount.toFixed(2),
        shippingCost,
        paymentMethod,
        shippingAddress.addressLine1,
        shippingAddress.addressLine2 || null,
        shippingAddress.city,
        shippingAddress.state,
        shippingAddress.postalCode,
        shippingAddress.country,
        notes || null
      ]
    );

    const orderId = orderResult.insertId;

    // Create order items and update stock
    for (const item of cartItems) {
      const finalPrice = item.price * (1 - item.discount_percentage / 100);
      const discount = item.price - finalPrice;
      const subtotal = finalPrice * item.quantity;

      await connection.query(
        `INSERT INTO order_items (order_id, book_id, quantity, unit_price, discount, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.book_id, item.quantity, item.price, discount.toFixed(2), subtotal.toFixed(2)]
      );

      // Update book stock and sales count
      await connection.query(
        `UPDATE books SET stock_quantity = stock_quantity - ?, sales_count = sales_count + ?
         WHERE book_id = ?`,
        [item.quantity, item.quantity, item.book_id]
      );
    }

    // Clear cart
    await connection.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.user_id]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId,
        orderNumber,
        totalAmount: totalAmount.toFixed(2)
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  } finally {
    connection.release();
  }
});

// Get user's orders
router.get('/', authenticate, async (req, res) => {
  try {
    const [orders] = await promisePool.query(
      `SELECT 
        o.order_id, o.order_number, o.total_amount, o.status, o.payment_status,
        o.created_at, o.shipped_at, o.delivered_at,
        COUNT(oi.order_item_id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.order_id
      ORDER BY o.created_at DESC`,
      [req.user.user_id]
    );

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Get single order details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [orders] = await promisePool.query(
      `SELECT 
        o.*,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = ? AND (o.user_id = ? OR ? = 'admin')`,
      [req.params.id, req.user.user_id, req.user.role]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const [orderItems] = await promisePool.query(
      `SELECT 
        oi.*, 
        b.title, b.isbn, b.cover_image_url,
        CONCAT(a.first_name, ' ', a.last_name) as author_name
      FROM order_items oi
      JOIN books b ON oi.book_id = b.book_id
      JOIN authors a ON b.author_id = a.author_id
      WHERE oi.order_id = ?`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...orders[0],
        items: orderItems
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

// Update order status (Admin only)
router.put('/:id/status', authenticate, isAdmin, [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { status } = req.body;
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'shipped') {
      updates.push('shipped_at = NOW()');
    } else if (status === 'delivered') {
      updates.push('delivered_at = NOW()');
    }

    values.push(req.params.id);

    const [result] = await promisePool.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Get all orders (Admin only)
router.get('/admin/all', authenticate, isAdmin, async (req, res) => {
  try {
    const [orders] = await promisePool.query(`SELECT * FROM order_summary ORDER BY created_at DESC`);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

module.exports = router;