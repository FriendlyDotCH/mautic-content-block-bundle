# AGENTS.md

Conventions for anyone (human or AI agent) changing this plugin.

## Naming

### Classes in `Service/` end with `Service`

Every new class in `Service/` must have a name ending in `Service`, e.g. `ContentBlockConfigService`,
`LinkedBlockService`, not `LinkedBlockResolver`.

Some existing classes predate this rule (`ContentBlockTokenReplacer`, `LinkedBlockResolver`,
`ThemeMjmlProvider`). Leave them as they are; do not rename them as a side effect of other work.
Rename one only when that is the task itself, and then update every reference (services, tests, README).
