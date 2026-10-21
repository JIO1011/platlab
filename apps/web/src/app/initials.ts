/** Las dos primeras iniciales del nombre: «Ana María Pérez» es «AM». */
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
