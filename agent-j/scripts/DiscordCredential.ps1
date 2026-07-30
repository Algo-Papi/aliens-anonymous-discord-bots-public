if (-not ("AgentJDiscordCredential.NativeMethods" -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace AgentJDiscordCredential {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct Credential {
        public UInt32 Flags;
        public UInt32 Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public UInt32 CredentialBlobSize;
        public IntPtr CredentialBlob;
        public UInt32 Persist;
        public UInt32 AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static class NativeMethods {
        [DllImport("advapi32.dll", EntryPoint = "CredWriteW",
            CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredWrite(
            ref Credential credential,
            UInt32 flags);

        [DllImport("advapi32.dll", EntryPoint = "CredReadW",
            CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredRead(
            string target,
            UInt32 type,
            UInt32 reservedFlag,
            out IntPtr credentialPtr);

        [DllImport("advapi32.dll", SetLastError = true)]
        public static extern void CredFree(IntPtr credentialPtr);
    }
}
"@
}

$script:CredentialTarget = "MIB Discord Bot Suite - Agent J Token"

function Set-AAAgentJDiscordToken {
    param([Parameter(Mandatory = $true)][string]$Token)

    $tokenBytes = [Text.Encoding]::Unicode.GetBytes($Token)
    $blob = [Runtime.InteropServices.Marshal]::AllocCoTaskMem($tokenBytes.Length)
    try {
        [Runtime.InteropServices.Marshal]::Copy(
            $tokenBytes,
            0,
            $blob,
            $tokenBytes.Length
        )

        $credential = New-Object AgentJDiscordCredential.Credential
        $credential.Type = 1
        $credential.TargetName = $script:CredentialTarget
        $credential.CredentialBlobSize = $tokenBytes.Length
        $credential.CredentialBlob = $blob
        $credential.Persist = 2
        $credential.UserName = "discord_bot_token"

        if (-not [AgentJDiscordCredential.NativeMethods]::CredWrite(
            [ref]$credential,
            0
        )) {
            $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
            throw "CredWrite failed with Win32 error $code."
        }
    }
    finally {
        if ($blob -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeCoTaskMemUnicode($blob)
        }
    }
}

function Get-AAAgentJDiscordToken {
    $credentialPtr = [IntPtr]::Zero
    if (-not [AgentJDiscordCredential.NativeMethods]::CredRead(
        $script:CredentialTarget,
        1,
        0,
        [ref]$credentialPtr
    )) {
        $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        throw "Agent J Discord bot token is not stored (Win32 error $code)."
    }

    try {
        $credential = [Runtime.InteropServices.Marshal]::PtrToStructure(
            $credentialPtr,
            [type][AgentJDiscordCredential.Credential]
        )
        if ($credential.CredentialBlobSize -eq 0) {
            return ""
        }

        $tokenBytes = New-Object byte[] $credential.CredentialBlobSize
        [Runtime.InteropServices.Marshal]::Copy(
            $credential.CredentialBlob,
            $tokenBytes,
            0,
            $credential.CredentialBlobSize
        )
        return [Text.Encoding]::Unicode.GetString($tokenBytes)
    }
    finally {
        if ($credentialPtr -ne [IntPtr]::Zero) {
            [AgentJDiscordCredential.NativeMethods]::CredFree($credentialPtr)
        }
    }
}
