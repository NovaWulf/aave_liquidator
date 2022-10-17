// percent is represented as a number less than 1 ie 0.75 is equivalent to 75%
// multiply base and percent and return a BigInt

export function percentBigInt(base: bigint, percent: number): bigint {
  return BigInt((base * BigInt(percent * 10000)) / 10000n);
}

export function bigIntDivide(
  a: bigint | number | string,
  b: bigint | number | string,
): number {
  return Number((BigInt(a) * 10000n) / BigInt(b)) / 10000;
}

export function tokenToDecimal(
  a: bigint | number | string,
  decimals: number,
): number {
  return Number((BigInt(a) * 10000n) / BigInt(10 ** decimals)) / 10000;
}

export function safeStringify(obj: any) {
  return JSON.stringify(
    obj,
    (_key, value) =>
      typeof value === 'bigint' ? value.toString() + 'n' : value,
    2,
  );
}
