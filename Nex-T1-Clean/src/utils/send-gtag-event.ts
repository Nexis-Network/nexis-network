type ZarazProperties = Record<string, unknown>;

type ZarazLikeWindow = Window & {
  zaraz?: {
    track: (eventName: string, properties?: ZarazProperties) => unknown;
  };
};

export default function sendGtagEvent(
  eventName: string,
  properties?: ZarazProperties,
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const zarazWindow = window as ZarazLikeWindow;
  if (!zarazWindow.zaraz) {
    return Promise.resolve();
  }

  return Promise.resolve(zarazWindow.zaraz.track(eventName, properties)).then(() => undefined);
}
