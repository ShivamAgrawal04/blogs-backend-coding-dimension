const fs = require("fs");
const path = require("path");

const srcRoot = path.join(__dirname, "..", "src");
const importRe = /from\s+(['"])(\.[^'"]+)\1/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

let changedFiles = 0;
let changedImports = 0;

for (const file of walk(srcRoot)) {
  if (file.endsWith(`${path.sep}register-aliases.ts`)) continue;

  const original = fs.readFileSync(file, "utf8");
  const dir = path.dirname(file);
  const next = original.replace(importRe, (match, quote, rel) => {
    if (rel === "./register-aliases" || rel === "./register-aliases.js") {
      return match;
    }
    const resolved = path.resolve(dir, rel);
    let absFromSrc = path.relative(srcRoot, resolved).split(path.sep).join("/");
    if (absFromSrc.startsWith("..")) return match;
    absFromSrc = absFromSrc.replace(/\.ts$/, "");
    changedImports += 1;
    return `from ${quote}@/${absFromSrc}${quote}`;
  });

  if (next !== original) {
    fs.writeFileSync(file, next);
    changedFiles += 1;
  }
}

console.log(`Updated ${changedFiles} files (${changedImports} imports)`);
