

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import useAuth from "@/hooks/useAuth";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    const { error: loginError } = await login(email, password);
    setSubmitting(false);

    if (loginError) {
      setError(loginError);
      return;
    }

    router.push("/listings");
  }

  return (
    <div className="max-w-md rounded-xl bg-white p-8 shadow">
      <h2 className="mb-6 text-2xl font-bold">Login</h2>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="mt-4">
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <Button onClick={handleLogin} disabled={submitting} className="mt-6 w-full">
        {submitting ? "Logging in..." : "Login"}
      </Button>
    </div>
  );
}
