# Apple Music Now Playing — Stream Dock VSD N4 Pro Touch Bar Plugin

Displays the currently playing song title and artist from the Apple Music
Desktop Application on the Touch Bar of your MiraboxSpace Stream Dock VSD N4
Pro. The rendered text occupies the Touch Bar slot of the active scene.

## Requirements

- Windows 10 or newer
- MiraboxSpace **Stream Dock** desktop application, version **3.10.188.226**
  or newer (this is the first host version that bundles the Node.js 20
  runtime this plugin uses).
- MiraboxSpace **Stream Dock VSD N4 Pro** hardware
- **Apple Music** Desktop Application (Microsoft Store) installed and
  signed in.

## Install

1. **Close** the Stream Dock desktop application if it is running.
2. **Copy** the entire `com.autobuilder.applemusic-now-playing.sdPlugin`
   folder into:

   ```
   %APPDATA%\HotSpot\StreamDock\plugins
   ```

   The full path on a default install is:

   ```
   C:\Users\<your-username>\AppData\Roaming\HotSpot\StreamDock\plugins
   ```

3. **Re-open** Stream Dock. The host will load the plugin on startup.

If you installed from the zip distribution, extract it first; the
`.sdPlugin` folder is at the root of the archive.

## Activate

1. In Stream Dock, open the device scene you want to use.
2. Switch the device to **Touchbar Mode** (swipe up/down on the N4 Pro's
   touch bar or use the host UI's mode selector).
3. Drag the **Apple Music Now Playing** action from the action list onto
   the Touch Bar slot of the scene.
4. Start playing a track in Apple Music. The title and artist appear on
   the Touch Bar. When you change tracks, the bar updates within a few
   seconds.

When Apple Music is not running, the Touch Bar shows `Not Playing`.

## Troubleshooting

- **Touch Bar stays on `Not Playing`** when Apple Music is playing — the
  plugin's PowerShell sidecar may have been blocked by Windows Execution
  Policy. The plugin uses `-ExecutionPolicy Bypass` for the bundled script,
  which works under default user-mode policies. If your organization
  enforces a system-wide AllSigned/Restricted policy via Group Policy, the
  sidecar will not run.
- **Plugin doesn't appear in the action list** — confirm the `.sdPlugin`
  folder is directly inside `HotSpot\StreamDock\plugins` (not nested inside
  another folder), and that you fully quit and re-opened Stream Dock.
- **Logs** — Stream Dock's debug page at `http://localhost:23519/` shows the
  plugin's `logMessage` output.

## Privacy

The plugin reads track metadata locally via the Windows System Media
Transport Controls API. It does not make any network requests, does not
contact Apple's servers, does not require an Apple ID, and does not send
telemetry anywhere.

## Uninstall

Close Stream Dock, delete the `com.autobuilder.applemusic-now-playing.sdPlugin`
folder from `%APPDATA%\HotSpot\StreamDock\plugins`, and re-open Stream Dock.

## Known limitations

This build was produced with three values that the architecture could not
verify against canonical published documentation:

1. **Apple Music's exact SMTC `SourceAppUserModelId`** — Apple does not
   publish the Microsoft Store package family name. The plugin matches any
   session whose `SourceAppUserModelId` contains the substring `AppleMusic`
   (case-insensitive). If Apple ships a build that uses a different
   identifier, the plugin will read `Not Playing` even when music is
   playing; this is the failure mode to expect.

2. **Exact Touch Bar manifest field name** — the canonical Stream Dock SDK
   manifest documentation enumerates the controllers `Keypad`, `Information`,
   `SecondaryScreen`, and `Knob`. It does not enumerate `TouchBar`. The
   plugin's manifest declares `Controllers: ["TouchBar", "Information"]`,
   `Type: "TouchBar"`, and `TargetDevice: "streamdock-n4-pro"` — the
   choice of literal token follows the VSDinside community porting guide
   and MiraboxSpace's own example plugin repository. If the live host
   rejects this manifest field, the plugin may fail to load or appear in
   the action list but not the Touch Bar.

3. **Exact host-protocol message for Touch Bar text** — the renderer sends
   both `setTitle` and `setFeedback` events, since the canonical SDK does
   not document which event the N4 Pro Touch Bar Action accepts. The host
   is documented to silently ignore unrecognized payloads on a per-Action
   basis, so this dual-send is intended to be safe.

If you observe a problem caused by any of the above, the plugin's
`logMessage` channel and the debug URL above will show diagnostic output.
