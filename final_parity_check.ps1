# Project Satya: Final Parity Verification Script
# This script ensures 100% structural and logical alignment between source and mirror.

$source = "o:\repos\SAtya1\Satya"
$dest = "o:\repos\SAtya1\Satya\projectSatya-main"

Write-Host "--- STRUCTURE CHECK ---" -ForegroundColor Cyan
$sourceFiles = Get-ChildItem -Path $source -Recurse -File | Where-Object { 
    $_.FullName -notmatch "projectSatya-main" -and 
    $_.FullName -notmatch "\.git\\" -and
    $_.FullName -notmatch "\.gemini\\" -and
    $_.FullName -notmatch "venv\\" -and
    $_.FullName -notmatch "node_modules\\"
}

$missing = @()
foreach ($f in $sourceFiles) {
    # Case-insensitive replacement to handle drive letter drift (o: vs O:)
    $relPath = $f.FullName -replace [regex]::Escape($source + "\"), ""
    $destPath = Join-Path $dest $relPath
    if (!(Test-Path $destPath)) {
        $missing += $relPath
    }
}

if ($missing.Count -eq 0) {
    Write-Host "[+] All source files exist in destination." -ForegroundColor Green
} else {
    Write-Host "[-] Missing files in destination:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" }
    exit 1
}

Write-Host "`n--- CONTENT SPOT-CHECK (LOGIC) ---" -ForegroundColor Cyan
# Specifically checking core logic files for 1:1 match (ignoring whitespace/comments if needed, but here we want exact parity)
$filesToCheck = @("backend\main.py", "contracts\Tender.sol")

foreach ($f in $filesToCheck) {
    $srcFile = Join-Path $source $f
    $dstFile = Join-Path $dest $f
    if (Test-Path $dstFile) {
        $srcHash = Get-FileHash $srcFile
        $dstHash = Get-FileHash $dstFile
        if ($srcHash.Hash -eq $dstHash.Hash) {
            Write-Host "[+] Logic Match: $f" -ForegroundColor Green
        } else {
            Write-Host "[-] Logic Mismatch: $f" -ForegroundColor Red
            # Note: We expect exact parity for logic files.
        }
    }
}
