import { useState } from "react";
import { useAuth } from "../theme/AuthProvider.jsx";
import brandIcon from "../assets/images/Plotline Icon.png";

function EyeIcon({ crossed = false }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle
        cx="12"
        cy="12"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
      />
      {crossed ? (
        <line
          x1="4"
          y1="20"
          x2="20"
          y2="4"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      ) : null}
    </svg>
  );
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="login-page">
      <a className="login-logo" href="#/">
        <img className="brand-icon" src={brandIcon} alt="Plotline" />
      </a>

      <h1 className="login-title">Welcome back!</h1>

      <div className="login-card" role="form" aria-label="Sign in">
        <div className="form-field">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            placeholder="example@email.com"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Password</label>
          <div className="password-wrap">
            <input
              className="form-input form-input--password"
              type={showPassword ? "text" : "password"}
              placeholder="password12"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
            >
              <EyeIcon crossed={showPassword} />
            </button>
          </div>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button
          className="login-submit"
          type="button"
          disabled={submitting}
          onClick={async () => {
            setError("");
            setSubmitting(true);
            try {
              await signIn(email, password);
              window.location.hash = "#/";
            } catch (e) {
              setError(e?.message || "Login failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}
