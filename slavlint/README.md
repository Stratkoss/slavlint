# slavlint

Lints Czech (`cs`) and Polish (`pl`) i18next locale files for the grammar and typography mistakes AI agents typically make.

English has two plural forms. Czech and Polish have four, and agents routinely generate only `_one` / `_other`. When a form is missing, i18next falls back to the fallback language, so Czech users see English text for counts 2–4. slavlint catches this before it ships.

## Run the CLI

Requires Node.js 20+.

```bash
cd slavlint
npm install          # also builds dist/
npx slavlint ../demo/locales
npx slavlint fixtures           # intentionally broken files
npx slavlint fixtures/cs.json --json
npx slavlint path/to/locales --fix   # rewrites typography in place
```

`--fix` rewrites typography issues only. It changes string values and nothing else: keys, order, indentation and `{{placeholders}}` / `$t(...)` / `<1>` tags are untouched. Non-breaking spaces are written as `\u00a0`, so they show up in diffs. Plural issues are reported, never auto-fixed. In the terminal report, `␣` marks a non-breaking space.

`<path>` can be a file or a folder. Folders are scanned recursively, skipping `node_modules`, `.next`, `dist`, and similar. The language comes from the file or folder name: `cs.json`, `pl-PL.json`, `locales/cs/common.json`, `translations/pl.json`. Use `--lang cs|pl` to override it.

The exit code is `1` if there are errors, `0` if there are only warnings or nothing to report, and `2` for usage errors.

## Rules

| Rule | Severity | What it checks |
| --- | --- | --- |
| `plural-missing` | error | A plural key lacks a category that `Intl.PluralRules` requires (cs/pl: `_one`, `_few`, `_many`, `_other`). |
| `plural-missing-decimal` | warning | A missing category that no integer 0–1000 reaches, i.e. used only for decimals like 1.5 (cs `_many`, pl `_other`). Harmless for whole-number counts. |
| `plural-decimal-copy` | warning | The decimal-only form equals the 5+ form (cs `_many` = `_other`, pl `_other` = `_many`), usually a copy-paste: `1,5 varianty` vs `5 variant`. Can be a false positive when the forms really coincide (pl `wiadomości`). |
| `plural-unused` | warning | A plural suffix the language never uses (e.g. `_two` in Czech). |
| `plural-no-variants` | warning | Text uses `{{count}}` but has no plural variants. Fine for abbreviations like `{{count}} ks`. |
| `json-invalid` | error | The file can't be parsed. |
| `vocative-greeting` | error | cs: a greeting with a name placeholder (`Dobrý den, {{firstName}}`, `Ahoj {{name}}`, `Vážený pane {{lastName}}`). Czech needs the vocative (`Petře`), but i18next inserts the name as-is. Not auto-fixed: decline the name in code with `vokativ` and pass it as `{{firstNameVocative}}`. |
| `typo-nbsp-one-letter` | warning, fixable | Non-breaking space after one-letter words: cs `k s v z o u a i`, pl `w z o u i a` (any case). |
| `typo-nbsp-unit` | warning, fixable | Non-breaking space between a number or `{{placeholder}}` and a unit: `250 ml`, `{{count}} ks`, `{{count}} szt.`. |
| `typo-thousands` | warning, fixable | cs: `1000` → `1 000`. pl: only 5+ digits (`10000` → `10 000`); Polish doesn't group 4-digit numbers. Czech 4-digit numbers 1800–2199 are treated as years unless a unit follows. |
| `typo-date` | warning, fixable | cs: `30.9.2026` → `30. 9. 2026`. |
| `typo-quotes` | warning, fixable | cs: `"…"` / `“…”` / `„…”` → `„…“`. |

Plural categories and the example numbers in messages come from `Intl.PluralRules`; nothing is hardcoded. All checks are deterministic and offline.

## MCP server (Cursor)

The same core is exposed as an MCP server over stdio (`dist/mcp.js`, bin `slavlint-mcp`).

| Tool | What it does |
| --- | --- |
| `lint_locale_file(path, lang?)` | Same findings as the CLI, as structured JSON. Accepts a file or a folder. |
| `check_text(text, lang)` | Checks one string; returns findings plus the auto-fixed text. |
| `plural_forms(word, lang, key?)` | Word forms mapped to the `Intl.PluralRules` categories, plus a ready i18next key set. Uses Grok (`XAI_API_KEY`, model override `XAI_MODEL`) and falls back to a built-in dictionary of 15 common UI words (položka, soubor, den, uživatel, zpráva, objednávka, produkt, kus, minuta, hodina, komentář, výsledek, stránka, kategorie, varianta, and their Polish equivalents). Output is always validated against `Intl.PluralRules`. |
| `vocative(name)` | Czech vocative via [`vokativ`](https://www.npmjs.com/package/vokativ): `Petr` → `Petře`. |

**This repo:** `.cursor/mcp.json` is already set up, both in `slavlint/` (when only that folder is open) and at the repo root (when the whole repo, including `demo/`, is open). Run `npm install` in `slavlint/`, then enable `slavlint` in Cursor Settings → MCP. The key is read from your environment (`${env:XAI_API_KEY}`); never put it in `mcp.json`.

**Another project:** run

```bash
npx slavlint install-cursor /path/to/project
```

It adds a `slavlint` entry to the project's `.cursor/mcp.json`, keeping other servers, and copies the agent rule to `.cursor/rules/slavlint.mdc`. It works without `XAI_API_KEY`: `plural_forms` then uses the built-in dictionary. The key is only referenced as `${env:XAI_API_KEY}` and never written. The resulting entry looks like this:

```json
{
  "mcpServers": {
    "slavlint": {
      "command": "node",
      "args": ["/absolute/path/to/slavlint/dist/mcp.js"],
      "env": { "XAI_API_KEY": "${env:XAI_API_KEY}" }
    }
  }
}
```

The rule tells the agent to use these tools for Czech and Polish UI texts and to run `lint_locale_file` before finishing.

To try the server without Cursor: `npx @modelcontextprotocol/inspector node dist/mcp.js`.

## See the bug in i18next

`scripts/render-demo.mjs` renders one plural key through real i18next for counts 1, 2, 3, 5 and 1.5, side by side for two locale files. Lines that fall back to English (`en.json` next to each file) are marked `← English`.

Counts are formatted for the file's language via `Intl.NumberFormat` (`1,5`).

Example: Medusa admin `v2.19.0` (bug from [medusajs/medusa#16518](https://github.com/medusajs/medusa/issues/16518)) vs current upstream. Both are sparse checkouts of `packages/admin/dashboard/src/i18n`:

```bash
git clone --depth 1 --branch v2.19.0 --filter=blob:none --sparse https://github.com/medusajs/medusa.git ~/Projects/medusa-i18n
git clone --depth 1 --filter=blob:none --sparse https://github.com/medusajs/medusa.git ~/Projects/medusa-upstream
for d in ~/Projects/medusa-i18n ~/Projects/medusa-upstream; do git -C $d sparse-checkout set packages/admin/dashboard/src/i18n; done

T=packages/admin/dashboard/src/i18n/translations
node scripts/render-demo.mjs products.variantCount \
  "v2.19.0=$HOME/Projects/medusa-i18n/$T/cs.json" \
  "upstream=$HOME/Projects/medusa-upstream/$T/cs.json"
```

## Tests

```bash
npm test
```
