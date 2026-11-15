# Maintainer: SKBlacksmith <skblacksmith@users.noreply.github.com>
pkgname=stremio-web-shell
pkgver=5.1.0
pkgrel=2
_serverver=4.22.5
pkgdesc="Stremio web client (v5) in a thin Electron shell with a self-managed streaming server"
arch=('x86_64' 'aarch64')
url="https://github.com/SKBlacksmith/stremio-web-shell"
license=('GPL-2.0-only')
depends=('electron' 'ffmpeg' 'mesa')
makedepends=('nodejs' 'npm' 'git')
provides=('stremio-web-desktop')
conflicts=('stremio-web-desktop' 'stremio-web-desktop-bin')
options=('!strip')
source=(
  "stremio-web-${pkgver}.tar.gz::https://github.com/Stremio/stremio-web/archive/refs/tags/v${pkgver}.tar.gz"
  'main.js'
  'stremio-web-shell.desktop'
  'stremio-web-shell'
  'icon.png'
  "server.js::https://dl.strem.io/server/v${_serverver}/desktop/server.js"
)
sha256sums=('SKIP' 'SKIP' 'SKIP' 'SKIP' 'SKIP' 'SKIP')

build() {
  cd "stremio-web-${pkgver}"
  export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  pnpm install --frozen-lockfile
  pnpm run build
}

package() {
  install -d "${pkgdir}/usr/lib/${pkgname}"
  cp -r "stremio-web-${pkgver}/build/." "${pkgdir}/usr/lib/${pkgname}/web/"
  install -Dm644 "${srcdir}/main.js" "${pkgdir}/usr/lib/${pkgname}/main.js"
  install -Dm644 "${srcdir}/icon.png" "${pkgdir}/usr/share/pixmaps/${pkgname}.png"
  install -Dm644 "${srcdir}/stremio-web-shell.desktop" \
    "${pkgdir}/usr/share/applications/${pkgname}.desktop"
  install -Dm755 "${srcdir}/stremio-web-shell" "${pkgdir}/usr/bin/${pkgname}"

  # The streaming server bundle is proprietary and is not redistributed here.
  # The package ships only a manifest with its version, URL and checksum; the
  # shell fetches it on first run and re-fetches it when the manifest changes.
  local server_sha
  server_sha=$(sha256sum "${srcdir}/server.js" | cut -d' ' -f1)
  cat > "${pkgdir}/usr/lib/${pkgname}/server-version.json" <<EOF
{
  "version": "${_serverver}",
  "url": "https://dl.strem.io/server/v${_serverver}/desktop/server.js",
  "sha256": "${server_sha}"
}
EOF

  cat > "${pkgdir}/usr/lib/${pkgname}/package.json" <<EOF
{
  "name": "${pkgname}",
  "version": "${pkgver}",
  "main": "main.js"
}
EOF
}
