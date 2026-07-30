$ErrorActionPreference = "Stop"
. "$PSScriptRoot\OpenAICredential.ps1"

$key = Get-Clipboard -Raw
if (-not $key) {
    throw "The clipboard does not contain an OpenAI API key."
}

$normalized = $key.Trim()
if (-not $normalized.StartsWith("sk-")) {
    throw "The clipboard does not appear to contain an OpenAI API key."
}

Set-AAAgentJOpenAIKey -Key $normalized
Set-Clipboard -Value " "
Write-Output "Stored the Agent J OpenAI API key in Windows Credential Manager and cleared the clipboard."
