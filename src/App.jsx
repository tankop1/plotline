import { useEffect, useMemo, useState } from "react";
import { useTheme } from "./theme/ThemeProvider.jsx";
import profileImg from "./assets/images/Profile Picture.jpeg";
import { useAuth } from "./theme/AuthProvider.jsx";
import brandIcon from "./assets/images/Plotline Icon.png";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Project from "./pages/Project.jsx";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash || "#/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isRegister = useMemo(() => route.startsWith("#/register"), [route]);
  const isLogin = useMemo(() => route.startsWith("#/login"), [route]);
  const isProject = useMemo(() => route.startsWith("#/project"), [route]);

  if (isRegister) {
    return <Register />;
  }

  if (isLogin) {
    return <Login />;
  }

  if (isProject) {
    return <Project />;
  }

  return (
    <div className="dashboard">
      <header className={`header${scrolled ? " header--scrolled" : ""}`}>
        <div className="brand">
          <img className="brand-icon" src={brandIcon} alt="Plotline" />
          <span className="brand-name">Plotline</span>
        </div>
        <div className="search">
          <svg
            className="search-icon"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="16.65"
              y1="16.65"
              x2="21"
              y2="21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            className="search-input"
            placeholder="Search for a project"
            aria-label="Search"
          />
        </div>
        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          {user ? (
            <>
              <button className="auth-login" onClick={signOut}>
                Sign out
              </button>
              <img className="avatar" src={profileImg} alt="Profile" />
            </>
          ) : (
            <>
              <button
                className="auth-login"
                onClick={() => (window.location.hash = "#/login")}
              >
                Login
              </button>
              <button
                className="auth-register"
                onClick={() => {
                  if (window.location.hash !== "#/register") {
                    window.location.hash = "#/register";
                  }
                }}
              >
                Register
              </button>
            </>
          )}
        </div>
      </header>

      <main className="content">
        <section className="hero">
          <div className="hero-gradient" />
          <div className="hero-inner">
            <h1 className="hero-title">
              Turn your idea into a screenplay in minutes with Plotline
            </h1>
            <button
              className="cta"
              onClick={() => (window.location.hash = "#/project")}
            >
              Start a new project
              <span className="cta-plus" aria-hidden>
                +
              </span>
            </button>
          </div>
        </section>

        <section className="grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <article
              key={idx}
              className="card"
              onClick={() => (window.location.hash = "#/project")}
              style={{ cursor: "pointer" }}
            >
              <div className="card-thumb">
                <div className="document-preview">
                  <div className="document-header">FADE IN:</div>
                  <div className="document-line">EXT. CITY STREET - DAY</div>
                  <div className="document-line">
                    A bustling urban landscape...
                  </div>
                  <div className="document-line">
                    JOHN (30s) walks with purpose.
                  </div>
                  <div className="document-line">He checks his watch.</div>
                  <div className="document-line">JOHN</div>
                  <div className="document-line">(muttering)</div>
                  <div className="document-line">I'm late again.</div>
                </div>
              </div>
              <div className="card-meta">
                <div className="card-title">
                  {idx === 0
                    ? "Untitled Project"
                    : idx === 1
                    ? "New Adventure"
                    : idx === 2
                    ? "Mystery Box"
                    : "Epic Journey"}
                </div>
                <div className="card-subtitle">Last opened Oct. {idx + 5}</div>
              </div>
              <button className="card-menu" aria-label="Project menu">
                ⋮
              </button>
            </article>
          ))}
        </section>

        <button
          className="floating-add"
          aria-label="Create new project"
          onClick={() => (window.location.hash = "#/project")}
        >
          +
        </button>
      </main>
    </div>
  );
}

export default App;
