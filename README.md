# stremio-web-shell

A thin Electron shell around the Stremio web client, packaged for Arch Linux.

It runs the official Stremio web application (v5) locally and talks to a
Stremio streaming server that the shell manages itself. There is no bundled
Chromium and no compiled native code: the package depends on the `electron`
package from the Arch repositories, so the browser engine is updated by
`pacman -Syu` like everything else.

## What it does

- serves the bundled Stremio web client on `http://127.0.0.1:11469`
- starts the Stremio streaming server on `http://127.0.0.1:11470`
- keeps both ports fixed, so the web client keeps its login and settings
  between restarts
- runs a single instance only: launching it again focuses the open window

## Installation

```sh
# /etc/pacman.conf
[stremio-web-shell]
SigLevel = Optional TrustAll
Server = https://skblacksmith.github.io/stremio-web-shell/$arch
```

```sh
sudo pacman -Sy
sudo pacman -S stremio-web-shell
```

The package provides and conflicts with `stremio-web-desktop`, so it replaces
manually installed copies of the same idea.

## How the streaming server is obtained

`server.js` is proprietary software published by Stremio. It is **not**
redistributed in this repository or in the package. The package ships only a
manifest (`server-version.json`) with the version, download URL and SHA-256
checksum; on first run the shell downloads the file into
`~/.cache/stremio-web-shell/` and verifies the checksum. When a new package
version pins a newer server, the shell downloads it on the next start.

## External components

| Component | Version | License | Role |
|---|---|---|---|
| [Stremio Web](https://github.com/Stremio/stremio-web) | 5.1.0 | GPL-2.0 | web client, built from source |
| [Stremio Server](https://www.stremio.com/) (`server.js`) | 4.22.5 | proprietary | streaming and transcoding, fetched at runtime |
| [Electron](https://www.electronjs.org/) | from Arch `electron` | MIT | browser shell |
| [FFmpeg](https://ffmpeg.org/) | from Arch `ffmpeg` | LGPL-2.1 / GPL-2.0 | transcoding backend |

This project is not affiliated with Stremio.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `FFMPEG_BIN` | `/usr/bin/ffmpeg` | ffmpeg used by the streaming server |
| `FFPROBE_BIN` | `/usr/bin/ffprobe` | ffprobe used by the streaming server |

## Removal

```sh
sudo pacman -Rns stremio-web-shell
rm -rf ~/.cache/stremio-web-shell ~/.config/stremio-web-shell
```

## License

GPL-2.0-only. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
