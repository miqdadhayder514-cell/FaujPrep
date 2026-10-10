$ErrorActionPreference = 'Stop'

$appRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $appRoot '.env.local'
if (-not (Test-Path $envFile)) {
  throw "Could not find $envFile."
}

$urlLine = Get-Content $envFile | Where-Object { $_ -match '^\s*VITE_SUPABASE_URL\s*=' } | Select-Object -First 1
if (-not $urlLine -or $urlLine -notmatch '^\s*VITE_SUPABASE_URL\s*=\s*(.*?)\s*$') {
  throw 'VITE_SUPABASE_URL was not found in my-app/.env.local.'
}
$supabaseUrl = $Matches[1].Trim().Trim('"').Trim("'")
if (-not $supabaseUrl) {
  throw 'VITE_SUPABASE_URL is empty in my-app/.env.local.'
}

Write-Host 'Paste the replacement sb_secret_... key at the hidden prompt. No characters will appear.'
$secureKey = Read-Host 'Supabase secret key' -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $secretKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer).Trim().Trim('"').Trim("'")
  if (-not $secretKey.StartsWith('sb_secret_')) {
    throw 'This does not look like a new sb_secret_ key. Paste only the key value, without its label or quotes. Create one in Supabase Settings > API Keys; do not use the legacy service_role key.'
  }

  $env:SUPABASE_URL = $supabaseUrl
  $env:SUPABASE_SERVICE_ROLE_KEY = $secretKey
  Push-Location $appRoot
  try {
    & node scripts/upload-paid-notes.mjs
    if ($LASTEXITCODE -ne 0) {
      throw "The PDF uploader exited with code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
  if ($keyPointer) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
  }
  Remove-Variable secretKey, secureKey -ErrorAction SilentlyContinue
}