"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Ring } from "@/components/ui/ring";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Required"),
});

const passwordRequirements = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "lower", label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper", label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "digit", label: "Number", test: (p: string) => /\d/.test(p) },
  {
    id: "symbol",
    label: "Symbol",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
] as const;

const strongPassword = z.string().refine((p) => passwordRequirements.every((r) => r.test(p)), {
  message: "Password doesn't meet all requirements",
});

const signupSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  password: strongPassword,
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

const TRANSITION_MS = 280;

export function AuthCard({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  function switchTo(next: Mode) {
    if (next === mode) return;
    setMode(next);
    // Keep URL in sync without a full nav (layout & component state persist).
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/${next}`);
    }
  }

  return (
    <div className="space-y-6">
      <Header mode={mode} />
      <div className="relative grid">
        <Pane visible={mode === "login"}>
          <LoginForm onSwitch={() => switchTo("signup")} />
        </Pane>
        <Pane visible={mode === "signup"}>
          <SignupForm onSwitch={() => switchTo("login")} />
        </Pane>
      </div>
    </div>
  );
}

function Header({ mode }: { mode: Mode }) {
  const isLogin = mode === "login";
  return (
    <div className="relative grid">
      <div
        className={cn(
          "col-start-1 row-start-1 space-y-1 transition-opacity duration-300 ease-out",
          isLogin ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your workspace.</p>
      </div>
      <div
        className={cn(
          "col-start-1 row-start-1 space-y-1 transition-opacity duration-300 ease-out",
          !isLogin ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={isLogin}
      >
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          We'll get your shop set up in the next step.
        </p>
      </div>
    </div>
  );
}

function Pane({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "col-start-1 row-start-1 transition-[opacity,transform] ease-out",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
      )}
      style={{ transitionDuration: `${TRANSITION_MS}ms` }}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}

function ChecklistItem({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 transition-colors",
        met ? "text-success" : "text-muted-foreground",
      )}
    >
      {met ? (
        <Check className="size-3.5 shrink-0" />
      ) : (
        <Circle className="size-3.5 shrink-0 opacity-60" />
      )}
      <span>{label}</span>
    </li>
  );
}

function PasswordChecklist({ value }: { value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">Password must include</p>
      <ul className="space-y-1 text-xs">
        {passwordRequirements.map((req) => (
          <ChecklistItem key={req.id} met={req.test(value ?? "")} label={req.label} />
        ))}
      </ul>
    </div>
  );
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EmailChecklist({ value }: { value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">Email must be</p>
      <ul className="space-y-1 text-xs">
        <ChecklistItem met={emailRegex.test(value ?? "")} label="A valid email address" />
      </ul>
    </div>
  );
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [emailFocused, setEmailFocused] = useState(false);
  // Keeps the button spinner up from submit through the redirect — isSubmitting
  // flips back to false as soon as onSubmit returns, before navigation lands.
  const [redirecting, setRedirecting] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error("Couldn't sign in", { description: error.message });
      return;
    }

    // No success toast — just hold the spinner and redirect.
    setRedirecting(true);
    router.push("/dashboard");
    router.refresh();
  }

  const busy = form.formState.isSubmitting || redirecting;

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <Tooltip open={emailFocused}>
          <TooltipTrigger asChild>
            <div onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}>
              <FormField name="email" label="Email" required hideError>
                <Input type="email" autoComplete="email" placeholder="you@example.com" />
              </FormField>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="start"
            sideOffset={12}
            className="border border-border bg-popover text-popover-foreground"
          >
            <EmailChecklist value={form.watch("email")} />
          </TooltipContent>
        </Tooltip>
        <FormField name="password" label="Password" required>
          <Input type="password" autoComplete="current-password" placeholder="••••••••" />
        </FormField>

        <div className="flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={busy || !form.formState.isValid}>
          {busy ? <Ring size="sm" className="text-current" /> : "Sign in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="font-medium text-foreground hover:underline"
          >
            Sign up
          </button>
        </p>
      </form>
    </Form>
  );
}

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [pwFocused, setPwFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  async function onSubmit(values: SignupValues) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { first_name: values.firstName, last_name: values.lastName },
      },
    });

    if (error) {
      toast.error("Couldn't create account", { description: error.message });
      return;
    }

    // If email confirmation is required, Supabase returns user but no session.
    if (data.session) {
      toast.success("Account created", {
        description: `Welcome, ${values.firstName}. Heading to onboarding…`,
      });
      router.push("/onboarding");
      router.refresh();
    } else {
      toast.success("Check your inbox", {
        description: `We sent a confirmation link to ${values.email}.`,
      });
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-3">
          <FormField name="firstName" label="First name" required>
            <Input type="text" autoComplete="given-name" placeholder="Jane" />
          </FormField>
          <FormField name="lastName" label="Last name" required>
            <Input type="text" autoComplete="family-name" placeholder="Doe" />
          </FormField>
        </div>
        <Tooltip open={emailFocused}>
          <TooltipTrigger asChild>
            <div onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}>
              <FormField name="email" label="Email" required hideError>
                <Input type="email" autoComplete="email" placeholder="you@example.com" />
              </FormField>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="start"
            sideOffset={12}
            className="border border-border bg-popover text-popover-foreground"
          >
            <EmailChecklist value={form.watch("email")} />
          </TooltipContent>
        </Tooltip>
        <Tooltip open={pwFocused}>
          <TooltipTrigger asChild>
            <div onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}>
              <FormField name="password" label="Password" required hideError>
                <Input type="password" autoComplete="new-password" placeholder="••••••••" />
              </FormField>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="start"
            sideOffset={12}
            className="border border-border bg-popover text-popover-foreground"
          >
            <PasswordChecklist value={form.watch("password")} />
          </TooltipContent>
        </Tooltip>

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting || !form.formState.isValid}
        >
          {form.formState.isSubmitting ? (
            <Ring size="sm" className="text-current" />
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </button>
        </p>
      </form>
    </Form>
  );
}
