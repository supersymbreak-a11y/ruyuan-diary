param(
  [string]$GeneratedDir = "C:\Users\Administrator\.codex\generated_images\01a0841b-299f-7ad0-8427-cdac2c77fc52",
  [string]$TargetDir = "E:\yuan_diary\public\covers\ai"
)

$names = ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('57uj6KGj5aSp5LiLfOeOi+S+r+enieW+t3zkuJzpmIHlvoXotKR85Lmd6Zeo56OU5pSYfOS6kembqOa7gua2pnzlh7vph5HpuKPpvJN85Y205pyI5YeM6aOOfOWjkeael+mCgOaciHzlpKnlsIHlraTni7x85aSp6YGT5LiN6YC+fOWlieWkqeWNjueblnzlpZHpmJTosIjlrrR85byC5omN5aWH5aOrfOW8k+eureaxn+S4nHzlvLnliZHphb/oirF85by56aaZ5bGV6aqlfOW9gOW8k+ihlOWIg3zlvaLmsJTlpI3nlJ985b2i6LCN5oiQ5YWJfOaarueHlee/u+mbt3zmoZPmoZPlhYjlvoF85qy65aSp572U5ZywfOa3seiXj+WMl+aWl3zmuLjor7TotKTlo6t857uu6Iqx6ZqQ6LG5fOiFvumZteW8oOiDhnzoi7Hlvr3lvKXkuq586JuH6J+S5LmL6JuwfOmVv+eUn+S5i+acr3znj6DmuIrnjonmsLR855m95pel5pit5Y+qfOe7h+WbiueUu+ivl3zph5Hnm7jnjonotKh86ZOB5bym5Y2D6ZKnfOmjjuWFtOS6keiSuHzosKjlj7jlpKnoi7E='))).Split('|')
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
$files = @(Get-ChildItem -LiteralPath $GeneratedDir -Filter 'exec-*.png' -File | Where-Object { $_.LastWriteTime -ge (Get-Date '2026-09-17 22:00') -and $_.LastWriteTime -lt (Get-Date '2026-09-18 00:15') } | Sort-Object LastWriteTime)
if ($files.Count -ne $names.Count) { throw "Expected $($names.Count) generated images, found $($files.Count)" }
for ($i=0; $i -lt $names.Count; $i++) {
  Copy-Item -LiteralPath $files[$i].FullName -Destination (Join-Path $TargetDir ($names[$i] + '.png')) -Force
  Write-Host "$($names[$i]) copied"
}
Write-Host "Done. Static AI banners installed in $TargetDir"
