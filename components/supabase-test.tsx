"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<
    "testing" | "connected" | "error"
  >("testing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus("testing");

      // Test basic connection by checking if we can reach Supabase
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error("Environment variables not loaded");
      }

      // Simple health check using fetch
      const response = await fetch(`${url}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setConnectionStatus("connected");
        setErrorMessage("Connection successful! Supabase is reachable.");

        // Now test actual database queries
        await testDatabaseQueries();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      setConnectionStatus("error");
      setErrorMessage(error.message || "Connection failed");
      console.error("Supabase connection error:", error);
    }
  };

  const testDatabaseQueries = async () => {
    try {
      // Test querying users
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("*")
        .limit(3);

      if (usersError) throw usersError;

      // Test querying projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .limit(3);

      if (projectsError) throw projectsError;

      // Test querying forum posts
      const { data: posts, error: postsError } = await supabase
        .from("forum_posts")
        .select("*")
        .limit(3);

      if (postsError) throw postsError;

      setData({
        users: users || [],
        projects: projects || [],
        posts: posts || [],
      });
    } catch (error: any) {
      console.error("Database query error:", error);
      setErrorMessage(
        `Connection successful, but database queries failed: ${error.message}`
      );
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
          <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || "Not loaded"}</div>
          <div>
            Key:{" "}
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(
                  0,
                  20
                )}...`
              : "Not loaded"}
          </div>
        </div>

        {data && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Database Data Test:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 p-3 rounded">
                <h4 className="font-semibold text-white mb-2">
                  Users ({data.users.length})
                </h4>
                {data.users.map((user: any) => (
                  <div key={user.id} className="text-sm text-gray-300">
                    {user.username} ({user.role})
                  </div>
                ))}
              </div>

              <div className="bg-gray-700 p-3 rounded">
                <h4 className="font-semibold text-white mb-2">
                  Projects ({data.projects.length})
                </h4>
                {data.projects.map((project: any) => (
                  <div key={project.id} className="text-sm text-gray-300">
                    {project.title} ({project.status})
                  </div>
                ))}
              </div>

              <div className="bg-gray-700 p-3 rounded">
                <h4 className="font-semibold text-white mb-2">
                  Forum Posts ({data.posts.length})
                </h4>
                {data.posts.map((post: any) => (
                  <div key={post.id} className="text-sm text-gray-300">
                    {post.title.substring(0, 30)}...
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
