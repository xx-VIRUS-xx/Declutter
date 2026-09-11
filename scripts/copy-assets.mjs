import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

mkdirSync(dist, { recursive: true });

// Manifest + icons from public/ go straight into dist/.
cpSync(join(root, "public"), dist, { recursive: true });

// Popup HTML/CSS live alongside the bundled popup.js.
mkdirSync(join(dist, "popup"), { recursive: true });
cpSync(join(root, "src", "popup", "popup.html"), join(dist, "popup", "popup.html"));
cpSync(join(root, "src", "popup", "popup.css"), join(dist, "popup", "popup.css"));

console.log("Copied manifest, icons, and popup assets into dist/");
