#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { URL, fileURLToPath, pathToFileURL } from "node:url";
import {
  addTranslation,
  findMissingTranslations,
  formatJson,
  getAllTranslationDetails,
  getTranslationDetails,
  parseCatalog,
  removeTranslation,
} from "./catalog.js";

function getUsage() {
  return [
    "Usage:",
    "  xcs missing --file FILE --language LANG",
    "  xcs show --file FILE --language LANG (--key KEY | --all-key)",
    "  xcs add --file FILE --key KEY --language LANG --text TEXT [--comment COMMENT] [--dry-run]",
    "  xcs remove --file FILE --key KEY --language LANG [--dry-run]",
    "",
  ].join("\n");
}

function parseCli(argv) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      comment: {
        type: "string",
        short: "c",
      },
      file: {
        type: "string",
        short: "f",
      },
      "all-key": {
        type: "boolean",
      },
      "dry-run": {
        type: "boolean",
      },
      help: {
        type: "boolean",
        short: "h",
      },
      key: {
        type: "string",
        short: "k",
      },
      language: {
        type: "string",
        short: "l",
      },
      text: {
        type: "string",
        short: "t",
      },
    },
  });

  return {
    command: positionals[0],
    options: values,
  };
}

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const supportedLanguages = new Set([
  "ar",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "fi",
  "fr",
  "hi",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "nl",
  "ms",
  "pl",
  "pt-BR",
  "pt-PT",
  "ru",
  "sv",
  "th",
  "uk",
  "vi",
  "zh-Hans",
  "zh-Hant",
]);

function requireOption(name, value) {
  if (!value) {
    throw new Error(`Missing required option: --${name}`);
  }

  return value;
}

function validateLanguage(language) {
  if (!supportedLanguages.has(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }

  return language;
}

function requireLanguage(options) {
  return validateLanguage(requireOption("language", options.language));
}

function requireKey(options) {
  return requireOption("key", options.key);
}

function requireKeyAndLanguage(options) {
  return {
    key: requireKey(options),
    language: requireLanguage(options),
  };
}

function isDryRun(options) {
  return options["dry-run"] === true;
}

function writeOutput(value) {
  process.stdout.write(formatJson(value));
}

function writeText(value) {
  process.stdout.write(value);
}

function validateShowOptions(options) {
  if (options["all-key"] === true && options.key) {
    throw new Error("Use either --key or --all-key with show, not both");
  }

  if (options["all-key"] !== true && !options.key) {
    throw new Error("Missing required option: --key or --all-key");
  }
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveCatalogPath(file) {
  if (isAbsolute(file)) {
    if (await pathExists(file)) {
      return file;
    }

    throw new Error(`Catalog file not found: ${file}`);
  }

  const cwdPath = resolve(process.cwd(), file);

  if (await pathExists(cwdPath)) {
    return cwdPath;
  }

  const projectPath = resolve(projectRoot, file);

  if (await pathExists(projectPath)) {
    return projectPath;
  }

  throw new Error(`Catalog file not found: ${file}`);
}

async function loadCatalog(file) {
  const text = await readFile(file, "utf8");

  try {
    return parseCatalog(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${file}: ${error.message}`, {
      cause: error,
    });
  }
}

async function saveCatalog(file, catalog) {
  const tempFile = join(dirname(file), `.${randomUUID()}.tmp`);

  try {
    await writeFile(tempFile, formatJson(catalog), "utf8");
    await rename(tempFile, file);
  } catch (error) {
    try {
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors.
    }

    throw new Error(`Failed to save catalog: ${file}`, {
      cause: error,
    });
  }
}

async function outputOrSaveCatalog(file, catalog, dryRun) {
  if (dryRun) {
    writeOutput(catalog);
    return;
  }

  await saveCatalog(file, catalog);
}

const commandHandlers = {
  async missing({ catalog, options }) {
    writeOutput(findMissingTranslations(catalog, requireLanguage(options)));
  },

  async show({ catalog, options }) {
    const language = requireLanguage(options);

    validateShowOptions(options);

    if (options["all-key"] === true) {
      writeOutput(getAllTranslationDetails(catalog, language));
      return;
    }

    const key = requireKey(options);
    const translationDetails = getTranslationDetails(catalog, {
      key,
      language,
    });

    if (!translationDetails) {
      throw new Error(`Key not found: ${key}`);
    }

    writeOutput(translationDetails);
  },

  async add({ catalog, file, options }) {
    const { key, language } = requireKeyAndLanguage(options);
    const text = requireOption("text", options.text);
    const nextCatalog = addTranslation(catalog, {
      key,
      language,
      text,
      comment: options.comment ?? "",
    });

    await outputOrSaveCatalog(file, nextCatalog, isDryRun(options));
  },

  async remove({ catalog, file, options }) {
    const nextCatalog = removeTranslation(
      catalog,
      requireKeyAndLanguage(options),
    );

    await outputOrSaveCatalog(file, nextCatalog, isDryRun(options));
  },
};

export async function run(argv = process.argv.slice(2)) {
  const { command, options } = parseCli(argv);

  if (!command || options.help) {
    writeText(getUsage());
    return;
  }

  const handler = commandHandlers[command];

  if (!handler) {
    throw new Error(`Unknown command: ${command}`);
  }

  const file = await resolveCatalogPath(requireOption("file", options.file));
  const catalog = await loadCatalog(file);

  await handler({ catalog, file, options });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
