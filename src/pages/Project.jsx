import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeProvider.jsx";
import { useAuth } from "../theme/AuthProvider.jsx";
import profileImg from "../assets/images/Profile Picture.jpeg";
import brandIcon from "../assets/images/Plotline Icon.png";
import {
  createProject,
  updateProject,
  getProject,
} from "../firebase/projects.js";
import {
  saveConversation,
  loadConversation,
} from "../firebase/conversations.js";
// Using Font Awesome via kit in index.html

function Project() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("script");
  const [selectedTool, setSelectedTool] = useState("action");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [isNewProject, setIsNewProject] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
  const idCounterRef = useRef(8);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [lastClickedIndex, setLastClickedIndex] = useState(null);

  // AI Panel state
  const [aiMode, setAiMode] = useState("agent"); // "agent" or "ask"
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const aiMessagesRef = useRef(null);
  const loadedProjectIdRef = useRef(null);
  const aiMessagesStateRef = useRef([]);

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

  const selectionStyles = useMemo(() => {
    const { start, end } = selectionRange;
    const set = new Set();
    for (let i = start; i <= end && i < lines.length; i++)
      set.add(lines[i].style);
    return set;
  }, [selectionRange, lines]);

  const generateLineId = () => {
    idCounterRef.current += 1;
    return `l${idCounterRef.current}`;
  };

  // Refs to focus specific line inputs reliably
  const lineRefs = useRef({});
  // Drag selection state
  const isMouseSelectingRef = useRef(false);
  const selectionAnchorRef = useRef(null);

  // Seed the ID counter from existing lines to avoid duplicates after edits
  useEffect(() => {
    const maxId = lines.reduce((max, ln) => {
      const m = typeof ln.id === "string" && ln.id.match(/l(\d+)/);
      const num = m ? parseInt(m[1], 10) : 0;
      return Math.max(max, num);
    }, 0);
    if (idCounterRef.current < maxId) idCounterRef.current = maxId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if we're loading an existing project or creating a new one
  useEffect(() => {
    const checkProjectRoute = () => {
      const hash = window.location.hash;
      const projectMatch = hash.match(/#\/project\/(.+)/);

      if (projectMatch) {
        const id = projectMatch[1];
        setProjectId(id);
        setIsNewProject(false);
        loadProject(id);
      } else {
        setProjectId(null);
        setIsNewProject(true);
        loadedProjectIdRef.current = null;
        aiMessagesStateRef.current = [];
        setAiMessages([]);
      }
    };

    checkProjectRoute();
    window.addEventListener("hashchange", checkProjectRoute);
    return () => window.removeEventListener("hashchange", checkProjectRoute);
  }, [user]); // Only run when user changes

  // Load existing project
  const loadProject = async (id) => {
    if (!user || isLoadingProject) return;

    setIsLoadingProject(true);
    try {
      const project = await getProject(id);
      if (project && project.userId === user.uid) {
        setProjectName(project.name || "Untitled Project");
        setLines(
          project.lines || [
            { id: "l1", text: "FADE IN:", style: "action" },
            { id: "l2", text: "EXT. CITY STREET - DAY", style: "location" },
            {
              id: "l3",
              text: "A bustling urban landscape...",
              style: "action",
            },
            {
              id: "l4",
              text: "JOHN (30s) walks with purpose.",
              style: "action",
            },
            { id: "l5", text: "He checks his watch.", style: "action" },
            { id: "l6", text: "JOHN", style: "character" },
            { id: "l7", text: "(muttering)", style: "parenthetical" },
            { id: "l8", text: "I'm late again.", style: "dialogue" },
          ]
        );

        // Load AI conversation for this project (only if we haven't loaded it yet)
        if (loadedProjectIdRef.current !== id) {
          const conversation = await loadConversation(id);
          aiMessagesStateRef.current = conversation;
          setAiMessages(conversation);
          loadedProjectIdRef.current = id;
        }
      }
    } catch (error) {
      console.error("Error loading project:", error);
    } finally {
      setIsLoadingProject(false);
    }
  };

  // Auto-save functionality
  const saveProject = async () => {
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      const projectData = {
        name: projectName,
        lines: lines,
      };

      if (isNewProject) {
        const newProjectId = await createProject(user.uid, projectData);
        setProjectId(newProjectId);
        setIsNewProject(false);

        // Save any existing AI conversation to the new project
        if (aiMessagesStateRef.current.length > 0) {
          await saveConversation(newProjectId, aiMessagesStateRef.current);
        }

        // Update URL to include project ID
        window.location.hash = `#/project/${newProjectId}`;
      } else {
        await updateProject(projectId, projectData);
      }
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when project data changes (debounced)
  useEffect(() => {
    if (!user || !projectId || isLoadingProject) return; // Don't auto-save if no project ID or loading

    const timeoutId = setTimeout(() => {
      saveProject();
    }, 2000); // Save 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [projectName, lines, user, projectId, isNewProject, isLoadingProject]);

  // Centralized Enter handling for all line inputs
  const handleLineKeyDown = (e, idx) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const cursorPosition = e.target.selectionStart || 0;
      const currentText = lines[idx].text;
      const textBeforeCursor = currentText.substring(0, cursorPosition);
      const textAfterCursor = currentText.substring(cursorPosition);

      const newLine = {
        id: generateLineId(),
        text: textAfterCursor,
        style: lines[idx].style, // Keep the same style as current line
      };

      setLines((prev) => {
        const next = [...prev];
        // Update current line with text before cursor
        next[idx] = { ...next[idx], text: textBeforeCursor };
        // Insert new line with text after cursor
        next.splice(idx + 1, 0, newLine);
        return next;
      });

      const newIndex = idx + 1;
      setSelectionRange({ start: newIndex, end: newIndex, isCollapsed: true });
      setLastClickedIndex(newIndex);

      // Focus the newly created line after render
      setTimeout(() => {
        const nextRef = lineRefs.current[newLine.id];
        if (nextRef && typeof nextRef.focus === "function") {
          try {
            nextRef.focus();
            // Place cursor at beginning of new line
            if (nextRef.setSelectionRange) nextRef.setSelectionRange(0, 0);
          } catch {}
        }
      }, 0);
    } else if (e.key === "Backspace") {
      const cursorPosition = e.target.selectionStart || 0;
      const selectionEnd = e.target.selectionEnd || 0;
      const hasSelection = cursorPosition !== selectionEnd;

      // Only do line deletion/merging if there's no text selection
      if (
        !hasSelection &&
        (cursorPosition === 0 || lines[idx].text === "") &&
        idx > 0
      ) {
        e.preventDefault();
        const currentText = lines[idx].text;
        setLines((prev) => {
          const next = [...prev];
          // Merge current line text with previous line
          next[idx - 1] = {
            ...next[idx - 1],
            text: next[idx - 1].text + currentText,
          };
          // Remove current line
          next.splice(idx, 1);
          return next;
        });
        const newIndex = idx - 1;
        setSelectionRange({
          start: newIndex,
          end: newIndex,
          isCollapsed: true,
        });
        setLastClickedIndex(newIndex);
        // Focus the previous line after render
        setTimeout(() => {
          const prevLineId = lines[newIndex]?.id;
          const prevRef = prevLineId ? lineRefs.current[prevLineId] : null;
          if (prevRef && typeof prevRef.focus === "function") {
            try {
              prevRef.focus();
              // Move cursor to end of previous line's original text (before merged text)
              if (prevRef.setSelectionRange) {
                const prevOriginalTextLength =
                  lines[newIndex]?.text?.length || 0;
                prevRef.setSelectionRange(
                  prevOriginalTextLength,
                  prevOriginalTextLength
                );
              }
            } catch {}
          }
        }, 0);
      }
      // If there's a selection, let the default behavior handle it (deleting selected text)
    }
  };

  // contentEditable beforeinput no longer needed; using controlled inputs

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

    // Preserve cursor position in the currently focused line
    setTimeout(() => {
      const focusedElement = document.activeElement;
      if (
        focusedElement &&
        focusedElement.tagName === "TEXTAREA" &&
        focusedElement.hasAttribute("data-line-index")
      ) {
        // Restore focus to the same element to maintain cursor position
        focusedElement.focus();
      }
    }, 0);
  };

  // Auto-resize textarea based on content
  const autoResize = (textarea) => {
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };

  // Centralized text update for lines
  const handleLineChange = (e, idx) => {
    const text = e.target.value.replace(/\n/g, "");
    setLines((prev) => prev.map((ln, i) => (i === idx ? { ...ln, text } : ln)));
    // Auto-resize the textarea
    autoResize(e.target);
  };

  const setBrowserSelectionForLines = (start, end) => {
    // With inputs, we keep logical selection only; no DOM selection spanning
    // Focus the last selected input to keep UX consistent
    const lastIdx = end;
    const id = lines[lastIdx]?.id;
    const ref = id ? lineRefs.current[id] : null;
    if (ref && typeof ref.focus === "function") ref.focus();
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

  // Drag-select handlers on line wrapper
  const handleDragMouseDown = (idx) => {
    isMouseSelectingRef.current = true;
    selectionAnchorRef.current = idx;
    setSelectionRange({ start: idx, end: idx, isCollapsed: true });
    setLastClickedIndex(idx);
    const onMouseUp = () => {
      isMouseSelectingRef.current = false;
      selectionAnchorRef.current = null;
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleDragMouseEnter = (idx) => {
    if (!isMouseSelectingRef.current) return;
    const anchor = selectionAnchorRef.current;
    if (anchor == null) return;
    const start = Math.min(anchor, idx);
    const end = Math.max(anchor, idx);
    setSelectionRange({ start, end, isCollapsed: start === end });
  };

  const handleToolClick = (toolType) => {
    applyStyleToSelection(toolType);
    setSelectedTool(toolType);
  };

  const handleToolMouseDown = (e) => {
    // Prevent toolbar buttons from taking focus away from textarea
    e.preventDefault();
  };

  // AI Panel functions
  const addAiMessage = (content, type = "assistant") => {
    const message = {
      id: Date.now() + Math.random(),
      content,
      type, // "user" or "assistant"
      timestamp: new Date(),
    };

    // Update the ref first to ensure we have the latest state
    aiMessagesStateRef.current = [...aiMessagesStateRef.current, message];

    setAiMessages(aiMessagesStateRef.current);

    // Save conversation to Firestore
    if (projectId) {
      saveConversation(projectId, aiMessagesStateRef.current).catch((error) => {
        console.error("Error saving conversation:", error);
      });
    }

    // Auto-scroll to bottom when new message is added
    setTimeout(() => {
      if (aiMessagesRef.current) {
        aiMessagesRef.current.scrollTop = aiMessagesRef.current.scrollHeight;
      }
    }, 100);
  };

  const callGeminiAPI = async (prompt, mode) => {
    const API_KEY = "AIzaSyBnD6pE3aHZ7SLLzdMKK2DN9S5Fd9QOThQ";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw error;
    }
  };

  const simulateAiResponse = async (userMessage, mode) => {
    setIsAiProcessing(true);

    try {
      if (mode === "agent") {
        // Agent Mode: Edit screenplay and explain actions
        const screenplayContext = lines
          .map((line) => `${line.style.toUpperCase()}: ${line.text}`)
          .join("\n");

        const agentPrompt = `You are a professional screenplay editor. The user wants you to edit their screenplay directly.

CURRENT SCREENPLAY:
${screenplayContext}

USER REQUEST: ${userMessage}

IMPORTANT: You must respond with ONLY a valid JSON object. No other text, no explanations, no markdown formatting.

The JSON must have this exact structure:
{
  "explanation": "Brief explanation of what you're doing",
  "edits": [
    {
      "type": "replace",
      "lineId": "l8",
      "newText": "New text content",
      "style": "dialogue"
    }
  ]
}

For "replace" edits: Use the exact lineId from the screenplay above.
For "add" edits: Use type "add", set lineId to null, and optionally use "insertAfter" with a lineId.

Available styles: location, action, character, dialogue, parenthetical, transition, general

RESPOND WITH ONLY THE JSON OBJECT:`;

        const aiResponse = await callGeminiAPI(agentPrompt, mode);

        // Clean the response to extract JSON
        let cleanResponse = aiResponse.trim();

        // Remove any markdown code blocks
        if (cleanResponse.startsWith("```json")) {
          cleanResponse = cleanResponse
            .replace(/^```json\s*/, "")
            .replace(/\s*```$/, "");
        } else if (cleanResponse.startsWith("```")) {
          cleanResponse = cleanResponse
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
        }

        // Try to find JSON in the response
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        }

        try {
          const parsedResponse = JSON.parse(cleanResponse);

          if (parsedResponse.explanation && parsedResponse.edits) {
            addAiMessage(parsedResponse.explanation, "assistant");

            if (parsedResponse.edits && parsedResponse.edits.length > 0) {
              applyScreenplayEdits(parsedResponse.edits);
            }
          } else {
            throw new Error("Invalid response structure");
          }
        } catch (parseError) {
          console.error("Error parsing AI response:", parseError);
          console.error("Raw response:", aiResponse);
          addAiMessage(
            "I had trouble processing that request. Please try rephrasing it.",
            "assistant"
          );
        }
      } else {
        // Ask Mode: Just answer questions
        const askPrompt = `You are a professional screenwriting consultant. Answer the user's question about screenwriting in a helpful, informative way.

USER QUESTION: ${userMessage}

Provide a clear, concise answer about screenwriting best practices, formatting, structure, character development, dialogue, or any other screenwriting topic. Keep your response under 200 words.`;

        const aiResponse = await callGeminiAPI(askPrompt, mode);
        addAiMessage(aiResponse, "assistant");
      }
    } catch (error) {
      console.error("AI request failed:", error);
      addAiMessage(
        "Sorry, I'm having trouble connecting right now. Please try again.",
        "assistant"
      );
    }

    setIsAiProcessing(false);
  };

  const applyScreenplayEdits = (edits) => {
    if (!edits || !Array.isArray(edits)) return;

    setLines((prev) => {
      const newLines = [...prev];

      edits.forEach((edit) => {
        if (edit.type === "replace" && edit.lineId) {
          // Replace existing line
          const lineIndex = newLines.findIndex(
            (line) => line.id === edit.lineId
          );
          if (lineIndex !== -1) {
            newLines[lineIndex] = {
              ...newLines[lineIndex],
              text: edit.newText,
              style: edit.style || newLines[lineIndex].style,
            };
          }
        } else if (edit.type === "add") {
          // Add new line
          const newLine = {
            id: generateLineId(),
            text: edit.newText,
            style: edit.style || "action",
          };

          if (edit.insertAfter) {
            // Insert after specific line
            const insertIndex = newLines.findIndex(
              (line) => line.id === edit.insertAfter
            );
            if (insertIndex !== -1) {
              newLines.splice(insertIndex + 1, 0, newLine);
            } else {
              // If insertAfter line not found, add to end
              newLines.push(newLine);
            }
          } else {
            // Add to end
            newLines.push(newLine);
          }
        }
      });

      return newLines;
    });
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || isAiProcessing) return;

    const userMessage = aiInput.trim();
    setAiInput(""); // Clear input immediately for better UX
    addAiMessage(userMessage, "user");

    await simulateAiResponse(userMessage, aiMode);
  };

  const handleAiInputChange = (e) => {
    setAiInput(e.target.value);
  };

  const handleAiInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAiSubmit(e);
    }
  };

  const handleAiModeChange = (e) => {
    setAiMode(e.target.value.toLowerCase().replace(" mode", ""));
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

  // Auto-resize textareas when lines change
  useEffect(() => {
    lines.forEach((line) => {
      const textarea = lineRefs.current[line.id];
      if (textarea) {
        autoResize(textarea);
      }
    });
  }, [lines]);

  // With controlled inputs, we drive selection via focus and shift-click

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
          {isSaving && <span className="save-indicator">Saving...</span>}
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
              onMouseDown={handleToolMouseDown}
            >
              <i className="fa-solid fa-location-dot" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "action" ? "toolbar-icon--selected" : ""
              }`}
              title="Action"
              onClick={() => handleToolClick("action")}
              onMouseDown={handleToolMouseDown}
            >
              <i className="fa-solid fa-person-running" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "character" ? "toolbar-icon--selected" : ""
              }`}
              title="Character"
              onClick={() => handleToolClick("character")}
              onMouseDown={handleToolMouseDown}
            >
              <i className="fa-regular fa-user" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "dialogue" ? "toolbar-icon--selected" : ""
              }`}
              title="Dialogue"
              onClick={() => handleToolClick("dialogue")}
              onMouseDown={handleToolMouseDown}
            >
              <i className="fa-regular fa-comment-dots" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "parenthetical" ? "toolbar-icon--selected" : ""
              }`}
              title="Parenthetical"
              onClick={() => handleToolClick("parenthetical")}
              onMouseDown={handleToolMouseDown}
            >
              <i className="fa-regular fa-face-smile" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "transition" ? "toolbar-icon--selected" : ""
              }`}
              title="Transition"
              onClick={() => handleToolClick("transition")}
              onMouseDown={handleToolMouseDown}
            >
              <i className="fa-solid fa-arrow-right-arrow-left" />
            </button>
            <button
              className={`toolbar-icon ${
                selectedTool === "general" ? "toolbar-icon--selected" : ""
              }`}
              title="General"
              onClick={() => handleToolClick("general")}
              onMouseDown={handleToolMouseDown}
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
          <div className="screenplay-editor" ref={editorRef}>
            {lines.map((line, idx) => (
              <div
                key={line.id}
                data-line-index={idx}
                onMouseDown={() => handleDragMouseDown(idx)}
                onMouseEnter={() => handleDragMouseEnter(idx)}
              >
                <textarea
                  data-line-index={idx}
                  ref={(el) => {
                    if (el) lineRefs.current[line.id] = el;
                  }}
                  className={`screenplay-${line.style}`}
                  value={line.text}
                  rows={1}
                  onKeyDown={(e) => handleLineKeyDown(e, idx)}
                  onChange={(e) => handleLineChange(e, idx)}
                  onMouseDown={(e) => handleLineClick(e, idx)}
                  onFocus={() => {
                    setSelectionRange({
                      start: idx,
                      end: idx,
                      isCollapsed: true,
                    });
                    setLastClickedIndex(idx);
                  }}
                  style={{
                    border: "none",
                    outline: "none",
                    resize: "none",
                    width: "100%",
                    background: "transparent",
                    overflow: "hidden",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    minHeight: "1.2em",
                    height: "auto",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* AI Panel */}
      <div className="ai-panel">
        <div className="ai-messages" ref={aiMessagesRef}>
          {aiMessages.length === 0 && (
            <div className="ai-welcome">
              <p>Welcome! I'm your AI writing assistant.</p>
              <p>
                <strong>Agent Mode:</strong> I'll edit your screenplay directly
              </p>
              <p>
                <strong>Ask Mode:</strong> I'll answer questions about
                screenwriting
              </p>
            </div>
          )}
          {aiMessages.map((message) => (
            <div
              key={message.id}
              className={`ai-message ai-message--${message.type}`}
            >
              <div className="ai-message-content">{message.content}</div>
              <div className="ai-message-time">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
          {isAiProcessing && (
            <div className="ai-message ai-message--assistant">
              <div className="ai-message-content ai-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        <form className="ai-input-form" onSubmit={handleAiSubmit}>
          <div className="ai-input-container">
            <textarea
              placeholder={
                aiMode === "agent"
                  ? "Tell me how to improve your screenplay..."
                  : "Ask me anything about screenwriting..."
              }
              className="ai-input-field"
              value={aiInput}
              onChange={handleAiInputChange}
              onKeyDown={handleAiInputKeyDown}
              rows={3}
              disabled={isAiProcessing}
            />
            <div className="ai-input-footer">
              <select
                className="ai-mode-select"
                value={`${
                  aiMode.charAt(0).toUpperCase() + aiMode.slice(1)
                } Mode`}
                onChange={handleAiModeChange}
                disabled={isAiProcessing}
              >
                <option>Agent Mode</option>
                <option>Ask Mode</option>
              </select>
              <button
                className="ai-send-button"
                type="submit"
                disabled={!aiInput.trim() || isAiProcessing}
                aria-label="Send message"
              >
                <i className="fa-solid fa-arrow-up" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Project;
