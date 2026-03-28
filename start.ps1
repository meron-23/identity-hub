# Identity Hub — Unified Startup Script (PowerShell)
# Launches all 3 services: Node backend, Flask AI, React frontend
#
# Usage:  .\start.ps1
# Stop:   Ctrl+C in each window (or close the windows)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              IDENTITY HUB — STARTING ALL SERVICES          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── 1. Flask AI Service (port 5001) ──────────────────────────────────────────
Write-Host "🐍 Starting Flask AI Service on http://localhost:5001 ..." -ForegroundColor Yellow
$aiDir = Join-Path $rootDir "ai"
$flaskCmd = "cd `"$aiDir`"; .\.venv\Scripts\Activate.ps1; python api.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $flaskCmd -WindowStyle Normal

Start-Sleep -Seconds 3

# ── 2. Node.js Backend (port 5000) ───────────────────────────────────────────
Write-Host "🟢 Starting Node.js Backend on http://localhost:5000 ..." -ForegroundColor Green
$backendDir = Join-Path $rootDir "backend"
$nodeCmd = "cd `"$backendDir`"; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $nodeCmd -WindowStyle Normal

Start-Sleep -Seconds 2

# ── 3. React Frontend (port 3000) ────────────────────────────────────────────
Write-Host "⚛️  Starting React Frontend on http://localhost:3000 ..." -ForegroundColor Blue
$frontendDir = Join-Path $rootDir "frontend"
$reactCmd = "cd `"$frontendDir`"; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $reactCmd -WindowStyle Normal

Write-Host ""
Write-Host "✅ All 3 services are starting up. Give them ~15 seconds to fully initialise." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Service        URL                      Status" -ForegroundColor White
Write-Host "  ─────────────  ───────────────────────  ──────────────────" -ForegroundColor DarkGray
Write-Host "  React Frontend http://localhost:3000     Starting..." -ForegroundColor Blue
Write-Host "  Node Backend   http://localhost:5000     Starting..." -ForegroundColor Green
Write-Host "  Flask AI API   http://localhost:5001     Starting..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  SSO Demo Banks:" -ForegroundColor White
Write-Host "    FirstBank Ethiopia  http://localhost:3000/bank-a" -ForegroundColor Cyan
Write-Host "    AfriMicro Finance   http://localhost:3000/bank-b" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SSO Flow Test (from browser):" -ForegroundColor White
Write-Host "    http://localhost:5000/api/sso?redirect_url=http://localhost:3000/bank-a" -ForegroundColor Gray
Write-Host ""
