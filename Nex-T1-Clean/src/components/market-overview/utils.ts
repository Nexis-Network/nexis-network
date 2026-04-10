export function formatDateLabel(date: string | null | undefined) {
  if (!date) return "just now";
  try {
    const dt = new Date(date);
    return dt.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return "just now";
  }
}

export function sentimentTone(value: number | null): "positive" | "negative" | "neutral" {
  if (typeof value !== "number") return "neutral";
  if (value >= 60) return "positive";
  if (value <= 40) return "negative";
  return "neutral";
}

export function splitNews(news: UntypedJson[]) {
  const summary = news.slice(0, 3);
  const developments = news.slice(3, 9);
  return { summary, developments };
}
