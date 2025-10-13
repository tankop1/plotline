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

  // Table read state
  const [isTableReadPlaying, setIsTableReadPlaying] = useState(false);
  const [currentSpeakingLine, setCurrentSpeakingLine] = useState(null);
  const [currentSpeakingWord, setCurrentSpeakingWord] = useState(null);
  const [tableReadQueue, setTableReadQueue] = useState([]);
  const currentUtteranceRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Name generator modal state
  const [isNameGeneratorOpen, setIsNameGeneratorOpen] = useState(false);
  const [nameDescription, setNameDescription] = useState("");
  const [generatedNames, setGeneratedNames] = useState([]);
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);

  // Script analysis modal state
  const [isScriptAnalysisOpen, setIsScriptAnalysisOpen] = useState(false);
  const [scriptAnalysis, setScriptAnalysis] = useState("");
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);

  // Plan modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planData, setPlanData] = useState({
    filmTitle: "",
    logLine: "",
    outline: "",
    additionalNotes: "",
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

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
        setIsLoadingProject(true);
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

        // Load plan data if available
        if (project.planData) {
          setPlanData(project.planData);
        }

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
    if (!textarea) return;
    // Temporarily reset height to measure scrollHeight accurately
    textarea.style.height = "auto";
    // Use max to avoid collapsing on very short lines
    const next = Math.max(textarea.scrollHeight, 18);
    textarea.style.height = next + "px";
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

  // Table read functions
  const getVoiceForCharacter = (characterName) => {
    // Simple gender inference from names
    const maleNames = [
      "JOHN",
      "JAMES",
      "MICHAEL",
      "DAVID",
      "ROBERT",
      "WILLIAM",
      "CHRIS",
      "ALEX",
      "SAM",
      "TOM",
      "BOB",
      "JACK",
      "HENRY",
      "PETER",
      "PAUL",
      "MARK",
      "STEVE",
      "BEN",
      "DAN",
      "MATT",
      "NICK",
      "JOE",
      "FRANK",
      "GEORGE",
      "CHARLES",
      "ANTHONY",
      "KEVIN",
      "BRIAN",
      "EDWARD",
      "RONALD",
      "TIMOTHY",
      "JASON",
      "JEFFREY",
      "RYAN",
      "JACOB",
      "GARY",
      "NICHOLAS",
      "ERIC",
      "JONATHAN",
      "STEPHEN",
      "LARRY",
      "JUSTIN",
      "SCOTT",
      "BRANDON",
      "BENJAMIN",
      "SAMUEL",
      "GREGORY",
      "ALEXANDER",
      "PATRICK",
      "JACK",
      "DENNIS",
      "JERRY",
      "TYLER",
      "AARON",
      "JOSE",
      "HENRY",
      "ADAM",
      "DOUGLAS",
      "NATHAN",
      "PETER",
      "ZACHARY",
      "KYLE",
      "WALTER",
      "HAROLD",
      "CARL",
      "JEREMY",
      "KEITH",
      "ROGER",
      "GERALD",
      "ETHAN",
      "ARTHUR",
      "TERRY",
      "CHRISTIAN",
      "SEAN",
      "LAWRENCE",
      "AUSTIN",
      "JOE",
      "NOAH",
      "JESSE",
      "ALBERT",
      "BRYAN",
      "BILLY",
      "BRUCE",
      "RALPH",
      "GABRIEL",
      "ROY",
      "JUAN",
      "WAYNE",
      "EUGENE",
      "LOUIS",
      "PHILIP",
      "BOBBY",
      "JOHNNY",
      "BRADLEY",
    ];

    const femaleNames = [
      "SARAH",
      "MARY",
      "JENNIFER",
      "LISA",
      "AMANDA",
      "JESSICA",
      "ASHLEY",
      "EMILY",
      "MELISSA",
      "NICOLE",
      "ELIZABETH",
      "HEATHER",
      "AMY",
      "ANGELA",
      "MICHELLE",
      "KIMBERLY",
      "DONNA",
      "DEBORAH",
      "SANDRA",
      "CAROL",
      "RUTH",
      "SHARON",
      "BARBARA",
      "HELEN",
      "NANCY",
      "BETTY",
      "DOROTHY",
      "KAREN",
      "SUSAN",
      "MARGARET",
      "PATRICIA",
      "LINDA",
      "CYNTHIA",
      "MARIA",
      "JANET",
      "CATHERINE",
      "FRANCES",
      "CHRISTINE",
      "SAMANTHA",
      "DEBRA",
      "RACHEL",
      "CAROLYN",
      "JANET",
      "VIRGINIA",
      "MARIA",
      "HEATHER",
      "DIANE",
      "JULIE",
      "JOYCE",
      "VICTORIA",
      "KELLY",
      "CHRISTINA",
      "JOAN",
      "EVELYN",
      "JUDITH",
      "ANDREA",
      "HANNAH",
      "JACQUELINE",
      "MARTHA",
      "GLORIA",
      "TERESA",
      "SARA",
      "JANICE",
      "JULIA",
      "MARIE",
      "MADISON",
      "GRACE",
      "JUDY",
      "THERESA",
      "BEVERLY",
      "DENISE",
      "MARILYN",
      "AMBER",
      "DANIELLE",
      "ROSE",
      "BRENDA",
      "DIANA",
      "ABIGAIL",
      "JANE",
      "LYNN",
      "LORI",
      "ALICE",
      "HELEN",
      "SANDRA",
      "DONNA",
      "CAROL",
      "RUTH",
      "SHARON",
      "MICHELLE",
      "LAURA",
      "SARAH",
      "KIMBERLY",
      "DEBORAH",
      "DOROTHY",
      "LISA",
      "NANCY",
      "KAREN",
      "BETTY",
      "HELEN",
      "SANDRA",
      "DONNA",
      "CAROL",
      "RUTH",
      "SHARON",
      "MICHELLE",
      "LAURA",
      "SARAH",
      "KIMBERLY",
      "DEBORAH",
      "DOROTHY",
      "LISA",
      "NANCY",
      "KAREN",
      "BETTY",
      "HELEN",
      "SANDRA",
      "DONNA",
      "CAROL",
      "RUTH",
      "SHARON",
      "MICHELLE",
      "LAURA",
      "SARAH",
      "KIMBERLY",
      "DEBORAH",
      "DOROTHY",
      "LISA",
      "NANCY",
      "KAREN",
      "BETTY",
    ];

    const name = characterName.toUpperCase().trim();

    // Check if it's a known male or female name
    const isMale = maleNames.some((n) => name.includes(n));
    const isFemale = femaleNames.some((n) => name.includes(n));

    // Fallback heuristic for unknown names
    let inferredGender = "neutral";
    if (isMale) {
      inferredGender = "male";
    } else if (isFemale) {
      inferredGender = "female";
    } else {
      // Simple heuristic: short names (1-4 chars) often male, longer often female
      if (name.length <= 4 && /^[A-Z]+$/.test(name)) {
        inferredGender = "male";
      } else if (name.length > 6) {
        inferredGender = "female";
      }
    }

    const voices = speechSynthesis.getVoices();

    // Try to find a voice that matches the inferred gender
    let selectedVoice = voices.find(
      (voice) =>
        voice.lang.startsWith("en") &&
        ((inferredGender === "male" &&
          (voice.name.toLowerCase().includes("male") ||
            voice.name.toLowerCase().includes("man") ||
            voice.name.toLowerCase().includes("david") ||
            voice.name.toLowerCase().includes("alex"))) ||
          (inferredGender === "female" &&
            (voice.name.toLowerCase().includes("female") ||
              voice.name.toLowerCase().includes("woman") ||
              voice.name.toLowerCase().includes("samantha") ||
              voice.name.toLowerCase().includes("susan"))))
    );

    // Fallback to any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find((voice) => voice.lang.startsWith("en"));
    }

    // Final fallback to first available voice
    return selectedVoice || voices[0];
  };

  const parseScreenplayForTableRead = () => {
    const dialoguePairs = [];
    let currentCharacter = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.style === "character") {
        currentCharacter = line.text.trim();
      } else if (
        line.style === "dialogue" &&
        currentCharacter &&
        line.text.trim()
      ) {
        dialoguePairs.push({
          character: currentCharacter,
          dialogue: line.text.trim(),
          lineIndex: i,
          lineId: line.id,
        });
      } else if (line.style !== "parenthetical") {
        // Reset character when we hit action, location, etc.
        currentCharacter = null;
      }
    }

    return dialoguePairs;
  };

  const speakWithHighlighting = (
    text,
    character,
    lineId,
    onWordStart,
    onComplete
  ) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getVoiceForCharacter(character);

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      onComplete();
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      onComplete();
    };

    currentUtteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const startTableRead = () => {
    if (isTableReadPlaying) {
      // Stop current table read
      speechSynthesis.cancel();
      if (currentUtteranceRef.current) {
        currentUtteranceRef.current = null;
      }
      setIsTableReadPlaying(false);
      isPlayingRef.current = false;
      setCurrentSpeakingLine(null);
      setCurrentSpeakingWord(null);
      setTableReadQueue([]);
      return;
    }

    const dialoguePairs = parseScreenplayForTableRead();

    if (dialoguePairs.length === 0) {
      alert("No dialogue found in the screenplay to read.");
      return;
    }

    setIsTableReadPlaying(true);
    isPlayingRef.current = true;
    setTableReadQueue(dialoguePairs);

    // Start with the first dialogue
    speakNextDialogue(dialoguePairs, 0);
  };

  const speakNextDialogue = (dialoguePairs, index) => {
    // Check if table read was stopped using ref for immediate check
    if (!isPlayingRef.current) {
      return;
    }

    if (index >= dialoguePairs.length) {
      // Table read complete
      setIsTableReadPlaying(false);
      isPlayingRef.current = false;
      setCurrentSpeakingLine(null);
      setCurrentSpeakingWord(null);
      setTableReadQueue([]);
      return;
    }

    const dialogue = dialoguePairs[index];
    setCurrentSpeakingLine(dialogue.lineId);

    speakWithHighlighting(
      dialogue.dialogue,
      dialogue.character,
      dialogue.lineId,
      null, // No word highlighting callback
      () => {
        setCurrentSpeakingWord(null);
        // Move to next dialogue after a short pause, but only if still playing
        setTimeout(() => {
          if (isPlayingRef.current) {
            speakNextDialogue(dialoguePairs, index + 1);
          }
        }, 500);
      }
    );
  };

  // Generate a print-ready HTML for PDF export
  const handleDownloadPdf = () => {
    const printable = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${
      projectName ? String(projectName).replace(/</g, "&lt;") : "Screenplay"
    }</title>
    <style>
      @page { size: Letter; margin: 1in; }
      * { box-sizing: border-box; }
      html, body { padding: 0; margin: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { width: 8.5in; height: 11in; }
      .doc {
        font-family: 'Courier Prime', Courier, monospace;
        font-size: 16px;
        line-height: 1.1;
        color: #000;
        width: 8.5in; height: 11in;
        padding: 0.5in 1in 1in 0;
      }
      /* title removed */
      .line { margin: 0; padding: 0; white-space: pre-wrap; }
      .location { font-weight: bold; text-transform: uppercase; padding: 10px 0; }
      .action { }
      .character { text-transform: uppercase; padding-top: 10px; position: relative; left: 4.2in; }
      .dialogue { position: relative; left: 2.9in; }
      .parenthetical { position: relative; left: 3.7in; }
      .transition { text-align: right; }
      .general { }
      @media print { .noprint { display: none; } }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="doc">
        ${lines
          .map((ln) => {
            const cls = (ln.style || "action")
              .replace("location", "location")
              .replace("action", "action")
              .replace("character", "character")
              .replace("dialogue", "dialogue")
              .replace("parenthetical", "parenthetical")
              .replace("transition", "transition")
              .replace("general", "general");
            const safe = String(ln.text || "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;");
            return `<div class="line ${cls}">${safe}</div>`;
          })
          .join("")}
      </div>
    </div>
    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
  </body>
</html>`;

    const blob = new Blob([printable], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      alert("Please allow popups to download the PDF.");
    }
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

    // Increase token limit for script analysis
    const maxTokens = mode === "script-analysis" ? 4096 : 1024;

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
            maxOutputTokens: maxTokens,
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

        // Get plan data for context
        const planContext =
          planData.filmTitle ||
          planData.logLine ||
          planData.outline ||
          planData.additionalNotes
            ? `\n\nPROJECT CONTEXT:\n${
                planData.filmTitle ? `Title: ${planData.filmTitle}\n` : ""
              }${planData.logLine ? `Log Line: ${planData.logLine}\n` : ""}${
                planData.outline ? `Outline: ${planData.outline}\n` : ""
              }${
                planData.additionalNotes
                  ? `Additional Notes: ${planData.additionalNotes}`
                  : ""
              }`
            : "";

        const agentPrompt = `You are a professional screenplay editor. The user wants you to edit their screenplay directly.

CURRENT SCREENPLAY:
${screenplayContext}${planContext}

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
        // Ask Mode: Analyze screenplay and provide feedback
        const screenplayContext = lines
          .map((line) => `${line.style.toUpperCase()}: ${line.text}`)
          .join("\n");

        // Get plan data for context
        const planContext =
          planData.filmTitle ||
          planData.logLine ||
          planData.outline ||
          planData.additionalNotes
            ? `\n\nPROJECT CONTEXT:\n${
                planData.filmTitle ? `Title: ${planData.filmTitle}\n` : ""
              }${planData.logLine ? `Log Line: ${planData.logLine}\n` : ""}${
                planData.outline ? `Outline: ${planData.outline}\n` : ""
              }${
                planData.additionalNotes
                  ? `Additional Notes: ${planData.additionalNotes}`
                  : ""
              }`
            : "";

        const askPrompt = `You are a professional screenwriting consultant. The user has asked a question about their screenplay and wants your expert feedback.

CURRENT SCREENPLAY:
${screenplayContext}${planContext}

USER QUESTION: ${userMessage}

Provide concise, constructive feedback about their screenplay. Focus on the most important points:
- Key strengths and weaknesses
- Specific areas for improvement
- Actionable suggestions

Be specific and reference actual content from their screenplay when relevant. Keep your response focused and practical, under 200 words.`;

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

  // Name generator functions
  const openNameGenerator = () => {
    setIsNameGeneratorOpen(true);
    setNameDescription("");
    setGeneratedNames([]);
  };

  const closeNameGenerator = () => {
    setIsNameGeneratorOpen(false);
    setNameDescription("");
    setGeneratedNames([]);
  };

  const generateNames = async () => {
    if (!nameDescription.trim()) return;

    setIsGeneratingNames(true);
    try {
      const prompt = `Generate 5 character names based on this description: "${nameDescription}"

Requirements:
- Provide exactly 5 names
- Make them appropriate for a screenplay
- Consider the description's characteristics (age, nationality, personality, etc.)
- Use realistic, memorable names
- Format as a simple list, one name per line

Names:`;

      const response = await callGeminiAPI(prompt, "ask");

      // Parse the response to extract names
      const names = response
        .split("\n")
        .map((line) => line.trim())
        .filter(
          (line) => line && !line.match(/^(names?|character|description):/i)
        )
        .slice(0, 5);

      setGeneratedNames(names);
    } catch (error) {
      console.error("Error generating names:", error);
      setGeneratedNames(["Error generating names. Please try again."]);
    } finally {
      setIsGeneratingNames(false);
    }
  };

  const copyNameToClipboard = async (name) => {
    try {
      // Remove asterisk and space from the beginning if present
      const cleanName = name.replace(/^\*\s*/, "");
      await navigator.clipboard.writeText(cleanName);
      // You could add a toast notification here if desired
    } catch (error) {
      console.error("Failed to copy name:", error);
    }
  };

  // Script analysis functions
  const openScriptAnalysis = () => {
    setIsScriptAnalysisOpen(true);
    setScriptAnalysis("");
    analyzeScript();
  };

  const closeScriptAnalysis = () => {
    setIsScriptAnalysisOpen(false);
    setScriptAnalysis("");
  };

  const analyzeScript = async () => {
    setIsAnalyzingScript(true);
    setScriptAnalysis("");

    try {
      // Construct screenplay text from lines array
      const screenplayText = lines.map((line) => line.text).join("\n");

      // Get plan data for context
      const planContext =
        planData.filmTitle ||
        planData.logLine ||
        planData.outline ||
        planData.additionalNotes
          ? `\n\nPROJECT CONTEXT:\n${
              planData.filmTitle ? `Title: ${planData.filmTitle}\n` : ""
            }${planData.logLine ? `Log Line: ${planData.logLine}\n` : ""}${
              planData.outline ? `Outline: ${planData.outline}\n` : ""
            }${
              planData.additionalNotes
                ? `Additional Notes: ${planData.additionalNotes}`
                : ""
            }`
          : "";

      const prompt = `Please provide a comprehensive analysis of this screenplay. Structure your response with the following sections in markdown format:

## **Script Overview**
- Brief summary of the story
- Genre and tone
- Target audience

## **Character Analysis**
- Main characters and their roles
- Character development and arcs
- Dialogue quality and voice

## **Structure & Pacing**
- Act structure analysis
- Pacing assessment
- Scene transitions

## **Strengths**
- What works well in the script
- Strong elements to build upon

## **Areas for Improvement**
- Specific suggestions for enhancement
- Weaknesses to address

## **Technical Notes**
- Formatting observations
- Industry standard compliance

## **Overall Assessment**
- Final thoughts and recommendations
- Next steps for development

Please analyze this screenplay:

${screenplayText}${planContext}`;

      const response = await callGeminiAPI(prompt, "script-analysis");
      setScriptAnalysis(response);
    } catch (error) {
      console.error("Error analyzing script:", error);
      console.error("Error details:", error.message);
      setScriptAnalysis(
        `Error analyzing script: ${error.message}. Please try again.`
      );
    } finally {
      setIsAnalyzingScript(false);
    }
  };

  // Plan modal functions
  const openPlanModal = () => {
    setIsPlanModalOpen(true);
    // Plan data is already loaded when project loads
  };

  const closePlanModal = () => {
    setIsPlanModalOpen(false);
  };

  const handlePlanInputChange = (field, value) => {
    setPlanData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const savePlanData = async () => {
    if (!projectId) return;

    setIsSavingPlan(true);
    try {
      await updateProject(projectId, { planData });
      // Show success message or close modal
      closePlanModal();
    } catch (error) {
      console.error("Error saving plan data:", error);
      alert("Failed to save plan data. Please try again.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Simple markdown formatter for Ask Mode responses
  const formatMarkdown = (text) => {
    return (
      text
        // Bold text **text** or __text__
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.*?)__/g, "<strong>$1</strong>")
        // Italic text *text* or _text_
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/_(.*?)_/g, "<em>$1</em>")
        // Headers ## Header
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        // Bullet points - item or * item
        .replace(/^[\s]*[-*] (.*$)/gim, "<li>$1</li>")
        // Numbered lists 1. item
        .replace(/^[\s]*\d+\. (.*$)/gim, "<li>$1</li>")
        // Line breaks
        .replace(/\n/g, "<br>")
        // Wrap consecutive <li> elements in <ul>
        .replace(/(<li>.*<\/li>)/g, (match) => {
          const listItems = match.match(/<li>.*?<\/li>/g);
          if (listItems && listItems.length > 1) {
            return `<ul>${match}</ul>`;
          }
          return match;
        })
    );
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

  // Auto-resize textareas when lines change, after paint
  useEffect(() => {
    if (isLoadingProject) return;
    const rafId = requestAnimationFrame(() => {
      lines.forEach((line) => {
        const textarea = lineRefs.current[line.id];
        if (textarea) {
          autoResize(textarea);
        }
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [lines, isLoadingProject]);

  // Load voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log(
          "Available voices:",
          voices.map((v) => v.name)
        );
      }
    };

    // Load voices immediately
    loadVoices();

    // Also load when voices change (some browsers load them asynchronously)
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      // Cleanup: stop any ongoing speech when component unmounts
      if (isTableReadPlaying) {
        speechSynthesis.cancel();
      }
    };
  }, []);

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
          <div className="project-title-wrap">
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
            <div className="save-status">
              <span
                className={`save-status-dot ${isSaving ? "saving" : "saved"}`}
                aria-hidden
              />
              <span className="save-status-text">
                {isSaving ? "Saving..." : "Up to date"}
              </span>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <nav className="project-nav">
          <button
            className={`nav-tab ${
              activeTab === "plan" ? "nav-tab--active" : ""
            }`}
            onClick={openPlanModal}
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
          <button className="table-read-button" onClick={startTableRead}>
            <i
              className={`fa-regular ${
                isTableReadPlaying ? "fa-circle-stop" : "fa-circle-play"
              } play-icon`}
            />
            {isTableReadPlaying ? "Stop table read" : "Start a table read"}
          </button>

          <div className="toolbar-icons">
            <button
              className="toolbar-icon"
              title="Name Generator"
              onClick={openNameGenerator}
            >
              <i className="fa-solid fa-dice" />
            </button>
            <button
              className="toolbar-icon"
              title="Script Analysis"
              onClick={openScriptAnalysis}
            >
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
          <button className="download-button" onClick={handleDownloadPdf}>
            <i className="fa-solid fa-download download-icon" />
            Download
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="project-content">
        <div className="content-canvas">
          <div className="screenplay-editor" ref={editorRef}>
            {isLoadingProject ? (
              <div>
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="skeleton-line"
                    style={{ width: `${70 + (i % 5) * 5}%` }}
                  />
                ))}
              </div>
            ) : (
              lines.map((line, idx) => (
                <div
                  key={line.id}
                  data-line-index={idx}
                  onMouseDown={() => handleDragMouseDown(idx)}
                  onMouseEnter={() => handleDragMouseEnter(idx)}
                >
                  <div
                    className={`screenplay-line-container ${
                      currentSpeakingLine === line.id &&
                      line.style === "dialogue"
                        ? "speaking"
                        : ""
                    }`}
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
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* AI Panel */}
      <div className="ai-panel">
        <div className="ai-messages" ref={aiMessagesRef}>
          {isLoadingProject ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="ai-message ai-message--assistant">
                  <div className="ai-message-content">
                    <div
                      className="skeleton-bubble"
                      style={{ width: `${85 - i * 10}%` }}
                    />
                    <div
                      className="skeleton-bubble"
                      style={{ width: `${65 - i * 8}%`, marginTop: 6 }}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {aiMessages.length === 0 && (
                <div className="ai-welcome">
                  <p>Welcome! I'm your AI writing assistant.</p>
                  <p>
                    <strong>Agent Mode:</strong> I'll edit your screenplay
                    directly
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
                  <div
                    className="ai-message-content"
                    dangerouslySetInnerHTML={
                      message.type === "assistant"
                        ? { __html: formatMarkdown(message.content) }
                        : { __html: message.content }
                    }
                  />
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
            </>
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

      {/* Name Generator Modal */}
      {isNameGeneratorOpen && (
        <div className="modal-overlay" onClick={closeNameGenerator}>
          <div
            className="name-generator-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Name Generator</h3>
              <button className="modal-close" onClick={closeNameGenerator}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-content">
              <div className="input-group">
                <label htmlFor="name-description">
                  Describe the character:
                </label>
                <input
                  id="name-description"
                  type="text"
                  value={nameDescription}
                  onChange={(e) => setNameDescription(e.target.value)}
                  placeholder="A handsome, menacing man from Italy"
                  className="name-input"
                />
              </div>

              <button
                className="generate-button"
                onClick={generateNames}
                disabled={!nameDescription.trim() || isGeneratingNames}
              >
                {isGeneratingNames ? "Generating..." : "Generate Names"}
              </button>

              {generatedNames.length > 0 && (
                <div className="generated-names">
                  <h4>Generated Names:</h4>
                  <ul>
                    {generatedNames.map((name, index) => (
                      <li key={index} className="name-item">
                        <span className="name-text">{name}</span>
                        <button
                          className="copy-name-button"
                          onClick={() => copyNameToClipboard(name)}
                          title="Copy name"
                        >
                          <i className="fa-solid fa-copy" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Script Analysis Modal */}
      {isScriptAnalysisOpen && (
        <div className="modal-overlay" onClick={closeScriptAnalysis}>
          <div
            className="script-analysis-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Script Analysis</h3>
              <button className="modal-close" onClick={closeScriptAnalysis}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-content">
              {isAnalyzingScript ? (
                <div className="analysis-loading">
                  <div className="loading-spinner"></div>
                  <p>Analyzing your script...</p>
                </div>
              ) : scriptAnalysis ? (
                <div
                  className="script-analysis-content"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(scriptAnalysis),
                  }}
                />
              ) : (
                <div className="analysis-error">
                  <p>Failed to load analysis. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {isPlanModalOpen && (
        <div className="modal-overlay" onClick={closePlanModal}>
          <div className="plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Project Plan</h3>
              <button className="modal-close" onClick={closePlanModal}>
                <i className="fa-solid fa-times" />
              </button>
            </div>

            <div className="modal-content">
              <div className="input-group">
                <label htmlFor="film-title">Film Title</label>
                <input
                  id="film-title"
                  type="text"
                  value={planData.filmTitle}
                  onChange={(e) =>
                    handlePlanInputChange("filmTitle", e.target.value)
                  }
                  placeholder="Enter the film title"
                  className="plan-input"
                />
              </div>

              <div className="input-group">
                <label htmlFor="log-line">Log Line</label>
                <input
                  id="log-line"
                  type="text"
                  value={planData.logLine}
                  onChange={(e) =>
                    handlePlanInputChange("logLine", e.target.value)
                  }
                  placeholder="A one-sentence summary of your story"
                  className="plan-input"
                />
              </div>

              <div className="input-group">
                <label htmlFor="outline">Outline</label>
                <textarea
                  id="outline"
                  value={planData.outline}
                  onChange={(e) =>
                    handlePlanInputChange("outline", e.target.value)
                  }
                  placeholder="Write your story outline here..."
                  className="plan-textarea"
                  rows={6}
                />
              </div>

              <div className="input-group">
                <label htmlFor="additional-notes">Additional Notes</label>
                <textarea
                  id="additional-notes"
                  value={planData.additionalNotes}
                  onChange={(e) =>
                    handlePlanInputChange("additionalNotes", e.target.value)
                  }
                  placeholder="Any additional notes, character descriptions, themes, etc."
                  className="plan-textarea"
                  rows={4}
                />
              </div>

              <button
                className="save-plan-button"
                onClick={savePlanData}
                disabled={isSavingPlan}
              >
                {isSavingPlan ? "Saving..." : "Save Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Project;
