import { ButtonsLayout } from '../core/TGBot/buttons';

// Button Helpers
//...............................................................................

export const btnFiltersTextArr = ButtonsLayout.filters.flat().map(({ text }) => text);

export const btnCategoriesTextArr = ButtonsLayout.nameLists.flat().map(({ text }) => text);

export const btnFavoriteNameTextArr = ButtonsLayout.favoriteName.flat().map(({ text }) => text);

export const btnRandomNameTextArr = ButtonsLayout.randomName.flat().map(({ text }) => text);

export function btnKeysByVal(obj: Record<string, { text: string }>, values: string[]): string[] | string {
  const keys: string[] = [];

  values.forEach((value) => {
    const foundKey = Object.keys(obj).find((key) => obj[key].text === value);

    if (foundKey) {
      keys.push(foundKey);
    }
  });

  return keys.length > 1 ? keys : keys[0];
}
