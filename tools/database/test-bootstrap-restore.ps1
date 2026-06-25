param(
  [int]$Port = 55432,
  [int]$ApiPort = 3101,
  [string]$PostgresBin = "C:\Program Files\PostgreSQL\18\bin"
)

$ErrorActionPreference = "Stop"
$workspace = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..\..")
)
$dataDir = Join-Path $workspace ".phase1-pg-data"
$backupDir = Join-Path $workspace ".phase1-pg-backups"
$serverStarted = $false
$apiProcess = $null

function Assert-SafeWorkspacePath([string]$Path) {
  $resolved = [System.IO.Path]::GetFullPath($Path)
  if (-not $resolved.StartsWith(
    $workspace + [System.IO.Path]::DirectorySeparatorChar
  )) {
    throw "Unsafe temporary path: $resolved"
  }
}

function Remove-TemporaryPath([string]$Path) {
  if (Test-Path -LiteralPath $Path) {
    Assert-SafeWorkspacePath $Path
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
}

if (-not (Test-Path -LiteralPath "$PostgresBin\initdb.exe")) {
  throw "PostgreSQL binaries were not found at $PostgresBin."
}

if (
  -not (Test-Path -LiteralPath (
    Join-Path (Split-Path $PostgresBin) "share\extension\postgis.control"
  ))
) {
  throw "PostGIS is not installed for the selected PostgreSQL distribution."
}

Remove-TemporaryPath $dataDir
Remove-TemporaryPath $backupDir
New-Item -ItemType Directory -Path $dataDir | Out-Null

try {
  & "$PostgresBin\initdb.exe" `
    -D $dataDir `
    -A trust `
    -U postgres `
    --no-locale `
    --encoding=UTF8
  if ($LASTEXITCODE -ne 0) {
    throw "initdb failed with exit code $LASTEXITCODE."
  }

  & "$PostgresBin\pg_ctl.exe" `
    -D $dataDir `
    -o "`"-p $Port -h 127.0.0.1`"" `
    -w start
  if ($LASTEXITCODE -ne 0) {
    throw "pg_ctl start failed with exit code $LASTEXITCODE."
  }
  $serverStarted = $true

  & "$PostgresBin\createdb.exe" `
    -h 127.0.0.1 `
    -p $Port `
    -U postgres `
    agrogest_phase1
  if ($LASTEXITCODE -ne 0) {
    throw "Could not create bootstrap test database."
  }

  $env:NODE_ENV = "test"
  $env:APP_HOST = "127.0.0.1"
  $env:APP_PORT = "$ApiPort"
  $env:APP_TRUST_PROXY = "false"
  $env:CORS_ALLOWED_ORIGINS = "http://localhost:3000"
  $env:DB_HOST = "127.0.0.1"
  $env:DB_PORT = "$Port"
  $env:DB_NAME = "agrogest_phase1"
  $env:DB_USER = "postgres"
  $env:DB_PASSWORD = "local-phase1-password"
  $env:DB_SCHEMA = "public"
  $env:DB_SSL = "false"
  $env:DB_SSL_REJECT_UNAUTHORIZED = "false"
  $env:JWT_ACCESS_SECRET = "phase1-access-secret-with-at-least-32-characters"
  $env:JWT_REFRESH_SECRET = "phase1-refresh-secret-with-at-least-32-characters"
  $env:JWT_ACCESS_EXPIRES_IN = "15m"
  $env:JWT_REFRESH_EXPIRES_IN = "30d"
  $env:ALLOW_DATABASE_BOOTSTRAP = "true"
  $env:SEED_ADMIN_FIRST_NAME = "Phase"
  $env:SEED_ADMIN_LAST_NAME = "One"
  $env:SEED_ADMIN_EMAIL = "phase1@example.local"
  $env:SEED_ADMIN_PASSWORD = "Phase1-Test-Password!"

  Push-Location $workspace
  try {
    pnpm.cmd --filter @agrogest/api build
    if ($LASTEXITCODE -ne 0) {
      throw "API build failed."
    }

    node apps/api/dist/scripts/bootstrap-database.js
    if ($LASTEXITCODE -ne 0) {
      throw "Database bootstrap failed."
    }

    node apps/api/dist/scripts/migrate-database.js
    if ($LASTEXITCODE -ne 0) {
      throw "Migration validation failed."
    }

    node apps/api/dist/scripts/seed-auth.js
    if ($LASTEXITCODE -ne 0) {
      throw "Auth seed failed."
    }

    $apiStdout = Join-Path $workspace ".phase1-api-stdout.log"
    $apiStderr = Join-Path $workspace ".phase1-api-stderr.log"
    Remove-Item $apiStdout, $apiStderr -Force -ErrorAction SilentlyContinue
    $apiProcess = Start-Process `
      -FilePath "node" `
      -ArgumentList "apps/api/dist/main.js" `
      -WorkingDirectory $workspace `
      -WindowStyle Hidden `
      -RedirectStandardOutput $apiStdout `
      -RedirectStandardError $apiStderr `
      -PassThru

    $healthUrl = "http://127.0.0.1:$ApiPort/health"
    $apiReady = $false
    for ($attempt = 1; $attempt -le 30; $attempt++) {
      Start-Sleep -Milliseconds 500
      try {
        $healthResponse = Invoke-WebRequest `
          -Uri $healthUrl `
          -UseBasicParsing `
          -TimeoutSec 2
        if ($healthResponse.StatusCode -eq 200) {
          $apiReady = $true
          break
        }
      } catch {
        if ($apiProcess.HasExited) {
          break
        }
      }
    }

    if (-not $apiReady) {
      $stderr = if (Test-Path $apiStderr) {
        Get-Content $apiStderr -Raw
      } else {
        "No API stderr was captured."
      }
      throw "API smoke start failed. $stderr"
    }

    $loginUrl = "http://127.0.0.1:$ApiPort/auth/login"
    $loginBody = @{
      email = "phase1@example.local"
      password = "invalid-password"
    } | ConvertTo-Json
    $statuses = @()
    for ($attempt = 1; $attempt -le 6; $attempt++) {
      try {
        $response = Invoke-WebRequest `
          -Uri $loginUrl `
          -Method Post `
          -ContentType "application/json" `
          -Body $loginBody `
          -UseBasicParsing
        $statuses += [int]$response.StatusCode
      } catch {
        $statuses += [int]$_.Exception.Response.StatusCode
      }
    }

    if ($statuses[5] -ne 429) {
      throw "Expected sixth login attempt to return 429. Statuses: $($statuses -join ',')."
    }
    Write-Output "api_health=passed"
    Write-Output "login_rate_limit_statuses=$($statuses -join ',')"

    Stop-Process -Id $apiProcess.Id -Force
    $apiProcess.WaitForExit()
    $apiProcess = $null
    Remove-Item $apiStdout, $apiStderr -Force -ErrorAction SilentlyContinue

    $env:PATH = "$PostgresBin;$env:PATH"
    & "$PSScriptRoot\backup-postgres.ps1" `
      -OutputDirectory $backupDir `
      -Label "phase1"

    $backupFile = (
      Get-ChildItem -LiteralPath $backupDir -Filter "*.dump" |
        Select-Object -First 1
    ).FullName
    if (-not $backupFile) {
      throw "Backup file was not created."
    }

    & "$PostgresBin\createdb.exe" `
      -h 127.0.0.1 `
      -p $Port `
      -U postgres `
      agrogest_restore
    if ($LASTEXITCODE -ne 0) {
      throw "Could not create restore test database."
    }

    $env:DB_NAME = "agrogest_restore"
    $env:ALLOW_DATABASE_RESTORE = "true"
    & "$PSScriptRoot\restore-postgres.ps1" -BackupFile $backupFile

    $tableCount = & "$PostgresBin\psql.exe" `
      -h 127.0.0.1 -p $Port -U postgres -d agrogest_restore -Atc `
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> 'spatial_ref_sys';"
    $provinceCount = & "$PostgresBin\psql.exe" `
      -h 127.0.0.1 -p $Port -U postgres -d agrogest_restore -Atc `
      "SELECT count(*) FROM provincias WHERE codigo LIKE '20%';"
    $districtCount = & "$PostgresBin\psql.exe" `
      -h 127.0.0.1 -p $Port -U postgres -d agrogest_restore -Atc `
      "SELECT count(*) FROM distritos WHERE ubigeo LIKE '20%';"

    if ([int]$tableCount -lt 40) {
      throw "Expected at least 40 restored tables, found $tableCount."
    }
    if ([int]$provinceCount -ne 8) {
      throw "Expected 8 Piura provinces, found $provinceCount."
    }
    if ([int]$districtCount -ne 65) {
      throw "Expected 65 Piura districts, found $districtCount."
    }

    Write-Output "restored_tables=$tableCount"
    Write-Output "restored_piura_provinces=$provinceCount"
    Write-Output "restored_piura_districts=$districtCount"
    Write-Output "database_smoke_test=passed"
  } finally {
    Pop-Location
  }
} finally {
  if ($apiProcess -and -not $apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
  }
  Remove-Item `
    (Join-Path $workspace ".phase1-api-stdout.log"), `
    (Join-Path $workspace ".phase1-api-stderr.log") `
    -Force -ErrorAction SilentlyContinue
  if ($serverStarted) {
    & "$PostgresBin\pg_ctl.exe" -D $dataDir -m fast -w stop
  }
  Remove-TemporaryPath $dataDir
  Remove-TemporaryPath $backupDir
}
