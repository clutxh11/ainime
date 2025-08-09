"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "./auth-provider";
import { Github, Mail } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle, signInWithGitHub } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        // Handle specific error cases
        if (error.message.includes("Email not confirmed")) {
          setError(
            "Please check your email and click the confirmation link before signing in."
          );
        } else if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(error.message);
        }
      } else {
        // Success - close modal and clear form
        onOpenChange(false);
        setEmail("");
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setLoading(true);
    setError(null);

    try {
      const { error } =
        provider === "google"
          ? await signInWithGoogle()
          : await signInWithGitHub();

      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isSignUp ? "Create Account" : "Sign In"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isSignUp
              ? "Join our community to rate and discuss anime"
              : "Welcome back! Sign in to continue"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={isSignUp ? "signup" : "signin"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-700">
            <TabsTrigger
              value="signin"
              onClick={() => setIsSignUp(false)}
              className="data-[state=active]:bg-gray-600"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              onClick={() => setIsSignUp(true)}
              className="data-[state=active]:bg-gray-600"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value={isSignUp ? "signup" : "signin"}
            className="space-y-4"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : isSignUp
                  ? "Create Account"
                  : "Sign In"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-800 px-2 text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={loading}
                className="bg-gray-700 border-gray-600 hover:bg-gray-600"
              >
                <Mail className="w-4 h-4 mr-2" />
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("github")}
                disabled={loading}
                className="bg-gray-700 border-gray-600 hover:bg-gray-600"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
