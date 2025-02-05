export function unique(nestedArr: Record<any, any>[][]): Record<string, any> {
  const uniqueSet = new Set();
  const result: Record<string, any> = {};
  let i = 0;
  for (const arr of nestedArr) {
    result[`${i}`] = [];
    for (const item of arr) {
      const itemString = JSON.stringify(item);
      if (!uniqueSet.has(itemString)) {
        uniqueSet.add(itemString);
        result[`${i}`].push(itemString);
      }
    }
  }
  i++;
  return result;
}
