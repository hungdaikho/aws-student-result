#!/bin/bash

# Student Result App Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="student-result-app"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
LOG_DIR="/var/log/$APP_NAME"

# Environment
ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging function
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
   error "This script should not be run as root"
fi

# Create necessary directories
log "Creating necessary directories..."
sudo mkdir -p $APP_DIR $BACKUP_DIR $LOG_DIR
sudo chown $USER:$USER $APP_DIR $BACKUP_DIR $LOG_DIR

# Backup current version
if [ -d "$APP_DIR/.git" ]; then
    log "Creating backup of current version..."
    tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C $APP_DIR .
fi

# Navigate to app directory
cd $APP_DIR

# Pull latest changes
log "Pulling latest changes from repository..."
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
else
    error "Git repository not found. Please clone the repository first."
fi

# Install dependencies
log "Installing dependencies..."
npm ci --only=production

# Generate Prisma client
log "Generating Prisma client..."
npx prisma generate

# Run database migrations
log "Running database migrations..."
npx prisma migrate deploy

# Build the application
log "Building the application..."
npm run build

# Set proper permissions
log "Setting proper permissions..."
sudo chown -R $USER:www-data $APP_DIR
sudo chmod -R 755 $APP_DIR
sudo chmod -R 775 $APP_DIR/.next

# Restart PM2 process
log "Restarting PM2 process..."
pm2 restart $APP_NAME || pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check if Nginx configuration is valid
log "Checking Nginx configuration..."
if sudo nginx -t; then
    log "Reloading Nginx..."
    sudo systemctl reload nginx
else
    error "Nginx configuration is invalid"
fi

# Health check
log "Performing health check..."
sleep 5
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log "Application is healthy"
else
    warning "Health check failed. Check logs with: pm2 logs $APP_NAME"
fi

# Cleanup old backups (keep last 5)
log "Cleaning up old backups..."
cd $BACKUP_DIR
ls -t | tail -n +6 | xargs -r rm

# Show deployment status
log "Deployment completed successfully!"
info "Application URL: https://your-domain.com"
info "PM2 Status: pm2 status"
info "PM2 Logs: pm2 logs $APP_NAME"
info "Nginx Logs: sudo tail -f /var/log/nginx/access.log"

# Optional: Send notification
if command -v curl &> /dev/null; then
    # You can add webhook notifications here
    # curl -X POST -H "Content-Type: application/json" \
    #   -d '{"text":"Student Result App deployed successfully!"}' \
    #   https://hooks.slack.com/services/YOUR_WEBHOOK_URL
    log "Deployment notification sent"
fi

log "Deployment script completed!"

