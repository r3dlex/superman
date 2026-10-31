// Fixtures must never inherit a caller's repository, index, config or templates.
export function fixtureEnvironment(): Record<string, string | undefined> {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      /^(?:GIT_|GITHUB_|GH_|SUPERMAN_APP_)/u.test(key) ||
      ["HEAD_SHA", "BASE_SHA", "HEAD_REF", "BASE_REF"].includes(key)
    )
      delete env[key];
  }
  return { ...env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
}
