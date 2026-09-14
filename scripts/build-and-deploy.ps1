$ErrorActionPreference = 'Stop'
node "$PSScriptRoot/dev.mjs" deploy
exit $LASTEXITCODE
