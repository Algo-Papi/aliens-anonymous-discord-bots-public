$ErrorActionPreference = "Stop"
. "$PSScriptRoot\DiscordCredential.ps1"

Write-Output (Get-AACitationDiscordToken)
