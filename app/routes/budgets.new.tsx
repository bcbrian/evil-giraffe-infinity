import { Form, redirect, json, useActionData } from "@remix-run/react";
import type { ActionFunction } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/client.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const amount = parseFloat(formData.get("amount") as string);

  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { error } = await supabase
    .from("budgets")
    .insert([{ name, amount, owner: user.id }]);

  if (error) {
    return json({ error: error.message || "Unknown error" }, { headers });
  }

  return redirect("/budgets");
};

export default function NewBudget() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Create Budget</h1>
      <Form method="post" className="w-full max-w-sm">
        <div className="mb-4">
          <label
            htmlFor="name"
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Budget Name
          </label>
          <input
            type="text"
            name="name"
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-6">
          <label
            htmlFor="amount"
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Budget Amount
          </label>
          <input
            type="number"
            name="amount"
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        {actionData?.error && (
          <p className="text-red-500">{actionData.error}</p>
        )}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Create Budget
          </button>
          <a
            href="/budgets"
            className="inline-block align-baseline font-bold text-sm text-red-500 hover:text-red-800"
          >
            Cancel
          </a>
        </div>
      </Form>
    </div>
  );
}
