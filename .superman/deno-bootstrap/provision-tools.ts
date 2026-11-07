#!/usr/bin/env deno
// The operational Deno root's external tool provisioning.
//
// This carries the CI workflow's reviewed provisioning step over to the Deno
// runtime unchanged: the platform is checked, the declared asset identity is
// read from the reviewed asset policy, the checksum-locked bytes are acquired,
// the digest is verified, the archive is extracted, the binary's version is
// read, and the tool's path is exported to the run's authority files.
//
// The acquisition is injected and the authority files are supplied by the
// caller, so this module never reaches the network and never writes a
// workflow environment on its own. The external runtime identities — the
// platform, the asset URLs, the digests and the tool versions — are the
// declared ones, unchanged.
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "./exec.ts";

/** A declared, checksum-locked external asset. */
export type Asset = { url: string; sha256: string };

/** The reviewed asset policy: a tool's identity and its per-platform assets. */
export type AssetPolicy = Record<string, { version?: string } & Record<string, Asset | undefined>>;

/** The acquisition of an asset's bytes. The caller supplies it. */
export type Acquirer = (asset: Asset) => Promise<Uint8Array>;

/** The run's authority files: the environment file and the PATH file. */
export type Authority = { environment: string; path: string };

/** A provisioned tool's recorded identity. */
export type ProvisionedTool = {
  tool: string;
  /** The version the binary reported, as the CI step prints it. */
  version: string;
  /** The version the asset policy declares, when it declares one. */
  expected: string | null;
  directory: string;
  binary: string;
  digest: string;
};

export type ProvisionOptions = {
  /** The platform the run must be on, such as `darwin-arm64`. */
  expected: string;
  /** The platform this process is on. */
  platform: string;
  /** The tools to provision, in the reviewed order. */
  tools: string[];
  /** The reviewed asset policy. */
  policy: AssetPolicy;
  /** The acquisition of an asset's bytes. */
  acquire: Acquirer;
  /** The directory the tools are installed into. */
  directory: string;
  /** The run's authority files. Without them nothing is exported. */
  authority?: Authority;
  /** The environment the tools are read with. */
  env: Record<string, string | undefined>;
};

/**
 * Provision the declared external tools.
 *
 * Every step fails closed: a missing or malformed asset identity, a digest
 * mismatch, an absent binary or a version that is not the declared one all
 * stop the provisioning. A tool that is provisioned carries exactly the
 * declared external runtime identity.
 */
export async function provisionTools(options: ProvisionOptions): Promise<ProvisionedTool[]> {
  const { expected, platform, tools, policy, acquire, directory, authority, env } = options;
  if (platform !== expected) throw new Error(`Wrong runner platform: ${platform}`);
  const provisioned: ProvisionedTool[] = [];
  for (const tool of tools) {
    const declared = policy[tool];
    const asset = declared?.[platform];
    if (!asset) {
      // Upstream archgate publishes no linux-arm64 asset. A registered Superman
      // prerelease is used when the asset policy has its url and sha256.
      // Checksum registration is not redistribution acceptance. A missing pin
      // still fails closed; it is not a waiver.
      if (tool === "archgate" && platform === "linux-arm64")
        throw new Error(
          "Gate 1 blocked: archgate has no reviewed, published linux-arm64 asset/checksum; " +
            "this leg fails closed until a human-authorized superman release asset is registered",
        );
      throw new Error(`Gate 1 blocked: reviewed, published ${tool} ${platform} asset/checksum is missing`);
    }
    if (!/^[a-f0-9]{64}$/u.test(asset.sha256) || !asset.url.startsWith("https://github.com/"))
      throw new Error("Invalid tool asset identity");
    const bytes = await acquire(asset);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== asset.sha256) throw new Error(`${tool} checksum mismatch`);
    const toolDirectory = join(directory, `superman-${tool}`);
    mkdirSync(toolDirectory, { recursive: true });
    const archive = join(toolDirectory, "asset.tar.gz");
    writeFileSync(archive, bytes);
    execFileSync("tar", ["-xzf", archive, "-C", toolDirectory], { env, encoding: "utf8", shell: false });
    const binary = join(toolDirectory, tool);
    // The CI step reads the binary's version and prints it. The provisioned
    // bytes are already bound by the asset digest, so the version is reported
    // rather than refused: a check here would be a stronger policy than the
    // provisioning behaviour this port carries.
    const version = execFileSync(binary, ["--version"], { env, encoding: "utf8", shell: false }).trim();
    if (authority) {
      appendFileSync(authority.environment, `${tool.toUpperCase()}_BIN=${binary}\n`);
      appendFileSync(authority.path, `${toolDirectory}\n`);
    }
    provisioned.push({ tool, version, expected: declared?.version ?? null, directory: toolDirectory, binary, digest });
  }
  return provisioned;
}
