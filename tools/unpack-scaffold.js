// tools/unpack-scaffold.js
import fs from "node:fs/promises";
import path from "node:path";

async function main(file) {
  if (!file) {
    console.error("Usage: node tools/unpack-scaffold.js <scaffold.json>");
    process.exit(1);
  }
  const json = JSON.parse(await fs.readFile(file, "utf8"));
  const baseDir = path.dirname(file); // typically public/data/courses
  for (const [rel, content] of Object.entries(json)) {
    const out = path.join(baseDir, rel.replace(/^courses\//, "")); // keep <id>/…
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, content, "utf8");
    console.log("Wrote", out);
  }
}
main(process.argv[2]).catch((e) => {
  console.error(e);
  process.exit(1);
});