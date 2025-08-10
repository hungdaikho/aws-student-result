# 🚀 Manual Deployment Guide for VPS: 148.230.115.4

## 📋 Your VPS Details
- **IP Address**: 148.230.115.4
- **Username**: root
- **Password**: Medahmed28233

## 🔧 Step-by-Step Manual Deployment

### Step 1: Connect to your VPS
```bash
ssh root@148.230.115.4
# Enter password: Medahmed28233
```

### Step 2: Update system and install dependencies
```bash
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
```

### Step 3: Setup PostgreSQL database
```bash
# Create database user
sudo -u postgres createuser --interactive student_app_user
# Enter 'y' when prompted

# Create database
sudo -u postgres createdb student_result_db

# Set password for database user
DB_PASSWORD=$(openssl rand -base64 32)
sudo -u postgres psql -c "ALTER USER student_app_user WITH PASSWORD '$DB_PASSWORD';"
echo "Database password: $DB_PASSWORD" > /root/db_password.txt
echo "Database password saved: $DB_PASSWORD"
```

### Step 4: Create application directory
```bash
# Create directories
mkdir -p /var/www/student-result-app
mkdir -p /var/log/pm2
mkdir -p /var/backups/student-result-app
chown -R root:root /var/www/student-result-app /var/log/pm2 /var/backups/student-result-app
```

### Step 5: Upload your application
**Option A: Using Git (Recommended)**
```bash
cd /var/www/student-result-app
git clone https://github.com/your-username/student-result-app.git .
```

**Option B: Using SCP from your local machine**
```bash
# From your local machine, run:
scp -r . root@148.230.115.4:/var/www/student-result-app/
```

### Step 6: Install dependencies and build
```bash
cd /var/www/student-result-app

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build application
npm run build
```

### Step 7: Create environment file
```bash
cd /var/www/student-result-app

# Get database password
DB_PASSWORD=$(cat /root/db_password.txt | grep 'Database password:' | cut -d' ' -f3)

# Create .env file
cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://student_app_user:$DB_PASSWORD@localhost:5432/student_result_db"

# Next.js Configuration
NODE_ENV=production
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://148.230.115.4

# Application Configuration
PORT=3000
HOSTNAME=0.0.0.0

# Security
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 24)

# File Upload Configuration
MAX_FILE_SIZE=52428800
UPLOAD_DIR=/var/www/student-result-app/uploads

# Monitoring
ENABLE_MONITORING=true
LOG_LEVEL=info

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=7
BACKUP_DIR=/var/backups/student-result-app

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
STATIC_CACHE_DURATION=31536000
EOF
```

### Step 8: Create PM2 ecosystem file
```bash
cd /var/www/student-result-app

cat > ecosystem.config.js << 'EOF'
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
```

### Step 9: Create Nginx configuration
```bash
cat > /etc/nginx/sites-available/student-result-app << 'EOF'
server {
    listen 80;
    server_name 148.230.115.4;
    
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Next.js static files with long cache
    location /_next/static/ {
        alias /var/www/student-result-app/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # Public files with medium cache
    location /public/ {
        alias /var/www/student-result-app/public/;
        expires 30d;
        access_log off;
        add_header Cache-Control "public";
    }

    # API routes - no cache
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Admin routes - no cache
    location /admin {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
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
ln -sf /etc/nginx/sites-available/student-result-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Step 10: Start application with PM2
```bash
cd /var/www/student-result-app

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
```

### Step 11: Create health check endpoint
```bash
mkdir -p /var/www/student-result-app/app/api/health

cat > /var/www/student-result-app/app/api/health/route.ts << 'EOF'
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
EOF
```

### Step 12: Test the deployment
```bash
# Wait a few seconds for the app to start
sleep 10

# Test if application is running
curl -f http://localhost:3000/health

# Check PM2 status
pm2 status

# Check logs if needed
pm2 logs student-result-app
```

## 🎉 Deployment Complete!

Your application should now be accessible at:
- **🌐 Main site**: http://148.230.115.4
- **🔧 Admin panel**: http://148.230.115.4/admin
- **💚 Health check**: http://148.230.115.4/health

## 📊 Useful Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs student-result-app

# Restart application
pm2 restart student-result-app

# Monitor resources
pm2 monit

# Check Nginx status
systemctl status nginx

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔄 Updates

To update your application:
```bash
cd /var/www/student-result-app
git pull origin main
npm install
npm run build
npx prisma migrate deploy
pm2 restart student-result-app
```

## 🛠️ Troubleshooting

If the application doesn't start:
```bash
# Check PM2 logs
pm2 logs student-result-app

# Check if port 3000 is in use
netstat -tlnp | grep :3000

# Restart PM2
pm2 restart student-result-app

# Check Nginx configuration
nginx -t
```

## 🔒 Security Notes

- Change the default database password after deployment
- Consider setting up SSH key authentication
- Configure SSL certificate with Certbot
- Set up regular backups
- Keep the system updated

**Happy deploying! 🚀**

