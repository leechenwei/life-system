import { getAccounts } from "@/lib/data";
import { addTransaction } from "../actions";
import { redirect } from "next/navigation";
import AddForm from "./add-form";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const accounts = await getAccounts();

  async function submit(form: FormData) {
    "use server";
    await addTransaction(form);
    redirect("/");
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="pt-2 text-xl font-semibold">Add transaction</h1>
      <AddForm
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
        action={submit}
      />
    </main>
  );
}
