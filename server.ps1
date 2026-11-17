$port = 8892
$root = "F:\Khet\งานส่วนตัว\mae-chawi-website"
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Output "Server listening on http://localhost:$port/ serving $root"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".svg"  = "image/svg+xml"
    ".mp4"  = "video/mp4"
    ".md"   = "text/markdown; charset=utf-8"
}

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
        $requestLine = $reader.ReadLine()
        if ($null -ne $requestLine) {
            while (($headerLine = $reader.ReadLine()) -ne "") {
                if ($null -eq $headerLine) { break }
            }
            $parts = $requestLine.Split(' ')
            $rawUrl = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
            $cleanPath = ($rawUrl -split '\?')[0]
            $urlPath = [System.Uri]::UnescapeDataString($cleanPath.TrimStart('/'))
            if ([string]::IsNullOrEmpty($urlPath)) {
                $urlPath = "index.html"
            }
            $filePath = Join-Path $root ($urlPath -replace '/', '\')
            if (Test-Path -LiteralPath $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                $body = [System.IO.File]::ReadAllBytes($filePath)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($body, 0, $body.Length)
            } else {
                $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
                $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($body, 0, $body.Length)
            }
        }
        $stream.Close()
        $client.Close()
    } catch {
        # Ignore transient socket disconnects
    }
}
