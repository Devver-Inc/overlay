import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const file = join(process.cwd(), "dist", "devver-overlay.iife.js");

function patch() {
  let content = readFileSync(file, "utf8");

  // Check if already patched
  if (content.includes("_global.DevverOverlay")) {
    console.log("[fix-iife-global] already patched");
    return;
  }

  // The new IIFE format wraps in (function(exports) { ... })(this.DevverOverlay = this.DevverOverlay || {});
  // We need to replace 'this.DevverOverlay' with our safe global access
  const safeGlobal =
    '(typeof globalThis!=="undefined"?globalThis:typeof window!=="undefined"?window:typeof self!=="undefined"?self:{})';

  // Replace patterns that assign to 'this.DevverOverlay'
  const patterns = [
    // Pattern: })(this.DevverOverlay = this.DevverOverlay || {});
    {
      from: /\}\)\(this\.DevverOverlay\s*=\s*this\.DevverOverlay\s*\|\|\s*\{\}\);?$/,
      to: `})((function(){var _g=${safeGlobal};return _g.DevverOverlay=_g.DevverOverlay||{};})());`,
    },
    // Pattern at start: (function(exports) { ... with this.DevverOverlay at end
    {
      from: /this\.DevverOverlay/g,
      to: `${safeGlobal}.DevverOverlay`,
    },
  ];

  let patched = false;

  for (const pattern of patterns) {
    if (pattern.from.test(content)) {
      content = content.replace(pattern.from, pattern.to);
      patched = true;
    }
  }

  if (!patched) {
    // Try a more generic approach - just ensure global scope access is safe
    console.log("[fix-iife-global] no standard pattern found, skipping");
    return;
  }

  writeFileSync(file, content, "utf8");
  console.log("[fix-iife-global] patched devver-overlay.iife.js");
}

patch();
