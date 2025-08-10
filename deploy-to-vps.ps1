# PowerShell Deployment Script for VPS: 148.230.115.4
# This script will deploy your student result app to your VPS

param(
    [string]$VPS_IP = "148.230.115.4",
    [string]$VPS_USER = "root",
    [string]$VPS_PASSWORD = "Medahmed28233"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Write-Log {
    param([string]$Message)
    Write-ColorOutput $Message $Green
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" $Red
    exit 1
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" $Yellow
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" $Blue
}

# Function to execute commands on VPS using SSH
function Invoke-SSHCommand {
    param([string]$Command)
    
    $sshCommand = "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $VPS_USER@$VPS_IP `"$Command`""
    $process = Start-Process -FilePath "ssh" -ArgumentList "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10", "$VPS_USER@$VPS_IP", $Command -NoNewWindow -Wait -PassThru -RedirectStandardOutput "temp_output.txt" -RedirectStandardError "temp_error.txt"
    
    if ($process.ExitCode -ne 0) {
        $error = Get-Content "temp_error.txt" -ErrorAction SilentlyContinue
        Write-Error "SSH command failed: $error"
    }
    
    $output = Get-Content "temp_output.txt" -ErrorAction SilentlyContinue
    Remove-Item "temp_output.txt" -ErrorAction SilentlyContinue
    Remove-Item "temp_error.txt" -ErrorAction SilentlyContinue
    
    return $output
}

# Function to copy files to VPS using SCP
function Copy-ToVPS {
    param([string]$Source, [string]$Destination)
    
    $scpCommand = "scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 `"$Source`" $VPS_USER@$VPS_IP`:$Destination"
    $process = Start-Process -FilePath "scp" -ArgumentList "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10", $Source, "$VPS_USER@$VPS_IP`:$Destination" -NoNewWindow -Wait -PassThru
    
    if ($process.ExitCode -ne 0) {
        Write-Error "SCP command failed"
    }
}

Write-Log "Starting deployment to VPS: $VPS_IP"

# Check if SSH is available
try {
    $sshVersion = ssh -V 2>&1
    Write-Log "SSH is available: $sshVersion"
} catch {
    Write-Error "SSH is not available. Please install OpenSSH or use WSL."
}

# Test SSH connection
Write-Log "Testing SSH connection..."
try {
    $testResult = Invoke-SSHCommand "echo 'SSH connection successful'"
    if ($testResult -contains "SSH connection successful") {
        Write-Log "SSH connection successful! Starting deployment..."
    } else {
        Write-Error "Cannot connect to VPS. Please check your credentials and network connection."
    }
} catch {
    Write-Error "SSH connection failed. Please check your credentials and network connection."
}

# Step 1: Update system and install dependencies
Write-Log "Step 1: Updating system and installing dependencies..."
Invoke-SSHCommand @"
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
"@

# Step 2: Setup database
Write-Log "Step 2: Setting up PostgreSQL database..."
Invoke-SSHCommand @"
# Create database user
sudo -u postgres createuser --interactive student_app_user << EOF
y
EOF

# Create database
sudo -u postgres createdb student_result_db

# Set password for database user
DB_PASSWORD=\$(openssl rand -base64 32)
sudo -u postgres psql -c "ALTER USER student_app_user WITH PASSWORD '\$DB_PASSWORD';"
echo "Database password: \$DB_PASSWORD" > /root/db_password.txt
"@

# Step 3: Create application directory
Write-Log "Step 3: Creating application directory..."
Invoke-SSHCommand @"
mkdir -p /var/www/student-result-app
mkdir -p /var/log/pm2
mkdir -p /var/backups/student-result-app
chown -R $VPS_USER:$VPS_USER /var/www/student-result-app /var/log/pm2 /var/backups/student-result-app
"@

# Step 4: Copy application files
Write-Log "Step 4: Copying application files..."
# Create a temporary tar file of the current directory
$tarCommand = "tar -czf app.tar.gz --exclude=node_modules --exclude=.next --exclude=.git ."
Invoke-Expression $tarCommand

# Copy the tar file to VPS
Copy-ToVPS "app.tar.gz" "/tmp/"

# Extract and setup on VPS
Invoke-SSHCommand @"
cd /var/www/student-result-app
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
"@

# Clean up local tar file
Remove-Item "app.tar.gz" -ErrorAction SilentlyContinue

# Step 5: Create environment file
Write-Log "Step 5: Creating environment configuration..."
Invoke-SSHCommand @"
cd /var/www/student-result-app

# Get database password
DB_PASSWORD=\$(cat /root/db_password.txt | grep 'Database password:' | cut -d' ' -f3)

# Create .env file
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://student_app_user:\$DB_PASSWORD@localhost:5432/student_result_db"

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
"@

# Step 6: Create PM2 ecosystem file
Write-Log "Step 6: Setting up PM2 configuration..."
Invoke-SSHCommand @"
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
"@

# Step 7: Create Nginx configuration
Write-Log "Step 7: Setting up Nginx configuration..."
Invoke-SSHCommand @"
cat > /etc/nginx/sites-available/student-result-app << 'EOF'
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
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
"@

# Step 8: Start application with PM2
Write-Log "Step 8: Starting application with PM2..."
Invoke-SSHCommand @"
cd /var/www/student-result-app

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
"@

# Step 9: Create health check endpoint
Write-Log "Step 9: Creating health check endpoint..."
Invoke-SSHCommand @"
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
"@

# Step 10: Setup log rotation
Write-Log "Step 10: Setting up log rotation..."
Invoke-SSHCommand @"
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
"@

# Step 11: Test the deployment
Write-Log "Step 11: Testing the deployment..."
Start-Sleep -Seconds 10

# Test if application is running
$healthCheck = Invoke-SSHCommand "curl -f http://localhost:3000/health > /dev/null 2>&1 && echo 'SUCCESS' || echo 'FAILED'"
if ($healthCheck -contains "SUCCESS") {
    Write-Log "✅ Application is running successfully!"
} else {
    Write-Warning "⚠️  Application health check failed. Checking logs..."
    Invoke-SSHCommand "pm2 logs student-result-app --lines 10"
}

# Get database password for user
$dbPassword = Invoke-SSHCommand "cat /root/db_password.txt | grep 'Database password:' | cut -d' ' -f3"

# Final instructions
Write-Log "🎉 Deployment completed successfully!"
Write-Info ""
Write-Info "Your application is now accessible at:"
Write-Info "🌐 Main site: http://$VPS_IP"
Write-Info "🔧 Admin panel: http://$VPS_IP/admin"
Write-Info "💚 Health check: http://$VPS_IP/health"
Write-Info ""
Write-Info "Database credentials:"
Write-Info "📊 Database: student_result_db"
Write-Info "👤 User: student_app_user"
Write-Info "🔑 Password: $dbPassword"
Write-Info ""
Write-Info "Useful commands:"
Write-Info "📋 PM2 status: pm2 status"
Write-Info "📝 PM2 logs: pm2 logs student-result-app"
Write-Info "🔄 Restart app: pm2 restart student-result-app"
Write-Info "📊 Monitor: pm2 monit"
Write-Info ""
Write-Info "Next steps:"
Write-Info "1. Upload your data files through the admin panel"
Write-Info "2. Configure a domain name (optional)"
Write-Info "3. Set up SSL certificate with Certbot"
Write-Info "4. Configure backups"
Write-Info ""
Write-Info "Happy deploying! 🚀"

