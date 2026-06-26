import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const docsRoot = path.join(repoRoot, "docs");
const indexPath = path.join(docsRoot, "index.md");
const errors = [];

if (!existsSync(docsRoot)) {
  fail("docs/ does not exist.");
}

if (existsSync(path.join(repoRoot, "specs"))) {
  fail("Root specs/ directory is not allowed. Use docs/specs/.");
}

const markdownFiles = walk(docsRoot).filter((file) => file.endsWith(".md"));
const indexContent = readFile(indexPath);

for (const file of markdownFiles) {
  const relative = toRepoPath(file);
  const content = readFile(file);
  const frontmatter = parseFrontmatter(content);

  validateFrontmatter(relative, frontmatter);
  validateLinks(file, content);
  validateIndexCoverage(relative);

  if (relative.startsWith("docs/specs/")) {
    validateSpec(relative, frontmatter, content);
  }
}

if (errors.length > 0) {
  console.error("Documentation validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Documentation validation passed (${markdownFiles.length} files).`);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return [fullPath];
  });
}

function readFile(file) {
  return readFileSync(file, "utf8");
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return null;
  }

  const endIndex = content.indexOf("\n---", 4);

  if (endIndex === -1) {
    return null;
  }

  const raw = content.slice(4, endIndex).trim();
  const fields = new Map();

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (match) {
      fields.set(match[1], match[2].replace(/^["']|["']$/g, "").trim());
    }
  }

  return fields;
}

function validateFrontmatter(relative, frontmatter) {
  if (isMetadataOptional(relative)) {
    return;
  }

  if (!frontmatter) {
    fail(`${relative} must declare frontmatter.`);
    return;
  }

  for (const field of ["title", "status"]) {
    if (!frontmatter.get(field)) {
      fail(`${relative} missing frontmatter field: ${field}.`);
    }
  }

  const status = frontmatter.get("status");

  if (status === "active") {
    for (const field of ["owner", "last_reviewed"]) {
      if (!frontmatter.get(field)) {
        fail(`${relative} active docs must declare ${field}.`);
      }
    }
  }
}

function validateLinks(file, content) {
  const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    const rawTarget = match[1].trim();

    if (shouldSkipLink(rawTarget)) {
      continue;
    }

    const linkTarget = rawTarget.split("#")[0].trim();

    if (!linkTarget) {
      continue;
    }

    const resolvedTarget = path.resolve(path.dirname(file), safeDecode(linkTarget));

    if (!resolvedTarget.startsWith(repoRoot)) {
      fail(`${toRepoPath(file)} links outside repo: ${rawTarget}.`);
      continue;
    }

    if (!existsSync(resolvedTarget)) {
      fail(`${toRepoPath(file)} has broken link: ${rawTarget}.`);
      continue;
    }

    if (statSync(resolvedTarget).isDirectory()) {
      continue;
    }
  }
}

function validateIndexCoverage(relative) {
  if (relative === "docs/index.md" || relative.startsWith("docs/notes/")) {
    return;
  }

  const pathFromIndex = relative.replace(/^docs\//, "");

  if (!indexContent.includes(`](${pathFromIndex})`)) {
    fail(`${relative} is not linked from docs/index.md.`);
  }
}

function validateSpec(relative, frontmatter, content) {
  const basename = path.basename(relative);

  if (basename === "README.md" || basename === "TEMPLATE.md") {
    return;
  }

  const match = basename.match(/^(\d{3})-[a-z0-9-]+\.md$/);

  if (!match) {
    fail(`${relative} must use NNN-titulo-breve.md naming.`);
    return;
  }

  if (!frontmatter) {
    return;
  }

  for (const field of ["numero", "area"]) {
    if (!frontmatter.get(field)) {
      fail(`${relative} missing spec field: ${field}.`);
    }
  }

  if (frontmatter.get("numero") !== match[1]) {
    fail(`${relative} numero must match filename prefix ${match[1]}.`);
  }

  if (frontmatter.get("status") === "implemented") {
    if (!frontmatter.get("implemented_in")) {
      fail(`${relative} implemented specs must declare implemented_in.`);
    }

    if (!content.includes("## Impacto documental")) {
      fail(`${relative} implemented specs must record documentation impact.`);
    }
  }
}

function isMetadataOptional(relative) {
  return (
    relative.startsWith("docs/notes/") ||
    relative.endsWith("/TEMPLATE.md") ||
    relative.endsWith("\\TEMPLATE.md")
  );
}

function shouldSkipLink(target) {
  return (
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.startsWith("#") ||
    target.startsWith("obsidian://")
  );
}

function safeDecode(target) {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

function toRepoPath(file) {
  return path.relative(repoRoot, file).replace(/\\/g, "/");
}

function fail(message) {
  errors.push(message);
}
