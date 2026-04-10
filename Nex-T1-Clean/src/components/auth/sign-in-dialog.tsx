"use client";

import { ReactNode, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslations } from "@/components/providers/locale-provider";
import { LoginWithWallet } from "@/components/auth/login-with-wallet";
import { getSignInDialogCopy } from "@/modules/auth/i18n";

type SignInDialogProps = {
  children: ReactNode;
};

export function SignInDialog({ children }: SignInDialogProps) {
  const t = useTranslations("auth");
  const copy = getSignInDialogCopy(t);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    const search = searchParams?.toString();
    return `${pathname}${search ? `?${search}` : ""}`;
  }, [pathname, searchParams]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-transparent border-none p-0 sm:max-w-sm" showCloseButton>
        <DialogTitle className="sr-only">{copy.title}</DialogTitle>
        <DialogDescription className="sr-only">{copy.description}</DialogDescription>
        <LoginWithWallet
          redirectTo={redirectTo}
          onSuccess={() => {
            setOpen(false);
            router.push(redirectTo || "/");
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
