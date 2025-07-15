# macOS yt-dlp Code Signature Fix

## Problem

When using a bundled yt-dlp binary in the Electron app on macOS, users encounter the error:

```
Failed to load Python shared library: code signature not valid for use in process:
mapping process and mapped file (non-platform) have different Team IDs
```

This happens because:

1. The yt-dlp binary is a PyInstaller package that extracts Python libraries at runtime
2. These extracted libraries are signed with a different Team ID than your app
3. macOS blocks the execution due to the Team ID mismatch

## Solution

The app now prioritizes using a system-installed yt-dlp over the bundled version:

1. **Primary**: Uses `/opt/homebrew/bin/yt-dlp` if available (installed via Homebrew)
2. **Fallback**: Uses the bundled yt-dlp binary if system version is not found
3. **Last Resort**: Falls back to `yt-dlp` in PATH

## User Requirements

For the best experience, users should install yt-dlp via Homebrew:

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install yt-dlp
brew install yt-dlp

# Verify installation
which yt-dlp  # Should show: /opt/homebrew/bin/yt-dlp
```

## Benefits

1. **No code signature issues**: System yt-dlp doesn't have Team ID conflicts
2. **Always up-to-date**: Users can update yt-dlp independently via `brew upgrade yt-dlp`
3. **Better performance**: No PyInstaller extraction overhead
4. **Fallback support**: Still works with bundled version if needed

## Technical Details

The implementation in `src/main.ts`:

- Checks for system yt-dlp at `/opt/homebrew/bin/yt-dlp` first
- Falls back to bundled version if not found
- Logs which version is being used for debugging
