import { TranslatorService } from '.';
import puppeteer from 'puppeteer';

import { Logger } from '../logger';
import { ruToEnLayout } from '../../utils';

export interface INameMeaning {
  name: string;
  meaning: string;
}

export class NameMeaner {
  private static BASE_URL = 'https://kakzovut.ru/names/';

  constructor() {}

  async getNameMeaning(nameRu: string): Promise<INameMeaning | undefined> {
    try {
      const nameEn = ruToEnLayout(nameRu);
      Logger.shared.dbg('getNameMeaning', { nameRu, nameEn });
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      const url = `${NameMeaner.BASE_URL}${nameEn.toLowerCase()}.html`;
      console.log(`Открываем страницу: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      const nameInfo = await page.evaluate(() => {
        const getText = (selector: string) => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() || '' : '';
        };

        const getTextFromAll = (selector: string, index: number) => {
          const elements = document.querySelectorAll(selector);
          return elements[index] ? elements[index].textContent?.trim() || '' : '';
        };

        return {
          name: getText('h1[itemprop="headline"]'),
          meaning: getTextFromAll('article[itemprop="articleBody"] p', 1),
        };
      });

      await browser.close();
      return nameInfo.meaning ? nameInfo : undefined;
    } catch (error) {
      const e = error as Error;
      Logger.shared.error(e, { note: 'Ошибка при получении значения имени:' });
      return undefined;
    }
  }
}
