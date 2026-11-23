# Zip one skill folder for upload to claude.ai / the Claude desktop app.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\package-skill.ps1 active-reader
param([Parameter(Mandatory = $true)][string]$Name)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$skill = Get-ChildItem -Path (Join-Path $repo "skills") -Recurse -Directory -Filter $Name |
  Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") } | Select-Object -First 1
if (-not $skill) { throw "No skill folder named '$Name' with a SKILL.md under skills\" }
$dist = Join-Path $repo "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$zip = Join-Path $dist "$Name.zip"
if (Test-Path $zip) { Remove-Item $zip }
# Zip the folder itself so the archive contains <name>/SKILL.md
Compress-Archive -Path $skill.FullName -DestinationPath $zip
Write-Host $zip
