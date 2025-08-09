"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function SignupTest() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Attempting signup with:", { email, password });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log("Signup response:", { data, error });

      if (error) {
        console.error("Signup error:", error);
        toast.error(`Signup failed: ${error.message}`);
      } else {
        console.log("Signup successful:", data);
        toast.success("Signup successful! Check your email for confirmation.");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Unexpected error during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">Test Signup</h2>
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="bg-gray-700 border-gray-600 text-white"
            minLength={6}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          {loading ? "Signing up..." : "Test Signup"}
        </Button>
      </form>

      <div className="mt-4 p-3 bg-gray-700 rounded text-sm text-gray-300">
        <p>
          <strong>Debug Info:</strong>
        </p>
        <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p>
          Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...
        </p>
        <p>Check browser console for detailed logs</p>
      </div>
    </div>
  );
}
