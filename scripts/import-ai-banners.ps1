param(
  [string]$Api = "https://ruyuan-diary-pools-api.supersymbreak.workers.dev/pools",
  [string]$GeneratedDir = "C:\Users\Administrator\.codex\generated_images\01a0841b-299f-7ad0-8427-cdac2c77fc52"
)

if (-not $env:RUYUAN_ADMIN_TOKEN) { $env:RUYUAN_ADMIN_TOKEN = Read-Host "Enter ADMIN_TOKEN" }
if (-not $env:RUYUAN_ADMIN_TOKEN) { throw "ADMIN_TOKEN is required" }

$nameOrder = @('绣衣天下','王侯秉德','东阁待贤','九门磔攘','云雨滂润','击金鸣鼓','却月凌风','壑林邀月','天封孤狼','天道不逾','奉天华盖','契阔谈宴','异才奇士','弓箭江东','弹剑酿花','弹香展骥','彀弓衔刃','形气复生','形谍成光','暮燕翻雷','桓桓先征','欺天罔地','深藏北斗','游说贤士','绮花隐豹','腾陵张胆','英徽弥亮','蛇蟒之蛰','长生之术','珠渊玉水','白日昭只','织囊画诗','金相玉质','铁弦千钧','风兴云蒸','谨司天英')

Add-Type -AssemblyName System.Drawing
$files = @(Get-ChildItem -LiteralPath $GeneratedDir -Filter 'exec-*.png' -File | Where-Object LastWriteTime -ge (Get-Date '2026-09-17 22:00') | Sort-Object LastWriteTime)
if ($files.Count -ne $nameOrder.Count) { throw "Expected $($nameOrder.Count) AI outputs, found $($files.Count)" }
$raw = (Invoke-WebRequest -Uri $Api -UseBasicParsing).Content
$rows = $raw | ConvertFrom-Json
$backup = Join-Path $env:TEMP ("ruyuan-pools-ai-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
[IO.File]::WriteAllText($backup, $raw, [Text.Encoding]::UTF8)
$encoder = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$headers = @{ Authorization = "Bearer $env:RUYUAN_ADMIN_TOKEN" }
$byName = @{}; foreach ($r in $rows) { $byName[$r.name] = $r }
$changed = 0

for ($i = 0; $i -lt $nameOrder.Count; $i++) {
  $name = $nameOrder[$i]; $row = $byName[$name]
  if (-not $row) { Write-Warning "$name not found"; continue }
  try {
    $src = [Drawing.Image]::FromFile($files[$i].FullName)
    $bmp = [Drawing.Bitmap]::new(1440, 440, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    # 去除 AI 输出常见的纯白/纯黑上下留边，再完整缩放到项目标准尺寸。
    $top = 0; $bottom = $src.Height - 1
    $isBorder = {
      param($y)
      $bright = 0; $dark = 0; $samples = 32
      for ($k = 0; $k -lt $samples; $k++) {
        $px = $src.GetPixel([int](($src.Width - 1) * $k / ($samples - 1)), $y)
        $v = ([int]$px.R + [int]$px.G + [int]$px.B) / 3
        if ($v -ge 245) { $bright++ }; if ($v -le 8) { $dark++ }
      }
      return (($bright -ge 30) -or ($dark -ge 30))
    }
    while ($top -lt [int]($src.Height * 0.15) -and (&$isBorder $top)) { $top++ }
    while ($bottom -gt [int]($src.Height * 0.85) -and (&$isBorder $bottom)) { $bottom-- }
    $cropH = [Math]::Max(1, $bottom - $top + 1)
    $g.DrawImage($src, [Drawing.Rectangle]::new(0, 0, 1440, 440), [Drawing.Rectangle]::new(0, $top, $src.Width, $cropH), [Drawing.GraphicsUnit]::Pixel)
    $g.Dispose(); $src.Dispose()
    $out = [IO.MemoryStream]::new(); $ep = [Drawing.Imaging.EncoderParameters]::new(1)
    $ep.Param[0] = [Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality, 95L)
    $bmp.Save($out, $encoder, $ep); $bmp.Dispose(); $ep.Dispose()
    $cover = 'data:image/jpeg;base64,' + [Convert]::ToBase64String($out.ToArray()); $out.Dispose()
    $upNames = @(); if ($row.upNames -is [array]) { $upNames = @($row.upNames) } elseif ($row.upNames -is [string] -and $row.upNames) { try { $p=$row.upNames|ConvertFrom-Json; if($p -is [array]){$upNames=@($p)} } catch {} }
    $payload = [ordered]@{id=$row.id;name=$row.name;type=$row.type;upNames=$upNames;cover=$cover;archived=[bool]$row.archived;createdAt=$row.createdAt}|ConvertTo-Json -Depth 10 -Compress
    Invoke-WebRequest -Uri $Api -Method Post -Headers $headers -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($payload)) -UseBasicParsing | Out-Null
    $changed++; Write-Host "$name updated"
  } catch { Write-Warning "$name failed: $($_.Exception.Message)" }
}
Write-Host "Done. Updated $changed AI banners. Backup: $backup"
