import { redirect } from "next/navigation";

export default function Page() {
  redirect("/settings/agent?view=assistant");
}
