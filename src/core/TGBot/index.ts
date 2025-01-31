import TelegramBot from 'node-telegram-bot-api';
import { Config } from '../';
import { Logger } from '../';

const BUTTONS: Record<string, any> = {
  mainMenu: [
    ['🔍 Подбор имени (по параметрам)', '🎲 Случайное имя'],
    ['📜 Списки имен', '💡 Значение имени'],
    ['❤️ Избранные имена', '⚙️ Настройки'],
  ],
  filters: [
    ['👦 Мальчик', '👧 Девочка', '❔ Унисекс'],
    ['🇷🇺 Русские', '🇫🇷 Французские', '🇮🇳 Индийские'],
    ['Короткие', 'Средние', 'Длинные'],
    ['Сильные', 'Мягкие', 'Умные', 'Творческие'],
    ['Топ-10', 'Редкие', 'Уникальные'],
    ['⬅️ Назад'],
  ],
  randomName: [['✅ Принять', '🔁 Попросить другое'], ['❤️ Добавить в избранное'], ['⬅️ Назад']],
  nameLists: [
    ['💎 Топ популярных имен', '🕊 Редкие и необычные'],
    ['📜 Классические и старинные', '🏛 Мифологические'],
    ['🎭 Литературные', '🔮 Значимые'],
    ['⬅️ Назад'],
  ],
  settings: [
    ['📥 Экспорт избранных имен', '🔔 Уведомления'],
    ['🎨 Тема', '🌍 Язык интерфейса'],
    ['⬅️ Назад'],
  ],
};

export class TGBot {
  public bot?: TelegramBot;

  static #shared: TGBot;
  private isInitialized = false;

  static async shared(conf: Config): Promise<TGBot> {
    if (!this.#shared) {
      this.#shared = new TGBot();
      await this.#shared.initBot(conf);
    }
    return this.#shared;
  }

  private async initBot(conf: Config): Promise<void> {
    if (this.isInitialized) return;

    const token = conf.services!.telegram!.authKey;
    if (!token) {
      Logger.shared.error({
        name: 'TGBot Initialization Error',
        message: 'Auth token is undefined!',
      });
      throw new Error(
        'You have to provide the bot-token from @BotFather via environment variable (SERVICE_TELEGRAM_API_KEY)'
      );
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.isInitialized = true;
      Logger.shared.info('Telegram bot initialized successfully');
    } catch (error) {
      Logger.shared.error(error as Error, `Failed to initialize Telegram bot`);
      throw error;
    }
  }

  async sendMessage(
    chatId: number,
    message: string,
    opt?: TelegramBot.SendMessageOptions
  ): Promise<number> {
    const trimmedMessage = message.length <= 4090 ? message : message.slice(0, 4090);
    opt = opt || {};
    try {
      const response = await this.bot!.sendMessage(chatId, trimmedMessage, {
        ...opt,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
      return response.message_id;
    } catch (error) {
      Logger.shared.fail(`Failed to send message: ${(error as Error).message}`);
      Logger.shared.fail(trimmedMessage);
      return 0;
    }
  }

  async stopBot(): Promise<void> {
    if (this.bot) {
      try {
        await this.bot.stopPolling();
        this.isInitialized = false;
        Logger.shared.info('Telegram bot stopped successfully');
      } catch (error) {
        const e = error as Error;
        Logger.shared.error(e);
        throw new Error(e.message);
      }
    }
  }

  private async sendMainMenu(chatId: number): Promise<void> {
    await this.sendMessage(chatId, '📌 Основное меню:', {
      reply_markup: { keyboard: BUTTONS.mainMenu, resize_keyboard: true },
    });
  }

  private async handleMenuSelection(chatId: number, text: string): Promise<void> {
    const menuActions: Record<string, () => Promise<number | void>> = {
      '🔍 Подбор имени (по параметрам)': () =>
        this.sendMessage(chatId, 'Выберите фильтр:', {
          reply_markup: { keyboard: BUTTONS.filtersю, resize_keyboard: true },
        }),
      '🎲 Случайное имя': () =>
        this.sendMessage(chatId, 'Предлагаю имя: Иван (Сильный, Умный). Выберите действие:', {
          reply_markup: { keyboard: BUTTONS.randomName, resize_keyboard: true },
        }),
      '📜 Списки имен': () =>
        this.sendMessage(chatId, 'Выберите категорию:', {
          reply_markup: { keyboard: BUTTONS.nameLists, resize_keyboard: true },
        }),
      '💡 Значение имени': () =>
        this.sendMessage(chatId, 'Введите имя, и я расскажу о его значении.'),
      '❤️ Избранные имена': () => this.sendMessage(chatId, 'Ваш список избранных имен пуст.'),
      '⚙️ Настройки': () =>
        this.sendMessage(chatId, 'Выберите настройку:', {
          reply_markup: { keyboard: BUTTONS.settings, resize_keyboard: true },
        }),
      '⬅️ Назад': () => this.sendMainMenu(chatId),
    };

    if (menuActions[text]) {
      await menuActions[text]();
    } else {
      await this.sendMessage(chatId, 'Пожалуйста, выберите один из пунктов меню.');
    }
  }

  setupMenu(): void {
    if (!this.bot) return;

    this.bot.onText(/\/start/, async (msg) => {
      await this.sendMainMenu(msg.chat.id);
    });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      if (text) {
        await this.handleMenuSelection(chatId, text);
      }
    });
  }
}
