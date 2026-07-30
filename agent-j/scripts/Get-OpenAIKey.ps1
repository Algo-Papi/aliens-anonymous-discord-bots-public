$ErrorActionPreference = "Stop"
. "$PSScriptRoot\OpenAICredential.ps1"

Write-Output (Get-AAAgentJOpenAIKey)
