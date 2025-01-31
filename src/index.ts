import { defaultConfig, TGBot } from './core';

async function main() {
  const bot = await TGBot.shared(defaultConfig);
  await bot.setupMenu();
}

main();
