# 📚 BookShop - Full-Stack E-Commerce Platform

A professional, production-ready bookshop e-commerce platform built with Node.js, React, and MySQL, designed for AWS deployment.

## 🏗️ Architecture Overview

```
bookshop-aws/
├── frontend/          # React application
├── backend/           # Express.js REST API
├── images/            # Static assets
├── db.sql             # MySQL database schema
└── package.json       # Root package manager
```

## 🚀 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Relational database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **AWS SDK** - S3 integration for image uploads

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Context API** - State management

## 📋 Prerequisites

- Node.js 16+ 
- MySQL 8.0+
- AWS Account (for deployment)
- npm or yarn

## 🛠️ Local Development Setup

### 1. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE bookshop;

# Import schema
mysql -u root -p bookshop < db.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**
```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=bookshop
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
```

```bash
# Start backend server
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will run on `http://localhost:3000`

## ☁️ AWS Deployment Guide

### Architecture
```
AWS Services Used:
├── EC2 - Application hosting
├── RDS - MySQL database
├── S3 - Static assets & images
├── CloudFront - CDN
├── Route 53 - DNS management
├── ALB - Load balancing
├── VPC - Network isolation
└── IAM - Access management
```

### Step 1: RDS MySQL Database

1. **Create RDS MySQL Instance**
   ```
   - Engine: MySQL 8.0
   - Instance: db.t3.micro (free tier) or larger
   - Storage: 20 GB SSD
   - Multi-AZ: Yes (production)
   - Public Access: No
   - VPC Security Group: Create new
   ```

2. **Security Group Configuration**
   - Inbound: MySQL/Aurora (3306) from EC2 security group
   - Outbound: All traffic

3. **Initialize Database**
   ```bash
   # Connect from EC2 instance
   mysql -h your-rds-endpoint.region.rds.amazonaws.com -u admin -p
   
   # Create database
   CREATE DATABASE bookshop;
   
   # Import schema
   mysql -h your-rds-endpoint -u admin -p bookshop < db.sql
   ```

### Step 2: S3 Bucket for Images

1. **Create S3 Bucket**
   ```
   - Bucket name: bookshop-images-[unique-id]
   - Region: Same as your EC2
   - Block public access: OFF (for public images)
   - Versioning: Enabled
   ```

2. **Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::bookshop-images-[id]/*"
       }
     ]
   }
   ```

3. **CORS Configuration**
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

### Step 3: EC2 Instance Setup

1. **Launch EC2 Instance**
   ```
   - AMI: Amazon Linux 2 or Ubuntu 22.04
   - Instance type: t2.micro (free tier) or t3.small
   - Key pair: Create or use existing
   - Security group:
     * SSH (22) from your IP
     * HTTP (80) from anywhere
     * HTTPS (443) from anywhere
     * Custom TCP (5000) from anywhere (temporary)
   ```

2. **Connect to EC2**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

3. **Install Node.js**
   ```bash
   # Update system
   sudo yum update -y  # Amazon Linux
   # OR
   sudo apt update && sudo apt upgrade -y  # Ubuntu
   
   # Install Node.js 18
   curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   # OR for Ubuntu:
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

4. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

5. **Install MySQL Client**
   ```bash
   sudo yum install mysql -y  # Amazon Linux
   # OR
   sudo apt install mysql-client -y  # Ubuntu
   ```

6. **Clone & Setup Application**
   ```bash
   # Create app directory
   mkdir -p /home/ec2-user/apps
   cd /home/ec2-user/apps
   
   # Upload your code (using SCP, Git, or CodeDeploy)
   # Example with SCP from local machine:
   scp -i your-key.pem -r bookshop-aws ec2-user@your-ec2-ip:/home/ec2-user/apps/
   
   # Install dependencies
   cd bookshop-aws/backend
   npm install --production
   
   # Create .env file
   nano .env
   # Add production environment variables
   ```

7. **Production .env Configuration**
   ```env
   NODE_ENV=production
   PORT=5000
   DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
   DB_PORT=3306
   DB_USER=admin
   DB_PASSWORD=your-rds-password
   DB_NAME=bookshop
   JWT_SECRET=generate-a-strong-random-secret
   JWT_EXPIRE=7d
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   S3_BUCKET_NAME=bookshop-images-[id]
   FRONTEND_URL=https://yourdomain.com
   ```

8. **Start Backend with PM2**
   ```bash
   pm2 start server.js --name bookshop-api
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```

### Step 4: Frontend Deployment

**Option A: Deploy on Same EC2 (Simple)**

```bash
cd /home/ec2-user/apps/bookshop-aws/frontend

# Create production build
npm run build

# Install serve
sudo npm install -g serve

# Start frontend
pm2 serve build 3000 --name bookshop-frontend --spa
pm2 save
```

**Option B: Deploy on S3 + CloudFront (Recommended)**

```bash
# Build frontend locally
cd frontend
npm run build

# Upload to S3
aws s3 sync build/ s3://bookshop-frontend-[id]/ --delete

# Create CloudFront distribution
# Point to S3 bucket as origin
# Enable HTTPS
# Set default root object: index.html
# Configure custom error response: 404 -> /index.html (for SPA routing)
```

### Step 5: NGINX Reverse Proxy (Recommended)

```bash
# Install NGINX
sudo amazon-linux-extras install nginx1 -y  # Amazon Linux
# OR
sudo apt install nginx -y  # Ubuntu

# Start NGINX
sudo systemctl start nginx
sudo systemctl enable nginx

# Create configuration
sudo nano /etc/nginx/conf.d/bookshop.conf
```

**NGINX Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Frontend (if serving from EC2)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx
```

### Step 6: SSL Certificate (HTTPS)

```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx -y  # Amazon Linux
# OR
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Step 7: Application Load Balancer (Optional - Production)

1. **Create Target Group**
   - Protocol: HTTP
   - Port: 5000 (backend) or 80 (NGINX)
   - Health check path: /health

2. **Create ALB**
   - Scheme: Internet-facing
   - Listeners: HTTP (80), HTTPS (443)
   - Availability Zones: Select 2+
   - Security group: Allow HTTP/HTTPS

3. **Update EC2 Security Group**
   - Allow traffic only from ALB security group

## 📊 Database Schema

The application includes:
- **Users** - Customer and admin accounts
- **Books** - Product catalog
- **Authors** - Book authors
- **Categories** - Book categorization
- **Orders** - Order management
- **Order Items** - Order details
- **Cart** - Shopping cart
- **Reviews** - Product reviews

See `db.sql` for complete schema.

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit .env files
   - Use strong JWT secrets
   - Rotate credentials regularly

2. **Database**
   - Use private subnets for RDS
   - Enable encryption at rest
   - Regular backups
   - Use IAM database authentication

3. **Application**
   - Input validation
   - SQL injection prevention (parameterized queries)
   - XSS protection
   - CORS configuration
   - Rate limiting (implement with express-rate-limit)
   - Helmet.js security headers

4. **AWS**
   - Use IAM roles instead of access keys
   - Enable CloudTrail logging
   - Configure VPC security groups properly
   - Use AWS WAF for additional protection

## 📈 Monitoring & Logging

### CloudWatch Integration

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm
```

### Application Logging

```javascript
// Add to server.js
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

const logger = winston.createLogger({
  transports: [
    new CloudWatchTransport({
      logGroupName: '/aws/ec2/bookshop',
      logStreamName: 'application-logs'
    })
  ]
});
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (auth required)

### Books
- `GET /api/books` - Get all books (with filters)
- `GET /api/books/:id` - Get single book
- `POST /api/books` - Create book (admin only)
- `PUT /api/books/:id` - Update book (admin only)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove from cart

### Orders
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test RDS connectivity
mysql -h your-rds-endpoint -u admin -p

# Check security groups
# Ensure EC2 security group can access RDS security group on port 3306
```

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs bookshop-api

# Check disk space
df -h

# Check memory
free -m
```

### Frontend Build Issues
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📞 Support

For issues and questions, please check:
- AWS Documentation
- Node.js Documentation
- React Documentation

## 📄 License

MIT License - Feel free to use this project for learning and practice.

---

**Built for AWS Cloud Practitioner Practice** 🚀