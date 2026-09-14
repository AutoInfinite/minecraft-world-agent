param([switch]$AcceptEula)
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
  npm.cmd test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  if ($AcceptEula) { node scripts/run-tests.mjs --accept-eula } else { node scripts/run-tests.mjs }
  exit $LASTEXITCODE
} finally { Pop-Location }
