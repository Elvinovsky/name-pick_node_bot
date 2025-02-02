import TelegramBot from 'node-telegram-bot-api';

import { Config } from '../';
import { Logger } from '../';
import { Buttons, ButtonsLayout } from './buttons';

export class TGBot {
  public bot?: TelegramBot;
  private userStates: Record<number, any> = {}; // Состояние пользователей

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
      // disable_notification: true
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

  private async sendMainMenu(chatId: number): Promise<void> {
    await this.sendMessage(chatId, '', {
      reply_markup: { keyboard: ButtonsLayout.mainMenu, resize_keyboard: true },
    });
  }

  private async handleMenuSelection(chatId: number, text: string): Promise<void> {
    const menuActions: Record<string, () => Promise<number | void>> = {
      [Buttons.back.text]: () => this.sendMainMenu(chatId),

      [Buttons.mainMenu.searchByFilters.text]: async () => {
        await this.sendMessage(chatId, 'Выберите параметры:', { reply_markup: { keyboard: ButtonsLayout.filters, resize_keyboard: true } });

        this.userStates[chatId] = { step: 'waiting_for_filter', selectedFilters: [] };

        setTimeout(() => {
          if (this.userStates[chatId]?.step === 'waiting_for_filter') {
            this.sendMessage(chatId, 'Вы не выбрали параметры. Попробуйте снова.');
            delete this.userStates[chatId];
          }
        }, 30000);
      },

      [Buttons.mainMenu.nameLists.text]: () => this.sendMessage(chatId, 'Выберите категорию:', { reply_markup: { keyboard: ButtonsLayout.nameLists, resize_keyboard: true } }),
      [Buttons.mainMenu.nameMeaning.text]: () => this.sendMessage(chatId, 'Введите имя, и я расскажу о его значении.'),
      [Buttons.mainMenu.favorites.text]: () => this.sendMessage(chatId, 'Ваш список избранных имен пуст.'),
      [Buttons.mainMenu.settings.text]: () => this.sendMessage(chatId, 'Выберите настройку:', { reply_markup: { keyboard: ButtonsLayout.settings, resize_keyboard: true } }),
      [Buttons.mainMenu.randomName.text]: () =>
        this.sendMessage(chatId, 'Предлагаю имя: Иван (Сильный, Умный). Выберите действие:', { reply_markup: { keyboard: ButtonsLayout.randomName, resize_keyboard: true } }),

      // Обработка фильтров
      [Buttons.filters.genderBoy.text]: async () => {
        this.addFilter(chatId, '👦 Мальчик');
      },
      [Buttons.filters.genderGirl.text]: async () => {
        this.addFilter(chatId, '👧 Девочка');
      },
      [Buttons.filters.rare.text]: async () => {
        this.addFilter(chatId, 'Редкие');
      },
    };

    if (menuActions[text]) {
      await menuActions[text]();
    } else {
      Logger.shared.dbg('handleMenuSelection: ', { text });
      await this.sendMessage(chatId, 'Пожалуйста, выберите один из пунктов меню.');
    }
  }

  private async addFilter(chatId: number, filter: string): Promise<void> {
    if (!this.userStates[chatId] || this.userStates[chatId].step !== 'waiting_for_filter') {
      await this.sendMessage(chatId, 'Ошибка! Попробуйте начать заново.');
      return;
    }

    this.userStates[chatId].selectedFilters.push(filter);
    await this.sendMessage(chatId, `Фильтр добавлен: ${filter}`);

    // Запрашиваем следующий параметр
    if (this.userStates[chatId].selectedFilters.length < 2) {
      await this.sendMessage(chatId, 'Выберите еще один параметр или нажмите "Продолжить".', {
        reply_markup: { keyboard: [[{ text: 'Продолжить' }]], resize_keyboard: true },
      });
    } else {
      await this.completeFilterSelection(chatId);
    }
  }

  private async completeFilterSelection(chatId: number): Promise<void> {
    const filters = this.userStates[chatId].selectedFilters.join(', ');
    await this.sendMessage(chatId, `Вы выбрали параметры: ${filters}`);

    delete this.userStates[chatId]; // Очистка состояния пользователя
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

      if (this.userStates[chatId]?.step === 'waiting_for_filter') {
        if (text === 'Продолжить') {
          await this.completeFilterSelection(chatId);
        } else {
          await this.addFilter(chatId, text);
        }
      } else {
        await this.handleMenuSelection(chatId, text);
      }
    });
  }
}
