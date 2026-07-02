

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import useAuth from "@/hooks/useAuth";

export default function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup() {
    setError(null);

    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    const { error: signupError } = await signup(name, email, password);
    setSubmitting(false);

    if (signupError) {
      setError(signupError);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="max-w-md rounded-xl bg-white p-8 shadow">
        <h2 className="mb-4 text-2xl font-bold">Check your email</h2>
        <p className="text-gray-600">
          We sent a confirmation link to {email}. Confirm it, then log in.
        </p>
        <Button onClick={() => router.push("/login")} className="mt-6 w-full">
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md rounded-xl bg-white p-8 shadow">
      <h2 className="mb-6 text-2xl font-bold">Create Account</h2>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <Input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="mt-4">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <Button onClick={handleSignup} disabled={submitting} className="mt-6 w-full">
        {submitting ? "Creating account..." : "Sign Up"}
      </Button>
    </div>
  );
}
