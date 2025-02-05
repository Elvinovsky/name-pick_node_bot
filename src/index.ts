import { TGBot } from './bot';
import { defaultConfig } from './core';

async function main() {
  const bot = new TGBot(defaultConfig);
  await bot.setupMenu();
}

main();
