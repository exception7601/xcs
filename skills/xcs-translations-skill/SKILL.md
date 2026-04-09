---
name: xcs-translations-skill
description: Manage `xcstrings` with the project CLI at `/Users/anderson/Developer/xcs/src/cli.js`. Use when reading one key, listing keys missing one language, or adding or removing a single key-language translation.
compatibility: Requires Node.js 20+.
---

# XCS Translations Skill

Use this skill for `Localizable.xcstrings`.
Use the project CLI directly.
The current absolute path is `/Users/anderson/Developer/xcs/src/cli.js`.
The CLI resolves `--file Localizable.xcstrings` relative to the project root when needed.
Do not use a skill-local script copy.
Do not read `Localizable.xcstrings` directly when the CLI can provide the information you need.

## Rules

This tool handles exactly one `key` and one `language` per `add` or `remove` command.
If several languages are requested, run one command per language.
Do not create batch scripts or one-off commands that change several keys at once.
Run one CLI command per change.
Each command should perform only one alteration.
Use `show --key` to read one key for one language.
Use `show --all-key` to read all keys for one language.
For `show`, pass exactly one of `--key` or `--all-key`.
Use `--dry-run` with `add` or `remove` when you need a preview without writing the file.

## Translation input

- `key`: Required.
- `text`: Required source text to translate.
- `comment`: Optional translator context.
  If the source has an obvious typo or grammar issue, translate the corrected meaning.
  If no `comment` is provided but the UI context is clear, write a short translator-facing comment.
- `languages`: Optional.
  `show`, `missing`, `add`, and `remove` all work with a specific language.
  The CLI validates language values against this set.
  If omitted for translation work, use this default set:
  - `ar`
  - `cs`
  - `da`
  - `de`
  - `el`
  - `en`
  - `es`
  - `et`
  - `fi`
  - `fr`
  - `hi`
  - `hu`
  - `id`
  - `it`
  - `ja`
  - `ko`
  - `nl`
  - `ms`
  - `pl`
  - `pt-BR`
  - `pt-PT`
  - `ru`
  - `sv`
  - `th`
  - `uk`
  - `vi`
  - `zh-Hans`
  - `zh-Hant`

## Translation guide

- Write natural, idiomatic translations.
- Preserve the original meaning and UI intent.
- Match the tone to the product context.
- Prefer natural phrasing over literal translation.
- Keep short UI copy concise.
- Follow normal grammar, punctuation, spacing, and capitalization rules for the target language.
- Preserve placeholders and format specifiers exactly, including `%@`, `%d`, and `%1$@`.
- Keep technical tokens and code-like fragments unchanged unless the user explicitly asks otherwise.

## Commands

Read one key for one language.

```bash
node /Users/anderson/Developer/xcs/src/cli.js show \
  --file Localizable.xcstrings \
  --key closeAction \
  --language ja
```

Read all keys for one language.

```bash
node /Users/anderson/Developer/xcs/src/cli.js show \
  --file Localizable.xcstrings \
  --language ja \
  --all-key
```

List keys missing one language.

```bash
node /Users/anderson/Developer/xcs/src/cli.js missing \
  --file Localizable.xcstrings \
  --language ja
```

Add one translation.

```bash
node /Users/anderson/Developer/xcs/src/cli.js add \
  --file Localizable.xcstrings \
  --key closeAction \
  --language ja \
  --text "閉じる" \
  --comment "Close button title"
```

Remove one translation.

```bash
node /Users/anderson/Developer/xcs/src/cli.js remove \
  --file Localizable.xcstrings \
  --key detailsAction \
  --language ja
```
