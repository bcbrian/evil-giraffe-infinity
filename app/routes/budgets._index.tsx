import { useLoaderData, redirect, json, Link } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase/client.server";

interface Budget {
  id: string; // Assuming Supabase uses a string for IDs
  name: string;
  amount: number;
  owner: string;
  spent: number;
}

export const loader: LoaderFunction = async ({ request }) => {
  const headers = new Headers();
  const supabase = await createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: budgets, error } = await supabase.from("budgets").select("*");

  if (error) {
    console.error("Error fetching budgets:", error);
    return json({ error: error.message }, { headers });
  }

  return json({ budgets }, { headers });
};

export default function Budgets() {
  const { budgets } = useLoaderData<typeof loader>();

  if (!budgets || budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <p className="text-gray-500 mt-4">
          You don&apos;t have any budgets yet
        </p>
        <Link to="/budgets/new">
          <button className="mt-4 bg-green-300 text-green-800 px-4 py-2 rounded">
            Create Budget
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <Link to="/budgets/new">
          <button className="bg-gray-200 p-2 rounded-full">+</button>
        </Link>
      </div>
      {budgets.map((budget: Budget) => (
        <div key={budget.id} className="mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{budget.name}</h2>
            <p className="text-lg font-semibold">${budget.amount}</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6 mt-2">
            <div
              className="bg-green-300 h-6 rounded-full flex items-center justify-center"
              style={{ width: `${(budget.spent / budget.amount) * 100}%` }}
            >
              <span className="text-green-800">${budget.spent}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
