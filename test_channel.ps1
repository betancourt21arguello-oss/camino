try {
    $r = Invoke-WebRequest -Uri 'https://www.youtube.com/@Cathopray_' -UseBasicParsing
    Write-Host "Status: $($r.StatusCode)"
    $content = $r.Content
    
    # Look for RSS feed links
    $rssMatches = [regex]::Matches($content, 'href="([^"]*feeds[^"]*)"')
    foreach ($m in $rssMatches) {
        Write-Host "RSS link: $($m.Groups[1].Value)"
    }
    
    # Look for channel ID in various formats
    $patterns = @(
        'channelId["\s:]+([A-Za-z0-9_-]+)',
        '"channelId"\s*:\s*"([^"]+)"',
        'channel_id=([A-Za-z0-9_-]+)',
        '/channel/([A-Za-z0-9_-]+)'
    )
    
    foreach ($pattern in $patterns) {
        $matches = [regex]::Matches($content, $pattern)
        foreach ($m in $matches) {
            Write-Host "Found ($pattern): $($m.Groups[1].Value)"
        }
    }
    
    if ($rssMatches.Count -eq 0) {
        Write-Host "No RSS links found"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
