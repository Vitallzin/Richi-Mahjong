/** Erro lançado quando uma ação é ilegal ou fora de hora. O estado não é alterado. */
export class IllegalActionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'IllegalActionError';
  }
}

export const illegal = (code: string, message: string): never => {
  throw new IllegalActionError(code, message);
};
