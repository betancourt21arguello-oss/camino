$urls = @(
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCSgJ9Ppudkzs9cD259tjMQw',
    'https://youtube.com/feeds/videos.xml?channel_id=UCSgJ9Ppudkzs9cD259tjMQw',
    'https://www.youtube.com/feeds/videos.xml?user=Cathopray_'
)

$headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

foreach ($url in $urls) {
    Write-Host "`nTesting: $url"
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -Headers $headers -MaximumRedirection 5
        Write-Host "Status: $($r.StatusCode)"
        Write-Host $r.Content.Substring(0, [Math]::Min(300, $r.Content.Length))
    } catch {
        $status = "Unknown"
        if ($_.Exception.Response) {
            $status = $_.Exception.Response.StatusCode.value__
        }
        Write-Host "Error: $status - $($_.Exception.Message)"
    }
}
