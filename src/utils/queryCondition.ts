import { $Enums, Prisma } from '@prisma/client';
import { btnKeysByVal } from './btn';
import { ButtonsLayout } from '../core/TGBot/buttons';

export function queryCondition(filters?: string[] | string): Prisma.NameWhereInput {
  if (!filters?.length) return {};
  if (!Array.isArray(filters)) return {};

  const genderFilters = filters.filter((f) => Object.keys($Enums.Gender).includes(f)) as $Enums.Gender[];
  const originFilters = filters.filter((f) => Object.keys($Enums.Origin).includes(f)) as $Enums.Origin[];
  const firstCategory = filters.includes('rare') ? 'rare' : undefined;

  const originCondition = originFilters.length > 0 ? [{ OR: originFilters.map((f) => ({ origin: f })) }] : [];
  const genderCondition = genderFilters.length === 1 ? [{ gender: genderFilters[0] }] : [];
  const categoryCondition = firstCategory ? [{ category: firstCategory }] : [];
  const notRareCondition = firstCategory ? [] : [{ category: { not: 'rare' } }];

  return {
    AND: [...originCondition, ...genderCondition, ...categoryCondition, ...notRareCondition],
  };
}
