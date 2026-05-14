// music_source.js — S5
// Queries Apple Music.app for the current track via osascript.
// Exports getNowPlaying(): Promise<{title:string, artist:string} | null>.
// Never rejects, never throws synchronously.

'use strict';

const { execFile } = require('child_process');

// AppleScript: print "title\tartist" when player_state is 'playing', else print empty.
// Required literal substrings: 'application "Music"', 'player state',
// 'name of current track', 'artist of current track'.
const APPLESCRIPT = [
  'tell application "Music"',
  '  if it is running then',
  '    if player state is playing then',
  '      set t to name of current track',
  '      set a to artist of current track',
  '      return t & tab & a',
  '    else',
  '      return ""',
  '    end if',
  '  else',
  '    return ""',
  '  end if',
  'end tell'
].join('\n');

function parseOutput(stdout) {
  if (stdout == null) return null;
  const s = String(stdout).replace(/\r/g, '').replace(/\n+$/, '');
  if (s.length === 0) return null;
  const idx = s.indexOf('\t');
  if (idx < 0) return null;
  const title = s.slice(0, idx);
  const artist = s.slice(idx + 1);
  if (!title) return null;
  return { title, artist };
}

function getNowPlaying() {
  return new Promise(function (resolve) {
    try {
      // Test-affordance: when MUSIC_SOURCE_FIXTURE is set, bypass osascript and
      // parse it directly. The AppleScript text remains in the source above
      // for static-grep assertions (MCA.TDIPD.2 / AA.S5.4).
      if (Object.prototype.hasOwnProperty.call(process.env, 'MUSIC_SOURCE_FIXTURE')) {
        const fixture = process.env.MUSIC_SOURCE_FIXTURE;
        resolve(parseOutput(fixture));
        return;
      }
      execFile('osascript', ['-e', APPLESCRIPT], { timeout: 5000 }, function (err, stdout) {
        if (err) { resolve(null); return; }
        resolve(parseOutput(stdout));
      });
    } catch (_e) {
      resolve(null);
    }
  });
}

module.exports = { getNowPlaying, APPLESCRIPT };
