import { useMemo, useState } from "react";
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

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="register-page">
      <a className="register-logo" href="#/">
        <img className="brand-icon" src={brandIcon} alt="Plotline" />
      </a>

      <h1 className="register-title">Welcome to Plotline!</h1>

      <div className="register-card" role="form" aria-label="Create account">
        <div className="register-grid">
          <div className="form-field form-field--first">
            <label className="form-label">First Name</label>
            <input
              className="form-input"
              placeholder="John"
              aria-label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="form-field form-field--first">
            <label className="form-label">Last Name</label>
            <input
              className="form-input"
              placeholder="Doe"
              aria-label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

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
          className="register-submit"
          type="button"
          disabled={submitting}
          onClick={async () => {
            setError("");
            setSubmitting(true);
            try {
              await signUp({ firstName, lastName, email, password });
              window.location.hash = "#/";
            } catch (e) {
              setError(e?.message || "Registration failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Creating..." : "Create an account"}
        </button>
      </div>
    </div>
  );
}
