$ErrorActionPreference = "Stop"
. "$PSScriptRoot\DiscordCredential.ps1"

$token = (Get-Clipboard -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "The clipboard does not contain a Discord bot token."
}

try {
    Set-AACitationDiscordToken -Token $token
    Write-Output "Discord bot token saved in Windows Credential Manager."
}
finally {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Clipboard]::Clear()
    $token = $null
}
