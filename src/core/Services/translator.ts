import translate from 'google-translate-api-x';
import { Logger } from '../Logger';

export class TranslatorService {
  private destLang: string;

  constructor(destLang: string = 'en') {
    this.destLang = destLang;
  }

  async translate(text: string): Promise<string> {
    try {
      const result = await translate(text, { to: this.destLang });
      return result.text;
    } catch (error) {
      const e = error as Error;
      Logger.shared.error(e);
      throw error;
    }
  }
}
