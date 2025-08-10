# 🚀 Quick Deployment Guide

## 📋 Prerequisites
- VPS with Ubuntu 20.04+ 
- Domain name (optional but recommended)
- SSH access to your VPS

## 🔧 Step 1: VPS Setup

### 1.1 Connect to your VPS
```bash
ssh user@your-vps-ip
```

### 1.2 Run the setup script
```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/your-username/student-result-app/main/scripts/setup-vps.sh | bash
```

**OR manually run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Nginx
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2
sudo npm install -g pm2

# Install firewall
sudo apt install -y ufw
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

## 🔧 Step 2: Database Setup

```bash
# Create database user
sudo -u postgres createuser --interactive student_app_user
# Enter 'y' when prompted

# Create database
sudo -u postgres createdb student_result_db

# Set password
sudo -u postgres psql
ALTER USER student_app_user WITH PASSWORD 'your_secure_password';
\q
```

## 🔧 Step 3: Application Deployment

### 3.1 Clone your repository
```bash
# Create app directory
sudo mkdir -p /var/www/student-result-app
sudo chown $USER:$USER /var/www/student-result-app

# Clone repository
cd /var/www/student-result-app
git clone https://github.com/your-username/student-result-app.git .
```

### 3.2 Configure environment
```bash
# Copy environment template
cp env.production.example .env

# Edit environment file
nano .env
```

**Update these values in `.env`:**
```env
DATABASE_URL="postgresql://student_app_user:your_secure_password@localhost:5432/student_result_db"
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_random_secret_here
```

### 3.3 Install and build
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
npm run build
```

## 🔧 Step 4: PM2 Configuration

### 4.1 Create PM2 ecosystem file
```bash
# Copy the ecosystem.config.js file to your app directory
# (Already included in the repository)
```

### 4.2 Start the application
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## 🔧 Step 5: Nginx Configuration

### 5.1 Create Nginx config
```bash
sudo nano /etc/nginx/sites-available/student-result-app
```

**Add this configuration:**
```nginx
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
```

### 5.2 Enable the site
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/student-result-app /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## 🔧 Step 6: SSL Certificate (Optional)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 🔧 Step 7: Testing

### 7.1 Check application status
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs student-result-app

# Test health endpoint
curl http://localhost:3000/health
```

### 7.2 Test website
- Visit `http://your-domain.com` (or `https://your-domain.com` if SSL is configured)
- Test the admin panel at `/admin`
- Upload some test data

## 🔄 Updates and Maintenance

### Manual Updates
```bash
cd /var/www/student-result-app
git pull origin main
npm install
npm run build
npx prisma migrate deploy
pm2 restart student-result-app
```

### Using the deployment script
```bash
cd /var/www/student-result-app
./deploy.sh
```

## 🛠️ Troubleshooting

### Common Issues

1. **Application not starting**
   ```bash
   pm2 logs student-result-app
   ```

2. **Database connection issues**
   ```bash
   sudo systemctl status postgresql
   npx prisma db pull
   ```

3. **Nginx issues**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. **Port 3000 not accessible**
   ```bash
   sudo ufw status
   sudo ufw allow 3000
   ```

### Useful Commands

```bash
# View PM2 processes
pm2 list

# Monitor resources
pm2 monit

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -h
```

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

- [ ] Firewall configured (UFW)
- [ ] SSH key authentication enabled
- [ ] SSL certificate installed
- [ ] Database secured with strong password
- [ ] Environment variables protected
- [ ] Regular backups configured
- [ ] Security updates enabled

## 📞 Support

If you encounter issues:

1. **Check logs:**
   ```bash
   pm2 logs student-result-app
   sudo journalctl -u nginx
   ```

2. **Verify configuration:**
   ```bash
   sudo nginx -t
   pm2 status
   ```

3. **Test connectivity:**
   ```bash
   curl -f http://localhost:3000/health
   ```

4. **Check system resources:**
   ```bash
   htop
   df -h
   ```

---

## 🎉 Deployment Complete!

Your student result application should now be accessible at:
- **HTTP**: `http://your-domain.com`
- **HTTPS**: `https://your-domain.com` (if SSL configured)

**Admin Panel**: `https://your-domain.com/admin`

**Health Check**: `https://your-domain.com/health`

---

## 📝 Next Steps

1. **Upload your data files** through the admin panel
2. **Configure your domain** DNS settings
3. **Set up monitoring** and alerts
4. **Configure backups** for your database
5. **Set up CI/CD** with GitHub Actions (optional)

**Happy deploying! 🚀**

