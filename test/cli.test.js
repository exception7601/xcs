import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { URL, fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const cliPath = fileURLToPath(new URL("../src/cli.js", import.meta.url));
const catalogPath = fileURLToPath(
  new URL("../Localizable.xcstrings", import.meta.url),
);
const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), {
      recursive: true,
      force: true,
    });
  }
});

function readCatalogText(file = catalogPath) {
  return readFileSync(file, "utf8");
}

function createTempFile(name, text) {
  const dir = mkdtempSync(join(tmpdir(), "xcs-"));
  const file = join(dir, name);

  tempDirs.push(dir);
  writeFileSync(file, text, "utf8");

  return file;
}

function createTempCatalog() {
  return createTempFile("Localizable.xcstrings", readCatalogText());
}

function createTempInvalidCatalog() {
  return createTempFile("Broken.xcstrings", "{ broken json\n");
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    ...options,
  });
}

describe("cli", () => {
  it("prints usage with --help", () => {
    const result = runCli(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain(
      "xcs show --file FILE --language LANG (--key KEY | --all-key)",
    );
    expect(result.stderr).toBe("");
  });

  it("prints all keys missing a language", () => {
    const file = createTempCatalog();
    const result = runCli(["missing", "--file", file, "--language", "ja"]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      {
        key: "closeAction",
        text: "Close",
        comment: "Close button title",
      },
    ]);
    expect(result.stderr).toBe("");
  });

  it("resolves a relative catalog path from the project root", () => {
    const cwd = mkdtempSync(join(tmpdir(), "xcs-cwd-"));

    tempDirs.push(cwd);

    const result = runCli(
      ["missing", "--file", "Localizable.xcstrings", "--language", "ja"],
      { cwd },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      {
        key: "closeAction",
        text: "Close",
        comment: "Close button title",
      },
    ]);
  });

  it("prints all keys for one language with --all-key", () => {
    const file = createTempCatalog();
    const result = runCli([
      "show",
      "--file",
      file,
      "--language",
      "ja",
      "--all-key",
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      {
        key: "closeAction",
        language: "ja",
        comment: "Close button title",
        state: null,
        text: null,
      },
      {
        key: "detailsAction",
        language: "ja",
        comment: "",
        state: "translated",
        text: "詳細",
      },
    ]);
    expect(result.stderr).toBe("");
  });

  it("prints one requested key for one language", () => {
    const file = createTempCatalog();
    const result = runCli([
      "show",
      "--file",
      file,
      "--key",
      "closeAction",
      "--language",
      "en",
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      key: "closeAction",
      language: "en",
      comment: "Close button title",
      state: "translated",
      text: "Close",
    });
    expect(result.stderr).toBe("");
  });

  it("prints null values when show receives a missing language", () => {
    const file = createTempCatalog();
    const result = runCli([
      "show",
      "--file",
      file,
      "--key",
      "closeAction",
      "--language",
      "fr",
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      key: "closeAction",
      language: "fr",
      comment: "Close button title",
      state: null,
      text: null,
    });
  });

  it("shows an error when show receives a missing key", () => {
    const file = createTempCatalog();
    const result = runCli([
      "show",
      "--file",
      file,
      "--key",
      "missingKey",
      "--language",
      "en",
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Key not found: missingKey");
  });

  it("shows an error when show receives both --key and --all-key", () => {
    const file = createTempCatalog();
    const result = runCli([
      "show",
      "--file",
      file,
      "--key",
      "closeAction",
      "--language",
      "en",
      "--all-key",
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Use either --key or --all-key with show, not both",
    );
  });

  it("shows an error when show receives neither --key nor --all-key", () => {
    const file = createTempCatalog();
    const result = runCli(["show", "--file", file, "--language", "en"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Missing required option: --key or --all-key",
    );
  });

  it("shows an error when a required option is missing", () => {
    const file = createTempCatalog();
    const result = runCli([
      "add",
      "--file",
      file,
      "--language",
      "ja",
      "--text",
      "閉じる",
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing required option: --key");
  });

  it("shows an error for an unknown command", () => {
    const file = createTempCatalog();
    const result = runCli(["rename", "--file", file]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unknown command: rename");
  });

  it("shows an error when the language is not supported", () => {
    const file = createTempCatalog();
    const result = runCli(["missing", "--file", file, "--language", "xx"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unsupported language: xx");
  });

  it("shows an error when the catalog file does not exist", () => {
    const result = runCli([
      "missing",
      "--file",
      "does-not-exist.xcstrings",
      "--language",
      "ja",
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Catalog file not found: does-not-exist.xcstrings",
    );
  });

  it("shows an error when the catalog file is invalid JSON", () => {
    const file = createTempInvalidCatalog();
    const result = runCli(["missing", "--file", file, "--language", "ja"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Invalid JSON in ${file}`);
  });

  it("shows the add result in dry-run mode without changing the file", () => {
    const file = createTempCatalog();
    const originalText = readCatalogText(file);
    const result = runCli([
      "add",
      "--file",
      file,
      "--key",
      "closeAction",
      "--language",
      "ja",
      "--text",
      "閉じる",
      "--dry-run",
    ]);

    expect(result.status).toBe(0);

    const catalog = JSON.parse(result.stdout);

    expect(catalog.strings.closeAction.localizations.ja).toEqual({
      stringUnit: {
        state: "translated",
        value: "閉じる",
      },
    });
    expect(readCatalogText(file)).toBe(originalText);
  });

  it("writes one added translation to disk", () => {
    const file = createTempCatalog();
    const result = runCli([
      "add",
      "--file",
      file,
      "--key",
      "closeAction",
      "--language",
      "ja",
      "--text",
      "閉じる",
    ]);

    expect(result.status).toBe(0);

    const catalog = JSON.parse(readCatalogText(file));

    expect(catalog.strings.closeAction.localizations.ja).toEqual({
      stringUnit: {
        state: "translated",
        value: "閉じる",
      },
    });
  });

  it("writes the comment when add receives --comment", () => {
    const file = createTempCatalog();
    const result = runCli([
      "add",
      "--file",
      file,
      "--key",
      "closeAction",
      "--language",
      "ja",
      "--text",
      "閉じる",
      "--comment",
      "Close action",
    ]);

    expect(result.status).toBe(0);

    const catalog = JSON.parse(readCatalogText(file));

    expect(catalog.strings.closeAction.comment).toBe("Close action");
  });

  it("creates a new key when add receives a missing key", () => {
    const file = createTempCatalog();
    const result = runCli([
      "add",
      "--file",
      file,
      "--key",
      "newAction",
      "--language",
      "ja",
      "--text",
      "新規",
    ]);

    expect(result.status).toBe(0);

    const catalog = JSON.parse(readCatalogText(file));

    expect(catalog.strings.newAction).toEqual({
      localizations: {
        ja: {
          stringUnit: {
            state: "translated",
            value: "新規",
          },
        },
      },
    });
  });

  it("shows the remove result in dry-run mode without changing the file", () => {
    const file = createTempCatalog();
    const originalText = readCatalogText(file);
    const result = runCli([
      "remove",
      "--file",
      file,
      "--key",
      "detailsAction",
      "--language",
      "ja",
      "--dry-run",
    ]);

    expect(result.status).toBe(0);

    const catalog = JSON.parse(result.stdout);

    expect(catalog.strings.detailsAction.localizations.ja).toBeUndefined();
    expect(readCatalogText(file)).toBe(originalText);
  });

  it("writes one removed translation to disk", () => {
    const file = createTempCatalog();
    const result = runCli([
      "remove",
      "--file",
      file,
      "--key",
      "detailsAction",
      "--language",
      "ja",
    ]);

    expect(result.status).toBe(0);

    const catalog = JSON.parse(readCatalogText(file));

    expect(catalog.strings.detailsAction.localizations.ja).toBeUndefined();
  });

  it("keeps the file unchanged when remove receives a missing key", () => {
    const file = createTempCatalog();
    const originalText = readCatalogText(file);
    const result = runCli([
      "remove",
      "--file",
      file,
      "--key",
      "missingKey",
      "--language",
      "ja",
    ]);

    expect(result.status).toBe(0);
    expect(readCatalogText(file)).toBe(originalText);
  });

  it("keeps the file unchanged when remove receives a missing language", () => {
    const file = createTempCatalog();
    const originalText = readCatalogText(file);
    const result = runCli([
      "remove",
      "--file",
      file,
      "--key",
      "closeAction",
      "--language",
      "fr",
    ]);

    expect(result.status).toBe(0);
    expect(readCatalogText(file)).toBe(originalText);
  });
});
