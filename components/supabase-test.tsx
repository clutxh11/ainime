"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<
    "testing" | "connected" | "error"
  >("testing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus("testing");

      // Test basic connection by querying the database
      const { data, error } = await supabase
        .from("users")
        .select("count")
        .limit(1);

      if (error) {
        // If users table doesn't exist yet, that's expected
        if (error.code === "42P01") {
          setConnectionStatus("connected");
          setErrorMessage(
            "Connection successful! (Users table not created yet)"
          );
        } else {
          throw error;
        }
      } else {
        setConnectionStatus("connected");
        setErrorMessage("");
      }
    } catch (error: any) {
      setConnectionStatus("error");
      setErrorMessage(error.message || "Connection failed");
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-500";
      case "error":
        return "text-red-500";
      default:
        return "text-yellow-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "✅ Connected to Supabase";
      case "error":
        return "❌ Connection Error";
      default:
        return "🔄 Testing connection...";
    }
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">
        Supabase Connection Test
      </h2>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {errorMessage && (
          <div className="text-sm text-gray-300 bg-gray-700 p-3 rounded">
            {errorMessage}
          </div>
        )}

        <div className="text-sm text-gray-400">
          <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
          <div>
            Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}
            ...
          </div>
        </div>

        <Button
          onClick={testConnection}
          disabled={connectionStatus === "testing"}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Test Connection Again
        </Button>
      </div>
    </div>
  );
}
