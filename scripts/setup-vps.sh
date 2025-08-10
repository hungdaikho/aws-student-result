#!/bin/bash

# VPS Setup Script for Student Result App
# Run this script on your VPS to set up the environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="student-result-app"
APP_DIR="/var/www/$APP_NAME"
DB_NAME="student_result_db"
DB_USER="student_app_user"

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Run as a regular user with sudo privileges."
fi

log "Starting VPS setup for Student Result App..."

# Update system
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
log "Installing essential packages..."
sudo apt install -y curl wget git unzip build-essential software-properties-common

# Install Node.js 18.x
log "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
log "Verifying Node.js installation..."
node --version
npm --version

# Install PostgreSQL
log "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user and database
log "Setting up PostgreSQL database..."
sudo -u postgres createuser --interactive $DB_USER << EOF
y
EOF

sudo -u postgres createdb $DB_NAME

# Set password for database user
DB_PASSWORD=$(openssl rand -base64 32)
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

log "Database password: $DB_PASSWORD"
log "Please save this password securely!"

# Install Nginx
log "Installing Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2
log "Installing PM2..."
sudo npm install -g pm2

# Create application directory
log "Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Create log directories
log "Creating log directories..."
sudo mkdir -p /var/log/pm2
sudo mkdir -p /var/backups/$APP_NAME
sudo chown $USER:$USER /var/log/pm2 /var/backups/$APP_NAME

# Install UFW firewall
log "Configuring firewall..."
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Install Certbot for SSL
log "Installing Certbot for SSL certificates..."
sudo apt install -y certbot python3-certbot-nginx

# Create Nginx configuration
log "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
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
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    sudo systemctl reload nginx
    log "Nginx configuration is valid and reloaded"
else
    error "Nginx configuration is invalid"
fi

# Create environment file template
log "Creating environment file template..."
cat > $APP_DIR/.env.example << EOF
# Database Configuration
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# Next.js Configuration
NODE_ENV=production
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.com

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

# Create PM2 ecosystem file
log "Creating PM2 ecosystem file..."
cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'student-result-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/student-result-app',
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

# Create deployment script
log "Creating deployment script..."
cat > $APP_DIR/deploy.sh << 'EOF'
#!/bin/bash
set -e

cd /var/www/student-result-app

# Pull latest changes
git fetch origin
git reset --hard origin/main

# Install dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build application
npm run build

# Set permissions
sudo chown -R $USER:www-data /var/www/student-result-app
sudo chmod -R 755 /var/www/student-result-app
sudo chmod -R 775 /var/www/student-result-app/.next

# Restart PM2
pm2 restart student-result-app || pm2 start ecosystem.config.js
pm2 save

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment completed successfully!"
EOF

chmod +x $APP_DIR/deploy.sh

# Create health check endpoint
log "Creating health check endpoint..."
mkdir -p $APP_DIR/app/api
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

# Setup log rotation
log "Setting up log rotation..."
sudo tee /etc/logrotate.d/pm2 > /dev/null << 'EOF'
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

# Create systemd service for PM2
log "Setting up PM2 startup service..."
pm2 startup systemd -u $USER --hp $(echo $HOME)

# Final instructions
log "VPS setup completed successfully!"
info "Next steps:"
info "1. Clone your repository to $APP_DIR"
info "2. Copy .env.example to .env and update with your domain"
info "3. Install dependencies: npm install"
info "4. Run database migrations: npx prisma migrate deploy"
info "5. Build the application: npm run build"
info "6. Start the application: pm2 start ecosystem.config.js"
info "7. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
info ""
info "Database credentials:"
info "Database: $DB_NAME"
info "User: $DB_USER"
info "Password: $DB_PASSWORD"
info ""
info "Important files:"
info "- Environment: $APP_DIR/.env"
info "- PM2 config: $APP_DIR/ecosystem.config.js"
info "- Nginx config: /etc/nginx/sites-available/$APP_NAME"
info "- Deployment script: $APP_DIR/deploy.sh"

log "Setup completed! 🎉"

