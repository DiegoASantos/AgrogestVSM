param(
  [string]$OutputDirectory = "backups",
  [string]$Label = "manual"
)

$ErrorActionPreference = "Stop"

function Require-Value([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "$Name is required."
  }
}

$dbHost = $env:DB_HOST
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$dbName = $env:DB_NAME
$dbUser = $env:DB_USER
$dbSchema = if ($env:DB_SCHEMA) { $env:DB_SCHEMA } else { "public" }

Require-Value "DB_HOST" $dbHost
Require-Value "DB_NAME" $dbName
Require-Value "DB_USER" $dbUser

$pgDump = Get-Command "pg_dump" -ErrorAction Stop
$pgRestore = Get-Command "pg_restore" -ErrorAction Stop
$resolvedOutput = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
  [System.IO.Path]::GetFullPath($OutputDirectory)
} else {
  [System.IO.Path]::GetFullPath(
    (Join-Path (Get-Location) $OutputDirectory)
  )
}
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null

$safeLabel = $Label -replace "[^a-zA-Z0-9_-]", "-"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $resolvedOutput "$dbName-$safeLabel-$timestamp.dump"

$previousPgPassword = $env:PGPASSWORD
if ($env:DB_PASSWORD) {
  $env:PGPASSWORD = $env:DB_PASSWORD
}

try {
  & $pgDump.Source `
    --host=$dbHost `
    --port=$dbPort `
    --username=$dbUser `
    --dbname=$dbName `
    --schema=$dbSchema `
    --format=custom `
    --compress=9 `
    --no-owner `
    --no-privileges `
    --file=$backupPath

  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE."
  }

  & $pgRestore.Source --list $backupPath | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Backup verification failed with exit code $LASTEXITCODE."
  }
} finally {
  $env:PGPASSWORD = $previousPgPassword
}

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath
Write-Output "backup=$backupPath"
Write-Output "sha256=$($hash.Hash.ToLowerInvariant())"
