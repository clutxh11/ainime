import { SupabaseTest } from "@/components/supabase-test";

export default function SupabaseTestPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Supabase Connection Test
        </h1>
        <SupabaseTest />

        <div className="mt-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Next Steps</h2>
          <div className="text-gray-300 space-y-2">
            <p>
              1. If connection is successful, you can now set up your database
              schema
            </p>
            <p>2. Go to your Supabase dashboard → SQL Editor</p>
            <p>
              3. Copy and paste the contents of{" "}
              <code className="bg-gray-700 px-2 py-1 rounded">
                supabase-schema.sql
              </code>
            </p>
            <p>4. Run the SQL to create all tables and policies</p>
          </div>
        </div>
      </div>
    </div>
  );
}
