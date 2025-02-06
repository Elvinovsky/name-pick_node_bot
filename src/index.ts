import { TGBot } from './bot';
import { defaultConfig, Logger } from './core';

function setupErrorHandling(bot: TGBot) {

  process.on('SIGINT', async () => {
    console.log('Received SIGINT. Shutting down gracefully...');
    bot.stopBot();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Shutting down gracefully...');
    bot.stopBot();
    process.exit(0);
  });

  process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled rejection caught:', reason);
    bot.stopBot();
    process.exit(1);
  });

  process.on('uncaughtException', async (err) => {
    console.error('Uncaught exception:', err);
    bot.stopBot();
    process.exit(1);
  });
}

async function main() {
  try {
    const bot = new TGBot(defaultConfig);
    await bot.setupMenu();

    setupErrorHandling(bot);
  } catch (err) {
    const error = err as Error;
    Logger.shared.error(error);
    process.exit(1);
  }
}

main();
