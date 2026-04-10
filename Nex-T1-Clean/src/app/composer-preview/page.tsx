import { ChatComposerVisualPreview } from "@/components/chat-composer/chat-composer-visual-preview";

type ComposerPreviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ComposerPreviewPage({
  searchParams,
}: ComposerPreviewPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawTheme = Array.isArray(resolvedSearchParams?.theme)
    ? resolvedSearchParams?.theme[0]
    : resolvedSearchParams?.theme;
  const theme =
    rawTheme === "light" || rawTheme === "dark" ? rawTheme : "dark";

  return (
    <ChatComposerVisualPreview theme={theme} />
  );
}
