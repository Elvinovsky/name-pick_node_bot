import { KeyboardButton } from 'node-telegram-bot-api';

//MENU UI
//...........................................................

export const Buttons: IButtons = {
  mainMenu: {
    searchByFilters: { text: '🔍 Подбор имени (по параметрам)' },
    randomName: { text: '🎲 Случайное имя' },
    nameLists: { text: '📜 Списки имен' },
    nameMeaning: { text: '💡 Значение имени' },
    favorites: { text: '❤️ Избранные имена' },
    settings: { text: '⚙️ Настройки' },
  },
  filters: {
    genderBoy: { text: '👦 Мальчик' },
    genderGirl: { text: '👧 Девочка' },
    originRussian: { text: '🇷🇺 Русские' },
    originFrench: { text: '🇫🇷 Французские' },
    originIndian: { text: '🇮🇳 Индийские' },
    top10: { text: 'Топ-10' },
    rare: { text: 'Редкие' },
    unique: { text: 'Уникальные' },
  },
  randomName: {
    accept: { text: '✅ Принять' },
    requestAnother: { text: '🔁 Попросить другое' },
    addToFavorites: { text: '❤️ Добавить в избранное' },
  },
  nameLists: {
    topPopular: { text: '💎 Топ популярных имен' },
    rareUnusual: { text: '🕊 Редкие и необычные' },
    classicOld: { text: '📜 Классические и старинные' },
  },
  settings: {
    exportFavorites: { text: '📥 Экспорт избранных имен' },
    notifications: { text: '🔔 Уведомления' },
    theme: { text: '🎨 Тема' },
    language: { text: '🌍 Язык интерфейса' },
  },
  back: { text: '⬅️ Назад' },
} as const;

export const ButtonsLayout: ButtonsLayoutType = {
  mainMenu: [
    [Buttons.mainMenu.searchByFilters, Buttons.mainMenu.randomName],
    [Buttons.mainMenu.nameLists, Buttons.mainMenu.nameMeaning],
    [Buttons.mainMenu.favorites, Buttons.mainMenu.settings],
  ],

  filters: [
    [Buttons.filters.genderBoy, Buttons.filters.genderGirl],
    [Buttons.filters.originRussian, Buttons.filters.originFrench, Buttons.filters.originIndian],
    [Buttons.filters.top10, Buttons.filters.rare, Buttons.filters.unique],
    [Buttons.back],
  ],

  randomName: [[Buttons.randomName.accept, Buttons.randomName.requestAnother], [Buttons.randomName.addToFavorites], [Buttons.back]],

  nameLists: [
    [Buttons.nameLists.topPopular, Buttons.nameLists.rareUnusual],
    [Buttons.nameLists.classicOld, Buttons.back],
  ],
  settings: [[Buttons.settings.exportFavorites, Buttons.settings.notifications], [Buttons.settings.theme, Buttons.settings.language], [Buttons.back]],

  back: [[Buttons.back]],
} as const;

const Commands = [
  {
    command: 'start',
    description: 'Запуск бота',
  },
];

//INTERFACES
//...........................................................

interface IButtons {
  mainMenu: MainMenuButtons;
  filters: FiltersButtons;
  randomName: RandomNameButtons;
  nameLists: NameListsButtons;
  settings: SettingsButtons;
  back: Button;
}

type ButtonsLayoutType = {
  [key in keyof IButtons]: KeyboardButton[][];
};

export interface ButtonAction extends Button {
  action: () => Promise<number | void>;
}

interface Button {
  text: string;
}

interface MainMenuButtons {
  searchByFilters: Button;
  randomName: Button;
  nameLists: Button;
  nameMeaning: Button;
  favorites: Button;
  settings: Button;
}

interface FiltersButtons {
  genderBoy: Button;
  genderGirl: Button;
  originRussian: Button;
  originFrench: Button;
  originIndian: Button;
  top10: Button;
  rare: Button;
  unique: Button;
}

interface RandomNameButtons {
  accept: Button;
  requestAnother: Button;
  addToFavorites: Button;
}

interface NameListsButtons {
  topPopular: Button;
  rareUnusual: Button;
  classicOld: Button;
}

interface SettingsButtons {
  exportFavorites: Button;
  notifications: Button;
  theme: Button;
  language: Button;
}
