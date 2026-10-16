/** Solo los campos enviados: en una edición parcial, lo ausente conserva su valor. */
export const definedFields = <T extends object>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
