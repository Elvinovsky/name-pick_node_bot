import TelegramBot from 'node-telegram-bot-api';
import NodeCache from 'node-cache';

import { Config } from '../';
import { Logger } from '../';
import { Buttons, ButtonsLayout } from './buttons';

interface IUserCashe {
  step: string;
  selectedFilters: string[];
}

const btnFiltersArr = ['👦 Мальчик', '👧 Девочка', '🇷🇺 Русские', '🇫🇷 Французские', '🇮🇳 Индийские', 'Редкие', '🌍 Европейские', '🌏 Восточные', '🕌 Арабские', '🏔 Кавказские'];

const StepStatus = Object.freeze({
  FILTER: {
    WAITING: 'waiting_for_filter',
  },
  NAME_MEANING: {
    WAITING: 'waiting_for_name_meaning',
  },
  RANDOM_NAME: {
    WAITING: 'waiting_for_random_name',
  },
  NAME_LISTS: {
    WAITING: 'waiting_for_name_lists',
  },
  SETTINGS: {
    WAITING: 'waiting_for_settings',
  },
});

export class TGBot {
  public bot?: TelegramBot;
  private userCache: NodeCache;
  private nameAIService: any;

  constructor(conf: Config) {
    const token = conf.services!.telegram!.authKey;
    if (!token) {
      Logger.shared.error({
        name: 'TGBot Initialization Error',
        message: 'Auth token is undefined!',
      });
      throw new Error('You have to provide the bot-token from @BotFather via environment variable (SERVICE_TELEGRAM_API_KEY)');
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.userCache = new NodeCache({ stdTTL: 1800 });

      Logger.shared.info('Telegram bot initialized successfully');
    } catch (error) {
      Logger.shared.error(error as Error, `Failed to initialize Telegram bot`);
      throw error;
    }
  }

  async sendMessage(chatId: number, message: string, opt?: TelegramBot.SendMessageOptions): Promise<number> {
    const trimmedMessage = message.length <= 4090 ? message : message.slice(0, 4090);

    const options: TelegramBot.SendMessageOptions = {
      parse_mode: 'HTML',
      // disable_web_page_preview: true,
      disable_notification: true,
      ...opt,
    };

    try {
      const response = await this.bot!.sendMessage(chatId, trimmedMessage, options);

      return response.message_id;
    } catch (error) {
      Logger.shared.fail(`Failed to send message: ${(error as Error).message}`, { options, trimmedMessage });
      return 0;
    }
  }

  private async sendMainMenu(chatId: number): Promise<void> {
    this.userCache.del(chatId);

    await this.sendMessage(chatId, 'Главное меню', {
      reply_markup: { keyboard: ButtonsLayout.mainMenu, resize_keyboard: true },
    });
  }

  private async handleMenuSelection(chatId: number, text: string): Promise<void> {
    this.userCache.del(chatId);

    const menuActions: Record<string, () => Promise<number | void>> = {
      //searchByFilters
      //..................................................................
      [Buttons.mainMenu.searchByFilters.text]: async () => {
        this.userCache.set(chatId, { step: StepStatus.FILTER.WAITING, selectedFilters: [] });
        await this.sendMessage(chatId, 'Выберите параметры:', { reply_markup: { keyboard: ButtonsLayout.filters, resize_keyboard: true } });
      },

      //searchByFilters
      //..................................................................
      [Buttons.mainMenu.nameLists.text]: async () => {
        this.userCache.set(chatId, { step: StepStatus.NAME_LISTS.WAITING, selectedFilters: [] });
        await this.sendMessage(chatId, 'Выберите категорию:', { reply_markup: { keyboard: ButtonsLayout.nameLists, resize_keyboard: true } });
      },

      //nameMeaning
      //..................................................................
      [Buttons.mainMenu.nameMeaning.text]: async () => {
        this.userCache.set(chatId, { step: StepStatus.NAME_MEANING.WAITING, selectedFilters: [] });
        this.sendMessage(chatId, 'Введите имя, и я расскажу о его значении.');
      },

      //randomName
      //..................................................................
      [Buttons.mainMenu.randomName.text]: async () => {
        this.sendMessage(chatId, 'Предлагаю имя: Мушкетер (Сильный, Умный). \n Выберите действие:', { reply_markup: { keyboard: ButtonsLayout.randomName, resize_keyboard: true } });
      },

      //favorites
      //..................................................................
      [Buttons.mainMenu.favorites.text]: () => this.sendMessage(chatId, 'Ваш список избранных имен пуст.'),

      //settings
      //..................................................................
      [Buttons.mainMenu.settings.text]: () => this.sendMessage(chatId, 'Выберите настройку:', { reply_markup: { keyboard: ButtonsLayout.settings, resize_keyboard: true } }),
    };

    if (menuActions[text]) {
      await menuActions[text]();
    } else {
      Logger.shared.dbg('handleMenuSelection: ', { text });
      await this.sendMessage(chatId, 'Пожалуйста, выберите один из пунктов меню.');
    }
  }

  private async addFilter(chatId: number, filter: string): Promise<void> {
    const cashe: IUserCashe | undefined = this.userCache.get(chatId);

    if (!cashe || cashe.step !== StepStatus.FILTER.WAITING) {
      await this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
      return;
    }

    //validate input filter
    if (!btnFiltersArr.includes(filter)) {
      await this.sendMessage(chatId, 'Выберите параметр из списка меню!');
      return;
    }

    // add | delete filter
    const index = cashe.selectedFilters.indexOf(filter);
    if (index !== -1) {
      cashe.selectedFilters.splice(index, 1);
    } else {
      cashe.selectedFilters.push(filter);
    }

    //update cashe
    this.userCache.set(chatId, cashe);

    await this.sendMessage(chatId, `Фильтры: ${cashe.selectedFilters}`);

    if (cashe.selectedFilters.length === Object.keys(Buttons.filters).length) {
      await this.sendMessage(chatId, 'нажмите "Применить".', {
        reply_markup: { keyboard: ButtonsLayout.apply, resize_keyboard: true },
      });
    }
  }

  private async applyFilterSelection(chatId: number): Promise<void> {
    const cashe: IUserCashe | undefined = this.userCache.get(chatId);
    if (cashe && cashe.selectedFilters.length < 1) {
      await this.sendMessage(chatId, `Вы не выбрали параметры запроса.`);
      return;
    }

    await this.sendMessage(chatId, `Вы выбрали параметры: ${cashe?.selectedFilters.join(', ')}`);

    // logic for get dats (repository)
    this.userCache.del(chatId);

    await this.sendMainMenu(chatId);
  }

  setupMenu(): void {
    if (!this.bot) return;

    this.bot.onText(/\/start/, async (msg) => {
      await this.sendMainMenu(msg.chat.id);
    });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text!;
      const userCache: IUserCashe | undefined = this.userCache.get(chatId);

      switch (true) {
        case text === Buttons.back.text:
          await this.sendMainMenu(chatId);
          break;

        case userCache?.step === StepStatus.NAME_MEANING.WAITING:
          await this.nameMeaning(chatId, text);
          await this.sendMainMenu(chatId);
          break;

        case userCache?.step === StepStatus.FILTER.WAITING:
          if (text === Buttons.apply.text) {
            await this.applyFilterSelection(chatId);
          } else {
            await this.addFilter(chatId, text);
          }
          break;

        default:
          await this.handleMenuSelection(chatId, text);
          break;
      }
    });
  }

  private async nameMeaning(chatId: number, name: string) {
    try {
      const promt = `Значение имени "${name}"? Дай очень красивый и короткий ответ.`;
      await this.sendMessage(chatId, promt);
      //return this.nameAIService(promt);
    } catch (e) {
      const error = e as Error;
      Logger.shared.fail('TGBot.nameMeaning');
      Logger.shared.error(error, { params: { name } });
    }
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
