# Tạo file .env cho Docker Compose và backend nếu chưa có. Không ghi đè file đã tồn tại.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function New-RandomSecret {
    $chars = [char[]]'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

function Write-Utf8NoBom([string]$path, [string[]]$lines) {
    [System.IO.File]::WriteAllText($path, (($lines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))
}

if (Test-Path .env) {
    Write-Host 'Đã có .env — bỏ qua.'
} else {
    $lines = Get-Content .env.example -Encoding UTF8 | ForEach-Object {
        if ($_ -eq 'DB_PASSWORD=') { "DB_PASSWORD=$(New-RandomSecret)" }
        elseif ($_ -eq 'DB_ROOT_PASSWORD=') { "DB_ROOT_PASSWORD=$(New-RandomSecret)" }
        else { $_ }
    }
    Write-Utf8NoBom (Join-Path $root '.env') $lines
    Write-Host 'Đã tạo .env với mật khẩu MySQL ngẫu nhiên.'
}

if (Test-Path backend/.env) {
    Write-Host 'Đã có backend/.env — bỏ qua.'
} else {
    $rootEnv = Get-Content .env -Encoding UTF8
    $dbPassword = (($rootEnv | Where-Object { $_ -like 'DB_PASSWORD=*' }) -split '=', 2)[1]
    $dbPort = (($rootEnv | Where-Object { $_ -like 'DB_FORWARD_PORT=*' }) -split '=', 2)[1]
    $lines = Get-Content backend/.env.example -Encoding UTF8 | ForEach-Object {
        if ($_ -like 'DB_PASSWORD=*') { "DB_PASSWORD=$dbPassword" }
        elseif ($_ -like 'DB_PORT=*') { "DB_PORT=$dbPort" }
        else { $_ }
    }
    Write-Utf8NoBom (Join-Path $root 'backend/.env') $lines
    Write-Host 'Đã tạo backend/.env (APP_KEY sẽ được sinh khi container app khởi động).'
}
