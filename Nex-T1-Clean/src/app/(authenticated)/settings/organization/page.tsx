import { redirect } from "next/navigation";

export default function Page() {
  redirect("/settings/workspace?view=organization");
}
