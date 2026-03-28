import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">📚</span>
            <span className="brand-text">BookShop</span>
          </Link>

          <ul className="navbar-menu">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/books">Books</Link></li>
            {isAuthenticated && <li><Link to="/orders">My Orders</Link></li>}
          </ul>

          <div className="navbar-actions">
            <Link to="/cart" className="cart-icon">
              🛒
              {cart.summary.itemCount > 0 && (
                <span className="cart-badge">{cart.summary.itemCount}</span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="user-menu">
                <span className="user-name">👤 {user.firstName}</span>
                <div className="dropdown">
                  <Link to="/profile">Profile</Link>
                  <Link to="/orders">Orders</Link>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;