import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const copyDirs = ["assets", "gallery", "sections", "login-owner", "api"];
const rootFiles = [
  "index.html",
  "contact.html",
  "card-loialitate.html",
  "preturi-rate.html",
  "proceduri.html",
  "medicina-estetica.html",
  "chirurgie-estetica.html",
  "cosmetologie.html",
  "despre-noi.html",
  "testimoniale.html",
  "login-owner.html",
  "style.css",
  "app.js",
  "zen-config.js",
];

function minifyHtml(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .trim();
}

function minifyJs(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()[\];,:=+\-*/<>])\s*/g, "$1")
    .trim();
}

function minifyFile(path) {
  const ext = extname(path).toLowerCase();
  const source = readFileSync(path, "utf8");
  const minified = ext === ".html" ? minifyHtml(source) : ext === ".css" ? minifyCss(source) : ext === ".js" ? minifyJs(source) : source;
  writeFileSync(path, minified, "utf8");
}

function minifyTree(path) {
  for (const entry of readdirSync(path)) {
    const fullPath = join(path, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      minifyTree(fullPath);
    } else if ([".html", ".css", ".js"].includes(extname(fullPath).toLowerCase())) {
      minifyFile(fullPath);
    }
  }
}

if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}

mkdirSync(dist, { recursive: true });

for (const dir of copyDirs) {
  if (existsSync(join(root, dir))) {
    cpSync(join(root, dir), join(dist, dir), { recursive: true });
  }
}

for (const file of rootFiles) {
  if (existsSync(join(root, file))) {
    cpSync(join(root, file), join(dist, file));
  }
}

minifyTree(dist);
console.log(`Built minified site in ${dist}`);
