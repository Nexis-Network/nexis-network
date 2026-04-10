import { redirect } from "next/navigation";

export default function Page() {
  redirect("/settings/wallets?view=agentkit");
}
