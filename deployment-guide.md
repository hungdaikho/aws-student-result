# 🚀 Student Result App Deployment Guide

## 📋 Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 20GB+ available space
- **CPU**: 2+ cores
- **Domain**: Optional but recommended for SSL

### Software Requirements
- Node.js 18+ 
- PostgreSQL 13+
- Nginx
- PM2 (Process Manager)
- Git

## 🔧 Step-by-Step Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip build-essential
```

### 2. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user
sudo -u postgres createuser --interactive
# Enter: student_app_user
# Enter: y (superuser)

# Create database
sudo -u postgres createdb student_result_db

# Set password for user
sudo -u postgres psql
ALTER USER student_app_user WITH PASSWORD 'your_secure_password';
\q
```

### 4. Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2
```

### 6. Deploy Application

```bash
# Create application directory
sudo mkdir -p /var/www/student-result-app
sudo chown $USER:$USER /var/www/student-result-app

# Clone your repository (replace with your repo URL)
cd /var/www/student-result-app
git clone https://github.com/your-username/student-result-app.git .

# Install dependencies
npm install

# Build the application
npm run build
```

### 7. Environment Configuration

```bash
# Create environment file
cp .env.example .env

# Edit environment file
nano .env
```

**Environment Variables:**
```env
# Database
DATABASE_URL="postgresql://student_app_user:your_secure_password@localhost:5432/student_result_db"

# Next.js
NODE_ENV=production
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-domain.com

# Optional: Redis for caching (if using)
REDIS_URL=redis://localhost:6379
```

### 8. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database (if needed)
npx prisma db seed
```

### 9. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
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
      time: true
    }
  ]
};
```

### 10. Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 11. Nginx Configuration

Create `/etc/nginx/sites-available/student-result-app`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Proxy to Node.js app
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
    }

    # Static files caching
    location /_next/static/ {
        alias /var/www/student-result-app/.next/static/;
        expires 365d;
        access_log off;
    }

    # Public files
    location /public/ {
        alias /var/www/student-result-app/public/;
        expires 30d;
        access_log off;
    }
}
```

Enable the site:

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/student-result-app /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 12. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 13. Firewall Configuration

```bash
# Install UFW
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 14. Monitoring and Logs

```bash
# View PM2 logs
pm2 logs student-result-app

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Monitor system resources
htop
```

## 🔄 Update Process

### Automatic Updates (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to VPS
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        script: |
          cd /var/www/student-result-app
          git pull origin main
          npm install
          npm run build
          npx prisma generate
          npx prisma migrate deploy
          pm2 restart student-result-app
```

### Manual Updates

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to app directory
cd /var/www/student-result-app

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Update database
npx prisma generate
npx prisma migrate deploy

# Restart application
pm2 restart student-result-app
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port 3000 not accessible**
   ```bash
   # Check if app is running
   pm2 status
   
   # Check logs
   pm2 logs student-result-app
   ```

2. **Database connection issues**
   ```bash
   # Test database connection
   npx prisma db pull
   
   # Check PostgreSQL status
   sudo systemctl status postgresql
   ```

3. **Nginx configuration errors**
   ```bash
   # Test Nginx config
   sudo nginx -t
   
   # Check Nginx status
   sudo systemctl status nginx
   ```

### Performance Optimization

1. **Enable Nginx caching**
2. **Use Redis for session storage**
3. **Implement CDN for static assets**
4. **Database query optimization**
5. **Enable compression**

## 📊 Monitoring

### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View statistics
pm2 show student-result-app
```

### System Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor disk usage
df -h

# Monitor memory usage
free -h
```

## 🔒 Security Checklist

- [ ] Firewall configured
- [ ] SSH key authentication
- [ ] SSL certificate installed
- [ ] Database secured
- [ ] Environment variables protected
- [ ] Regular backups configured
- [ ] Security updates enabled
- [ ] Monitoring alerts set up

## 📞 Support

For deployment issues:
1. Check logs: `pm2 logs` and `sudo journalctl -u nginx`
2. Verify configuration files
3. Test database connectivity
4. Check firewall settings
5. Verify SSL certificate

---

**Deployment completed!** 🎉

Your student result application should now be accessible at `https://your-domain.com`

