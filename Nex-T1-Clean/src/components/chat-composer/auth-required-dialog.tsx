import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AuthView = "sign-in" | "sign-up";

interface AuthRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: AuthView) => void;
}

export function AuthRequiredDialog({ open, onOpenChange, onNavigate }: AuthRequiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>
            Sign in or create an account to send prompts to Nex AI.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Button onClick={() => onNavigate("sign-in")}>Sign in</Button>
          <Button variant="outline" onClick={() => onNavigate("sign-up")}>
            Create account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
