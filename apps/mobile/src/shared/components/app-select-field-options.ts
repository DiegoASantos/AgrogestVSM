export type SearchableSelectOption = {
  label: string;
  helper?: string;
};

export function getVisibleSelectOptions<T extends SearchableSelectOption>(
  options: readonly T[],
  searchText: string,
  searchable: boolean,
  maxVisibleOptions?: number
) {
  const normalizedSearch = searchable ? normalizeSearchableText(searchText) : "";
  const matchingOptions = normalizedSearch
    ? options.filter((option) =>
        normalizeSearchableText(`${option.label} ${option.helper ?? ""}`).includes(
          normalizedSearch
        )
      )
    : [...options];
  const limit =
    typeof maxVisibleOptions === "number" && maxVisibleOptions > 0
      ? Math.floor(maxVisibleOptions)
      : null;
  const visibleOptions = limit ? matchingOptions.slice(0, limit) : matchingOptions;

  return {
    hasSearchText: normalizedSearch.length > 0,
    matchingOptionCount: matchingOptions.length,
    visibleOptions
  };
}

function normalizeSearchableText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
