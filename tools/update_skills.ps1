Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  POE2 Skill Data Updater" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found. Install from: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Go not found. Install from: https://go.dev/" -ForegroundColor Red
    exit 1
}

Set-Location "$PSScriptRoot\.."

Write-Host "[1/3] Checking puppeteer..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules\puppeteer")) {
    Write-Host "    Installing puppeteer..." -ForegroundColor Gray
    npm install puppeteer
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] puppeteer install failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "    [OK] puppeteer ready" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] Extracting skill data from poe2db.tw..." -ForegroundColor Yellow
node "tools\auto_extract.js"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Extraction failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[3/3] Merging data..." -ForegroundColor Yellow
go run "tools\merge_skills.go"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Merge failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  [OK] Update complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Restart server: go run main.go" -ForegroundColor Cyan