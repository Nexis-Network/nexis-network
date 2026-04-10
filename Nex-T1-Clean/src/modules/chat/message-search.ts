type RoleBearingMessage = {
  role: string;
};

export function findLatestMessageByRole<
  TMessage extends RoleBearingMessage,
  TRole extends TMessage["role"],
>(messages: readonly TMessage[], role: TRole): TMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === role) {
      return message;
    }
  }

  return null;
}
