export const uniqId = (prefix: string = '') => `${prefix}${String(Math.random()).slice(2)}${Date.now()}`;

export const keys = <T extends object>(obj: T) => Object.keys(obj) as Array<keyof T>;
export const entries = <T extends object>(obj: T) => Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
