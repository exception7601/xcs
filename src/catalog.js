function cloneJson(value) {
  return globalThis.structuredClone(value);
}

export function parseCatalog(text) {
  return JSON.parse(text);
}

export function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function findMissingTranslations(catalog, language) {
  const sourceLanguage = catalog.sourceLanguage;

  return Object.entries(catalog.strings ?? {})
    .filter(([, entry]) => entry.localizations?.[language] == null)
    .map(([key, entry]) => ({
      key,
      text: entry.localizations?.[sourceLanguage]?.stringUnit?.value ?? "",
      comment: entry.comment ?? "",
    }));
}

export function getTranslationDetails(catalog, { key, language }) {
  const entry = catalog.strings?.[key];

  if (!entry) {
    return null;
  }

  const localization = entry.localizations?.[language]?.stringUnit;

  return {
    key,
    language,
    comment: entry.comment ?? "",
    state: localization?.state ?? null,
    text: localization?.value ?? null,
  };
}

export function getAllTranslationDetails(catalog, language) {
  return Object.entries(catalog.strings ?? {}).map(([key]) =>
    getTranslationDetails(catalog, { key, language }),
  );
}

export function addTranslation(catalog, { key, language, text, comment = "" }) {
  const nextCatalog = cloneJson(catalog);

  nextCatalog.strings ??= {};
  nextCatalog.strings[key] ??= {};
  nextCatalog.strings[key].localizations ??= {};
  nextCatalog.strings[key].localizations[language] = {
    stringUnit: {
      state: "translated",
      value: text,
    },
  };

  if (comment) {
    nextCatalog.strings[key].comment = comment;
  }

  return nextCatalog;
}

export function removeTranslation(catalog, { key, language }) {
  const nextCatalog = cloneJson(catalog);

  if (nextCatalog.strings?.[key]?.localizations) {
    delete nextCatalog.strings[key].localizations[language];
  }

  return nextCatalog;
}
