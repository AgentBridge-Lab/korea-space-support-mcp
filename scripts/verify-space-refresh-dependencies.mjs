import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const requiredPackages = ["typescript"];

const resolveFromProject = (packageName, projectRoot = process.cwd()) => {
  const projectRequire = createRequire(resolve(projectRoot, "package.json"));
  return projectRequire.resolve(`${packageName}/package.json`);
};

export const assertRefreshDependencies = ({
  projectRoot = process.cwd(),
  resolvePackage = resolveFromProject
} = {}) => {
  const missing = requiredPackages.filter((packageName) => {
    try {
      resolvePackage(packageName, projectRoot);
      return false;
    } catch {
      return true;
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Space refresh dependencies are missing (${missing.join(", ")}). Run npm ci before refreshing. No source data was changed.`
    );
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assertRefreshDependencies();
  console.log("Space refresh dependency preflight passed.");
}
