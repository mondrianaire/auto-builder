// music_source.js -- S5 v3 (Windows SMTC backend).
// Queries the Windows System Media Transport Controls (SMTC) for the current
// media session via powershell.exe + WinRT projection. Apple Music for Windows
// (Microsoft Store preview) registers with SMTC like other media apps.
//
// Exports: getNowPlaying(): Promise<{title:string, artist:string} | null>.
//   Never rejects, never throws synchronously. Resolves to null on any error,
//   on non-Playing PlaybackStatus, or when there is no current SMTC session.
//
// Contract preserved verbatim from C-S4-S5:
//   - signature, Promise discipline, tab-delimited stdout parsing
//   - resolve-to-null on any error (empty stdout, non-zero exit, spawn throw)
//   - MUSIC_SOURCE_FIXTURE env-var test affordance from dev-002
//
// Required literal substrings (AA.S5.4 / MCA.TDIPD.2):
//   'GlobalSystemMediaTransportControlsSessionManager',
//   'Windows.Media.Control', 'TryGetMediaPropertiesAsync', 'PlaybackStatus'.

'use strict';

const { execFile } = require('child_process');

// PowerShell + WinRT script that queries SMTC for the current session.
// Built as concatenated single-quoted JS strings so that PowerShell's own
// backtick-escapes and dollar-sigils pass through verbatim without JS
// template-literal interpretation. Output: "<title>\t<artist>\n" on a live
// Playing session, empty stdout in every other case (no session, paused,
// stopped, or any thrown error swallowed by try/catch).
const PS_SCRIPT = [
  "$ErrorActionPreference = 'SilentlyContinue'",
  "try {",
  "  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]",
  "  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSession,Windows.Media.Control,ContentType=WindowsRuntime]",
  "  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]",
  "  Add-Type -AssemblyName System.Runtime.WindowsRuntime",
  // AsTask shim: find the IAsyncOperation<T> generic AsTask method.
  "  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })",
  "  function Await($op, $resType) {",
  "    $task = $asTaskGeneric.MakeGenericMethod($resType).Invoke($null, @($op))",
  "    $task.Wait(-1) | Out-Null",
  "    $task.Result",
  "  }",
  "  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])",
  "  if ($null -eq $mgr) { exit 0 }",
  "  $session = $mgr.GetCurrentSession()",
  "  if ($null -eq $session) { exit 0 }",
  "  $playback = $session.GetPlaybackInfo()",
  "  if ($playback.PlaybackStatus -ne [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing) { exit 0 }",
  "  $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])",
  "  if ($null -eq $props) { exit 0 }",
  "  $title = if ($props.Title) { $props.Title } else { '' }",
  "  $artist = if ($props.Artist) { $props.Artist } else { '' }",
  "  if ($title -eq '' -and $artist -eq '') { exit 0 }",
  "  Write-Output (\"{0}`t{1}\" -f $title, $artist)",
  "} catch {",
  "  exit 0",
  "}"
].join("\n");

function parseOutput(stdout) {
  if (stdout == null) return null;
  const s = String(stdout).replace(/\r/g, '').replace(/\n+$/, '');
  if (s.length === 0) return null;
  const idx = s.indexOf('\t');
  if (idx < 0) return null;
  const title = s.slice(0, idx);
  const artist = s.slice(idx + 1);
  if (!title && !artist) return null;
  return { title: title || '', artist: artist || '' };
}

function getNowPlaying() {
  return new Promise(function (resolve) {
    try {
      // Test-affordance preserved from dev-002 (mechanism-agnostic harness shim).
      // When MUSIC_SOURCE_FIXTURE is set, bypass the powershell.exe spawn and
      // parse the env-var directly. The PowerShell text remains in the source
      // above for static-grep assertions (MCA.TDIPD.2 / AA.S5.4).
      if (Object.prototype.hasOwnProperty.call(process.env, 'MUSIC_SOURCE_FIXTURE')) {
        const fixture = process.env.MUSIC_SOURCE_FIXTURE;
        resolve(parseOutput(fixture));
        return;
      }
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS_SCRIPT],
        { timeout: 4000, windowsHide: true },
        function (err, stdout) {
          if (err) { resolve(null); return; }
          resolve(parseOutput(stdout));
        }
      );
    } catch (_e) {
      resolve(null);
    }
  });
}

module.exports = { getNowPlaying, PS_SCRIPT };
