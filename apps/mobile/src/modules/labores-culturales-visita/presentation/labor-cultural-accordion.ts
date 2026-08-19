export type LaborAccordionGroup = {
  categoryCode: string;
  itemIds: string[];
};

export function findFirstLaborCategoryWithoutSelection(
  groups: LaborAccordionGroup[],
  selectedLaborIds: Set<string>
): string | null {
  return (
    groups.find((group) => !group.itemIds.some((itemId) => selectedLaborIds.has(itemId)))
      ?.categoryCode ?? null
  );
}

export function findNextLaborCategoryWithoutSelection(
  groups: LaborAccordionGroup[],
  selectedLaborIds: Set<string>,
  completedCategoryCode: string
): string | null {
  const completedIndex = groups.findIndex(
    (group) => group.categoryCode === completedCategoryCode
  );
  const orderedGroups =
    completedIndex >= 0
      ? [...groups.slice(completedIndex + 1), ...groups.slice(0, completedIndex + 1)]
      : groups;

  return findFirstLaborCategoryWithoutSelection(orderedGroups, selectedLaborIds);
}

export function toLaborAccordionGroups(
  groups: Array<{ categoryCode: string; items: Array<{ id: string }> }>
): LaborAccordionGroup[] {
  return groups.map((group) => ({
    categoryCode: group.categoryCode,
    itemIds: group.items.map((item) => item.id)
  }));
}
