import { readFileSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  addTranslation,
  findMissingTranslations,
  getAllTranslationDetails,
  getTranslationDetails,
  removeTranslation,
} from "../src/catalog.js";

const catalogPath = fileURLToPath(
  new URL("../Localizable.xcstrings", import.meta.url),
);

function createCatalog() {
  return JSON.parse(readFileSync(catalogPath, "utf8"));
}

describe("findMissingTranslations", () => {
  it("returns all keys that are missing one language", () => {
    expect(findMissingTranslations(createCatalog(), "ja")).toEqual([
      {
        key: "closeAction",
        text: "Close",
        comment: "Close button title",
      },
    ]);
  });
});

describe("getTranslationDetails", () => {
  it("returns one key for one language", () => {
    expect(
      getTranslationDetails(createCatalog(), {
        key: "closeAction",
        language: "en",
      }),
    ).toEqual({
      key: "closeAction",
      language: "en",
      comment: "Close button title",
      state: "translated",
      text: "Close",
    });
  });

  it("returns null when the key does not exist", () => {
    expect(
      getTranslationDetails(createCatalog(), {
        key: "missingKey",
        language: "en",
      }),
    ).toBeNull();
  });

  it("returns null values when the language does not exist", () => {
    expect(
      getTranslationDetails(createCatalog(), {
        key: "closeAction",
        language: "fr",
      }),
    ).toEqual({
      key: "closeAction",
      language: "fr",
      comment: "Close button title",
      state: null,
      text: null,
    });
  });
});

describe("getAllTranslationDetails", () => {
  it("returns all keys for one language", () => {
    expect(getAllTranslationDetails(createCatalog(), "ja")).toEqual([
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
  });
});

describe("addTranslation", () => {
  it("adds one translation without mutating the input catalog", () => {
    const catalog = createCatalog();
    const nextCatalog = addTranslation(catalog, {
      key: "closeAction",
      language: "ja",
      text: "閉じる",
    });

    expect(nextCatalog.strings.closeAction.localizations.ja).toEqual({
      stringUnit: {
        state: "translated",
        value: "閉じる",
      },
    });
    expect(catalog.strings.closeAction.localizations.ja).toBeUndefined();
  });

  it("updates the comment when one is provided", () => {
    const nextCatalog = addTranslation(createCatalog(), {
      key: "closeAction",
      language: "ja",
      text: "閉じる",
      comment: "Close action",
    });

    expect(nextCatalog.strings.closeAction.comment).toBe("Close action");
  });

  it("creates a new key when the key does not exist", () => {
    const nextCatalog = addTranslation(createCatalog(), {
      key: "newAction",
      language: "ja",
      text: "新規",
    });

    expect(nextCatalog.strings.newAction).toEqual({
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
});

describe("removeTranslation", () => {
  it("removes one translation without mutating the input catalog", () => {
    const catalog = createCatalog();
    const nextCatalog = removeTranslation(catalog, {
      key: "detailsAction",
      language: "ja",
    });

    expect(nextCatalog.strings.detailsAction.localizations.ja).toBeUndefined();
    expect(
      catalog.strings.detailsAction.localizations.ja.stringUnit.value,
    ).toBe("詳細");
  });

  it("keeps the catalog unchanged when the key does not exist", () => {
    const catalog = createCatalog();
    const nextCatalog = removeTranslation(catalog, {
      key: "missingKey",
      language: "ja",
    });

    expect(nextCatalog).toEqual(catalog);
  });

  it("keeps the catalog unchanged when the language does not exist", () => {
    const catalog = createCatalog();
    const nextCatalog = removeTranslation(catalog, {
      key: "closeAction",
      language: "fr",
    });

    expect(nextCatalog).toEqual(catalog);
  });
});
