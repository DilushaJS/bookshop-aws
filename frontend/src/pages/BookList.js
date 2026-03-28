import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Home.css';

const BookList = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await axios.get('/books');
        setBooks(response.data.data);
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  if (loading) return <div className="container py-5"><h2>Loading...</h2></div>;

  return (
    <div className="container py-5">
      <h2>All Books</h2>
      <div className="books-grid">
        {books.map(book => (
          <Link to={`/books/${book.book_id}`} key={book.book_id} className="card">
            <img src={book.cover_image_url} alt={book.title} />
            <h3>{book.title}</h3>
            <p className="text-muted">{book.author_name}</p>
            <p className="price">${book.final_price}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BookList;
