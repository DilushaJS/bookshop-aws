import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], summary: { itemCount: 0, total: '0.00' } });
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [], summary: { itemCount: 0, total: '0.00' } });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/cart');
      setCart(response.data.data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (bookId, quantity = 1) => {
    try {
      await axios.post('/cart', { bookId, quantity });
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Failed to add to cart:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to add to cart' };
    }
  };

  const updateCartItem = async (cartId, quantity) => {
    try {
      await axios.put(`/cart/${cartId}`, { quantity });
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Failed to update cart:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to update cart' };
    }
  };

  const removeFromCart = async (cartId) => {
    try {
      await axios.delete(`/cart/${cartId}`);
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to remove from cart' };
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete('/cart');
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear cart:', error);
      return { success: false };
    }
  };

  const value = {
    cart,
    loading,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};