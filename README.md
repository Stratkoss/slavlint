# slavlint

Grammar checks for Czech UI texts, built for AI agents. A CLI linter and an MCP server for Cursor.

Detailed docs: [slavlint/README.md](slavlint/README.md).

## The problem

English has two plural forms. Czech has three: 1 možnost / 2 možnosti / 5 možností. AI agents and translators mix them up. i18next then shows the wrong form, or falls back to English when a category is missing.

## Proof

slavlint found 9 wrong Czech plural forms in the current [Medusa](https://github.com/medusajs/medusa) admin (open-source Shopify alternative, 36k GitHub stars). Example: "5 možnosti dopravy" instead of "5 možností dopravy". A Cursor agent fixed them through slavlint's MCP tools. A native speaker reviewed the forms.

[medusajs/medusa#17083](https://github.com/medusajs/medusa/pull/17083)

## Quick start

Requires Node.js 20+.

```bash
npx slavlint ./locales
npx slavlint ./locales --fix    # typography only; plurals are reported, never rewritten
npx slavlint ./locales --json
```

In Cursor, no API key:

```bash
npx slavlint install-cursor <project path>
```

## MCP tools

| Tool | What it does |
| --- | --- |
| `lint_locale_file` | Lints a locale file or folder. Same findings as the CLI. |
| `check_text` | Checks one string and returns the auto-fixed text. |
| `plural_forms` | Guide for one word: categories, example counts, grammar hints, dictionary forms if known. |
| `verify_plural_forms` | Checks forms the agent wrote. On success, returns the i18next key set. |
| `vocative` | Czech vocative of a name: `Petr` → `Petře`. |

Flow: `plural_forms` → the agent writes the forms → `verify_plural_forms` → `lint_locale_file`.

## What it checks

| Rule | Severity | Example |
| --- | --- | --- |
| `plural-missing` | error | No `_few`, so a count of 3 falls back to English. |
| `plural-missing-decimal` | warning | No `_many`, the form used only for decimals like 1,5. |
| `plural-few-copy` | warning | `5 možnosti dopravy` instead of `5 možností dopravy`. |
| `plural-decimal-copy` | warning | `1,5 variant` copied from the 5+ form instead of `1,5 varianty`. |
| `plural-no-variants` | warning | `{{count}}` with no plural keys. Fine for `{{count}} ks`. |
| `vocative-greeting` | error | `Dobrý den, {{firstName}}` — Czech needs `Petře`, and i18next will not decline the name. |
| typography | warning, `--fix` | Non-breaking spaces, `1 000`, `30. 9. 2026`, Czech quotes `„…“`. |

## How it works

- One core powers the CLI and the MCP server.
- Plural categories come from `Intl.PluralRules` (Unicode CLDR). Nothing is hardcoded.
- Checks are deterministic and never need the network.

## Limitations

- Czech is verified by a native speaker.
- Polish plural checks exist, but they are experimental and not reviewed.
- Word forms outside the built-in dictionary are checked for structure, not full grammar.
- Vocative uses the [`vokativ`](https://www.npmjs.com/package/vokativ) package and can be wrong for foreign names.

## Repo layout

- `slavlint/` — the CLI and MCP server.
- `demo/` — a Next.js shop used to see the bugs.

Built in one afternoon at Cursor Hackathon Prague, 30 Sep 2026, with Cursor.
