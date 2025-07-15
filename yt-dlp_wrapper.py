#!/usr/bin/env python3
"""
yt-dlp wrapper script for Downlodr
This avoids code signing conflicts by using yt-dlp as a Python module
"""

import sys
try:
    from yt_dlp import main
    if __name__ == '__main__':
        main()
except ImportError:
    print("Error: yt-dlp not installed. Please install with: pip install yt-dlp", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error running yt-dlp: {e}", file=sys.stderr)
    sys.exit(1) 