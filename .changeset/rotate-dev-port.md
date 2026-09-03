---
'@limitedrun/cli': patch
---

`limitedrun dev` now rotates to the next available port when the requested one is already in use (up to 20 consecutive ports), instead of failing on `EADDRINUSE`.
