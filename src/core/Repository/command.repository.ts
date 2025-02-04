import { $Enums, Prisma, PrismaClient } from '@prisma/client';
import PrismaSingleton from './prisma';
import { Logger } from '../Logger';

export class CommandRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = PrismaSingleton.shared();
  }

  async createUser(chatId: number) {
    return this.prisma.user.create({ data: { chatId } });
  }

  async saveFavoriteName(chatId: number, name: string): Promise<void> {
    const favNameExist = await this.#findFavName(name);

    if (favNameExist) {
      return;
    }

    let user: { id: number; chatId: bigint };
    const userExist = await this.#findUser(chatId);

    if (!userExist) {
      user = await this.createUser(chatId);
    } else {
      user = userExist;
    }

    await this.prisma.favoriteName.create({
      data: {
        userId: user.id,
        name,
      },
    });
    return;
  }

  async deleteFavoriteName(chatId: number, name: string) {
    return this.prisma.favoriteName.deleteMany({
      where: { AND: [{ user: { chatId } }, { name }] },
    });
  }

  async #findUser(chatId: number) {
    return this.prisma.user.findFirst({ where: { chatId } });
  }
  async #findFavName(name: string) {
    return this.prisma.favoriteName.findFirst({ where: { name } });
  }
}
