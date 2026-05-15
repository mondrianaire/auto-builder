# smtc-reader.ps1 — System Media Transport Controls reader for Apple Music
#
# Reads the currently playing Title and Artist from the Apple Music Desktop
# Application on Windows via the Windows.Media.Control WinRT API.
#
# Canonical references (probe-ip2/findings.json):
#   C.2.1  Microsoft Learn: Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager
#   C.2.2  9to5Mac (2023-04-25): "Windows media controls ... now work" for Apple Music on Windows
#   C.2.3  github.com/DubyaDude/WindowsMediaController — reference impl pattern
#
# Apple Music's exact SourceAppUserModelId / Package Family Name is
# external_source_unreachable (sections-v1.json IP2.A3). We substring-match
# 'AppleMusic' case-insensitively against each session's SourceAppUserModelId
# and pick the first match. If no match exists, emit a null TrackState.
#
# Output protocol:
#   One JSON object per line on stdout. Fields:
#     { "title": str, "artist": str, "isPlaying": bool, "sourceAppId": str }
#   On idle (no Apple Music session): { "track": null }

# ---------------------------------------------------------------------------
# WinRT assembly load — per Microsoft Learn C.2.1 and the WindowsMediaController
# reference (C.2.3). This is the documented PowerShell-to-WinRT pattern.
# ---------------------------------------------------------------------------
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
[void][Windows.Foundation.IAsyncOperation`1,Windows.Foundation,ContentType=WindowsRuntime]

# ---------------------------------------------------------------------------
# AwaitOperation — converts a WinRT IAsyncOperation<T> into a synchronous call.
# Pattern from the documented PowerShell-WinRT bridge (community reference).
# ---------------------------------------------------------------------------
function Await($WinRtTask, $ResultType) {
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
    Select-Object -First 1
  $netTask = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  return $netTask.Result
}

function Emit-Json($obj) {
  $json = $obj | ConvertTo-Json -Compress -Depth 5
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

function Get-AppleMusicSession($manager) {
  $sessions = $manager.GetSessions()
  foreach ($s in $sessions) {
    $appId = $null
    try { $appId = $s.SourceAppUserModelId } catch { $appId = $null }
    if ($appId -and ($appId -match 'AppleMusic')) {
      return $s
    }
  }
  return $null
}

function Read-And-Emit($session) {
  if ($null -eq $session) {
    Emit-Json @{ track = $null }
    return
  }
  try {
    $propsTask = $session.TryGetMediaPropertiesAsync()
    $props = Await $propsTask ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $playback = $session.GetPlaybackInfo()
    $isPlaying = ($playback.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing)
    $title = if ($props.Title) { [string]$props.Title } else { '' }
    $artist = if ($props.Artist) { [string]$props.Artist } else { '' }
    $appId = if ($session.SourceAppUserModelId) { [string]$session.SourceAppUserModelId } else { '' }

    if ([string]::IsNullOrWhiteSpace($title) -and [string]::IsNullOrWhiteSpace($artist)) {
      Emit-Json @{ track = $null }
      return
    }

    Emit-Json @{
      title       = $title
      artist      = $artist
      isPlaying   = [bool]$isPlaying
      sourceAppId = $appId
    }
  } catch {
    # Don't crash on transient WinRT errors; emit idle and continue.
    Emit-Json @{ track = $null; error = $_.Exception.Message }
  }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
try {
  $managerTask = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
  $manager = Await $managerTask ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
} catch {
  Emit-Json @{ track = $null; fatal = "SMTC RequestAsync failed: $($_.Exception.Message)" }
  exit 1
}

# Find Apple Music session
$current = Get-AppleMusicSession $manager
Read-And-Emit $current

# Subscribe to session events per C.2.1
# CurrentSessionChanged and SessionsChanged on the manager — re-pick Apple
# Music session and re-emit.
# MediaPropertiesChanged and PlaybackInfoChanged on the selected session —
# re-read properties and emit.

$onSessionsChanged = {
  $current = Get-AppleMusicSession $manager
  Read-And-Emit $current
}

Register-ObjectEvent -InputObject $manager -EventName 'SessionsChanged' -Action $onSessionsChanged | Out-Null
Register-ObjectEvent -InputObject $manager -EventName 'CurrentSessionChanged' -Action $onSessionsChanged | Out-Null

$attachedEvents = @()
function Attach-SessionEvents($session) {
  if ($null -eq $session) { return }
  $h1 = Register-ObjectEvent -InputObject $session -EventName 'MediaPropertiesChanged' -Action { Read-And-Emit $current }
  $h2 = Register-ObjectEvent -InputObject $session -EventName 'PlaybackInfoChanged' -Action { Read-And-Emit $current }
  $script:attachedEvents += $h1
  $script:attachedEvents += $h2
}
Attach-SessionEvents $current

# Stay alive — PowerShell does not have a built-in pump for WinRT events;
# Register-ObjectEvent enqueues them on the runspace event queue and we
# need a wait loop to keep the process alive. Wait-Event is the documented
# pattern; we also re-poll every 5s as a safety net in case event delivery
# stalls (the documented event-driven path remains primary).
while ($true) {
  Wait-Event -Timeout 5 | Out-Null
  # Periodic safety re-read in case events were missed
  $current = Get-AppleMusicSession $manager
  # No emit here — events drive emission; this only refreshes the session ref.
}
