import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featuredRes, bestsellersRes] = await Promise.all([
          axios.get('/books?featured=true'),
          axios.get('/books?bestseller=true')
        ]);

        setFeaturedBooks(featuredRes.data.data);
        setBestsellers(bestsellersRes.data.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Discover Your Next Great Read</h1>
            <p>Explore thousands of books across all genres. Fast shipping, great prices, and exceptional service.</p>
            <Link to="/books" className="btn btn-primary btn-lg">Browse Our Collection</Link>
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Featured Books</h2>
          <div className="books-grid">
            {featuredBooks.map(book => (
              <Link to={`/books/${book.book_id}`} key={book.book_id} className="book-card">
                <div className="book-image">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt={book.title} />
                  ) : (
                    <div className="book-placeholder">📖</div>
                  )}
                  {book.discount_percentage > 0 && (
                    <span className="discount-badge">-{book.discount_percentage}%</span>
                  )}
                </div>
                <div className="book-info">
                  <h3>{book.title}</h3>
                  <p className="author">{book.author_name}</p>
                  <div className="rating">
                    {'⭐'.repeat(Math.round(book.rating_average || 0))}
                    <span>({book.rating_count || 0})</span>
                  </div>
                  <div className="price">
                    {book.discount_percentage > 0 ? (
                      <>
                        <span className="final-price">${book.final_price}</span>
                        <span className="original-price">${book.price}</span>
                      </>
                    ) : (
                      <span className="final-price">${book.price}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-3">
            <Link to="/books?featured=true" className="btn btn-outline">View All Featured</Link>
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="section bestsellers">
        <div className="container">
          <h2 className="section-title">Bestsellers</h2>
          <div className="books-grid">
            {bestsellers.slice(0, 8).map(book => (
              <Link to={`/books/${book.book_id}`} key={book.book_id} className="book-card">
                <div className="book-image">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt={book.title} />
                  ) : (
                    <div className="book-placeholder">📖</div>
                  )}
                  <span className="bestseller-badge">🏆 Bestseller</span>
                </div>
                <div className="book-info">
                  <h3>{book.title}</h3>
                  <p className="author">{book.author_name}</p>
                  <div className="rating">
                    {'⭐'.repeat(Math.round(book.rating_average || 0))}
                    <span>({book.rating_count || 0})</span>
                  </div>
                  <div className="price">
                    <span className="final-price">${book.price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-3">
            <Link to="/books?bestseller=true" className="btn btn-outline">View All Bestsellers</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features">
        <div className="container">
          <h2 className="section-title">Why Choose BookShop?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🚚</div>
              <h3>Fast Shipping</h3>
              <p>Get your books delivered quickly with our express shipping options.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Best Prices</h3>
              <p>Competitive prices and regular discounts on thousands of titles.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Vast Selection</h3>
              <p>Browse through our extensive collection across all genres.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Payment</h3>
              <p>Shop with confidence using our secure payment gateway.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;