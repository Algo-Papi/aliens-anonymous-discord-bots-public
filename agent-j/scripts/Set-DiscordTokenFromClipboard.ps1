$ErrorActionPreference = "Stop"
. "$PSScriptRoot\DiscordCredential.ps1"

$token = Get-Clipboard -Raw
if (-not $token) {
    throw "The clipboard does not contain a token."
}

Set-AAAgentJDiscordToken -Token $token.Trim()
Set-Clipboard -Value " "
Write-Output "Stored the Agent J Discord token in Windows Credential Manager."
