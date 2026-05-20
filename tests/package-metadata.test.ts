import { describe, expect, it } from "vitest";

import packageJson from "../package.json" with { type: "json" };

type PackageJsonWithDependencies = typeof packageJson & {
  optionalDependencies?: Record<string, string>;
};

const directDependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

const nativePlatformPackagePattern =
  /(?:^|[-_])(?:android|darwin|freebsd|linux|win32)(?:[-_](?:arm|arm64|x64|ia32|musl|gnu|msvc|gnueabihf|wasi|wasm32))*$/;

describe("package metadata", () => {
  it("does not directly depend on platform-specific native packages", () => {
    const metadata = packageJson as PackageJsonWithDependencies;
    const directPlatformPackages = directDependencySections.flatMap((section) =>
      Object.keys(metadata[section] ?? {}).filter((dependencyName) =>
        nativePlatformPackagePattern.test(dependencyName),
      ),
    );

    expect(directPlatformPackages).toEqual([]);
  });
});
