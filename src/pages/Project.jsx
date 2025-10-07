import { useState } from "react";
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

  const applyFormatting = (formatType) => {
    console.log("=== APPLY FORMATTING DEBUG START ===");
    console.log("Format type:", formatType);

    const selection = window.getSelection();
    console.log("Selection range count:", selection.rangeCount);
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    console.log("Selected text:", JSON.stringify(selectedText));
    console.log("Selected text length:", selectedText.length);
    console.log("Has line breaks:", selectedText.includes("\n"));

    if (selectedText) {
      // Find the paragraph or line element containing the selection
      let container = range.commonAncestorContainer;
      console.log("Initial container:", container);
      console.log("Container node type:", container.nodeType);
      console.log("Container node name:", container.nodeName);

      // Walk up to find the block element (p, div, or span with screenplay class)
      while (container && container.nodeType !== Node.ELEMENT_NODE) {
        container = container.parentNode;
        console.log("Walking up to element node, new container:", container);
      }

      console.log("After walking up to element, container:", container);
      console.log("Container tag name:", container.tagName);
      console.log("Container classes:", container.classList.toString());

      // Find the immediate block element
      while (container && !container.classList.contains("screenplay-editor")) {
        console.log("Looking for block element, current container:", container);
        console.log("Container tag:", container.tagName);
        console.log("Container classes:", container.classList.toString());

        if (
          container.tagName === "P" ||
          container.tagName === "DIV" ||
          (container.tagName === "SPAN" &&
            container.classList.toString().includes("screenplay-"))
        ) {
          console.log("Found block element, breaking");
          break;
        }
        container = container.parentElement;
        console.log("Moving to parent:", container);
      }

      console.log("Final container:", container);
      console.log("Final container tag:", container.tagName);
      console.log("Final container classes:", container.classList.toString());
      console.log(
        "Container has screenplay class:",
        container && container.classList.toString().includes("screenplay-")
      );
      console.log(
        "Container is screenplay editor:",
        container && container.classList.contains("screenplay-editor")
      );

      if (
        container &&
        container.classList.toString().includes("screenplay-") &&
        !container.classList.contains("screenplay-editor")
      ) {
        console.log("PATH A: Replacing entire formatted element");
        console.log(
          "Container text content:",
          JSON.stringify(container.textContent)
        );
        console.log(
          "Container text content length:",
          container.textContent.length
        );

        // Replace the entire formatted element
        const newElement = document.createElement("span");
        newElement.className = `screenplay-${formatType}`;
        newElement.textContent = container.textContent;
        console.log("New element created with class:", newElement.className);
        console.log(
          "New element text content:",
          JSON.stringify(newElement.textContent)
        );

        container.parentNode.replaceChild(newElement, container);
        console.log("Element replaced in DOM");

        // Select the new element
        const newRange = document.createRange();
        newRange.selectNodeContents(newElement);
        selection.removeAllRanges();
        selection.addRange(newRange);
        console.log("Selection restored to new element");
      } else {
        console.log("PATH B: Creating new formatted element for selected text");
        console.log(
          "Selected text for new element:",
          JSON.stringify(selectedText)
        );

        // Create a new formatted element for the selected text
        const span = document.createElement("span");
        span.className = `screenplay-${formatType}`;
        span.textContent = selectedText;
        console.log("New span created with class:", span.className);
        console.log("New span text content:", JSON.stringify(span.textContent));

        range.deleteContents();
        console.log("Range contents deleted");
        range.insertNode(span);
        console.log("New span inserted");

        // Select the new element
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(newRange);
        console.log("Selection restored to new span");
      }
    } else {
      console.log("PATH C: No selected text, setting data attribute");
      // Set formatting for new text
      const editor = document.querySelector(".screenplay-editor");
      if (editor) {
        editor.setAttribute("data-current-format", formatType);
        console.log("Data attribute set:", formatType);
      }
    }
    console.log("=== APPLY FORMATTING DEBUG END ===");
  };

  const handleEditorClick = (e) => {
    const target = e.target;
    const formatClass = target.className.match(/screenplay-(\w+)/);
    if (formatClass) {
      const formatType = formatClass[1];
      const toolIndex = formattingTypes.indexOf(formatType);
      if (toolIndex !== -1) {
        setSelectedTool(formatType);
      }
    }
  };

  const handleToolClick = (toolType) => {
    setSelectedTool(toolType);
    applyFormatting(toolType);
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
            contentEditable
            suppressContentEditableWarning={true}
            onClick={handleEditorClick}
          >
            <p className="screenplay-action">FADE IN:</p>
            <p className="screenplay-location">EXT. CITY STREET - DAY</p>
            <p className="screenplay-action">A bustling urban landscape...</p>
            <p className="screenplay-action">JOHN (30s) walks with purpose.</p>
            <p className="screenplay-action">He checks his watch.</p>
            <p className="screenplay-character">JOHN</p>
            <p className="screenplay-parenthetical">(muttering)</p>
            <p className="screenplay-dialogue">I'm late again.</p>
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
