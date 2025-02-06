import TelegramBot from 'node-telegram-bot-api';
import NodeCache from 'node-cache';
import { Prisma } from '@prisma/client';

import { Buttons, ButtonsLayout } from './btnMenu';
import { StepStatus } from '../constants';
import { QueryRepository, CommandRepository, INameMeaning, NameMeaningScraper, Config, Logger } from '../../core/';
import { btnCategoriesTextArr, btnFiltersTextArr, btnKeysByVal, btnRandomNameTextArr, queryCondition } from '../utils';
import { isName } from '../../utils';

interface IUserChatCache {
  step: string;
  selectedFilters?: string[];
  currentFavoriteName?: {
    name: string;
  };
  pagination?: {
    skip: number;
    count?: number;
  };
  query?: Prisma.NameWhereInput;
}

export class TGBot {
  public bot?: TelegramBot;
  private userCache: NodeCache;
  private nameMeanerService: NameMeaningScraper;
  private repository: QueryRepository;
  private command: CommandRepository;

  constructor(conf: Config) {
    const token = conf.services!.telegram!.authKey;
    if (!token) {
      throw new Error('You have to provide the bot-token from @BotFather via environment variable (SERVICE_TELEGRAM_API_KEY)');
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.userCache = new NodeCache({ stdTTL: 1800 });
      this.repository = new QueryRepository();
      this.command = new CommandRepository();
      this.nameMeanerService = new NameMeaningScraper();
      Logger.shared.info('Telegram bot initialized successfully');
    } catch (error) {
      Logger.shared.error(error as Error, `Failed to initialize Telegram bot`);
      throw error;
    }
  }

  async setupMenu(): Promise<void> {
    if (!this.bot) {
      Logger.shared.fail("Bot don't initialize!");
      return;
    }

    this.bot.onText(/\/start/, async (msg) => {
      await this.sendMenuDelCash(msg.chat.id);
      return;
    });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text!;
      await this.bot!.sendChatAction(chatId, 'typing');

      const userCache: IUserChatCache | undefined = this.getUserChatCache(chatId);

      if (text === Buttons.back.text) {
        return this.sendMenuDelCash(chatId);
      }

      if (userCache?.step === StepStatus.NAME_MEANING_WAITING) {
        return this.btnNameMeaning(chatId, text);
      }

      if (userCache?.step === StepStatus.NAME_LISTS_WAITING) {
        return this.btnListByCategory(chatId, text);
      }

      if (userCache?.step === StepStatus.FILTER_WAITING) {
        return this.btnSearchParams(chatId, text);
      }

      if (userCache?.step === StepStatus.FAVORITE_NAME_WAITING) {
        return this.btnFavoriteName(chatId, text);
      }

      if (userCache?.step === StepStatus.RANDOM_NAME_WAITING) {
        return this.btnRandomName(chatId, text);
      }

      await this.handleMenuSelection(chatId, text);
    });
  }

  setUserChatCache(chatId: number, cache: IUserChatCache): void {
    this.userCache.set(chatId, cache);
  }

  getUserChatCache(chatId: number): IUserChatCache | undefined {
    const cachedData = this.userCache.get<IUserChatCache>(chatId);
    return cachedData; // Возвращаем значение с типом IUserChatCache
  }

  //...................................................................

  private async btnFavoriteName(chatId: number, text: string): Promise<void> {
    const userCache: IUserChatCache | undefined = this.getUserChatCache(chatId);

    if (!userCache || userCache.step !== StepStatus.FAVORITE_NAME_WAITING) {
      await this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
      return this.sendMenuDelCash(chatId);
    }

    if (isName(text, 3, 15).error) {
      return this.sendMessage(chatId, '<b>Не валидное имя!</b> \n <i>( не меньше 3 букв и не больше 15 )</i>');
    }

    const key = btnKeysByVal(Buttons.favoriteName, [text]);

    if (!key) {
      userCache.currentFavoriteName = { name: text };
      this.setUserChatCache(chatId, userCache);
      return this.sendFavoriteName(chatId, '<b>Теперь выберите действие.</b>');
    }

    if (!userCache?.currentFavoriteName?.name) {
      return this.sendMessage(chatId, '<b>Введите Имя!</b>');
    }

    if (!Array.isArray(key) && userCache?.currentFavoriteName?.name) {
      return this.handleAddOrDelete(chatId, key);
    }

    await this.sendMessage(chatId, 'Ошибка. Попробуйте заново.');
    return this.sendMenuDelCash(chatId);
  }

  private async btnListByCategory(chatId: number, tCategory: string) {
    const userCache: IUserChatCache | undefined = this.getUserChatCache(chatId);
    let query = userCache?.query;

    if (!userCache || userCache.step !== StepStatus.NAME_LISTS_WAITING) {
      return this.sendMenuDelCash(chatId, 'Ошибка! Попробуйте начать заново.');
    }

    if (!query && !btnCategoriesTextArr.includes(tCategory)) {
      return this.sendMessage(chatId, 'Выберите категорию из списка меню!');
    }

    if (!query) {
      const category = btnKeysByVal(Buttons.nameLists, [tCategory]) as string;
      query = { category };
      userCache.query = query;
    }

    const nameList = (await this.repository.listCategory(query, userCache.pagination?.skip)).sort(() => Math.random() - 0.5);

    const formattedNameList = nameList.map((el) => `<b>${el.name}</b> - <code>${el.note}</code>\n\n`).join(' ');

    this.moreAction(chatId, userCache);
    await this.sendMore(chatId, formattedNameList);
  }

  private async btnSearchParams(chatId: number, filter: string): Promise<void> {
    const userCache: IUserChatCache | undefined = this.getUserChatCache(chatId);

    if (filter === Buttons.apply.text || filter === Buttons.more.text) {
      Logger.shared.dbg('addFilter', userCache?.selectedFilters);
      return this.applyParams(chatId, userCache?.selectedFilters);
    }

    if (!userCache || userCache.step !== StepStatus.FILTER_WAITING) {
      await this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
      return this.sendMenuDelCash(chatId);
    }

    if (!btnFiltersTextArr.includes(filter)) {
      return this.sendMessage(chatId, 'Выберите параметр из списка меню!');
    }

    const filterIndex = userCache.selectedFilters!.indexOf(filter);
    filterIndex !== -1 ? userCache.selectedFilters!.splice(filterIndex, 1) : userCache.selectedFilters!.push(filter);

    this.setUserChatCache(chatId, userCache);

    await this.sendMessage(chatId, `Текущие фильтры: ${userCache.selectedFilters!.join(', ')}`);

    if (userCache.selectedFilters!.length === Object.keys(Buttons.filters).length) {
      return this.sendMessage(chatId, 'Все фильтры выбраны. Нажмите "Применить".', { reply_markup: { keyboard: ButtonsLayout.apply, resize_keyboard: true } });
    }
  }

  private async btnRandomName(chatId: number, action?: string): Promise<void> {
    const userCache: IUserChatCache | undefined = this.getUserChatCache(chatId);

    if (!userCache || userCache.step !== StepStatus.RANDOM_NAME_WAITING) {
      await this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
      return this.sendMenuDelCash(chatId);
    }

    if (!action || action === Buttons.randomName.requestAnother.text) {
      return this.getRandomName(chatId, userCache);
    }

    const actionsMap: Record<string, () => Promise<void>> = {
      [Buttons.randomName.accept.text]: async () => await this.acceptAction(chatId, userCache),
      [Buttons.randomName.addToFavorites.text]: async () => await this.favoritesAction(chatId, userCache),
    };

    if (actionsMap[action]) {
      return actionsMap[action]();
    }

    if (!btnRandomNameTextArr.includes(action)) {
      return this.sendMessage(chatId, 'Выберите действие из списка меню!');
    }

    return this.getRandomName(chatId, userCache);
  }

  private async btnNameMeaning(chatId: number, name: string) {
    if (isName(name, 3, 15).error) {
      return this.sendMessage(chatId, '<b>Не валидное имя!</b> \n <i>( не меньше 3 букв и не больше 15 )</i>');
    }

    const meanService: INameMeaning | undefined = await this.nameMeanerService.getNameMeaning(name);
    const meanDB = await this.repository.getName(name);

    const response: string = meanService ? `${meanService.name}\n\n${meanService.meaning}` : meanDB ? `Значение имени: \n\n${meanDB.note}` : 'Значений не найдео.';

    await this.sendNameMeaning(chatId, response);
  }

  private moreAction(chatId: number, userCache: IUserChatCache) {
    Logger.shared.dbg('moreAction', userCache);
    if (userCache === undefined) {
      return this.sendMenuDelCash(chatId, 'Ошибка! Попробуйте начать заново.');
    }

    if (!userCache?.pagination) {
      userCache.pagination = { skip: 2 };
      this.setUserChatCache(chatId, userCache);
      return;
    }

    const skipUp = userCache.pagination.skip + 1;
    userCache.pagination.skip = skipUp;
    this.setUserChatCache(chatId, userCache);
  }

  //...................................................................

  //...................................................................

  private async sendSearchByFilters(chatId: number) {
    await this.sendMessage(chatId, 'Выберите параметры:', {
      reply_markup: { keyboard: ButtonsLayout.filters, resize_keyboard: true },
    });
  }

  private async sendNameLists(chatId: number, message?: string) {
    await this.sendMessage(chatId, message || 'Выберите категорию:', {
      reply_markup: { keyboard: ButtonsLayout.nameLists, resize_keyboard: true },
    });
  }

  private async sendNameMeaning(chatId: number, text?: string) {
    await this.sendMessage(chatId, text || 'Введите имя, и я расскажу о его значении.', {
      reply_markup: { keyboard: ButtonsLayout.back, resize_keyboard: true },
    });
  }

  private async sendRandomName(chatId: number) {
    await this.sendMessage(chatId, 'Ищу для вас случайное Имя...', {
      reply_markup: { keyboard: ButtonsLayout.randomName, resize_keyboard: true },
    });
  }

  private async sendFavoriteName(chatId: number, message: string) {
    await this.sendMessage(chatId, message, {
      reply_markup: { keyboard: ButtonsLayout.favoriteName, resize_keyboard: true },
    });
  }

  private async sendMore(chatId: number, text: string) {
    await this.sendMessage(chatId, text || '___', {
      reply_markup: { keyboard: ButtonsLayout.more, resize_keyboard: true },
    });
  }

  //...................................................................

  private async handleMenuSelection(chatId: number, text: string): Promise<void> {
    this.userCache.del(chatId);

    // Определяем действия для каждого пункта меню
    const menuActions: Record<string, () => Promise<void>> = {
      // Поиск по фильтрам
      [Buttons.mainMenu.searchByFilters.text]: async () => {
        this.setUserChatCache(chatId, { step: StepStatus.FILTER_WAITING, selectedFilters: [] });
        await this.sendSearchByFilters(chatId);
      },

      // Списки имен
      [Buttons.mainMenu.nameLists.text]: async () => {
        this.setUserChatCache(chatId, { step: StepStatus.NAME_LISTS_WAITING, selectedFilters: [] });
        await this.sendNameLists(chatId);
      },

      // Значение имени
      [Buttons.mainMenu.nameMeaning.text]: async () => {
        this.setUserChatCache(chatId, { step: StepStatus.NAME_MEANING_WAITING, selectedFilters: [] });
        await this.sendNameMeaning(chatId);
      },

      // Случайное имя
      [Buttons.mainMenu.randomName.text]: async () => {
        this.setUserChatCache(chatId, { step: StepStatus.RANDOM_NAME_WAITING, selectedFilters: [] });
        await this.sendRandomName(chatId);
        this.btnRandomName(chatId);
      },

      // Избранное
      [Buttons.mainMenu.favorites.text]: async () => {
        this.setUserChatCache(chatId, { step: StepStatus.FAVORITE_NAME_WAITING, selectedFilters: [] });
        const favorites: string = await this.repository.listFavorites(chatId).then((r) => r.map((n) => `<code>${n.name}</code>`).join(', ') || '<i>Ваш список избранных имен пуст.</i>');
        const message = `<b>Введите имя и выберите ✅  |  ❌</b>\n ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n<b>ИЗБРАННЫЕ:</b> ${favorites}`;
        await this.sendFavoriteName(chatId, message);
      },

      // Настройки
      [Buttons.mainMenu.settings.text]: async () => {
        await this.sendMessage(chatId, 'Функционал раздела еще не реализова.', {
          reply_markup: { keyboard: ButtonsLayout.settings, resize_keyboard: true },
        });
      },
    };

    if (menuActions[text]) {
      await menuActions[text]();
    } else {
      Logger.shared.dbg('handleMenuSelection: Неизвестный текст', { text });
      await this.sendMessage(chatId, 'Пожалуйста, выберите один из пунктов меню.');
      return this.sendMenuDelCash(chatId);
    }
  }

  private async handleAddOrDelete(chatId: number, action: string) {
    const userCashe: IUserChatCache | undefined = this.getUserChatCache(chatId);
    const favorite = userCashe?.currentFavoriteName?.name;

    if (!Buttons.favoriteName[action] || !favorite) {
      await this.sendMessage(chatId, 'Ошибка. Попробуйте заново.');
      return this.sendMenuDelCash(chatId);
    }

    if (action === 'add') {
      await this.saveFavoriteName(chatId, favorite);
      const favorites: string = await this.repository.listFavorites(chatId).then((r) => r.map((n) => `<code>${n.name}</code>`).join(', ') || '<i>Ваш список избранных имен пуст.</i>');
      await this.sendMessage(chatId, `<b> ✅ Имя добавлено в Избранные!</b>\n ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n<b>ИЗБРАННЫЕ:</b> ${favorites}`, {
        reply_markup: { keyboard: ButtonsLayout.favoriteName, resize_keyboard: true },
      });
      return;
    }

    await this.command.deleteFavoriteName(chatId, favorite);
    const favorites: string = await this.repository.listFavorites(chatId).then((r) => r.map((n) => `<code>${n.name}</code>`).join(', ') || '<i>Ваш список избранных имен пуст.</i>');
    await this.sendMessage(chatId, `<b>❌  Имя удалено </b>\n ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n<b>ИЗБРАННЫЕ:</b> ${favorites}`, {
      reply_markup: { keyboard: ButtonsLayout.favoriteName, resize_keyboard: true },
    });
  }

  private async getRandomName(chatId: number, userCache: IUserChatCache): Promise<void> {
    const result = await this.repository.randomName();
    userCache.currentFavoriteName = { name: result.name };
    this.setUserChatCache(chatId, userCache);
    return this.sendMessage(chatId, `<b>${result.name}</b> - <code>${result.note}</code>\n\n\nВыберите действие:`);
  }

  private async applyParams(chatId: number, filters?: string[]): Promise<void> {
    const userCache = this.getUserChatCache(chatId);
    let query = userCache?.query;

    if ((!query && !filters) || !userCache) {
      return this.sendMenuDelCash(chatId, `Что-то пошло не так...`);
    }

    if (!query && filters) {
      query = queryCondition(btnKeysByVal(Buttons.filters, filters));
      userCache.query = query;
    }

    const nameList = (await this.repository.listFilter(query!, userCache?.pagination?.skip)).sort(() => Math.random() - 0.5);

    const formattedNameList = nameList.map((el) => `<code>${el.name}</code> - <i>${el.note}</i>\n\n`).join(' ');

    this.moreAction(chatId, userCache);
    await this.sendMore(chatId, formattedNameList);
  }

  private async acceptAction(chatId: number, userCache: IUserChatCache): Promise<void> {
    if (!userCache.currentFavoriteName?.name) {
      return this.sendMenuDelCash(chatId, 'Ошибка! Попробуйте начать заново.');
    }

    await this.saveFavoriteName(chatId, userCache.currentFavoriteName.name);
    await this.sendMessage(chatId, 'Имя добавлено в избранные');
    return this.sendMenuDelCash(chatId);
  }

  private async favoritesAction(chatId: number, userCache: IUserChatCache): Promise<void> {
    if (!userCache.currentFavoriteName?.name) {
      return this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
    }
    await this.saveFavoriteName(chatId, userCache.currentFavoriteName.name);
    return this.sendMessage(chatId, 'Имя добавлено в Избранное.');
  }

  //...................................................................

  private async saveFavoriteName(chatId: number, name: string): Promise<void> {
    return await this.command.saveFavoriteName(chatId, name);
  }

  //...................................................................

  async sendMessage(chatId: number, message: string, opt?: TelegramBot.SendMessageOptions): Promise<void> {
    const trimmedMessage = message.length <= 4090 ? message : message.slice(0, 4090);

    const options: TelegramBot.SendMessageOptions = {
      parse_mode: 'HTML',
      // disable_web_page_preview: true,
      disable_notification: true,
      ...opt,
    };

    try {
      await this.bot!.sendMessage(chatId, trimmedMessage, options);
      return;
    } catch (error) {
      Logger.shared.fail(`Failed to send message: ${(error as Error).message}`, { options, trimmedMessage });
      return;
    }
  }

  private async sendMenuDelCash(chatId: number, text?: string): Promise<void> {
    this.userCache.del(chatId);

    await this.sendMessage(chatId, text || 'Главное меню', {
      reply_markup: { keyboard: ButtonsLayout.mainMenu, resize_keyboard: true },
    });
  }

  stopBot(): void | never {
    if (this.bot) {
      try {
        this.bot.stopPolling();
        Logger.shared.info('Telegram bot stop Polling!');
      } catch (error) {
        const e = error as Error;
        Logger.shared.error(e);
        throw error;
      }
    }
  }
}
