param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"

function Require-Value([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "$Name is required."
  }
}

if ($env:ALLOW_DATABASE_RESTORE -ne "true") {
  throw "ALLOW_DATABASE_RESTORE=true is required."
}

if (
  $env:NODE_ENV -eq "production" -and
  $env:ALLOW_PRODUCTION_DATABASE_RESTORE -ne "true"
) {
  throw "Production restore requires ALLOW_PRODUCTION_DATABASE_RESTORE=true."
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
$dbHost = $env:DB_HOST
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$dbName = $env:DB_NAME
$dbUser = $env:DB_USER
$dbSchema = if ($env:DB_SCHEMA) { $env:DB_SCHEMA } else { "public" }

Require-Value "DB_HOST" $dbHost
Require-Value "DB_NAME" $dbName
Require-Value "DB_USER" $dbUser

$pgRestore = Get-Command "pg_restore" -ErrorAction Stop
$psql = Get-Command "psql" -ErrorAction Stop
& $pgRestore.Source --list $resolvedBackup | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "The backup archive is invalid or unreadable."
}

$previousPgPassword = $env:PGPASSWORD
if ($env:DB_PASSWORD) {
  $env:PGPASSWORD = $env:DB_PASSWORD
}

try {
  & $psql.Source `
    --host=$dbHost `
    --port=$dbPort `
    --username=$dbUser `
    --dbname=$dbName `
    --set=ON_ERROR_STOP=1 `
    --command="CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS postgis;"

  if ($LASTEXITCODE -ne 0) {
    throw "Could not prepare PostgreSQL extensions."
  }

  & $pgRestore.Source `
    --host=$dbHost `
    --port=$dbPort `
    --username=$dbUser `
    --dbname=$dbName `
    --schema=$dbSchema `
    --clean `
    --if-exists `
    --no-owner `
    --no-privileges `
    --exit-on-error `
    $resolvedBackup

  if ($LASTEXITCODE -ne 0) {
    throw "pg_restore failed with exit code $LASTEXITCODE."
  }
} finally {
  $env:PGPASSWORD = $previousPgPassword
}

Write-Output "restore_completed=$resolvedBackup"
