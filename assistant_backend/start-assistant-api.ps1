param(
    [int]$Port = 8098
)

$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSCommandPath
$python = Get-Command python -ErrorAction SilentlyContinue

if (-not $python) {
    Write-Error "Python was not found in PATH. Install Python 3 and try again."
}

Write-Host "DayZ assistant API: http://127.0.0.1:$Port/"
Write-Host "Health endpoint: http://127.0.0.1:$Port/health"
Write-Host "Stop server: Ctrl+C"

Push-Location $backendRoot
try {
    & $python.Source assistant_api.py --host 127.0.0.1 --port $Port
}
finally {
    Pop-Location
}
