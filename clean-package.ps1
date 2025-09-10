# Clean up packaged files and kill any running instances
Write-Host "Cleaning up packaged files..."

# Kill any running instances of the application
try {
    Get-Process | Where-Object { $_.ProcessName -like "*Schedule*" -or $_.ProcessName -like "*electron*" } | Stop-Process -Force
    Write-Host "Killed running Schedule I and Electron processes"
} catch {
    Write-Host "No running Schedule I or Electron processes found"
}

# Wait a moment for processes to fully terminate
Start-Sleep -Seconds 2

# Try to unlock files using handle.exe if available, or use alternative method
try {
    # Use PowerShell to force unlock files
    $files = Get-ChildItem -Path "dist-package" -Recurse -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        try {
            # Try to open file for exclusive access to unlock it
            $stream = [System.IO.File]::Open($file.FullName, 'Open', 'ReadWrite', 'None')
            $stream.Close()
            $stream.Dispose()
        } catch {
            Write-Host "Could not unlock file: $($file.Name)"
        }
    }
} catch {
    Write-Host "Error unlocking files: $_"
}

# Remove the dist-package directory
try {
    if (Test-Path "dist-package") {
        Remove-Item -Path "dist-package" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed dist-package directory"
    } else {
        Write-Host "dist-package directory does not exist"
    }
} catch {
    Write-Host "Error removing dist-package directory: $_"
    # Try alternative cleanup method
    try {
        cmd /c "rmdir /s /q dist-package" 2>$null
        Write-Host "Used alternative cleanup method"
    } catch {
        Write-Host "Alternative cleanup also failed"
    }
}

Write-Host "Cleanup complete"
