$ErrorActionPreference = "Stop"

$mediaRoot = (Resolve-Path -LiteralPath "public\media").Path
$storageRoot = "ss:///training-media/home-guides/v2"
$cacheControl = "public, max-age=31536000, immutable"
$clips = @(
  "huong-dan-giam-khao-vor",
  "huong-dan-giam-khao-dme",
  "huong-dan-giam-khao-ads-b",
  "huong-dan-thi-sinh-vor",
  "huong-dan-thi-sinh-dme",
  "huong-dan-thi-sinh-ads-b"
)

foreach ($clip in $clips) {
  foreach ($extension in @("mp4", "webp", "mp3")) {
    $fileName = "$clip.$extension"
    $source = Join-Path $mediaRoot $fileName
    if (-not (Test-Path -LiteralPath $source)) {
      if ($extension -eq "mp3") {
        # File lồng tiếng mp3 là tùy chọn, bỏ qua nếu chưa có
        continue
      }
      throw "Missing generated media file: $source"
    }

    & npx supabase storage cp $source "$storageRoot/$fileName" `
      --linked `
      --experimental `
      --cache-control $cacheControl

    if ($LASTEXITCODE -ne 0) {
      throw "Supabase upload failed: $fileName"
    }
  }
}

Write-Output "Uploaded 6 clips and 6 posters to $storageRoot"
