const baseCases = Object.freeze({
  0: 0,
  1: 1,
});

export function fibo(n: number) {
  return isNaN(baseCases[n]) ? fibo(n - 1) + fibo(n - 2) : baseCases[n];
}
