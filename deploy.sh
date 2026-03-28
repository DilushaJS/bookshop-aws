#!/bin/bash

# BookShop AWS Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "======================================"
echo "BookShop AWS Deployment Script"
echo "======================================"

# Configuration
APP_NAME="bookshop"
REGION="us-east-1"
INSTANCE_TYPE="t3.small"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install it first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Build frontend
build_frontend() {
    print_info "Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    print_success "Frontend built successfully"
}

# Deploy to S3
deploy_frontend_s3() {
    print_info "Deploying frontend to S3..."
    
    BUCKET_NAME="${APP_NAME}-frontend-$(date +%s)"
    
    # Create bucket
    aws s3 mb s3://${BUCKET_NAME} --region ${REGION}
    
    # Enable static website hosting
    aws s3 website s3://${BUCKET_NAME} --index-document index.html --error-document index.html
    
    # Upload build files
    aws s3 sync frontend/build/ s3://${BUCKET_NAME}/ --delete
    
    # Make bucket public
    aws s3api put-bucket-policy --bucket ${BUCKET_NAME} --policy "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [{
            \"Sid\": \"PublicReadGetObject\",
            \"Effect\": \"Allow\",
            \"Principal\": \"*\",
            \"Action\": \"s3:GetObject\",
            \"Resource\": \"arn:aws:s3:::${BUCKET_NAME}/*\"
        }]
    }"
    
    print_success "Frontend deployed to S3: http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
}

# Install backend dependencies
prepare_backend() {
    print_info "Preparing backend..."
    cd backend
    npm install --production
    cd ..
    print_success "Backend prepared"
}

# Package application for EC2
package_app() {
    print_info "Packaging application..."
    
    tar -czf ${APP_NAME}.tar.gz \
        --exclude='node_modules' \
        --exclude='frontend/build' \
        --exclude='frontend/node_modules' \
        --exclude='.git' \
        backend/ package.json README.md
    
    print_success "Application packaged: ${APP_NAME}.tar.gz"
}

# Upload to EC2 (requires EC2 instance and key)
upload_to_ec2() {
    read -p "Enter EC2 instance IP: " EC2_IP
    read -p "Enter path to SSH key (.pem file): " SSH_KEY
    read -p "Enter EC2 username (default: ec2-user): " EC2_USER
    EC2_USER=${EC2_USER:-ec2-user}
    
    print_info "Uploading to EC2..."
    
    # Upload package
    scp -i ${SSH_KEY} ${APP_NAME}.tar.gz ${EC2_USER}@${EC2_IP}:/home/${EC2_USER}/
    
    # Extract and setup
    ssh -i ${SSH_KEY} ${EC2_USER}@${EC2_IP} << 'ENDSSH'
        # Extract package
        tar -xzf bookshop.tar.gz
        cd backend
        
        # Install dependencies
        npm install --production
        
        # Setup PM2
        pm2 stop bookshop-api || true
        pm2 delete bookshop-api || true
        pm2 start server.js --name bookshop-api
        pm2 save
        
        echo "Deployment completed on EC2!"
ENDSSH
    
    print_success "Application deployed to EC2: ${EC2_IP}"
}

# Create RDS database
create_rds() {
    print_info "Creating RDS MySQL instance..."
    
    DB_INSTANCE_ID="${APP_NAME}-db"
    DB_NAME="bookshop"
    DB_USERNAME="admin"
    
    read -s -p "Enter database password: " DB_PASSWORD
    echo
    
    aws rds create-db-instance \
        --db-instance-identifier ${DB_INSTANCE_ID} \
        --db-instance-class db.t3.micro \
        --engine mysql \
        --engine-version 8.0 \
        --master-username ${DB_USERNAME} \
        --master-user-password ${DB_PASSWORD} \
        --allocated-storage 20 \
        --db-name ${DB_NAME} \
        --region ${REGION} \
        --publicly-accessible \
        --backup-retention-period 7
    
    print_info "Waiting for RDS instance to be available (this may take several minutes)..."
    aws rds wait db-instance-available --db-instance-identifier ${DB_INSTANCE_ID}
    
    # Get endpoint
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier ${DB_INSTANCE_ID} \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    print_success "RDS instance created: ${DB_ENDPOINT}"
    print_info "Update your .env file with: DB_HOST=${DB_ENDPOINT}"
}

# Main menu
show_menu() {
    echo ""
    echo "Select deployment option:"
    echo "1) Full deployment (Frontend to S3 + Backend to EC2)"
    echo "2) Deploy frontend only (S3)"
    echo "3) Deploy backend only (EC2)"
    echo "4) Create RDS database"
    echo "5) Build and package application"
    echo "6) Exit"
    echo ""
    read -p "Enter choice [1-6]: " choice
    
    case $choice in
        1)
            check_prerequisites
            build_frontend
            deploy_frontend_s3
            prepare_backend
            package_app
            upload_to_ec2
            ;;
        2)
            check_prerequisites
            build_frontend
            deploy_frontend_s3
            ;;
        3)
            check_prerequisites
            prepare_backend
            package_app
            upload_to_ec2
            ;;
        4)
            check_prerequisites
            create_rds
            ;;
        5)
            check_prerequisites
            build_frontend
            prepare_backend
            package_app
            print_success "Package ready: ${APP_NAME}.tar.gz"
            ;;
        6)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid option"
            show_menu
            ;;
    esac
}

# Run
show_menu

echo ""
print_success "Deployment completed!"
echo ""