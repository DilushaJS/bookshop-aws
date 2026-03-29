import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>📚 BookShop</h3>
            <p>Your premier online bookstore with a vast collection of books across all genres.</p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/books">Browse Books</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/contact">Contact</a></li>
              <li><a href="/faq">FAQ</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Categories</h4>
            <ul>
              <li><a href="/books?category=fiction">Fiction</a></li>
              <li><a href="/books?category=non-fiction">Non-Fiction</a></li>
              <li><a href="/books?category=science">Science</a></li>
              <li><a href="/books?category=business">Business</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Customer Service</h4>
            <ul>
              <li><a href="/shipping">Shipping Info</a></li>
              <li><a href="/returns">Returns</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 BookShop. All rights reserved. | Deployed on AWS</p>
          <div className="social-links">
            <button aria-label="Facebook" title="Facebook">📘</button>
            <button aria-label="Twitter" title="Twitter">🐦</button>
            <button aria-label="Instagram" title="Instagram">📷</button>
            <button aria-label="LinkedIn" title="LinkedIn">💼</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;