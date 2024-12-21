import { Form, useActionData, Link } from "react-router";
import { redirect, data } from "react-router";
import { createSupabaseServerClient } from "~/supabase/client.server";
import { motion } from "framer-motion";
import { DollarSign, X } from "lucide-react";
import type { Route } from "./+types/budgets.new";

export async function action({ request }: Route.ActionArgs) {
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
    return data({ error: error.message || "Unknown error" }, { headers });
  }

  return redirect("/budgets");
}

export default function NewBudget() {
  const actionData = useActionData<typeof action>();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-900 to-indigo-900 text-purple-100"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-md bg-black bg-opacity-50 p-8 rounded-lg shadow-lg"
      >
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Create Budget
        </h1>
        <Form method="post" className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-purple-300 text-sm font-semibold mb-2"
            >
              Budget Name
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-4 py-2 rounded bg-purple-900 bg-opacity-50 border border-purple-700 text-purple-100 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter budget name"
            />
          </div>
          <div>
            <label
              htmlFor="amount"
              className="block text-purple-300 text-sm font-semibold mb-2"
            >
              Budget Amount
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                size={18}
              />
              <input
                type="number"
                name="amount"
                required
                className="w-full pl-10 pr-4 py-2 rounded bg-purple-900 bg-opacity-50 border border-purple-700 text-purple-100 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter budget amount"
              />
            </div>
          </div>
          {actionData?.error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 bg-red-900 bg-opacity-50 p-3 rounded"
            >
              {actionData.error}
            </motion.p>
          )}
          <div className="flex items-center justify-between pt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:shadow-xl"
            >
              Create Budget
            </motion.button>
            <Link
              to="/budgets"
              className="inline-flex items-center font-semibold text-purple-300 hover:text-purple-100 transition-colors duration-300"
            >
              <X size={20} className="mr-1" />
              Cancel
            </Link>
          </div>
        </Form>
      </motion.div>
    </motion.div>
  );
}
