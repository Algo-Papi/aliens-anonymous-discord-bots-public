$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node.exe -ErrorAction Stop).Source
$logDirectory = Join-Path $projectRoot "logs"
$logFile = Join-Path $logDirectory "citation-bureau.log"

if (-not (Test-Path -LiteralPath $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory | Out-Null
}

Set-Location -LiteralPath $projectRoot
& $node ".\src\index.js" *>> $logFile
exit $LASTEXITCODE
