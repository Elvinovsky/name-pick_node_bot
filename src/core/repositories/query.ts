import { $Enums, Origin, Prisma, PrismaClient } from '@prisma/client';
import PrismaSingleton from './prsmSinglton';
import { Logger } from '../logger';

function randomSkip(totalItems: number, limit: number): number {
  const maxSkip = Math.max(0, totalItems - limit); // Максимальное значение для skip
  return Math.floor(Math.random() * (maxSkip + 1)); // Случайное значение от 0 до maxSkip
}

export class QueryRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = PrismaSingleton.shared();
  }

  async listFilter(where: Prisma.NameWhereInput) {
    Logger.shared.info('where:', where);
    //todo реализовать функционад пагинации для телеги
    const totalcount = await this.prisma.name.count({ where });
    const take = 30;
    const skip = randomSkip(totalcount, take);

    return this.prisma.name.findMany({ take, skip, where });
  }

  async listCategory(category: string) {
    Logger.shared.info('category:', category);
    //todo реализовать функционад пагинации для телеги
    const totalcount = await this.prisma.name.count({ where: { category } });
    const take = 30;
    const skip = randomSkip(totalcount, take);

    return this.prisma.name.findMany({ take, skip, where: { category } });
  }

  async randomName() {
    const totalcount = await this.prisma.name.count();
    return this.prisma.name.findFirstOrThrow({ skip: randomSkip(totalcount, 1) });
  }

  async listFavorites(chatId: number) {
    return this.prisma.favoriteName.findMany({ where: { user: { chatId } } });
  }
  async createUser(_name: string, _email: string) {
    // return this.prisma.favoriteName.create({
    //   data: {
    //   },
    // });
  }

  async getName(name: string) {
    return this.prisma.name.findFirst({
      where: { name },
    });
  }
}
