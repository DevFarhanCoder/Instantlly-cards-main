$ErrorActionPreference = 'Stop'
$esbuildPath = Join-Path -Path (Get-Location) -ChildPath 'node_modules\esbuild\esbuild.exe'
if (Test-Path $esbuildPath) {
  try {
    Unblock-File -Path $esbuildPath -ErrorAction Stop
    Write-Host "Unblocked esbuild at $esbuildPath"
  } catch {
    Write-Host "Could not unblock esbuild (continuing): $($_.Exception.Message)"
  }
}

cmd /c npm test
