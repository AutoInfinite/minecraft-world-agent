$ErrorActionPreference = 'Stop'
node "$PSScriptRoot/dev.mjs" setup
exit $LASTEXITCODE
