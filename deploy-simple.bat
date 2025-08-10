@echo off
echo Starting deployment to VPS: 148.230.115.4
echo.

REM Check if plink is available (PuTTY command line)
where plink >nul 2>&1
if %errorlevel% neq 0 (
    echo PuTTY is not installed. Please install PuTTY from: https://www.putty.org/
    echo Or use the manual deployment guide: QUICK-DEPLOYMENT-STEPS.md
    pause
    exit /b 1
)

echo Creating deployment script...
(
echo #!/bin/bash
echo set -e
echo echo "Starting deployment..."
echo.
echo # Update system and install dependencies
echo echo "Step 1: Updating system and installing dependencies..."
echo apt update ^&^& apt upgrade -y
echo apt install -y curl wget git unzip build-essential software-properties-common
echo curl -fsSL https://deb.nodesource.com/setup_18.x ^| bash -
echo apt-get install -y nodejs
echo apt install -y postgresql postgresql-contrib
echo systemctl start postgresql
echo systemctl enable postgresql
echo apt install -y nginx
echo systemctl start nginx
echo systemctl enable nginx
echo npm install -g pm2
echo apt install -y ufw
echo ufw allow ssh
echo ufw allow 80
echo ufw allow 443
echo ufw --force enable
echo apt install -y certbot python3-certbot-nginx
echo.
echo # Setup database
echo echo "Step 2: Setting up PostgreSQL database..."
echo sudo -u postgres createuser --interactive student_app_user ^<^< EOF
echo y
echo EOF
echo sudo -u postgres createdb student_result_db
echo DB_PASSWORD=^$(openssl rand -base64 32^)
echo sudo -u postgres psql -c "ALTER USER student_app_user WITH PASSWORD '$DB_PASSWORD';"
echo echo "Database password: $DB_PASSWORD" ^> /root/db_password.txt
echo.
echo # Create application directory
echo echo "Step 3: Creating application directory..."
echo mkdir -p /var/www/student-result-app
echo mkdir -p /var/log/pm2
echo mkdir -p /var/backups/student-result-app
echo chown -R root:root /var/www/student-result-app /var/log/pm2 /var/backups/student-result-app
echo.
echo echo "Step 4: Installing dependencies and building application..."
echo cd /var/www/student-result-app
echo npm install
echo npx prisma generate
echo npx prisma migrate deploy
echo npm run build
echo.
echo # Create environment file
echo echo "Step 5: Creating environment configuration..."
echo DB_PASSWORD=^$(cat /root/db_password.txt ^| grep 'Database password:' ^| cut -d' ' -f3^)
echo cat ^> .env ^<^< EOF
echo # Database Configuration
echo DATABASE_URL="postgresql://student_app_user:$DB_PASSWORD@localhost:5432/student_result_db"
echo # Next.js Configuration
echo NODE_ENV=production
echo NEXTAUTH_SECRET=^$(openssl rand -base64 32^)
echo NEXTAUTH_URL=http://148.230.115.4
echo # Application Configuration
echo PORT=3000
echo HOSTNAME=0.0.0.0
echo # Security
echo JWT_SECRET=^$(openssl rand -base64 32^)
echo ENCRYPTION_KEY=^$(openssl rand -base64 24^)
echo # File Upload Configuration
echo MAX_FILE_SIZE=52428800
echo UPLOAD_DIR=/var/www/student-result-app/uploads
echo # Monitoring
echo ENABLE_MONITORING=true
echo LOG_LEVEL=info
echo # Backup Configuration
echo BACKUP_ENABLED=true
echo BACKUP_RETENTION_DAYS=7
echo BACKUP_DIR=/var/backups/student-result-app
echo # Rate Limiting
echo RATE_LIMIT_WINDOW=900000
echo RATE_LIMIT_MAX_REQUESTS=100
echo # Performance
echo ENABLE_COMPRESSION=true
echo ENABLE_CACHING=true
echo STATIC_CACHE_DURATION=31536000
echo EOF
echo.
echo # Create PM2 ecosystem file
echo echo "Step 6: Setting up PM2 configuration..."
echo cat ^> ecosystem.config.js ^<^< 'EOF'
echo module.exports = {
echo   apps: [
echo     {
echo       name: 'student-result-app',
echo       script: 'npm',
echo       args: 'start',
echo       cwd: '/var/www/student-result-app',
echo       instances: 'max',
echo       exec_mode: 'cluster',
echo       env: {
echo         NODE_ENV: 'production',
echo         PORT: 3000
echo       },
echo       error_file: '/var/log/pm2/student-result-app-error.log',
echo       out_file: '/var/log/pm2/student-result-app-out.log',
echo       log_file: '/var/log/pm2/student-result-app-combined.log',
echo       time: true,
echo       autorestart: true,
echo       watch: false,
echo       max_memory_restart: '1G',
echo       kill_timeout: 5000,
echo       listen_timeout: 3000,
echo       log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
echo       merge_logs: true,
echo       min_uptime: '10s',
echo       max_restarts: 10
echo     }
echo   ]
echo };
echo EOF
echo.
echo # Create Nginx configuration
echo echo "Step 7: Setting up Nginx configuration..."
echo cat ^> /etc/nginx/sites-available/student-result-app ^<^< 'EOF'
echo server {
echo     listen 80;
echo     server_name 148.230.115.4;
echo     gzip on;
echo     gzip_vary on;
echo     gzip_min_length 1024;
echo     gzip_proxied expired no-cache no-store private must-revalidate auth;
echo     gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json application/xml image/svg+xml;
echo     client_max_body_size 50M;
echo     location / {
echo         proxy_pass http://localhost:3000;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection 'upgrade';
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo         proxy_read_timeout 86400;
echo         proxy_connect_timeout 60s;
echo         proxy_send_timeout 60s;
echo     }
echo     location /_next/static/ {
echo         alias /var/www/student-result-app/.next/static/;
echo         expires 365d;
echo         access_log off;
echo         add_header Cache-Control "public, immutable";
echo     }
echo     location /public/ {
echo         alias /var/www/student-result-app/public/;
echo         expires 30d;
echo         access_log off;
echo         add_header Cache-Control "public";
echo     }
echo     location /api/ {
echo         proxy_pass http://localhost:3000;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection 'upgrade';
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo         add_header Cache-Control "no-cache, no-store, must-revalidate";
echo         add_header Pragma "no-cache";
echo         add_header Expires "0";
echo     }
echo     location /admin {
echo         proxy_pass http://localhost:3000;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection 'upgrade';
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo         add_header Cache-Control "no-cache, no-store, must-revalidate";
echo     }
echo     location /health {
echo         access_log off;
echo         return 200 "healthy\n";
echo         add_header Content-Type text/plain;
echo     }
echo     location ~ /\. {
echo         deny all;
echo         access_log off;
echo         log_not_found off;
echo     }
echo     location ~* \.(env^|log^|sql^|md^|txt)$ {
echo         deny all;
echo         access_log off;
echo         log_not_found off;
echo     }
echo }
echo EOF
echo ln -sf /etc/nginx/sites-available/student-result-app /etc/nginx/sites-enabled/
echo rm -f /etc/nginx/sites-enabled/default
echo nginx -t
echo systemctl reload nginx
echo.
echo # Start application with PM2
echo echo "Step 8: Starting application with PM2..."
echo cd /var/www/student-result-app
echo pm2 start ecosystem.config.js
echo pm2 save
echo pm2 startup systemd -u root --hp /root
echo.
echo # Create health check endpoint
echo echo "Step 9: Creating health check endpoint..."
echo mkdir -p /var/www/student-result-app/app/api/health
echo cat ^> /var/www/student-result-app/app/api/health/route.ts ^<^< 'EOF'
echo import { NextResponse } from 'next/server';
echo export async function GET() {
echo   return NextResponse.json({ 
echo     status: 'healthy', 
echo     timestamp: new Date().toISOString(),
echo     uptime: process.uptime()
echo   });
echo }
echo EOF
echo.
echo # Test the deployment
echo echo "Step 10: Testing the deployment..."
echo sleep 10
echo curl -f http://localhost:3000/health
echo pm2 status
echo.
echo echo "Deployment completed successfully!"
echo echo "Your application is now accessible at:"
echo echo "Main site: http://148.230.115.4"
echo echo "Admin panel: http://148.230.115.4/admin"
echo echo "Health check: http://148.230.115.4/health"
) > deploy-script.sh

echo Deployment script created. Now uploading files and running deployment...
echo.

REM Upload files to VPS
echo Uploading application files...
pscp -r -pw Medahmed28233@ . root@148.230.115.4:/var/www/student-result-app/

REM Run deployment script
echo Running deployment script...
plink -pw Medahmed28233@ root@148.230.115.4 "bash /root/deploy-script.sh"

echo.
echo Deployment completed! Your application should be accessible at:
echo http://148.230.115.4
echo.
pause
