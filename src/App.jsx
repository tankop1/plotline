import { useEffect, useMemo, useState } from "react";
import { useTheme } from "./theme/ThemeProvider.jsx";
import profileImg from "./assets/images/Profile Picture.jpeg";
import { useAuth } from "./theme/AuthProvider.jsx";
import brandIcon from "./assets/images/Plotline Icon.png";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Project from "./pages/Project.jsx";
import { getUserProjects, createProject } from "./firebase/projects.js";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash || "#/");
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

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

  // Fetch user projects when user changes
  useEffect(() => {
    const fetchProjects = async () => {
      if (user) {
        setProjectsLoading(true);
        try {
          const userProjects = await getUserProjects(user.uid);
          setProjects(userProjects);
        } catch (error) {
          console.error("Error fetching projects:", error);
          setProjects([]);
        } finally {
          setProjectsLoading(false);
        }
      } else {
        setProjects([]);
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  // Function to create a new project
  const handleCreateProject = async () => {
    if (!user || creatingProject) return;

    setCreatingProject(true);
    try {
      const projectData = {
        name: "Untitled Project",
        lines: [
          { id: "l1", text: "FADE IN:", style: "action" },
          { id: "l2", text: "EXT. CITY STREET - DAY", style: "location" },
          { id: "l3", text: "A bustling urban landscape...", style: "action" },
          { id: "l4", text: "JOHN (30s) walks with purpose.", style: "action" },
          { id: "l5", text: "He checks his watch.", style: "action" },
          { id: "l6", text: "JOHN", style: "character" },
          { id: "l7", text: "(muttering)", style: "parenthetical" },
          { id: "l8", text: "I'm late again.", style: "dialogue" },
        ],
      };

      const newProjectId = await createProject(user.uid, projectData);

      // Navigate to the new project
      window.location.hash = `#/project/${newProjectId}`;

      // Refresh the projects list to show the new project
      const updatedProjects = await getUserProjects(user.uid);
      setProjects(updatedProjects);
    } catch (error) {
      console.error("Error creating project:", error);
      // Fallback to regular project page if creation fails
      window.location.hash = "#/project";
    } finally {
      setCreatingProject(false);
    }
  };

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
              onClick={handleCreateProject}
              disabled={creatingProject}
            >
              {creatingProject ? "Creating..." : "Start a new project"}
              <span className="cta-plus" aria-hidden>
                +
              </span>
            </button>
          </div>
        </section>

        <section className="grid">
          {projectsLoading ? (
            <div className="loading-state">
              <p>Loading your projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <p>No projects yet. Create your first screenplay!</p>
            </div>
          ) : (
            projects.map((project) => (
              <article
                key={project.id}
                className="card"
                onClick={() =>
                  (window.location.hash = `#/project/${project.id}`)
                }
                style={{ cursor: "pointer" }}
              >
                <div className="card-thumb">
                  <div className="document-preview">
                    {project.lines && project.lines.length > 0 ? (
                      project.lines.slice(0, 8).map((line, idx) => (
                        <div
                          key={idx}
                          className={`preview-line preview-${
                            line.style || "action"
                          }`}
                        >
                          {line.text}
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="preview-line preview-action">
                          FADE IN:
                        </div>
                        <div className="preview-line preview-location">
                          EXT. CITY STREET - DAY
                        </div>
                        <div className="preview-line preview-action">
                          A bustling urban landscape...
                        </div>
                        <div className="preview-line preview-action">
                          JOHN (30s) walks with purpose.
                        </div>
                        <div className="preview-line preview-action">
                          He checks his watch.
                        </div>
                        <div className="preview-line preview-character">
                          JOHN
                        </div>
                        <div className="preview-line preview-parenthetical">
                          (muttering)
                        </div>
                        <div className="preview-line preview-dialogue">
                          I'm late again.
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="card-meta">
                  <div className="card-title">
                    {project.name || "Untitled Project"}
                  </div>
                  <div className="card-subtitle">
                    Last opened{" "}
                    {project.updatedAt
                      ? new Date(
                          project.updatedAt.seconds * 1000
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "Recently"}
                  </div>
                </div>
                <button className="card-menu" aria-label="Project menu">
                  ⋮
                </button>
              </article>
            ))
          )}
        </section>

        <button
          className="floating-add"
          aria-label="Create new project"
          onClick={handleCreateProject}
          disabled={creatingProject}
        >
          {creatingProject ? "..." : "+"}
        </button>
      </main>
    </div>
  );
}

export default App;
