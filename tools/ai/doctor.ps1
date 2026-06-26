param(
  [switch]$SkipOpenCode,
  [switch]$SkipObsidian
)

$ErrorActionPreference = "Stop"

function Write-Check {
  param(
    [string]$Name,
    [scriptblock]$Command,
    [switch]$Optional
  )

  Write-Output "== $Name =="

  try {
    & $Command
    Write-Output "OK: $Name"
  } catch {
    if ($Optional) {
      Write-Output "WARN: $Name"
      Write-Output $_.Exception.Message
      return
    }

    Write-Output "FAIL: $Name"
    Write-Output $_.Exception.Message
    throw
  }
}

Write-Check "Node" { node --version }
Write-Check "pnpm" { pnpm.cmd --version }
Write-Check "Documentation validation" { pnpm.cmd docs:check }
Write-Check "OpenGem binary" {
  if (-not (Test-Path ".\node_modules\.bin\opengem.CMD")) {
    throw "OpenGem binary not found. Run pnpm install."
  }

  Get-Command ".\node_modules\.bin\opengem.CMD" | Select-Object -ExpandProperty Source
}

if (-not $SkipOpenCode) {
  Write-Check "OpenCode version" { opencode.cmd --version }
  Write-Check "OpenCode DeepSeek models" { opencode.cmd models deepseek }
  Write-Check "OpenCode agents" { opencode.cmd agent list }
  Write-Check "OpenCode skills" { opencode.cmd debug skill }
}

if (-not $SkipObsidian) {
  Write-Check "Obsidian CLI" {
    obsidian version
    obsidian vaults verbose
    obsidian vault=docs vault info=path
  } -Optional
}

Write-Output "ai_doctor_completed=true"
