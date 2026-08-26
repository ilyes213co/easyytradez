import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const targets = [
  join(root, ".next", "tsconfig.tsbuildinfo"),
  join(root, "tsconfig.tsbuildinfo"),
];

for (const target of targets) {
  try {
    if (existsSync(target)) {
      rmSync(target, { force: true, recursive: true, maxRetries: 2, retryDelay: 100 });
    }
  } catch (error) {
    console.warn(`[prepare-next-cache] unable to remove ${target}:`, error.message);
  }
}
