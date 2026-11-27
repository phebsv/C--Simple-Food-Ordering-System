[CmdletBinding()]
param(
    [string]$SourcePath = (Join-Path $PSScriptRoot 'db.json'),
    [string]$TemplatePath = (Join-Path $PSScriptRoot '002-import.template.sql'),
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
    throw "Legacy JSON file not found: $SourcePath"
}
if (-not (Test-Path -LiteralPath $TemplatePath -PathType Leaf)) {
    throw "Import SQL template not found: $TemplatePath"
}

$sourceJson = [System.IO.File]::ReadAllText(
    (Resolve-Path -LiteralPath $SourcePath).Path,
    [System.Text.UTF8Encoding]::new($false, $true))
try {
    $legacyData = ConvertFrom-Json -InputObject $sourceJson -AsHashtable
}
catch {
    throw "Legacy JSON is not valid JSON: $($_.Exception.Message)"
}

if ($legacyData -isnot [System.Collections.IDictionary] -or
    -not $legacyData.Contains('users') -or
    -not $legacyData.Contains('menu') -or
    -not $legacyData.Contains('orders')) {
    throw 'Legacy JSON must contain users, menu, and orders collections.'
}

$placeholder = '__NOMNOM_SOURCE_HEX__'
$template = [System.IO.File]::ReadAllText(
    (Resolve-Path -LiteralPath $TemplatePath).Path,
    [System.Text.UTF8Encoding]::new($false, $true))
if (-not $template.Contains($placeholder, [System.StringComparison]::Ordinal)) {
    throw "Import template does not contain the expected source placeholder."
}

$sourceHex = [Convert]::ToHexString([System.Text.Encoding]::UTF8.GetBytes($sourceJson))
$sql = $template.Replace($placeholder, $sourceHex)

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $fileName = 'nomnom-import-{0}.sql' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
    $OutputPath = Join-Path ([System.IO.Path]::GetTempPath()) $fileName
}

$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($resolvedOutputPath)) | Out-Null
[System.IO.File]::WriteAllText(
    $resolvedOutputPath,
    $sql,
    [System.Text.UTF8Encoding]::new($false))

Write-Output $resolvedOutputPath
