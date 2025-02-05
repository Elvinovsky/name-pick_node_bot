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

  favoriteName: {
    delete: { text: '❌  Удалить' },
    add: { text: '✅ Добавить' },
  },
  filters: {
    genderBoy: { text: '👦 Мальчик' },
    genderGirl: { text: '👧 Девочка' },
    eroupean: { text: '🌍 Европейские' },
    eastern: { text: '🌏 Восточные' },
    arabian: { text: '🕌 Арабские' },
    caucasian: { text: '🏔 Кавказские' },
    rare: { text: 'Редкие' },
  },
  randomName: {
    accept: { text: '✅ Принять' },
    requestAnother: { text: '🔁 Попросить другое' },
    addToFavorites: { text: '❤️ Добавить в избранное' },
  },
  nameLists: {
    topPopulare: { text: "💎 Топ популярных имен" },
    rareUnusual: { text: '🕊 Редкие и необычные' },
    classicOld: { text: '📜 Классические и старинные' },
  },
  settings: {
    exportFavorites: { text: '📥 Экспорт избранных имен' },
    notifications: { text: '🔔 Уведомления' },
    theme: { text: '🎨 Тема' },
    language: { text: '🌍 Язык интерфейса' },
  },
  back: { text: '⬅️ В главное меню' },
  apply: { text: '✅ Применить' },
  more: { text: '🔄 Загрузить ещё' },
} as const;

export const ButtonsLayout: ButtonsLayoutType = {
  mainMenu: [
    [Buttons.mainMenu.searchByFilters, Buttons.mainMenu.randomName],
    [Buttons.mainMenu.nameLists, Buttons.mainMenu.nameMeaning],
    [Buttons.mainMenu.favorites, Buttons.mainMenu.settings],
  ],

  filters: [
    [Buttons.filters.genderBoy, Buttons.filters.genderGirl, Buttons.filters.rare],
    [Buttons.filters.eroupean, Buttons.filters.eastern],
    [Buttons.filters.arabian, Buttons.filters.caucasian],
    [Buttons.apply, Buttons.back],
  ],
  nameLists: [
    [Buttons.nameLists.topPopulare, Buttons.nameLists.rareUnusual],
    [Buttons.nameLists.classicOld, Buttons.back],
  ],

  favoriteName: [[Buttons.favoriteName.add, Buttons.favoriteName.delete], [Buttons.back]],

  randomName: [[Buttons.randomName.accept, Buttons.randomName.requestAnother], [Buttons.randomName.addToFavorites], [Buttons.back]],

  settings: [[Buttons.settings.exportFavorites, Buttons.settings.notifications], [Buttons.settings.theme, Buttons.settings.language], [Buttons.back]],

  more: [[Buttons.more], [Buttons.back]],

  back: [[Buttons.back]],

  apply: [[Buttons.apply]],
} as const;

//INTERFACES / TYPES
//...........................................................

interface IButtons {
  mainMenu: IMainMenuButtons;
  filters: IFiltersButtons;
  randomName: IRandomNameButtons;
  favoriteName: IFavoriteNameButtons;
  nameLists: INameListsButtons;
  settings: ISettingsButtons;
  back: IButton;
  apply: IButton;
  more: IButton;
}

type ButtonsLayoutType = {
  [key in keyof IButtons]: KeyboardButton[][];
};

interface IButton {
  text: string;
}

interface IMainMenuButtons {
  [key: string]: { text: string };
  searchByFilters: IButton;
  randomName: IButton;
  nameLists: IButton;
  nameMeaning: IButton;
  favorites: IButton;
  settings: IButton;
}

interface IFiltersButtons {
  [key: string]: { text: string };
  genderBoy: IButton;
  genderGirl: IButton;
  eroupean: IButton;
  eastern: IButton;
  arabian: IButton;
  caucasian: IButton;
  rare: IButton;
}

interface IRandomNameButtons {
  [key: string]: { text: string };
  accept: IButton;
  requestAnother: IButton;
  addToFavorites: IButton;
}

interface IFavoriteNameButtons {
  [key: string]: { text: string };
  add: IButton;
  delete: IButton;
}

interface INameListsButtons {
  [key: string]: { text: string };
  topPopulare: IButton;
  rareUnusual: IButton;
  classicOld: IButton;
}

interface ISettingsButtons {
  [key: string]: { text: string };
  exportFavorites: IButton;
  notifications: IButton;
  theme: IButton;
  language: IButton;
}
