if (-not ("AgentJOpenAICredential.NativeMethods" -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace AgentJOpenAICredential {
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

$script:OpenAICredentialTarget = "MIB Discord Bot Suite - Agent J OpenAI Key"

function Set-AAAgentJOpenAIKey {
    param([Parameter(Mandatory = $true)][string]$Key)

    $keyBytes = [Text.Encoding]::Unicode.GetBytes($Key)
    $blob = [Runtime.InteropServices.Marshal]::AllocCoTaskMem($keyBytes.Length)
    try {
        [Runtime.InteropServices.Marshal]::Copy(
            $keyBytes,
            0,
            $blob,
            $keyBytes.Length
        )

        $credential = New-Object AgentJOpenAICredential.Credential
        $credential.Type = 1
        $credential.TargetName = $script:OpenAICredentialTarget
        $credential.CredentialBlobSize = $keyBytes.Length
        $credential.CredentialBlob = $blob
        $credential.Persist = 2
        $credential.UserName = "openai_api_key"

        if (-not [AgentJOpenAICredential.NativeMethods]::CredWrite(
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

function Get-AAAgentJOpenAIKey {
    $credentialPtr = [IntPtr]::Zero
    if (-not [AgentJOpenAICredential.NativeMethods]::CredRead(
        $script:OpenAICredentialTarget,
        1,
        0,
        [ref]$credentialPtr
    )) {
        $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        throw "Agent J OpenAI API key is not stored (Win32 error $code)."
    }

    try {
        $credential = [Runtime.InteropServices.Marshal]::PtrToStructure(
            $credentialPtr,
            [type][AgentJOpenAICredential.Credential]
        )
        if ($credential.CredentialBlobSize -eq 0) {
            return ""
        }

        $keyBytes = New-Object byte[] $credential.CredentialBlobSize
        [Runtime.InteropServices.Marshal]::Copy(
            $credential.CredentialBlob,
            $keyBytes,
            0,
            $credential.CredentialBlobSize
        )
        return [Text.Encoding]::Unicode.GetString($keyBytes)
    }
    finally {
        if ($credentialPtr -ne [IntPtr]::Zero) {
            [AgentJOpenAICredential.NativeMethods]::CredFree($credentialPtr)
        }
    }
}
