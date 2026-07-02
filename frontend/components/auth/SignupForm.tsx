"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import useAuth from "@/hooks/useAuth";

type Role = "buyer" | "seller";

export default function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    const { error: signupError, hasSession } = await signup(name, email, password, role);
    setSubmitting(false);

    if (signupError) {
      setError(signupError);
      return;
    }

    // Email confirmation is off → Supabase already logged us in, straight to app.
    if (hasSession) {
      router.push(ROUTES.LISTINGS);
      return;
    }

    // Email confirmation is on → user needs to click the link before logging in.
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-wide text-teal-deep">
            {APP_NAME}
          </h1>
        </div>
        <h2 className="mb-3 text-center text-xl font-semibold text-teal-deep">
          Check your email
        </h2>
        <p className="text-center text-sm text-gray-600">
          We sent a confirmation link to <strong>{email}</strong>. Confirm it,
          then log in.
        </p>
        <Button
          onClick={() => router.push(ROUTES.LOGIN)}
          className="mt-6 w-full"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-wide text-teal-deep">
          {APP_NAME}
        </h1>
        <p className="mt-2 text-sm text-gray-500">Create your account</p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-600"
          >
            Display Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Jane Adekunle"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-600"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-600"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-600">
            I am a
          </span>
          <RoleSegmented value={role} onChange={setRole} />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full"
        >
          {submitting ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href={ROUTES.LOGIN}
          className="font-medium text-teal-mid hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

function RoleSegmented({
  value,
  onChange,
}: {
  value: Role;
  onChange: (r: Role) => void;
}) {
  const options: { key: Role; label: string }[] = [
    { key: "buyer", label: "Buyer" },
    { key: "seller", label: "Seller" },
  ];

  return (
    <div
      role="radiogroup"
      className="flex rounded-lg border border-gray-200 bg-gray-50 p-1"
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-white text-teal-deep shadow-sm"
                : "text-gray-500 hover:text-teal-deep"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
