# Load environment variables from .env file
# Usage: . .\load-env.ps1

if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            Set-Item -Path "env:$name" -Value $value
            Write-Host "✅ Loaded: $name" -ForegroundColor Green
        }
    }
    Write-Host "`n✅ Environment variables loaded from .env" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}
