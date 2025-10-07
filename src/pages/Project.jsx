import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeProvider.jsx";
import profileImg from "../assets/images/Profile Picture.jpeg";
import brandIcon from "../assets/images/Plotline Icon.png";
// Using Font Awesome via kit in index.html

function Project() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("script");
  const [selectedTool, setSelectedTool] = useState("action");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [isEditingName, setIsEditingName] = useState(false);

  // Screenplay data model and selection
  const [lines, setLines] = useState([
    { id: "l1", text: "FADE IN:", style: "action" },
    { id: "l2", text: "EXT. CITY STREET - DAY", style: "location" },
    { id: "l3", text: "A bustling urban landscape...", style: "action" },
    { id: "l4", text: "JOHN (30s) walks with purpose.", style: "action" },
    { id: "l5", text: "He checks his watch.", style: "action" },
    { id: "l6", text: "JOHN", style: "character" },
    { id: "l7", text: "(muttering)", style: "parenthetical" },
    { id: "l8", text: "I'm late again.", style: "dialogue" },
  ]);
  const [selectionRange, setSelectionRange] = useState({
    start: 0,
    end: 0,
    isCollapsed: true,
  });
  const editorRef = useRef(null);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [lastClickedIndex, setLastClickedIndex] = useState(null);

  // Formatting types mapping
  const formattingTypes = [
    "location", // 1. Location - bold, left aligned
    "action", // 2. Action - left aligned
    "character", // 3. Character - 4.2" from left margin
    "dialogue", // 4. Dialogue - 2.9" from left edge
    "parenthetical", // 5. Parenthetical - 3.7" from left margin
    "transition", // 6. Transition - right aligned
    "general", // 7. General - same as action (left aligned)
  ];

  // Selection and block utilities
  const getClosestLineEl = (node) => {
    let current = node;
    while (current && current !== editorRef.current) {
      if (
        current.nodeType === Node.ELEMENT_NODE &&
        current.hasAttribute &&
        current.hasAttribute("data-line-index")
      )
        return current;
      current = current.parentNode;
    }
    return null;
  };

  const computeSelectionRange = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const aEl = getClosestLineEl(sel.anchorNode);
    const fEl = getClosestLineEl(sel.focusNode);
    if (!aEl || !fEl) return;
    const a = parseInt(aEl.getAttribute("data-line-index"), 10);
    const b = parseInt(fEl.getAttribute("data-line-index"), 10);
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    const isCollapsed = sel.isCollapsed && a === b;
    setSelectionRange({ start, end, isCollapsed });
    if (isCollapsed) setLastClickedIndex(start);
  };

  const selectionStyles = useMemo(() => {
    const { start, end } = selectionRange;
    const set = new Set();
    for (let i = start; i <= end && i < lines.length; i++)
      set.add(lines[i].style);
    return set;
  }, [selectionRange, lines]);

  // Line-based style update (no grouping)
  const applyStyleToSelection = (formatType) => {
    const { start, end } = selectionRange;
    const ids = selectedLineIds.length
      ? new Set(selectedLineIds)
      : new Set(
          Array.from(
            { length: end - start + 1 },
            (_, i) => lines[start + i]?.id
          )
        );
    setLines((prev) =>
      prev.map((ln) => (ids.has(ln.id) ? { ...ln, style: formatType } : ln))
    );
  };

  const handleEditorClick = () => {
    computeSelectionRange();
  };

  const setBrowserSelectionForLines = (start, end) => {
    const container = editorRef.current;
    if (!container) return;
    const startEl = container.querySelector(`[data-line-index="${start}"]`);
    const endEl = container.querySelector(`[data-line-index="${end}"]`);
    if (!startEl || !endEl) return;
    const range = document.createRange();
    range.setStart(startEl, 0);
    range.setEnd(endEl, endEl.childNodes.length);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const handleLineClick = (e, idx) => {
    if (e.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, idx);
      const end = Math.max(lastClickedIndex, idx);
      setSelectionRange({ start, end, isCollapsed: start === end });
      setBrowserSelectionForLines(start, end);
    } else {
      setSelectionRange({ start: idx, end: idx, isCollapsed: true });
      setLastClickedIndex(idx);
      // Do not programmatically select the whole line; let the browser place the caret
    }
  };

  const handleToolClick = (toolType) => {
    applyStyleToSelection(toolType);
    setSelectedTool(toolType);
  };

  // Project name editing handlers
  const handleNameClick = () => {
    setIsEditingName(true);
    // Select all text when editing starts
    setTimeout(() => {
      const input = document.querySelector(".project-name--editing");
      if (input) {
        input.select();
      }
    }, 0);
  };

  const handleNameChange = (e) => {
    setProjectName(e.target.value);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      setIsEditingName(false);
    } else if (e.key === "Escape") {
      setProjectName("Untitled Project"); // Reset to default
      setIsEditingName(false);
    }
  };

  const handleNameBlur = () => {
    setIsEditingName(false);
  };

  // Sync toolbar highlight with selection styles
  useEffect(() => {
    if (selectionStyles.size === 1) {
      const only = Array.from(selectionStyles)[0];
      setSelectedTool(only);
    } else {
      setSelectedTool(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionStyles]);

  // Keep selectedLineIds in sync with selectionRange
  useEffect(() => {
    const { start, end } = selectionRange;
    const ids = [];
    for (let i = start; i <= end && i < lines.length; i++)
      ids.push(lines[i].id);
    setSelectedLineIds(ids);
  }, [selectionRange, lines]);

  // Listen to selection changes to update selectionRange
  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const container = editorRef.current;
      if (!container) return;
      const range = sel.getRangeAt(0);
      if (
        !container.contains(range.startContainer) &&
        !container.contains(range.endContainer)
      )
        return;
      const aEl = (node) => {
        let cur = node;
        while (cur && cur !== container) {
          if (
            cur.nodeType === Node.ELEMENT_NODE &&
            cur.hasAttribute &&
            cur.hasAttribute("data-line-index")
          )
            return cur;
          cur = cur.parentNode;
        }
        return null;
      };
      const sEl = aEl(sel.anchorNode);
      const eEl = aEl(sel.focusNode);
      if (!sEl || !eEl) return;
      const a = parseInt(sEl.getAttribute("data-line-index"), 10);
      const b = parseInt(eEl.getAttribute("data-line-index"), 10);
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      const isCollapsed = sel.isCollapsed && a === b;
      setSelectionRange({ start, end, isCollapsed });
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  return (
    <div className="project-page">
      {/* Top Navigation Bar */}
      <header className="project-header">
        <div className="project-brand">
          <img
            className="project-brand-icon"
            src={brandIcon}
            alt="Plotline"
            onClick={() => (window.location.hash = "#/")}
            style={{ cursor: "pointer" }}
          />
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={handleNameChange}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameBlur}
              className="project-name project-name--editing"
              autoFocus
            />
          ) : (
            <span
              className="project-name"
              onClick={handleNameClick}
              style={{ cursor: "pointer" }}
            >
              {projectName}
            </span>
          )}
        </div>

        {/* Main Navigation Tabs */}
        <nav className="project-nav">
          <button
            className={`nav-tab ${
              activeTab === "plan" ? "nav-tab--active" : ""
            }`}
            onClick={() => setActiveTab("plan")}
          >
            <i className="fa-regular fa-window-restore nav-icon" />
            Plan
          </button>
          <button
            className={`nav-tab ${
              activeTab === "script" ? "nav-tab--active" : ""
            }`}
            onClick={() => setActiveTab("script")}
          >
            <i className="fa-regular fa-file-lines nav-icon" />
            Script
          </button>
          <button
            className={`nav-tab ${
              activeTab === "storyboard" ? "nav-tab--active" : ""
            }`}
            onClick={() => setActiveTab("storyboard")}
          >
            <i className="fa-regular fa-images nav-icon" />
            Storyboard
          </button>
        </nav>

        <div className="project-actions">
          <button className="share-button">Share</button>
          <img className="project-avatar" src={profileImg} alt="Profile" />
        </div>
      </header>

      {/* Secondary Toolbar */}
      <div className="project-toolbar">
        <div className="toolbar-left">
          <button className="table-read-button">
            <i className="fa-regular fa-circle-play play-icon" />
            Start a table read
          </button>

          <div className="toolbar-icons">
            <button className="toolbar-icon" title="Random">
              <i className="fa-solid fa-dice" />
            </button>
            <button className="toolbar-icon" title="Clipboard">
              <i className="fa-regular fa-clipboard" />
            </button>
            <div className="toolbar-divider"></div>
            <button
              className={`toolbar-icon ${
                selectedTool === "location" ? "toolbar-icon--selected" : ""
              }`}
              title="Location"
              onClick={() => handleToolClick("location")}
            >
              <i className="fa-solid fa-location-dot" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "action" ? "toolbar-icon--selected" : ""
              }`}
              title="Action"
              onClick={() => handleToolClick("action")}
            >
              <i className="fa-solid fa-person-running" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "character" ? "toolbar-icon--selected" : ""
              }`}
              title="Character"
              onClick={() => handleToolClick("character")}
            >
              <i className="fa-regular fa-user" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "dialogue" ? "toolbar-icon--selected" : ""
              }`}
              title="Dialogue"
              onClick={() => handleToolClick("dialogue")}
            >
              <i className="fa-regular fa-comment-dots" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "parenthetical" ? "toolbar-icon--selected" : ""
              }`}
              title="Parenthetical"
              onClick={() => handleToolClick("parenthetical")}
            >
              <i className="fa-regular fa-face-smile" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "transition" ? "toolbar-icon--selected" : ""
              }`}
              title="Transition"
              onClick={() => handleToolClick("transition")}
            >
              <i className="fa-solid fa-arrow-right-arrow-left" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "general" ? "toolbar-icon--selected" : ""
              }`}
              title="General"
              onClick={() => handleToolClick("general")}
            >
              <i className="fa-solid fa-grip-lines" />
            </button>
          </div>
        </div>

        <div className="toolbar-right">
          <button className="toolbar-icon" title="Conversation">
            <i className="fa-regular fa-comments" />
          </button>
          <button className="download-button">
            <i className="fa-solid fa-download download-icon" />
            Download
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="project-content">
        <div className="content-canvas">
          <div
            className="screenplay-editor"
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning={true}
            onClick={handleEditorClick}
          >
            {lines.map((line, idx) => (
              <p
                key={line.id}
                data-line-index={idx}
                className={`screenplay-${line.style}`}
                onClick={(e) => handleLineClick(e, idx)}
                onInput={(e) => {
                  const text = e.currentTarget.innerText.replace(/\n/g, "");
                  setLines((prev) =>
                    prev.map((ln, i) => (i === idx ? { ...ln, text } : ln))
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              >
                {line.text}
              </p>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Input Box */}
      <div className="floating-input">
        <div className="input-container">
          <textarea
            placeholder="Write or edit anything..."
            className="input-field"
            rows={3}
          />
          <div className="input-footer">
            <select className="agent-mode">
              <option>Agent Mode</option>
              <option>Ask Mode</option>
            </select>
            <button className="send-button" aria-label="Send">
              <i className="fa-solid fa-arrow-up" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Project;
