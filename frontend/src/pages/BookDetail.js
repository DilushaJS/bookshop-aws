import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const BookDetail = () => {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await axios.get(`/books/${id}`);
        setBook(response.data.data);
      } catch (error) {
        console.error('Error fetching book:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  if (loading) return <div className="container py-5"><h2>Loading...</h2></div>;
  if (!book) return <div className="container py-5"><h2>Book not found</h2></div>;

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-md-4">
          <img src={book.cover_image_url} alt={book.title} className="img-fluid" />
        </div>
        <div className="col-md-8">
          <h2>{book.title}</h2>
          <p className="text-muted">{book.author_name}</p>
          <div className="mb-3">
            <span className="h4">${book.final_price}</span>
            {book.discount_percentage > 0 && (
              <span className="text-danger ms-2">({book.discount_percentage}% off)</span>
            )}
          </div>
          <p>{book.description}</p>
          <div className="mb-3">
            <label htmlFor="quantity" className="me-2">Quantity:</label>
            <input
              type="number"
              id="quantity"
              min="1"
              max={book.stock_quantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="form-control"
              style={{ width: '100px' }}
            />
          </div>
          <button className="btn btn-primary">Add to Cart</button>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
