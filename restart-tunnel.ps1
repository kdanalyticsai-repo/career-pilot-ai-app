# CareerPilot — restart cloudflared tunnel and push OTA update
# Run this whenever the tunnel dies. No EAS build needed.

Write-Host "Starting cloudflared tunnel..." -ForegroundColor Cyan

$logFile = "$env:TEMP\cloudflared_tunnel.log"

# Kill any existing cloudflared
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force

# Start new tunnel
Start-Process -FilePath "C:\Program Files (x86)\cloudflared\cloudflared.exe" `
    -ArgumentList "tunnel","--url","http://localhost:8000" `
    -RedirectStandardError $logFile -WindowStyle Hidden

# Wait for URL
Write-Host "Waiting for tunnel URL..." -ForegroundColor Yellow
$url = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    $log = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
    if ($log -match 'https://[a-z0-9\-]+\.trycloudflare\.com') {
        $url = $matches[0]
        break
    }
}

if (-not $url) {
    Write-Host "ERROR: Could not get tunnel URL. Check cloudflared is installed." -ForegroundColor Red
    exit 1
}

Write-Host "Tunnel URL: $url" -ForegroundColor Green

# Update .env
$envPath = "$PSScriptRoot\mobile\.env"
$envContent = Get-Content $envPath -Raw
$envContent = $envContent -replace 'EXPO_PUBLIC_API_URL=.*', "EXPO_PUBLIC_API_URL=$url/api/v1"
Set-Content $envPath $envContent -Encoding utf8
Write-Host "Updated .env with new URL" -ForegroundColor Green

# Push OTA update (no build needed, free & unlimited)
Write-Host "Pushing OTA update to installed app..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\mobile"
npx eas update --channel preview --message "Update tunnel URL" --non-interactive

Write-Host ""
Write-Host "Done! Open the app on your phone — it will auto-update within ~30 seconds." -ForegroundColor Green
Write-Host "Backend tunnel: $url" -ForegroundColor Cyan
