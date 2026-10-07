import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  FiAlertCircle,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
} from "react-icons/fi";

import { useLoginMutation } from "../../../api/api";
import { setToken } from "../auth.slice";
import { loginSchema } from "../schemas/auth.schema";
import { homeFor } from "../roles";
import type { UserRole } from "../../../api/api";

type FieldErrors = { email?: string; password?: string };

function apiMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    if ("status" in error && error.status === "FETCH_ERROR") {
      return "Can't reach the server. Check your connection and try again.";
    }
    if (
      "data" in error &&
      typeof error.data === "object" &&
      error.data !== null &&
      "message" in error.data
    ) {
      return String(error.data.message);
    }
  }
  return "Login failed. Please try again.";
}

export default function LoginForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    const parsed = loginSchema.safeParse({ email: email.trim(), password });

    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email") errors.email = "Enter a valid email address.";
        if (field === "password") errors.password = "Password must be at least 8 characters.";
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      const result = await login(parsed.data).unwrap();
      dispatch(setToken(result.token));
      // Cashiers start at the POS, the manager at the dashboard
      navigate(homeFor(result.user.role as UserRole), { replace: true });
    } catch (error) {
      setFormError(apiMessage(error));
    }
  };

  const checkCapsLock = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);
  };

  const inputWrap = (hasError: boolean) =>
    `group flex items-center gap-3 rounded-xl border bg-white px-4 transition focus-within:ring-4 ${
      hasError
        ? "border-red-300 focus-within:border-red-400 focus-within:ring-red-100"
        : "border-[#E6EAED] focus-within:border-[#FE9F43] focus-within:ring-[#FE9F43]/15"
    }`;

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{formError}</span>
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-two">
          Email
        </label>
        <div className={inputWrap(!!fieldErrors.email)}>
          <FiMail className="shrink-0 text-[#A0A7AE] group-focus-within:text-[#FE9F43]" size={17} />
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@store.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            disabled={isLoading}
            aria-invalid={!!fieldErrors.email}
            className="w-full bg-transparent py-3 text-[15px] text-text-two outline-none placeholder:text-[#A0A7AE] disabled:opacity-60"
          />
        </div>
        {fieldErrors.email && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-two">
          Password
        </label>
        <div className={inputWrap(!!fieldErrors.password)}>
          <FiLock className="shrink-0 text-[#A0A7AE] group-focus-within:text-[#FE9F43]" size={17} />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
            }}
            onKeyDown={checkCapsLock}
            onKeyUp={checkCapsLock}
            onBlur={() => setCapsLock(false)}
            disabled={isLoading}
            aria-invalid={!!fieldErrors.password}
            className="w-full bg-transparent py-3 text-[15px] text-text-two outline-none placeholder:text-[#A0A7AE] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword((show) => !show)}
            className="shrink-0 cursor-pointer rounded-md p-1 text-[#A0A7AE] transition hover:text-text-two"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
          </button>
        </div>
        {fieldErrors.password ? (
          <p className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>
        ) : (
          capsLock && <p className="mt-1.5 text-xs text-amber-600">Caps Lock is on.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FE9F43] py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[#FE9F43]/30 transition hover:bg-[#F28F2F] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <FiArrowRight className="transition group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
