Add-Type -AssemblyName System.Drawing
$imgPath = "c:\Users\eders\Desktop\MCL\mcl-piloto-classe-ii\public\icons\mcl-logo.png"
$outPath192 = "c:\Users\eders\Desktop\MCL\mcl-piloto-classe-ii\public\icons\icon-192.png"
$outPath512 = "c:\Users\eders\Desktop\MCL\mcl-piloto-classe-ii\public\icons\icon-512.png"

$img = [System.Drawing.Image]::FromFile($imgPath)

function Save-SquareImage($bmp, $outPath, $targetSize) {
    $outBmp = New-Object System.Drawing.Bitmap $targetSize, $targetSize
    $outBmp.MakeTransparent()
    $g = [System.Drawing.Graphics]::FromImage($outBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $ratio = [Math]::Min($targetSize / $bmp.Width, $targetSize / $bmp.Height)
    $w = $bmp.Width * $ratio
    $h = $bmp.Height * $ratio
    $x = ($targetSize - $w) / 2
    $y = ($targetSize - $h) / 2
    
    $g.DrawImage($bmp, [float]$x, [float]$y, [float]$w, [float]$h)
    $outBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $outBmp.Dispose()
}

Save-SquareImage $img $outPath192 192
Save-SquareImage $img $outPath512 512
$img.Dispose()
