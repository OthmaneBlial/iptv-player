# Deployment Guide

## Static Hosting

Build the app:

```bash
npm ci
npm run build
```

Deploy the `dist/` folder to any static host that supports SPA fallback or custom rewrite rules.

## Docker

Build and run:

```bash
docker build -t broadcast-console .
docker run --rm -p 8080:80 broadcast-console
```

Then open `http://localhost:8080`.

## Releases

Push a version tag like `v1.1.0` and GitHub Actions will build the production bundle and publish a release artifact.

## Desktop Packaging Note

The project is currently best shipped as:

- a self-hosted Docker image
- a static web deployment
- an installable PWA

If a desktop shell becomes necessary, Tauri is the recommended next step because it fits this stack better than a heavier Electron wrapper.
