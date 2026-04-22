# Changelog

All notable changes to `@notambourine/hrvst-cli` are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## [3.1.0] — 2026-04-22

First release under the `@notambourine/hrvst-cli` scope. Consumers previously
installing `hrvst-cli@3.0.0` from the upstream `kgajera/hrvst-cli` package
should migrate:

```
npm uninstall -g hrvst-cli
npm install -g @notambourine/hrvst-cli
```

The `hrvst` binary name is unchanged.

### Fixed

- **Line-items API requests were broken** due to the Postman-collection body
  serializer emitting bracket-notation keys (`line_items[0]kind`) as literal
  JSON object keys instead of nested arrays/objects. Affected every non-GET
  endpoint generated from the Harvest collection, including
  `hrvst invoices line-items create/update` and
  `hrvst estimates line-items create/update`. Request bodies are now
  normalized into the structure Harvest's REST API expects. (cherry-pick of
  `scott4mation/hrvst-cli@270ef42`)
- OAuth login callback shows a distinct error page on failure instead of
  the success page. Prevents a phished user from closing the tab thinking
  authentication worked when it didn't.
- Config file permissions (`~/.hrvst/config.json`) are now enforced to
  `0600` on every write, not just on file creation. Fixes pre-existing
  configs installed before `3.1.0` being left at `0644`.
- Config directory (`~/.hrvst`) creation is atomic (`mkdir -p` with
  `0700`), avoiding an `EEXIST` race on first-run.

### Security

- OAuth login flow hardened (from upstream PR #10):
  - CSRF `state` parameter (128 bits of `crypto.randomBytes`) added to the
    authorization URL and validated on callback.
  - Callback HTTP server binds explicitly to `localhost` instead of all
    interfaces, reducing exposure on shared networks.
  - 5-minute callback timeout so the listener doesn't hang indefinitely.
  - OAuth error output sanitized — no longer echoes arbitrary
    server-provided strings to the terminal.
  - Config file and parent directory written with restricted permissions
    (`0600` / `0700`) so the stored access token is not readable by other
    local users.

### Changed

- Package renamed to `@notambourine/hrvst-cli` (scoped). Binary name
  (`hrvst`) unchanged.
- Most dependencies bumped to latest (1-day release-age cooldown). Notable
  majors: `typescript 5→6`, `vitest 2→4`, `yargs 17→18`, `inquirer 11→13`,
  `open 10→11`, `postman-collection 4→5`, `supertest 6→7`, `execa 8→9`.
  `yargs 18` changes the `--help` text wrap to word boundaries (cosmetic).
  `eslint` pinned at `^8.57` and `@typescript-eslint/*` at `^7.18`
  (ESLint 9+ requires flat-config migration — deferred).
- `npm test` now runs `vitest run` (non-watch) and exits on completion;
  use `npm run test:watch` for the previous watch-mode behavior.

### Added

- CHANGELOG.md (this file).
- GitHub Actions CI workflow.
- Test coverage for the OAuth CSRF state-mismatch path.

## [3.0.0] — upstream baseline

See [kgajera/hrvst-cli@v3.0.0](https://github.com/kgajera/hrvst-cli)
for the upstream 3.0.0 release notes. This fork diverges from there.
