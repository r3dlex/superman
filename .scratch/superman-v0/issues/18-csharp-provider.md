# 18: C# provider

**Milestone:** M7b **(M1 amendment 3)**

**What to build:** Detected by a `*.sln`, `*.slnx` or `*.slnf` at the root (several solutions: `affected.providers` config picks one, otherwise full). Projects come from `dotnet sln <file> list`; edges come from `<ProjectReference Include="…">` items parsed from each `.csproj`/`.fsproj`/`.vbproj` (MSBuild XML read as text, conditions ignored, so edges are a superset). `dotnet reference list` (`dotnet list reference` before the .NET 10 SDK) lists direct references only and is used as a cross-check in tests, not at run time. The reverse transitive closure gives affected projects; test projects among them (`IsTestProject` or a test SDK reference) are the targets, with `dotnet test <project>`. `Directory.Build.props/.targets`, `Directory.Packages.props`, `global.json`, `NuGet.config` and solution files force full.

**Blocked by:** 12

**Status:** ready-for-agent

**Kind:** behavior

**Protected-path follow-up:** None.

- [ ] A fixture solution `Core ← Api ← Api.Tests`, `Core ← Core.Tests` selects both test projects for a `Core` change and only `Api.Tests` for an `Api` change (test-first; the `.csproj` files are fixtures, no .NET SDK needed).
- [ ] A conditional `ProjectReference` is still an edge.
- [ ] A `Directory.Build.props` change in a subfolder affects every project below it; at the root it forces full.
- [ ] Typecheck targets include every affected complete compiler project and reverse dependent, not only test projects. Unknown imported MSBuild/config inputs or missing argv produces full-check fallback.

Start with a library-only project change whose dependent test project is distinct from its compiler scope.
- [ ] The `dotnet test <project>` argument form under Microsoft.Testing.Platform vs VSTest is checked on a real SDK (VERIFY result recorded).
