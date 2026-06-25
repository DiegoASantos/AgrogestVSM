[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Title,

  [Parameter(Mandatory = $true)]
  [string]$Handoff
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$handoffPath = Resolve-Path (Join-Path $root $Handoff)

Push-Location $root
try {
  if (-not (Get-Command "opencode.cmd" -ErrorAction SilentlyContinue)) {
    throw "OpenCode no está disponible como opencode.cmd."
  }

  $prompt = @"
Realiza una revisión independiente de solo lectura.
Lee AGENTS.md, docs/index.md y el handoff: $Handoff
Revisa el diff actual relacionado con ese handoff.
No modifiques archivos. Devuelve el formato definido por tu agente.
"@

  Write-Output "review_title=$Title"
  Write-Output "review_handoff=$($handoffPath.Path)"
  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  & opencode.cmd run --agent deepseek-reviewer --title $Title $prompt
  $exitCode = $LASTEXITCODE
  $stopwatch.Stop()
  Write-Output "review_duration_seconds=$([math]::Round($stopwatch.Elapsed.TotalSeconds, 2))"

  if ($exitCode -ne 0) {
    throw "DeepSeek Reviewer terminó con código $exitCode."
  }

  $sessions = (
    & opencode.cmd session list -n 10 --format json | Out-String
  ) | ConvertFrom-Json
  $reviewSession = $sessions |
    Where-Object { $_.title -eq $Title } |
    Sort-Object created -Descending |
    Select-Object -First 1

  if ($null -ne $reviewSession) {
    $export = (
      & opencode.cmd export $reviewSession.id 2>$null | Out-String
    ) | ConvertFrom-Json
    $assistantMessages = @(
      $export.messages | Where-Object { $_.info.role -eq "assistant" }
    )
    $inputTokens = 0
    $outputTokens = 0
    $reasoningTokens = 0
    $cacheReadTokens = 0
    $reportedCost = 0

    foreach ($message in $assistantMessages) {
      $inputTokens += [double]$message.info.tokens.input
      $outputTokens += [double]$message.info.tokens.output
      $reasoningTokens += [double]$message.info.tokens.reasoning
      $cacheReadTokens += [double]$message.info.tokens.cache.read
      $reportedCost += [double]$message.info.cost
    }

    Write-Output "review_session_id=$($reviewSession.id)"
    Write-Output "review_input_tokens=$inputTokens"
    Write-Output "review_output_tokens=$outputTokens"
    Write-Output "review_reasoning_tokens=$reasoningTokens"
    Write-Output "review_cache_read_tokens=$cacheReadTokens"
    Write-Output "review_reported_cost_usd=$reportedCost"
  }
}
finally {
  Pop-Location
}
