import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("VPN-only access model", () => {
  it("does not ship application-level NextAuth routes or login pages", () => {
    expect(fs.existsSync(path.join(projectRoot, "app/api/auth/[...nextauth]/route.ts"))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, "app/login/page.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, "components/login-form.tsx"))).toBe(false);
  });

  it("does not require a server session inside API route handlers", () => {
    for (const route of ["app/api/items/route.ts", "app/api/files/route.ts", "app/api/parse/route.ts", "app/api/stringify/route.ts"]) {
      const source = read(route);
      expect(source).not.toContain("requireUser");
      expect(source).not.toContain("next-auth");
    }
  });
});
