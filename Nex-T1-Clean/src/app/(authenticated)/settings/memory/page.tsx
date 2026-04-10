import { redirect } from "next/navigation";

export default function Page() {
  redirect("/settings/messages?view=memory");
}
