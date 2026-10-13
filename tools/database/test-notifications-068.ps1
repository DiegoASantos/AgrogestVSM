param([int]$Port = 55568, [string]$PostgresBin = "C:\Program Files\PostgreSQL\18\bin")

$ErrorActionPreference = "Stop"
$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$dataDir = [System.IO.Path]::GetFullPath((Join-Path $workspace ".pg-notifications-068-smoke"))
if (-not $dataDir.StartsWith($workspace + [System.IO.Path]::DirectorySeparatorChar)) {
  throw "Unsafe temporary path."
}
if (Test-Path -LiteralPath $dataDir) {
  throw "Temporary PostgreSQL path already exists; refusing to modify it."
}

$started = $false
try {
  New-Item -ItemType Directory -Path $dataDir | Out-Null
  & "$PostgresBin\initdb.exe" -D $dataDir -A trust -U postgres --no-locale --encoding=UTF8 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "initdb failed." }
  $startArgs = "-D `"$dataDir`" -l `"$(Join-Path $dataDir 'server.log')`" -o `"-p $Port -h 127.0.0.1`" -w start"
  $start = Start-Process -FilePath "$PostgresBin\pg_ctl.exe" -ArgumentList $startArgs -WindowStyle Hidden -PassThru
  $start.WaitForExit()
  if ($start.ExitCode -ne 0) { throw "pg_ctl start failed." }
  $started = $true
  $env:NOTIFICATIONS_SMOKE_PORT = "$Port"
  node (Join-Path $PSScriptRoot "test-notifications-068.cjs")
  if ($LASTEXITCODE -ne 0) { throw "Notification SQL smoke failed." }
} finally {
  if ($started) {
    $stopArgs = "-D `"$dataDir`" -m fast -w stop"
    $stop = Start-Process -FilePath "$PostgresBin\pg_ctl.exe" -ArgumentList $stopArgs -WindowStyle Hidden -PassThru
    $stop.WaitForExit()
    if ($stop.ExitCode -ne 0) { Write-Warning "pg_ctl stop failed; temporary data directory was retained." }
  }
  if ((-not $started -or -not $stop -or $stop.ExitCode -eq 0) -and (Test-Path -LiteralPath $dataDir)) {
    $resolved = [System.IO.Path]::GetFullPath($dataDir)
    if ($resolved.StartsWith($workspace + [System.IO.Path]::DirectorySeparatorChar) -and
        $resolved -eq [System.IO.Path]::GetFullPath((Join-Path $workspace ".pg-notifications-068-smoke"))) {
      Remove-Item -LiteralPath $resolved -Recurse -Force
    }
  }
  Remove-Item Env:NOTIFICATIONS_SMOKE_PORT -ErrorAction SilentlyContinue
}
