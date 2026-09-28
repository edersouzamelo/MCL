param(
  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 8)]
  [int]$MonitorId,
  [string]$BaseUrl = "https://mcl-one.vercel.app",
  [int]$WindowX = 0,
  [int]$WindowY = 0
)

$ErrorActionPreference = "Stop"
$target = "$($BaseUrl.TrimEnd('/'))/grupamento/monitor/$MonitorId"
$profile = Join-Path $env:LOCALAPPDATA "MCL\monitor-$MonitorId"
New-Item -ItemType Directory -Force -Path $profile | Out-Null

$candidates = @(
  @{ Path = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"; Kind = "chromium" },
  @{ Path = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"; Kind = "chromium" },
  @{ Path = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"; Kind = "chromium" },
  @{ Path = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"; Kind = "chromium" },
  @{ Path = "$env:ProgramFiles\Mozilla Firefox\firefox.exe"; Kind = "firefox" }
)
$browser = $candidates | Where-Object { Test-Path $_.Path } | Select-Object -First 1
if (-not $browser) { throw "Instale Edge, Chrome ou Firefox antes de configurar o monitor." }

if ($browser.Kind -eq "firefox") {
  $browserArgs = "-no-remote -profile `"$profile`" --kiosk `"$target`""
} else {
  $browserArgs = "--user-data-dir=`"$profile`" --no-first-run --start-fullscreen --window-position=$WindowX,$WindowY --app=`"$target`""
}

$taskName = "MCL Monitor $MonitorId"
$action = New-ScheduledTaskAction -Execute $browser.Path -Argument $browserArgs
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description "Exibe o monitor $MonitorId do MCL no notebook HDMI ao iniciar a sessao." -Force | Out-Null
Start-Process -FilePath $browser.Path -ArgumentList $browserArgs
Write-Host "Monitor $MonitorId configurado. Nesta primeira abertura, entre no MCL e clique em 'Vincular notebook' no rodape do monitor."
Write-Host "A tarefa '$taskName' abrira a mesma pagina e o mesmo perfil automaticamente nos proximos logons."
