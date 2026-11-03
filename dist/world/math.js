export function hash(value) {
  let result = 2166136261;
  for (const char of String(value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

export function randomAt(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 19.17) * 43758.5453123;
  return n - Math.floor(n);
}
export function noise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = randomAt(ix, iy, seed), b = randomAt(ix + 1, iy, seed);
  const c = randomAt(ix, iy + 1, seed), d = randomAt(ix + 1, iy + 1, seed);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
export function mixColor(color, other, amount) {
  const read = (value) => {
    if (/^#[0-9a-f]{3}$/i.test(value || '')) value = '#' + value.slice(1).split('').map((char) => char + char).join('');
    if (!/^#[0-9a-f]{6}$/i.test(value || '')) value = '#a9c5a2';
    return [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16));
  };
  const a = read(color), b = read(other);
  return '#' + a.map((value, index) => Math.round(value * (1 - amount) + b[index] * amount).toString(16).padStart(2, '0')).join('');
}
