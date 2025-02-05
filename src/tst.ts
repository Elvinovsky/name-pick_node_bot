import puppeteer from 'puppeteer';
import { NameMeaner } from './core/Services';

async function main(name: string): Promise<any> {
  function translateToEnglishLayout(input: string): string {
    const russianToEnglishMap = new Map<string, string>([
      ['а', 'a'],
      ['б', 'b'],
      ['в', 'v'],
      ['г', 'g'],
      ['д', 'd'],
      ['е', 'e'],
      ['ё', 'yo'],
      ['ж', 'zh'],
      ['з', 'z'],
      ['и', 'i'],
      ['й', 'y'],
      ['к', 'k'],
      ['л', 'l'],
      ['м', 'm'],
      ['н', 'n'],
      ['о', 'o'],
      ['п', 'p'],
      ['р', 'r'],
      ['с', 's'],
      ['т', 't'],
      ['у', 'u'],
      ['ф', 'f'],
      ['х', 'h'],
      ['ц', 'ts'],
      ['ч', 'ch'],
      ['ш', 'sh'],
      ['щ', 'sch'],
      ['ы', 'y'],
      ['э', 'e'],
      ['ю', 'yu'],
      ['я', 'ya'],
      ['А', 'A'],
      ['Б', 'B'],
      ['В', 'V'],
      ['Г', 'G'],
      ['Д', 'D'],
      ['Е', 'E'],
      ['Ё', 'Yo'],
      ['Ж', 'Zh'],
      ['З', 'Z'],
      ['И', 'I'],
      ['Й', 'Y'],
      ['К', 'K'],
      ['Л', 'L'],
      ['М', 'M'],
      ['Н', 'N'],
      ['О', 'O'],
      ['П', 'P'],
      ['Р', 'R'],
      ['С', 'S'],
      ['Т', 'T'],
      ['У', 'U'],
      ['Ф', 'F'],
      ['Х', 'H'],
      ['Ц', 'Ts'],
      ['Ч', 'Ch'],
      ['Ш', 'Sh'],
      ['Щ', 'Sch'],
      ['Ы', 'Y'],
      ['Э', 'E'],
      ['Ю', 'Yu'],
      ['Я', 'Ya'],
    ]);

    return input
      .split('')
      .map((char) => russianToEnglishMap.get(char) || undefined)
      .filter(Boolean)
      .join('');
  }

  return translateToEnglishLayout('артемеида');
}

(async () => {
  const name = 'аиша'; 
  const result = await main(name);
  console.log(result);
})();
