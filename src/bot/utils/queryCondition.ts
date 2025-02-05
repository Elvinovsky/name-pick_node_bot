import { $Enums, Prisma } from '@prisma/client';

export function queryCondition(filters?: string[] | string): Prisma.NameWhereInput {
  if (!filters?.length) return {};
  Array.isArray(filters) ? filters : (filters = [filters]);

  const genderFilters = filters.filter((f) => Object.keys($Enums.Gender).includes(f)) as $Enums.Gender[];
  const originFilters = filters.filter((f) => Object.keys($Enums.Origin).includes(f)) as $Enums.Origin[];
  const rareFilter = filters.includes('rare') ? 'rare' : undefined;

  const originCondition = originFilters.length > 0 ? [{ OR: originFilters.map((f) => ({ origin: f })) }] : [];
  const genderCondition = genderFilters.length === 1 ? [{ gender: genderFilters[0] }] : [];
  const categoryCondition = rareFilter ? [{ category: { in: ['rare', 'rareUnusual', 'classicOld'] } }] : [{ category: { notIn: ['rare', 'rareUnusual', 'classicOld'] } }];

  return {
    AND: [...originCondition, ...genderCondition, ...categoryCondition],
  };
}
