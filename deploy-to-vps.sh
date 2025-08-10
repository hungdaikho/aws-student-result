#!/bin/bash

# Customized Deployment Script for VPS: 148.230.115.4
# This script will deploy your student result app to your VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# VPS Configuration
VPS_IP="148.230.115.4"
VPS_USER="root"
VPS_PASSWORD="Medahmed28233"
APP_NAME="student-result-app"
APP_DIR="/var/www/$APP_NAME"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Function to execute commands on VPS
execute_on_vps() {
    local command="$1"
    sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" "$command"
}

# Function to copy files to VPS
copy_to_vps() {
    local source="$1"
    local destination="$2"
    sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$source" "$VPS_USER@$VPS_IP:$destination"
}

log "Starting deployment to VPS: $VPS_IP"

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    error "sshpass is not installed. Please install it first:"
    echo "Ubuntu/Debian: sudo apt install sshpass"
    echo "macOS: brew install sshpass"
    echo "Windows: Download from https://sourceforge.net/projects/sshpass/"
fi

# Test SSH connection
log "Testing SSH connection..."
if ! execute_on_vps "echo 'SSH connection successful'"; then
    error "Cannot connect to VPS. Please check your credentials and network connection."
fi

log "SSH connection successful! Starting deployment..."

# Step 1: Update system and install dependencies
log "Step 1: Updating system and installing dependencies..."
execute_on_vps "
    # Update system
    apt update && apt upgrade -y
    
    # Install essential packages
    apt install -y curl wget git unzip build-essential software-properties-common
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Install PostgreSQL
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    
    # Install Nginx
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Install PM2
    npm install -g pm2
    
    # Install UFW firewall
    apt install -y ufw
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw --force enable
    
    # Install Certbot for SSL
    apt install -y certbot python3-certbot-nginx
"

# Step 2: Setup database
log "Step 2: Setting up PostgreSQL database..."
execute_on_vps "
    # Create database user
    sudo -u postgres createuser --interactive student_app_user << EOF
y
EOF

    # Create database
    sudo -u postgres createdb student_result_db
    
    # Set password for database user
    DB_PASSWORD=\$(openssl rand -base64 32)
    sudo -u postgres psql -c \"ALTER USER student_app_user WITH PASSWORD '\$DB_PASSWORD';\"
    echo \"Database password: \$DB_PASSWORD\" > /root/db_password.txt
"

# Step 3: Create application directory
log "Step 3: Creating application directory..."
execute_on_vps "
    mkdir -p $APP_DIR
    mkdir -p /var/log/pm2
    mkdir -p /var/backups/$APP_NAME
    chown -R $VPS_USER:$VPS_USER $APP_DIR /var/log/pm2 /var/backups/$APP_NAME
"

# Step 4: Copy application files
log "Step 4: Copying application files..."
# Create a temporary tar file of the current directory
tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.next --exclude=.git .

# Copy the tar file to VPS
copy_to_vps "/tmp/app.tar.gz" "/tmp/"

# Extract and setup on VPS
execute_on_vps "
    cd $APP_DIR
    tar -xzf /tmp/app.tar.gz
    rm /tmp/app.tar.gz
    
    # Install dependencies
    npm install
    
    # Generate Prisma client
    npx prisma generate
    
    # Run database migrations
    npx prisma migrate deploy
    
    # Build application
    npm run build
"

# Step 5: Create environment file
log "Step 5: Creating environment configuration..."
execute_on_vps "
    cd $APP_DIR
    
    # Get database password
    DB_PASSWORD=\$(cat /root/db_password.txt | grep 'Database password:' | cut -d' ' -f3)
    
    # Create .env file
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=\"postgresql://student_app_user:\$DB_PASSWORD@localhost:5432/student_result_db\"

# Next.js Configuration
NODE_ENV=production
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://$VPS_IP

# Application Configuration
PORT=3000
HOSTNAME=0.0.0.0

# Security
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 24)

# File Upload Configuration
MAX_FILE_SIZE=52428800
UPLOAD_DIR=$APP_DIR/uploads

# Monitoring
ENABLE_MONITORING=true
LOG_LEVEL=info

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=7
BACKUP_DIR=/var/backups/$APP_NAME

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
STATIC_CACHE_DURATION=31536000
EOF
"

# Step 6: Create PM2 ecosystem file
log "Step 6: Setting up PM2 configuration..."
execute_on_vps "
    cd $APP_DIR
    
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'student-result-app',
      script: 'npm',
      args: 'start',
      cwd: '$APP_DIR',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/student-result-app-error.log',
      out_file: '/var/log/pm2/student-result-app-out.log',
      log_file: '/var/log/pm2/student-result-app-combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      listen_timeout: 3000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
};
EOF
"

# Step 7: Create Nginx configuration
log "Step 7: Setting up Nginx configuration..."
execute_on_vps "
    cat > /etc/nginx/sites-available/$APP_NAME << 'EOF'
server {
    listen 80;
    server_name $VPS_IP;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json application/xml image/svg+xml;

    # Client max body size for file uploads
    client_max_body_size 50M;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Next.js static files with long cache
    location /_next/static/ {
        alias $APP_DIR/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control \"public, immutable\";
    }

    # Public files with medium cache
    location /public/ {
        alias $APP_DIR/public/;
        expires 30d;
        access_log off;
        add_header Cache-Control \"public\";
    }

    # API routes - no cache
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        add_header Cache-Control \"no-cache, no-store, must-revalidate\";
        add_header Pragma \"no-cache\";
        add_header Expires \"0\";
    }

    # Admin routes - no cache
    location /admin {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        add_header Cache-Control \"no-cache, no-store, must-revalidate\";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 \"healthy\\n\";
        add_header Content-Type text/plain;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~* \.(env|log|sql|md|txt)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

    # Enable the site
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
"

# Step 8: Start application with PM2
log "Step 8: Starting application with PM2..."
execute_on_vps "
    cd $APP_DIR
    
    # Start with PM2
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 to start on boot
    pm2 startup systemd -u root --hp /root
"

# Step 9: Create health check endpoint
log "Step 9: Creating health check endpoint..."
execute_on_vps "
    mkdir -p $APP_DIR/app/api/health
    
    cat > $APP_DIR/app/api/health/route.ts << 'EOF'
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
EOF
"

# Step 10: Setup log rotation
log "Step 10: Setting up log rotation..."
execute_on_vps "
    cat > /etc/logrotate.d/pm2 << 'EOF'
/var/log/pm2/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
"

# Step 11: Test the deployment
log "Step 11: Testing the deployment..."
sleep 10

# Test if application is running
if execute_on_vps "curl -f http://localhost:3000/health > /dev/null 2>&1"; then
    log "✅ Application is running successfully!"
else
    warning "⚠️  Application health check failed. Checking logs..."
    execute_on_vps "pm2 logs student-result-app --lines 10"
fi

# Get database password for user
DB_PASSWORD=$(execute_on_vps "cat /root/db_password.txt | grep 'Database password:' | cut -d' ' -f3")

# Final instructions
log "🎉 Deployment completed successfully!"
info ""
info "Your application is now accessible at:"
info "🌐 Main site: http://$VPS_IP"
info "🔧 Admin panel: http://$VPS_IP/admin"
info "💚 Health check: http://$VPS_IP/health"
info ""
info "Database credentials:"
info "📊 Database: student_result_db"
info "👤 User: student_app_user"
info "🔑 Password: $DB_PASSWORD"
info ""
info "Useful commands:"
info "📋 PM2 status: pm2 status"
info "📝 PM2 logs: pm2 logs student-result-app"
info "🔄 Restart app: pm2 restart student-result-app"
info "📊 Monitor: pm2 monit"
info ""
info "Next steps:"
info "1. Upload your data files through the admin panel"
info "2. Configure a domain name (optional)"
info "3. Set up SSL certificate with Certbot"
info "4. Configure backups"
info ""
info "Happy deploying! 🚀"

# Clean up local tar file
rm -f /tmp/app.tar.gz

