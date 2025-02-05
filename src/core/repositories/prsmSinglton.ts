import { PrismaClient } from '@prisma/client';

class PrismaSingleton {
  static #shared: PrismaClient;

  private constructor() {}

  public static shared(): PrismaClient {
    if (!PrismaSingleton.#shared) {
      PrismaSingleton.#shared = new PrismaClient();
    }
    return PrismaSingleton.#shared;
  }
}

export default PrismaSingleton;