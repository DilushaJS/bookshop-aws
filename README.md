# Bookshop AWS E-Commerce Platform

A full-stack e-commerce bookshop application built with React, Node.js/Express, MySQL, and designed for AWS deployment.

## Prerequisites

- Node.js 18+ (with npm)
- MySQL 8.0+
- macOS/Linux/Windows with terminal access

## Quick Start

### 1. Clone & Install Dependencies

```bash
cd bookshop-aws
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..
```

### 2. Set Up MySQL Database

**macOS (Homebrew):**
```bash
brew install mysql
brew services start mysql
mysql -u root -p -e "DROP DATABASE IF EXISTS bookshop; CREATE DATABASE bookshop;"
mysql -u root -p bookshop < backend/src/db/db.sql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mysql-server
sudo systemctl start mysql
sudo mysql -u root -p -e "DROP DATABASE IF EXISTS bookshop; CREATE DATABASE bookshop;"
sudo mysql -u root -p bookshop < backend/src/db/db.sql
```

### 3. Configure Environment Variables

**Backend** - Edit `backend/.env`:
```
NODE_ENV=development
PORT=5001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bookshop

JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d

FRONTEND_URL=http://localhost:3000
```

### 4. Run the Application

**Option A: Run Both Services (root directory)**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

**Option B: From Root with Concurrently**
```bash
npm run dev  # Requires backend/.env to be configured
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001/api
- **Health Check**: http://localhost:5001/health

## Project Structure

```
bookshop-aws/
├── backend/
│   ├── src/
│   │   ├── server.js           # Express app entry point
│   │   ├── config/             # Configuration (database)
│   │   ├── middleware/         # Auth, error handling
│   │   ├── routes/             # API routes (auth, books, cart, orders, categories)
│   │   └── db/                 # Database schema & seed data
│   ├── package.json
│   └── .env                    # Environment variables (DO NOT commit)
├── frontend/
│   ├── src/
│   │   ├── App.js              # Main React component
│   │   ├── components/         # Reusable components (Navbar, Footer)
│   │   ├── pages/              # Page components (Home, Auth, Login)
│   │   ├── AuthContext.js      # Auth state management
│   │   └── CartContext.js      # Cart state management
│   ├── package.json
│   └── public/                 # Static files
├── package.json                # Root scripts
├── AWS_ARCHITECTURE.md         # AWS deployment architecture
├── deploy.sh                   # Deployment script
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)
- `PUT /api/auth/profile` - Update user profile (requires auth)

### Books
- `GET /api/books` - Get all books (with pagination, filtering, sorting)
- `GET /api/books/:id` - Get single book
- `POST /api/books` - Create book (admin only)
- `PUT /api/books/:id` - Update book (admin only)
- `DELETE /api/books/:id` - Delete book (admin only)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category with books

### Cart
- `GET /api/cart` - Get user's cart (requires auth)
- `POST /api/cart` - Add item to cart (requires auth)
- `PUT /api/cart/:id` - Update cart item quantity (requires auth)
- `DELETE /api/cart/:id` - Remove item from cart (requires auth)
- `DELETE /api/cart` - Clear cart (requires auth)

### Orders
- `GET /api/orders` - Get user's orders (requires auth)
- `GET /api/orders/:id` - Get order details (requires auth)
- `POST /api/orders` - Create new order (requires auth)
- `PUT /api/orders/:id` - Update order status (admin only)

## Database

### Schema Includes:
- **users** - Customer and admin accounts
- **authors** - Book authors
- **categories** - Book categories with hierarchy
- **books** - Book inventory with pricing, ratings, inventory
- **reviews** - Customer reviews
- **cart_items** - Shopping cart
- **orders** - Order history
- **order_items** - Order line items

All tables include indexes for optimal query performance and timestamps for auditing.

## Features

✅ User authentication with JWT
✅ Book browsing with advanced filtering (category, price, author, search)
✅ Shopping cart management
✅ Order placement and tracking
✅ Product reviews and ratings
✅ Admin panel for inventory management
✅ Responsive React UI
✅ Secure password hashing with bcrypt
✅ Input validation with express-validator
✅ CORS enabled for cross-origin requests
✅ Compression and security headers with helmet

## Development

### Sample Credentials

After running the database seed script, you can log in with:

**Admin Account:**
- Email: `admin@bookshop.com`
- Password: `password123` (from seed data)

**Customer Account:**
- Email: `john.doe@email.com`
- Password: `password123`

### Debugging

Backend logs are printed to console when `NODE_ENV=development`.

Frontend development server provides hot module reloading for instant updates.

## Deployment

See [AWS_ARCHITECTURE.md](AWS_ARCHITECTURE.md) for detailed AWS deployment instructions including:
- EC2 setup
- RDS MySQL configuration
- CloudFront CDN setup
- S3 bucket configuration
- Load balancer setup
- Security groups
- Auto-scaling configuration

## Troubleshooting

**Port already in use:**
```bash
lsof -n -iTCP:5001 -sTCP:LISTEN
kill -9 <PID>
```

**Database connection failed:**
- Verify MySQL is running: `brew services list` (macOS)
- Check credentials in `backend/.env`
- Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`

**CORS errors:**
- Verify `FRONTEND_URL` in `backend/.env` matches your frontend URL
- Check browser console for exact error details

## License

MIT
