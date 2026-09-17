param(
  [string]$Api = "https://ruyuan-diary-pools-api.supersymbreak.workers.dev/pools"
)

if (-not $env:RUYUAN_ADMIN_TOKEN) {
  $env:RUYUAN_ADMIN_TOKEN = Read-Host "Enter ADMIN_TOKEN"
}
if (-not $env:RUYUAN_ADMIN_TOKEN) { throw "ADMIN_TOKEN is required" }

Add-Type -AssemblyName System.Drawing
$raw = (Invoke-WebRequest -Uri $Api -UseBasicParsing).Content
$rows = $raw | ConvertFrom-Json
$backup = Join-Path $env:TEMP ("ruyuan-pools-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
[IO.File]::WriteAllText($backup, $raw, [Text.Encoding]::UTF8)
$encoder = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq "image/jpeg"
$headers = @{ Authorization = "Bearer $env:RUYUAN_ADMIN_TOKEN" }
$changed = 0

foreach ($row in $rows) {
  if (-not ($row.cover -is [string]) -or -not $row.cover.StartsWith("data:image/")) { continue }
  try {
    $upNames = @()
    if ($row.upNames -is [array]) { $upNames = @($row.upNames) }
    elseif ($row.upNames -is [string] -and $row.upNames) {
      try { $parsedNames = $row.upNames | ConvertFrom-Json; if ($parsedNames -is [array]) { $upNames = @($parsedNames) } } catch { $upNames = @() }
    }
    $bytes = [Convert]::FromBase64String(($row.cover -split ',', 2)[1])
    $ms = [IO.MemoryStream]::new($bytes)
    $src = [Drawing.Image]::FromStream($ms)
    $bmp = [Drawing.Bitmap]::new(1440, 440, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $drawW = [int][Math]::Round(440 * $src.Width / $src.Height)
    $g.DrawImage($src, [Drawing.Rectangle]::new(0, 0, $drawW, 440))
    $g.Dispose(); $src.Dispose(); $ms.Dispose()
    $out = [IO.MemoryStream]::new()
    $ep = [Drawing.Imaging.EncoderParameters]::new(1)
    $ep.Param[0] = [Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality, 95L)
    $bmp.Save($out, $encoder, $ep)
    $bmp.Dispose(); $ep.Dispose()
    $cover = "data:image/jpeg;base64," + [Convert]::ToBase64String($out.ToArray())
    $out.Dispose()
    $payload = [ordered]@{ id=$row.id; name=$row.name; type=$row.type; upNames=$upNames; cover=$cover; archived=[bool]$row.archived; createdAt=$row.createdAt } | ConvertTo-Json -Depth 10 -Compress
    Invoke-WebRequest -Uri $Api -Method Post -Headers $headers -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($payload)) -UseBasicParsing | Out-Null
    $changed++
    Write-Host "$($row.name) updated"
  } catch { Write-Warning "$($row.name) failed: $($_.Exception.Message)" }
}
Write-Host "Done. Updated $changed banners. Backup: $backup"
