/**
 * Element at `index`, for arrays the code knows are long enough.
 * @throws RangeError when the index is out of range, which signals a bug.
 */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new RangeError(`No item at index ${index}`);
  return item;
}
