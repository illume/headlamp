# Copyright 2025 The Kubernetes Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Verify Windows build artifacts and binaries
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Split-Path -Parent $scriptDir
$distDir = Join-Path $appDir "dist"

# Function to test backend binary
function Test-BackendBinary {
  param($backendPath)
  
  Write-Host "Found backend at: $backendPath"
  $versionOutput = & $backendPath --version 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    Write-Host "[FAIL] Backend version command failed with exit code $exitCode" -ForegroundColor Red
    exit $exitCode
  }
  Write-Host "Backend version: $versionOutput"
  if ($versionOutput -match "Headlamp") {
    Write-Host "[PASS] Backend binary is working" -ForegroundColor Green
    return $true
  } else {
    Write-Host "[FAIL] Backend version check failed" -ForegroundColor Red
    exit 1
  }
}

Write-Host "=== Verifying Windows Build Artifacts ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify artifacts exist
Write-Host "Checking for built artifacts..."
Get-ChildItem $distDir | Format-Table

$installers = Get-ChildItem "$distDir\*.exe" -ErrorAction SilentlyContinue
if ($installers) {
  Write-Host "[PASS] Windows installer found" -ForegroundColor Green
} else {
  Write-Host "[FAIL] No Windows installer found" -ForegroundColor Red
  exit 1
}
Write-Host ""

# Step 2: Verify backend binary in unpacked resources
Write-Host "=== Verifying Backend Binary ===" -ForegroundColor Cyan
$unpackedDir = Join-Path $distDir "win-unpacked"
$appPath = $null

if (Test-Path $unpackedDir) {
  Write-Host "Found unpacked build directory"
  $backendPath = Join-Path $unpackedDir "resources\headlamp-server.exe"
  if (Test-Path $backendPath) {
    Test-BackendBinary $backendPath
    $appPath = Join-Path $unpackedDir "Headlamp.exe"
  } else {
    Write-Host "[FAIL] Backend server binary not found in unpacked resources" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "Unpacked directory not found, checking in build output..." -ForegroundColor Yellow
  $backendPath = Get-ChildItem -Path $distDir -Recurse -Filter "headlamp-server.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($backendPath) {
    Test-BackendBinary $backendPath.FullName
    # Try to find the app executable near the backend
    $appPath = Get-ChildItem -Path (Split-Path $backendPath.FullName) -Recurse -Filter "Headlamp.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 | Select-Object -ExpandProperty FullName
  } else {
    Write-Host "[FAIL] Could not find backend binary to test in dist output" -ForegroundColor Red
    exit 1
  }
}
Write-Host ""

# Step 3: Verify Electron app can run
Write-Host "=== Verifying Electron App ===" -ForegroundColor Cyan
if ($appPath -and (Test-Path $appPath)) {
  Write-Host "Testing Electron app..."
  Write-Host "Found Headlamp at: $appPath"
  
  try {
    # Create a unique temp directory for this run
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    $outputFile = Join-Path $tempDir "plugins-output.txt"
    $errorFile = Join-Path $tempDir "plugins-error.txt"
    
    $process = Start-Process -FilePath $appPath -ArgumentList "list-plugins" -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile
    if ($process.ExitCode -eq 0) {
      Write-Host "[PASS] App executed successfully" -ForegroundColor Green
      if (Test-Path $outputFile) {
        Get-Content $outputFile
      }
    } else {
      Write-Host "[FAIL] App failed to run (exit code: $($process.ExitCode))" -ForegroundColor Red
      if (Test-Path $errorFile) {
        Get-Content $errorFile
      }
      # Cleanup temp directory before exiting
      if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
      }
      exit 1
    }
    
    # Cleanup temp directory
    if (Test-Path $tempDir) {
      Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  } catch {
    Write-Host "[FAIL] Error running app: $_" -ForegroundColor Red
    # Cleanup temp directory before exiting
    if (Test-Path $tempDir) {
      Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    exit 1
  }
} else {
  Write-Host "[FAIL] Could not find Headlamp.exe for app verification" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "[PASS] All Windows verification checks passed" -ForegroundColor Green

