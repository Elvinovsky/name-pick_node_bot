import { $Enums, Prisma, PrismaClient } from '@prisma/client';
import PrismaSingleton from './prsmSinglton';
import { Logger } from '../logger';
import { offsetPagination, randomNumber } from '../../utils';

export class QueryRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = PrismaSingleton.shared();
  }

  async listFilter(where: Prisma.NameWhereInput, pageNumber = 1) {
    Logger.shared.info('query:', { where, pageNumber });

    const pageSize = 10;
    const offset = offsetPagination(pageNumber, pageSize);

    return this.prisma.name.findMany({ take: pageSize, skip: offset, where, orderBy: { createdAt: 'desc' } });
  }

  async listCategory(where: Prisma.NameWhereInput, pageNumber = 1) {
    Logger.shared.dbg('query:', { where, pageNumber });

    const pageSize = 10;
    const offset = offsetPagination(pageNumber, pageSize);

    return this.prisma.name.findMany({ take: pageSize, skip: offset, where, orderBy: { createdAt: 'desc' } });
  }

  async randomName() {
    const totalcount = await this.prisma.name.count();
    return this.prisma.name.findFirstOrThrow({ skip: randomNumber(totalcount, 1) });
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
