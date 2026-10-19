# Tạo/bổ sung file .env cho Docker Compose và backend.
# Chỉ thêm khóa còn thiếu hoặc đang rỗng; KHÔNG ghi đè giá trị đã có.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function New-RandomSecret {
    $chars = [char[]]'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

function Read-EnvLines([string]$path) {
    [System.IO.File]::ReadAllLines((Join-Path $root $path), [System.Text.Encoding]::UTF8)
}

function Write-EnvLines([string]$path, [string[]]$lines) {
    [System.IO.File]::WriteAllText((Join-Path $root $path), (($lines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))
}

function Get-EnvValue([string]$path, [string]$key) {
    $line = Read-EnvLines $path | Where-Object { $_ -like "$key=*" } | Select-Object -First 1
    if ($null -eq $line) { return '' }
    ($line -split '=', 2)[1]
}

function Set-EnvKeyIfMissing([string]$path, [string]$key, [string]$value) {
    $lines = @(Read-EnvLines $path)
    $existing = $lines | Where-Object { $_ -like "$key=*" } | Select-Object -First 1
    if ($null -ne $existing -and $existing -ne "$key=") { return }
    if ($null -ne $existing) {
        $lines = $lines | ForEach-Object { if ($_ -eq "$key=") { "$key=$value" } else { $_ } }
    } else {
        $lines += ''
        $lines += "$key=$value"
    }
    Write-EnvLines $path $lines
    Write-Host "  + ${path}: đặt $key"
}

if (-not (Test-Path .env)) {
    Write-EnvLines '.env' (Read-EnvLines '.env.example')
    Write-Host 'Đã tạo .env từ .env.example.'
}
Set-EnvKeyIfMissing '.env' 'DB_PASSWORD' (New-RandomSecret)
Set-EnvKeyIfMissing '.env' 'DB_ROOT_PASSWORD' (New-RandomSecret)
Set-EnvKeyIfMissing '.env' 'DB_TEST_PASSWORD' (New-RandomSecret)

if (-not (Test-Path backend/.env)) {
    $dbPort = Get-EnvValue '.env' 'DB_FORWARD_PORT'
    if (-not $dbPort) { $dbPort = '3307' }
    $lines = Read-EnvLines 'backend/.env.example' | ForEach-Object {
        if ($_ -like 'DB_PORT=*') { "DB_PORT=$dbPort" } else { $_ }
    }
    Write-EnvLines 'backend/.env' $lines
    Write-Host 'Đã tạo backend/.env (APP_KEY sẽ được sinh khi container app khởi động).'
}
Set-EnvKeyIfMissing 'backend/.env' 'DB_PASSWORD' (Get-EnvValue '.env' 'DB_PASSWORD')
Set-EnvKeyIfMissing 'backend/.env' 'DB_TEST_PASSWORD' (Get-EnvValue '.env' 'DB_TEST_PASSWORD')

foreach ($key in @('DB_PASSWORD', 'DB_TEST_PASSWORD')) {
    if ((Get-EnvValue '.env' $key) -ne (Get-EnvValue 'backend/.env' $key)) {
        Write-Warning "$key trong .env và backend/.env khác nhau — sửa tay cho khớp (script không ghi đè)."
    }
}
Write-Host 'Xong. Nếu vừa thêm DB_TEST_PASSWORD cho volume MySQL đã có: docker compose up -d mysql; sh scripts/create-test-db.sh'
