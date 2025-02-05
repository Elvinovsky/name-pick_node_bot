import TelegramBot from 'node-telegram-bot-api';
import NodeCache from 'node-cache';

import { btnCategoriesTextArr, btnFiltersTextArr, btnKeysByVal, btnRandomNameTextArr, queryCondition } from '../utils';
import { Buttons, ButtonsLayout } from './btnMenu';
import { StepStatus } from '../constants';

import { QueryRepository, CommandRepository } from '../../core/';
import { INameMeaning, NameMeaner } from '../../core/';
import { Config } from '../../core';
import { Logger } from '../../core';
interface IUserChatCashe {
  step: string;
  selectedFilters: string[];
  currentFavoriteName: {
    id?: number;
    name: string;
  };
}

export class TGBot {
  public bot?: TelegramBot;
  private userCache: NodeCache;
  private nameMeanerService: NameMeaner;
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
      this.nameMeanerService = new NameMeaner();
      Logger.shared.info('Telegram bot initialized successfully');
    } catch (error) {
      Logger.shared.error(error as Error, `Failed to initialize Telegram bot`);
      throw error;
    }
  }

  setupMenu(): void {
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
      const userCache: IUserChatCashe | undefined = this.userCache.get(chatId);

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

  //...................................................................

  private async btnFavoriteName(chatId: number, text: string): Promise<void> {
    const userCache: IUserChatCashe | undefined = this.userCache.get(chatId);

    if (!userCache || userCache.step !== StepStatus.FAVORITE_NAME_WAITING) {
      await this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
      return this.sendMenuDelCash(chatId);
    }

    if (text.trim().length < 2 || text.trim().length > 16) {
      return this.sendMessage(chatId, '<b>Не валидное имя!</b> \n <i>( не меньше 3 букв и не больше 15 )</i>');
    }

    const key = btnKeysByVal(Buttons.favoriteName, [text]);

    if (!key) {
      userCache.currentFavoriteName = { name: text };
      this.userCache.set(chatId, userCache);
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
    const userCache: IUserChatCashe | undefined = this.userCache.get(chatId);

    if (!userCache || userCache.step !== StepStatus.NAME_LISTS_WAITING) {
      await this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
      return this.sendMenuDelCash(chatId);
    }

    if (!btnCategoriesTextArr.includes(tCategory)) {
      return this.sendMessage(chatId, 'Выберите категорию из списка меню!');
    }

    const category = btnKeysByVal(Buttons.nameLists, [tCategory]);

    const nameList = (await this.repository.listCategory(category as string)).sort(() => Math.random() - 0.5);

    const formattedNameList = nameList.map((el) => `<b>${el.name}</b> - <code>${el.note}</code>\n\n`).join(' ');

    await this.sendNameLists(chatId, formattedNameList);
  }

  private async btnSearchParams(chatId: number, filter: string): Promise<void> {
    const userCache: IUserChatCashe | undefined = this.userCache.get(chatId);

    if (filter === Buttons.apply.text) {
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

    const filterIndex = userCache.selectedFilters.indexOf(filter);
    filterIndex !== -1 ? userCache.selectedFilters.splice(filterIndex, 1) : userCache.selectedFilters.push(filter);

    this.userCache.set(chatId, userCache);

    await this.sendMessage(chatId, `Текущие фильтры: ${userCache.selectedFilters.join(', ')}`);

    if (userCache.selectedFilters.length === Object.keys(Buttons.filters).length) {
      return this.sendMessage(chatId, 'Все фильтры выбраны. Нажмите "Применить".', { reply_markup: { keyboard: ButtonsLayout.apply, resize_keyboard: true } });
    }
  }

  private async btnRandomName(chatId: number, action?: string): Promise<void> {
    const userCache: IUserChatCashe | undefined = this.userCache.get(chatId);

    if (!action || action === Buttons.randomName.requestAnother.text) {
      return this.getRandomName(chatId, userCache);
    }

    if (!userCache || userCache.step !== StepStatus.RANDOM_NAME_WAITING) {
      await this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
      return this.sendMenuDelCash(chatId);
    }

    const actionsMap: Record<string, (chatId: number, userCache: IUserChatCashe) => Promise<void>> = {
      [Buttons.randomName.accept.text]: this.acceptAction.bind(this),
      [Buttons.randomName.addToFavorites.text]: this.favoritesAction.bind(this),
    };

    if (actionsMap[action]) {
      return actionsMap[action](chatId, userCache);
    }

    if (!btnRandomNameTextArr.includes(action)) {
      return this.sendMessage(chatId, 'Выберите действие из списка меню!');
    }

    return this.getRandomName(chatId, userCache);
  }

  private async btnNameMeaning(chatId: number, name: string) {
    try {
      const meanService: INameMeaning | undefined = await this.nameMeanerService.getNameMeaning(name);
      const meanDB = await this.repository.getName(name);

      const response: string = meanService ? `${meanService.name}\n\n${meanService.meaning}` : meanDB ? `Значение имени: \n\n${meanDB.note}` : 'Значений не найдео.';

      await this.sendNameMeaning(chatId, response);
    } catch (e) {
      const error = e as Error;
      Logger.shared.fail('TGBot.nameMeaning');
      Logger.shared.error(error, { params: { name } });
    }
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

  //...................................................................

  private async handleMenuSelection(chatId: number, text: string): Promise<void> {
    this.userCache.del(chatId);

    // Определяем действия для каждого пункта меню
    const menuActions: Record<string, () => Promise<void>> = {
      // Поиск по фильтрам
      [Buttons.mainMenu.searchByFilters.text]: async () => {
        this.userCache.set(chatId, { step: StepStatus.FILTER_WAITING, selectedFilters: [] });
        await this.sendSearchByFilters(chatId);
      },

      // Списки имен
      [Buttons.mainMenu.nameLists.text]: async () => {
        this.userCache.set(chatId, { step: StepStatus.NAME_LISTS_WAITING, selectedFilters: [] });
        await this.sendNameLists(chatId);
      },

      // Значение имени
      [Buttons.mainMenu.nameMeaning.text]: async () => {
        this.userCache.set(chatId, { step: StepStatus.NAME_MEANING_WAITING, selectedFilters: [] });
        await this.sendNameMeaning(chatId);
      },

      // Случайное имя
      [Buttons.mainMenu.randomName.text]: async () => {
        this.userCache.set(chatId, { step: StepStatus.RANDOM_NAME_WAITING, selectedFilters: [] });
        await this.sendRandomName(chatId);
        this.btnRandomName(chatId);
      },

      // Избранное
      [Buttons.mainMenu.favorites.text]: async () => {
        this.userCache.set(chatId, { step: StepStatus.FAVORITE_NAME_WAITING, selectedFilters: [] });
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
    const userCashe: IUserChatCashe | undefined = this.userCache.get(chatId);
    const favorite = userCashe?.currentFavoriteName?.name;

    if (!Buttons.favoriteName[action] || !favorite) {
      await this.sendMessage(chatId, 'Ошибка. Попробуйте заново.');
      return this.sendMenuDelCash(chatId);
    }

    if (action === 'add') {
      await this.saveFavoriteName(chatId, favorite);
      await this.sendMessage(chatId, ``);
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

  private async getRandomName(chatId: number, userCache: IUserChatCashe | undefined): Promise<void> {
    const result = await this.repository.randomName();
    this.userCache.set(chatId, { ...userCache, currentFavoriteName: { name: result.name, id: result.id } });
    return this.sendMessage(chatId, `<b>${result.name}</b> - <code>${result.note}</code>\n\n\nВыберите действие:`);
  }

  private async applyParams(chatId: number, filters?: string[]): Promise<void> {
    if (!filters || filters.length === 0) {
      return this.sendMessage(chatId, `Вы не выбрали параметры запроса.`);
    }

    await this.sendMessage(chatId, `Вы выбрали параметры: ${filters.join(', ')}.`);

    Logger.shared.info('getListByFilter', filters);

    // Формирование параметров запроса
    const keys = btnKeysByVal(Buttons.filters, filters);
    const query = queryCondition(keys);

    const nameList = (await this.repository.listFilter(query)).sort(() => Math.random() - 0.5);

    const formattedNameList = nameList.map((el) => `<code>${el.name}</code> - <i>${el.note}</i>\n\n`).join(' ');

    await this.sendMessage(chatId, formattedNameList);

    this.userCache.set(chatId, { step: StepStatus.FILTER_WAITING, selectedFilters: [] });

    return this.sendSearchByFilters(chatId);
  }

  private async acceptAction(chatId: number, userCache: IUserChatCashe): Promise<void> {
    if (!userCache.currentFavoriteName?.id) {
      await this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
      return this.sendMenuDelCash(chatId);
    }

    await this.saveFavoriteName(chatId, userCache.currentFavoriteName.name);
    await this.sendMessage(chatId, 'Имя добавлено в избранные');
    return this.sendMenuDelCash(chatId);
  }

  private async favoritesAction(chatId: number, userCache: IUserChatCashe): Promise<void> {
    if (!userCache.currentFavoriteName?.id) {
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

  private async sendMenuDelCash(chatId: number): Promise<void> {
    this.userCache.del(chatId);

    await this.sendMessage(chatId, 'Главное меню', {
      reply_markup: { keyboard: ButtonsLayout.mainMenu, resize_keyboard: true },
    });
  }

  async stopBot(): Promise<void> {
    if (this.bot) {
      try {
        await this.bot.stopPolling();
        Logger.shared.info('Telegram bot stopped successfully');
      } catch (error) {
        const e = error as Error;
        Logger.shared.error(e);
        throw new Error(e.message);
      }
    }
  }
}
