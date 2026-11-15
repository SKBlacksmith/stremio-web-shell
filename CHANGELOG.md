# Changelog

## 5.1.0-2

- Fix the server bundle download: the helper appended `.part` to a path that
  already had it, so the first start failed with ENOENT.
- Resolve package resources through `app.getAppPath()` so the shell also works
  when started with the system `electron` binary.
- Start on Wayland when the session provides it.

## 5.1.0-1

- Initial package: Stremio Web 5.1.0 in a thin Electron shell.
- Fixed UI port (11469) and streaming port (11470) to keep the client session
  and settings across restarts.
- Single-instance lock.
- Streaming server fetched at runtime from a pinned, checksum-verified URL.
