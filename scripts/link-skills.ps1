# Link every skill (except deprecated/) into the Claude Code skills folder using
# directory junctions, so edits in this repo apply immediately. No admin needed.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\link-skills.ps1
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$dests = @("$env:USERPROFILE\.claude\skills", "$env:USERPROFILE\.agents\skills")

$skills = Get-ChildItem -Path (Join-Path $repo "skills") -Recurse -Filter SKILL.md |
  Where-Object { $_.FullName -notmatch '\\deprecated\\' } |
  ForEach-Object { $_.Directory }

foreach ($dest in $dests) {
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  foreach ($s in $skills) {
    $target = Join-Path $dest $s.Name
    if (Test-Path $target) {
      $item = Get-Item $target -Force
      if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { $item.Delete() }
      else { Write-Warning "Skipping $target : a real folder is already there"; continue }
    }
    New-Item -ItemType Junction -Path $target -Target $s.FullName | Out-Null
    Write-Host "linked $($s.Name) -> $($s.FullName)  ($dest)"
  }
}
