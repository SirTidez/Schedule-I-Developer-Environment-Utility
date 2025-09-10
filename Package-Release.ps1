# Schedule I Developer Environment Utility - Release Packaging Script
# This script automatically packages the published files into a zip archive

param(
    [string]$Configuration = "Release",
    [string]$RuntimeIdentifier = "win-x64",
    [string]$ProjectName = "Schedule I Developer Environment Utility"
)

# Calculate paths - use the directory where the script is located
$ProjectDir = $PSScriptRoot
$PublishDir = Join-Path $ProjectDir "bin\$Configuration\net8.0-windows10.0.19041.0\$RuntimeIdentifier\publish"

# Debug: Show calculated paths
Write-Host "Script Root: $PSScriptRoot" -ForegroundColor Cyan
Write-Host "Project Directory: $ProjectDir" -ForegroundColor Cyan
Write-Host "Publish Directory: $PublishDir" -ForegroundColor Cyan
$ZipFileName = "Schedule I Development Utility.zip"
$ZipPath = Join-Path $ProjectDir $ZipFileName

Write-Host "=== Schedule I Developer Environment Utility - Release Packaging ===" -ForegroundColor Green
Write-Host "Configuration: $Configuration" -ForegroundColor Yellow
Write-Host "Runtime: $RuntimeIdentifier" -ForegroundColor Yellow
Write-Host "Publish Directory: $PublishDir" -ForegroundColor Yellow
Write-Host "Zip Output: $ZipPath" -ForegroundColor Yellow
Write-Host ""

# Check if publish directory exists
if (-not (Test-Path $PublishDir)) {
    Write-Warning "Publish directory not found: $PublishDir"
    Write-Warning "This script should be run after 'dotnet publish' completes."
    Write-Warning "Skipping packaging..."
    exit 0
}

# Check if main executable exists
$MainExe = Join-Path $PublishDir "$ProjectName.exe"
if (-not (Test-Path $MainExe)) {
    Write-Warning "Main executable not found: $MainExe"
    Write-Warning "Publish may not be complete yet. Skipping packaging..."
    exit 0
}

Write-Host "Found publish directory with executable" -ForegroundColor Green

# Remove existing zip file if it exists
if (Test-Path $ZipPath) {
    Write-Host "Removing existing zip file..." -ForegroundColor Yellow
    Remove-Item $ZipPath -Force
}

# Create the zip archive
Write-Host "Creating zip archive..." -ForegroundColor Yellow
try {
    Compress-Archive -Path "$PublishDir\*" -DestinationPath $ZipPath -Force
    Write-Host "Zip archive created successfully!" -ForegroundColor Green
} catch {
    Write-Error "Failed to create zip archive: $_"
    exit 1
}

# Get zip file info
$ZipInfo = Get-Item $ZipPath
$ZipSizeMB = [math]::Round($ZipInfo.Length / 1MB, 2)

Write-Host ""
Write-Host "=== Packaging Complete ===" -ForegroundColor Green
Write-Host "Zip File: $ZipPath" -ForegroundColor White
Write-Host "Size: $ZipSizeMB MB ($($ZipInfo.Length) bytes)" -ForegroundColor White
Write-Host "Ready for distribution!" -ForegroundColor Green
