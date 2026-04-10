import Link from "next/link";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resolveAuthErrorCopy } from "@/app/auth/error-content";
import { getRequestI18n } from "@/i18n/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; provider?: string }>;
}) {
  const params = await searchParams;
  const { locale } = await getRequestI18n();
  const errorInfo = resolveAuthErrorCopy(locale, params?.error, params?.provider);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{errorInfo.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{errorInfo.message}</p>
              <p className="text-sm text-muted-foreground">{errorInfo.recovery}</p>
              {params?.error && (
                <p className="text-xs text-muted-foreground/60 pt-2">
                  {errorInfo.referenceLabel}: {params.error}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex gap-3">
              {errorInfo.actionHref && (
                <Button asChild>
                  <Link href={errorInfo.actionHref}>
                    {errorInfo.actionLabel ?? "Try again"}
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href="/">{errorInfo.homeLabel}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
