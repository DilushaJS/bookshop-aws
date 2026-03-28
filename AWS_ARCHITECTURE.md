# AWS Architecture for BookShop E-Commerce Platform

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet Gateway                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │   Route 53 (DNS)    │
                   └─────────┬──────────┘
                             │
              ┌──────────────▼───────────────┐
              │  CloudFront Distribution     │
              │  (CDN for static assets)     │
              └──────┬──────────────┬────────┘
                     │              │
          ┌──────────▼─────┐   ┌───▼──────────────┐
          │  S3 Bucket      │   │  Application     │
          │  (Frontend)     │   │  Load Balancer   │
          └─────────────────┘   └───┬──────────────┘
                                    │
                        ┌───────────┴───────────┐
                        │                       │
                  ┌─────▼─────┐          ┌─────▼─────┐
                  │  EC2       │          │  EC2      │
                  │  (Primary) │          │  (Backup) │
                  └─────┬─────┘          └─────┬─────┘
                        │                       │
                        └───────────┬───────────┘
                                    │
                        ┌───────────▼────────────┐
                        │   RDS MySQL            │
                        │   (Multi-AZ)           │
                        └────────────────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │   S3 Bucket            │
                        │   (Images/Assets)      │
                        └────────────────────────┘
```

## Services Overview

### 1. Route 53 (DNS)
- **Purpose**: Domain name management
- **Configuration**: 
  - A record pointing to CloudFront distribution
  - Subdomain for API (api.yourdomain.com)
- **Cost**: ~$0.50/month per hosted zone

### 2. CloudFront (CDN)
- **Purpose**: Content delivery, caching, SSL termination
- **Configuration**:
  - Origin: S3 bucket (frontend)
  - Alternate origin: ALB (API)
  - SSL certificate from ACM
  - Cache behavior for /api/* routes
- **Benefits**: 
  - Global edge locations
  - DDoS protection
  - Reduced latency
- **Cost**: Pay per data transfer

### 3. S3 (Simple Storage Service)
**Two buckets:**

a) **Frontend Bucket**
- Static React build files
- Public read access
- Versioning enabled
- Cost: ~$0.023 per GB/month

b) **Images Bucket**
- Book cover images
- Public read access
- Lifecycle policies for old versions
- Cost: ~$0.023 per GB/month

### 4. Application Load Balancer (ALB)
- **Purpose**: Distribute traffic, health checks
- **Configuration**:
  - Target group: EC2 instances
  - Health check: GET /health
  - Listeners: HTTP (80) → HTTPS (443)
  - SSL certificate from ACM
- **Cost**: ~$22.50/month + data processing

### 5. EC2 (Elastic Compute Cloud)
**Instance Configuration:**
- **Type**: t3.small (2 vCPU, 2 GB RAM)
- **OS**: Amazon Linux 2 or Ubuntu 22.04
- **Software**:
  - Node.js 18
  - PM2 process manager
  - NGINX reverse proxy
- **Auto Scaling Group**:
  - Min: 1 instance
  - Desired: 2 instances
  - Max: 4 instances
  - Scale on CPU > 70%
- **Cost**: ~$15/month per instance (t3.small)

### 6. RDS (Relational Database Service)
- **Engine**: MySQL 8.0
- **Instance**: db.t3.micro (free tier) or db.t3.small
- **Configuration**:
  - Multi-AZ deployment (production)
  - Automated backups (7 days retention)
  - Encryption at rest
  - Private subnet only
- **Storage**: 20 GB SSD (expandable)
- **Cost**: ~$15-30/month depending on instance size

### 7. VPC (Virtual Private Cloud)
**Network Structure:**

```
VPC (10.0.0.0/16)
├── Public Subnet 1 (10.0.1.0/24) - AZ-a
│   ├── ALB
│   └── NAT Gateway
├── Public Subnet 2 (10.0.2.0/24) - AZ-b
│   ├── ALB
│   └── NAT Gateway
├── Private Subnet 1 (10.0.10.0/24) - AZ-a
│   ├── EC2 Instance
│   └── RDS Primary
└── Private Subnet 2 (10.0.11.0/24) - AZ-b
    ├── EC2 Instance
    └── RDS Standby
```

### 8. Security Groups

**ALB Security Group**
- Inbound: HTTP (80), HTTPS (443) from 0.0.0.0/0
- Outbound: All traffic

**EC2 Security Group**
- Inbound: 
  - SSH (22) from your IP
  - HTTP (5000) from ALB security group
- Outbound: All traffic

**RDS Security Group**
- Inbound: MySQL (3306) from EC2 security group
- Outbound: None

### 9. IAM (Identity and Access Management)

**EC2 Instance Role Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::bookshop-images-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

## High Availability & Disaster Recovery

### Multi-AZ Deployment
- EC2 instances in multiple availability zones
- RDS Multi-AZ for automatic failover
- ALB distributes traffic across AZs

### Backup Strategy
- **RDS**: Automated daily backups (7-day retention)
- **S3**: Versioning enabled
- **EC2**: AMI snapshots weekly
- **Database**: Manual snapshots before major updates

### Monitoring
- **CloudWatch**: 
  - EC2 CPU/Memory metrics
  - RDS connections/performance
  - ALB request count/latency
  - Custom application metrics
- **CloudWatch Logs**: Application logs
- **SNS**: Alerts for critical events

## Cost Estimation (Monthly)

### Minimal Setup (Development/Testing)
```
EC2 (t3.micro)        : $7.50
RDS (db.t3.micro)     : $15.00
S3 Storage (5GB)      : $0.12
Data Transfer         : $1.00
-----------------------------------
Total                 : ~$24/month
```

### Production Setup
```
EC2 (2x t3.small)     : $30.00
RDS (db.t3.small MA)  : $50.00
ALB                   : $22.50
S3 Storage (50GB)     : $1.15
CloudFront            : $10.00
Route 53              : $0.50
Data Transfer         : $20.00
Backups               : $5.00
-----------------------------------
Total                 : ~$139/month
```

### Scalable Setup (High Traffic)
```
EC2 (4x t3.medium)    : $134.00
RDS (db.t3.medium MA) : $120.00
ALB                   : $22.50
S3 Storage (200GB)    : $4.60
CloudFront            : $50.00
Route 53              : $0.50
Data Transfer         : $100.00
Backups               : $20.00
WAF                   : $10.00
-----------------------------------
Total                 : ~$461/month
```

## Security Best Practices

1. **Network Security**
   - EC2 and RDS in private subnets
   - Security groups with least privilege
   - NACLs for additional protection

2. **Data Security**
   - RDS encryption at rest
   - SSL/TLS for data in transit
   - S3 bucket encryption
   - Secrets Manager for credentials

3. **Access Control**
   - IAM roles instead of access keys
   - MFA for root account
   - CloudTrail for audit logging
   - VPC Flow Logs enabled

4. **Application Security**
   - WAF rules for common attacks
   - Regular security updates
   - Input validation
   - SQL injection prevention

## Scaling Strategy

### Horizontal Scaling (More Instances)
- Auto Scaling based on CloudWatch metrics
- Scale out when CPU > 70% for 5 minutes
- Scale in when CPU < 30% for 10 minutes

### Vertical Scaling (Bigger Instances)
- Upgrade EC2 instance types (t3.small → t3.medium → t3.large)
- Upgrade RDS instance types
- Minimal downtime with proper planning

### Database Scaling
- Read replicas for read-heavy workloads
- Database caching with ElastiCache
- Query optimization and indexing

## Deployment Pipeline (CI/CD)

```
GitHub Repository
       │
       ▼
AWS CodePipeline
       │
       ├─► CodeBuild (Build & Test)
       │
       ├─► Deploy Frontend to S3
       │
       └─► CodeDeploy to EC2
           │
           └─► Health Check
                   │
                   ├─ Success → Complete
                   └─ Failure → Rollback
```

## Performance Optimization

1. **Caching**
   - CloudFront for static assets
   - ElastiCache for database queries
   - Browser caching headers

2. **Database**
   - Proper indexing
   - Connection pooling
   - Query optimization

3. **Application**
   - Compression (gzip)
   - Image optimization
   - Code minification
   - Lazy loading

## Conclusion

This architecture provides:
✅ High availability across multiple AZs
✅ Scalability to handle traffic growth
✅ Security with defense in depth
✅ Cost optimization options
✅ Easy maintenance and updates
✅ Comprehensive monitoring
✅ Disaster recovery capabilities

Perfect for AWS Cloud Practitioner certification practice!