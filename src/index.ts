import { defaultConfig, TGBot } from './core';

async function main() {
  const bot = new TGBot(defaultConfig);
  await bot.setupMenu();
}

main();
