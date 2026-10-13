/** Sin tildes y en minúsculas, para que «acido» encuentre «Ácido»: el plegado de los buscadores. */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
