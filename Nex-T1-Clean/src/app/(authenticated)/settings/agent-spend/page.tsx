import { redirect } from "next/navigation";

export default function Page() {
  redirect("/settings/security?view=risk");
}
