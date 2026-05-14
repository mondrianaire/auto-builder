#!/bin/sh
# CodePathMac entrypoint per C-S1-S3.
# Exec node against main.js, forwarding the four SDK CLI args verbatim.
exec /usr/bin/env node "$(dirname "$0")/main.js" "$@"
