# Streamflow

Streamflow is a modern IPTV workspace built with TypeScript, Sass, HLS.js, and Rust/WASM. It is designed for loading large playlists quickly, browsing channels with useful filters, and playing HLS streams in a UI that makes playback state obvious.

## What It Does

- Load playlists from URL, local file, raw text, or built-in quick-source presets
- Parse playlists with a Rust/WASM engine and fall back to JavaScript when needed
- Play HLS streams with retries, status badges, quality selection, audio-track selection, volume, fullscreen, and picture-in-picture
- Save multiple playlist libraries and switch between them without re-importing
- Track favorites, pinned channels, watch history, and resume state
- Import XMLTV guide data and show now/next program context
- Scan stream health and collect manual source reports
- Support profiles, restricted groups, multiview, quick switch, PWA install, and optional cloud sync

## Tech Stack

- Frontend: TypeScript, Sass, Webpack
- Playback: HLS.js
- Performance layer: Rust + WebAssembly via `wasm-pack`
- Storage: localStorage + IndexedDB
- Delivery: static build, Docker, or installable PWA

## Requirements

- Node.js 20+
- npm
- Rust toolchain
- `wasm-pack`
- Rust target `wasm32-unknown-unknown`

Install the Rust/WASM tooling once:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.13.1 --locked
```

## Getting Started

Clone and install dependencies:

```bash
git clone git@github.com:OthmaneBlial/iptv-player.git
cd iptv-player
npm ci
```

Start the development server:

```bash
npm start
```

The dev server builds the WASM package first, then launches Webpack Dev Server. If the browser does not open automatically, use the URL printed in the terminal.

## First Run

1. Open the app.
2. In `Quick Sources`, choose `Streamflow Demo`.
3. Click `Load`.
4. Pick a channel from the sidebar.

You can also paste your own `.m3u` or `.m3u8` URL, import a local playlist file, or paste raw playlist content in Settings.

## Scripts

```bash
npm start              # build WASM and launch the dev server
npm run build:wasm     # compile the Rust/WASM package
npm run build          # production build
npm run build:release  # release WASM build + production bundle
npm test -- --runInBand
npm run lint
npm run format
```

## Feature Overview

### Playlist Workflow

- Quick-source presets for fast testing
- Remote URL import through a proxy-aware fetch path
- Local file import for `.m3u` and `.m3u8`
- Raw playlist paste support
- Saved playlist library with rename, duplicate, delete, export, and restore

### Playback

- HLS playback with retry handling
- Clear `standby`, `buffering`, `on air`, and `signal lost` states
- Quality and audio-track controls
- Volume, mute, fullscreen, picture-in-picture, and retry controls
- Resume last channel

### Discovery

- Search with fuzzy matching
- Group, country, language, recent, favorites, and health-aware sorting
- Favorites and pinned channels
- Watch history

### Advanced Tools

- XMLTV EPG import
- Stream health scanning and reporting
- Profile-aware restrictions
- Quick switch and multiview
- PWA support and optional cloud sync

## Docker

Build and run the production image:

```bash
docker build -t streamflow .
docker run --rm -p 8080:80 streamflow
```

Then open `http://localhost:8080`.

## CI and Releases

- GitHub Actions runs the build and Jest suite on pushes to `main` and on pull requests
- Pushing a tag that matches `v*` builds the production bundle and publishes a release artifact

## Project Layout

```text
src/
  components/   UI components
  services/     playback, bootstrap, header, PWA, multiview
  store/        application state
  styles/       Sass system and component styling
  utils/        playlist, EPG, sync, storage, health, profiles, diagnostics
  workers/      worker scripts
iptv-wasm/
  src/          Rust parser/filter implementation
  src-js/       JS bridge helpers
docs/
  deployment.md deployment notes
tests/
  Jest coverage and browser automation helpers
```

## Notes

- Public IPTV playlists are not stable. Some channels will be offline, geo-blocked, or codec-incompatible depending on the browser.
- `npm run build` requires `wasm-pack` because the WASM package is rebuilt before bundling.
- In development, service workers are disabled and cleaned up to avoid stale cached assets on `localhost`.

## Documentation

- [Deployment Guide](docs/deployment.md)
- [Implementation Status](IMPLEMENTATION_STATUS.md)
- [WASM Implementation Notes](WASM_IMPLEMENTATION.md)

## License

MIT
