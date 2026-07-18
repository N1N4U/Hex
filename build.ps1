# script to build go 

$ErrorActionPreference = "Stop"

Write-Host "Setting environment variables for Linux (amd64)..." -ForegroundColor Cyan
$env:GOOS = "linux"
$env:GOARCH = "amd64"

Write-Host "Building Hex Core..." -ForegroundColor Cyan
# Switch to the script's root directory, then into core, because the go.mod is inside core/
Set-Location -Path "$PSScriptRoot\core"

# Build and output the binary into the root directory
go build -o ..\hex-linux-amd64 .

# Switch back to the root directory
Set-Location -Path "$PSScriptRoot"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Blue
Write-Host " Build Complete! " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Blue
Write-Host "File created: hex-linux-amd64 (in the Hex root folder)" -ForegroundColor Yellow
Write-Host "Next Step: Upload this file to your GitHub Releases page!" -ForegroundColor Yellow
