param([switch]$AcceptEula)
$ErrorActionPreference = 'Stop'
if ($AcceptEula) { node "$PSScriptRoot/dev.mjs" start --accept-eula } else { node "$PSScriptRoot/dev.mjs" start }
exit $LASTEXITCODE
