const CHAT_URL = "/api/chat";
const SPEAK_URL = "/api/chat/speak";
const CHAT_RESET_URL = "/api/chat/reset";
const DASHBOARD_COMMENTS_URL = "/api/dashboard/comments";
const DASHBOARD_COMMENT_ASK_URL = "/api/dashboard/comments/ask";
const ACCESS_STATUS_URL = "/api/dashboard-access/status";
const SITE_METRICS_URL = "/site-metrics.json";
const CHAT_SESSION_KEY = "local_dashboard_chat_session";
const CHAT_DEBUG_KEY = "local_dashboard_chat_debug";
const CHAT_HANDLE_KEY = "local_dashboard_chat_handle";
const CAMERA_OVERLAY_KEY = "local_dashboard_camera_overlay";
const CAMERA_FIT_KEY = "local_dashboard_camera_fit";
const CAMERA_VISION_KEY = "local_dashboard_camera_vision_visibility";
const DASHBOARD_VOICE_KEY = "local_dashboard_voice";
const CAMERA_CONTEXT_LINES = [
  "camera_hardware: Logitech QuickCam Messenger Plus",
  "camera_usb_id: 046d:08f6",
  "camera_driver: STV06xx",
  "camera_usb_link: USB 2.0 full-speed 12 Mbps",
  "camera_capture_request: /dev/video0 324x240 raw GRBG Bayer progressive",
  "camera_presentations: classic 324x240 autocontrasted grayscale; full-color 240x324 Vision Monitor with tracking and music-reactive overlays",
  "camera_color_information: reconstructed from raw Bayer data and approximate; weak chroma cues may be wrong",
  "camera_analysis_source: canonical unwarped evidence frame, never the music-reactive presentation pixels",
  "camera_limitations: low resolution, visible noise, weak fine-text fidelity",
];

const state = {
  access: null,
  accessDenied: false,
  cameraNonce: 0,
  latestMetrics: null,
  latestStatus: null,
  chatSession: "",
  chatInflight: false,
  chatDebug: localStorage.getItem(CHAT_DEBUG_KEY) === "on",
  voiceEnabled: localStorage.getItem(DASHBOARD_VOICE_KEY) === "on",
  lastAssistantReply: "",
  speechQueue: [],
  speechQueueIndex: 0,
  speechQueueOpen: false,
  speechPlaybackPending: false,
  speechSequenceToken: 0,
  pendingSpeechUrl: "",
  pendingSpeechText: "",
  pendingSpeechPromise: null,
  commentMessages: [],
  lastPageContext: null,
  lastChatDebug: null,
  lastChatRequest: null,
  lastStableCameraCaption: "",
  lastStableCameraSource: "",
  lastStableCameraCached: false,
  lastStableCameraConfidence: "?",
  lastStableCameraReport: "",
  cameraOverlayVisible: localStorage.getItem(CAMERA_OVERLAY_KEY) !== "hidden",
  cameraFitMode: localStorage.getItem(CAMERA_FIT_KEY) === "fill" ? "fill" : "fit",
  cameraVisionVisible: localStorage.getItem(CAMERA_VISION_KEY) === "on",
  serviceConsoleLoaded: false,
  cameraThread: {
    lastObservationKey: "",
    lastSignature: "",
    stableCount: 0,
    currentAssessment: "Camera thread pending.",
    changeOverTime: "Waiting for the first stable scene description.",
    operationalNote: "Grayscale low-resolution feed; fine text and color remain unreliable.",
    confidence: "?",
  },
};

const statusEl = document.getElementById("action-status");
const refreshStateEl = document.getElementById("refresh-state");
const dashboardUrlEl = document.getElementById("dashboard-url");
const accessBannerEl = document.getElementById("access-banner");
const accessBannerTitleEl = document.getElementById("access-banner-title");
const accessBannerDetailEl = document.getElementById("access-banner-detail");
const chatHealthEl = document.getElementById("chat-health");
const cameraImageEl = document.getElementById("camera-image");
const cameraOverlayEl = document.getElementById("camera-overlay");
const cameraCaptionEl = document.getElementById("camera-caption");
const cameraProgressEl = document.getElementById("camera-progress");
const cameraProgressLabelEl = document.getElementById("camera-progress-label");
const cameraProgressAgeEl = document.getElementById("camera-progress-age");
const cameraProgressTrackEl = document.getElementById("camera-progress-track");
const cameraProgressBarEl = document.getElementById("camera-progress-bar");
const cameraThreadEl = document.getElementById("camera-thread");
const cameraDescribeNowEl = document.getElementById("camera-describe-now");
const cameraAutoToggleEl = document.getElementById("camera-auto-toggle");
const cameraViewerCountEl = document.getElementById("camera-viewer-count");
const cameraObserverDetailEl = document.getElementById("camera-observer-detail");
const cameraControlStateEl = document.getElementById("camera-control-state");
const cameraCacheStateEl = document.getElementById("camera-cache-state");
const cameraOverlayToggleEl = document.getElementById("camera-overlay-toggle");
const cameraFitToggleEl = document.getElementById("camera-fit-toggle");
const cameraClassicToggleEl = document.getElementById("camera-classic-toggle");
const cameraVisionToggleEl = document.getElementById("camera-vision-toggle");
const cameraFullscreenEl = document.getElementById("camera-fullscreen");
const cameraOverlayStateEl = document.getElementById("camera-overlay-state");
const cameraFitStateEl = document.getElementById("camera-fit-state");
const cameraVisionStateEl = document.getElementById("camera-vision-state");
const serviceSelectEl = document.getElementById("service-select");
const serviceModeEl = document.getElementById("service-mode");
const serviceConsoleEl = document.getElementById("service-console");
const serviceRefreshEl = document.getElementById("service-refresh");
const serviceRestartEl = document.getElementById("service-restart");
const chatMessagesEl = document.getElementById("chat-messages");
const chatComposerEl = document.getElementById("chat-composer");
const chatInputEl = document.getElementById("chat-input");
const chatSendEl = document.getElementById("chat-send");
const chatResetEl = document.getElementById("chat-reset");
const chatDebugToggleEl = document.getElementById("chat-debug-toggle");
const chatIncludeCameraEl = document.getElementById("chat-include-camera");
const chatVoiceToggleEl = document.getElementById("dashboard-voice-toggle");
const chatStopAudioEl = document.getElementById("dashboard-stop-audio");
const chatNameEl = document.getElementById("chat-name");
const chatTargetEl = document.getElementById("chat-target");
const chatContextNoteEl = document.getElementById("chat-context-note");
const chatSessionLabelEl = document.getElementById("chat-session-label");
const chatDebugPanelEl = document.getElementById("chat-debug-panel");
const chatDebugContextEl = document.getElementById("chat-debug-context");
const chatDebugRetrievalEl = document.getElementById("chat-debug-retrieval");
const chatDebugResponseEl = document.getElementById("chat-debug-response");
const workingMemoryEl = document.getElementById("working-memory");
const environmentStateEl = document.getElementById("environment-state");
const activeAnomaliesEl = document.getElementById("active-anomalies");
const observerSummaryEl = document.getElementById("observer-summary");
const recentFramesEl = document.getElementById("recent-frames");
const recentTracesEl = document.getElementById("recent-traces");
const actionDecisionsEl = document.getElementById("action-decisions");
const aiMetricsEl = document.getElementById("ai-metrics");
const localOnlyEls = Array.from(document.querySelectorAll("[data-local-only]"));
const dashboardVoiceOrbEl = document.getElementById("dashboard-voice-orb");
const dashboardVoiceFigureEl = document.getElementById("dashboard-voice-figure");
const dashboardVoiceModeEl = document.getElementById("dashboard-voice-mode");
const dashboardVoiceStatusEl = document.getElementById("dashboard-voice-status");
const dashboardPresenceAudioEl = document.getElementById("dashboard-presence-audio");
const dashboardPresenceOrbEl = document.getElementById("dashboard-presence-orb");
let cameraProgressTimer = 0;
let cameraFollowupTimer = 0;
let statusFetchPromise = null;
let dashboardVoiceVisualizer = null;

const dashboardVoiceStateText = {
  idle: "Idle on network",
  loading: "Recovering session",
  connecting: "Opening channel",
  working: "Working through context",
  speaking: "Speaking through orb",
  complete: "Reply ready",
  error: "Backend fault",
};

function setStatus(text) {
  statusEl.textContent = text;
  if (dashboardVoiceOrbEl && dashboardVoiceStateText[text]) {
    dashboardVoiceOrbEl.dataset.state = text;
  }
  if (dashboardVoiceModeEl && dashboardVoiceStateText[text]) {
    dashboardVoiceModeEl.textContent = dashboardVoiceStateText[text] || text;
  }
}

function updateVoiceUi() {
  if (chatVoiceToggleEl) {
    chatVoiceToggleEl.textContent = state.voiceEnabled ? "Voice on" : "Voice off";
    chatVoiceToggleEl.setAttribute("aria-pressed", state.voiceEnabled ? "true" : "false");
  }
  if (dashboardVoiceStatusEl) {
    dashboardVoiceStatusEl.textContent = state.voiceEnabled ? "voice armed" : "voice muted";
  }
  if (chatStopAudioEl) {
    chatStopAudioEl.disabled = !state.voiceEnabled;
  }
}

function generateSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `dashboard-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getChatSessionId() {
  const existing = localStorage.getItem(CHAT_SESSION_KEY);
  if (existing) {
    return existing;
  }
  const created = generateSessionId();
  localStorage.setItem(CHAT_SESSION_KEY, created);
  return created;
}

function getChatHandle() {
  return localStorage.getItem(CHAT_HANDLE_KEY) || "";
}

function setChatHandle(value) {
  localStorage.setItem(CHAT_HANDLE_KEY, String(value || "").trim());
}

function refreshCameraImage() {
  state.cameraNonce += 1;
  const endpoint = state.cameraVisionVisible
    ? "/api/dashboard/camera-vision.mjpg"
    : "/api/dashboard/camera.mjpg";
  cameraImageEl.src = `${endpoint}?ts=${Date.now()}-${state.cameraNonce}`;
}

function setCameraVisionVisible(visible, { reconnect = true } = {}) {
  state.cameraVisionVisible = Boolean(visible);
  localStorage.setItem(CAMERA_VISION_KEY, state.cameraVisionVisible ? "on" : "off");
  const frame = cameraImageEl?.closest(".camera-frame");
  frame?.classList.toggle("vision-visibility", state.cameraVisionVisible);
  if (cameraVisionToggleEl) {
    cameraVisionToggleEl.setAttribute("aria-pressed", state.cameraVisionVisible ? "true" : "false");
  }
  if (cameraClassicToggleEl) {
    cameraClassicToggleEl.setAttribute("aria-pressed", state.cameraVisionVisible ? "false" : "true");
  }
  if (cameraVisionStateEl) {
    cameraVisionStateEl.textContent = state.cameraVisionVisible
      ? "Full-color Vision Monitor"
      : "Classic grayscale";
  }
  setCameraOverlayVisible(state.cameraOverlayVisible);
  if (reconnect && !state.accessDenied) {
    refreshCameraImage();
  }
}

function setCameraOverlayVisible(visible) {
  state.cameraOverlayVisible = Boolean(visible);
  localStorage.setItem(CAMERA_OVERLAY_KEY, state.cameraOverlayVisible ? "visible" : "hidden");
  const effectiveVisible = state.cameraOverlayVisible;
  if (cameraOverlayEl) {
    cameraOverlayEl.hidden = !effectiveVisible;
    cameraOverlayEl.setAttribute("aria-hidden", effectiveVisible ? "false" : "true");
  }
  if (cameraOverlayToggleEl) {
    cameraOverlayToggleEl.disabled = false;
    cameraOverlayToggleEl.textContent = state.cameraOverlayVisible
      ? "Hide description overlay"
      : "Show description overlay";
  }
  if (cameraOverlayStateEl) {
    cameraOverlayStateEl.textContent = state.cameraOverlayVisible
      ? "Overlay visible"
      : "Overlay hidden";
  }
}

function setCameraFitMode(mode) {
  state.cameraFitMode = mode === "fill" ? "fill" : "fit";
  localStorage.setItem(CAMERA_FIT_KEY, state.cameraFitMode);
  const frame = cameraImageEl?.closest(".camera-frame");
  if (frame) {
    frame.classList.toggle("fill", state.cameraFitMode === "fill");
  }
  if (cameraFitToggleEl) {
    cameraFitToggleEl.textContent = state.cameraFitMode === "fill" ? "Fit frame" : "Fill frame";
  }
  if (cameraFitStateEl) {
    cameraFitStateEl.textContent = state.cameraFitMode === "fill" ? "Fill mode" : "Fit mode";
  }
}

function toggleCameraOverlay() {
  setCameraOverlayVisible(!state.cameraOverlayVisible);
}

function showCameraOverlay() {
  if (!state.cameraOverlayVisible) {
    setCameraOverlayVisible(true);
    setStatus("Camera description overlay restored.");
  }
}

function hideCameraOverlay() {
  if (state.cameraOverlayVisible) {
    setCameraOverlayVisible(false);
    setStatus("Camera description overlay hidden.");
  }
}

async function requestCameraFullscreen() {
  const frame = cameraImageEl?.closest(".camera-frame");
  if (!frame?.requestFullscreen) {
    throw new Error("fullscreen_unavailable");
  }
  await frame.requestFullscreen();
}

function setAccessBanner(title, detail = "", hidden = false) {
  accessBannerEl.hidden = hidden;
  accessBannerTitleEl.textContent = title;
  accessBannerDetailEl.textContent = detail;
}

function updateLocalOnlyControls() {
  const localClient = Boolean(state.access?.local_client);
  for (const node of localOnlyEls) {
    if ("disabled" in node) {
      node.disabled = !localClient;
    }
    node.setAttribute("aria-disabled", localClient ? "false" : "true");
    node.title = localClient ? "" : "Available only from the local machine or LAN.";
  }
}

function formatRelativeAge(ts) {
  if (!ts) return "";
  const age = Math.max(0, Math.round(Date.now() / 1000 - Number(ts)));
  return `${age}s ago`;
}

function formatCameraElapsed(ts) {
  if (!ts) {
    return "0.0s";
  }
  const elapsedMs = Math.max(0, Date.now() - (Number(ts) * 1000));
  return `${(Math.round(elapsedMs / 100) / 10).toFixed(1)}s`;
}

function normalizeCameraThreadText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function classifyCameraScene(value) {
  const normalized = normalizeCameraThreadText(value);
  if (!normalized) {
    return "Camera thread pending.";
  }
  if (normalized.includes("keyboard") || normalized.includes("keys")) {
    return "Stable close-up workstation view centered on a keyboard.";
  }
  if (normalized.includes("screen") || normalized.includes("monitor") || normalized.includes("display")) {
    return "Screen or monitor remains the dominant subject.";
  }
  if (normalized.includes("person") || normalized.includes("face") || normalized.includes("human")) {
    return "Human subject remains present in frame.";
  }
  if (normalized.includes("room") || normalized.includes("window") || normalized.includes("interior")) {
    return "Indoor room scene remains in view.";
  }
  return compactText(String(value || "").trim(), 140) || "Scene remains broadly unchanged.";
}

function scheduleCameraFollowup(delay = 1600) {
  if (cameraFollowupTimer) {
    window.clearTimeout(cameraFollowupTimer);
  }
  cameraFollowupTimer = window.setTimeout(() => {
    if (state.accessDenied) return;
    fetchStatus().catch(() => {});
  }, delay);
}

function updateCameraThreadState(camera = {}) {
  const previous = state.cameraThread || {};
  const description = String(camera.caption || "").trim();
  if (!description) {
    state.cameraThread = {
      ...previous,
      operationalNote: camera.caption_error
        ? `Caption error: ${camera.caption_error}`
        : camera.camera_error
          ? `Camera error: ${camera.camera_error}`
          : previous.operationalNote || "Grayscale low-resolution feed; fine text and color remain unreliable.",
    };
    return state.cameraThread;
  }
  if (camera.caption_in_flight && previous.lastObservationKey) {
    const baseOperational = String(previous.operationalNote || "").replace(/\s*Refresh in progress\.$/, "").trim();
    state.cameraThread = {
      ...previous,
      operationalNote: `${baseOperational || "Grayscale low-resolution feed; fine text and color remain unreliable."} Refresh in progress.`,
      confidence: camera.caption_confidence ?? previous.confidence ?? "?",
    };
    return state.cameraThread;
  }
  const signature = String(camera.caption_frame_signature || camera.frame_signature || normalizeCameraThreadText(description));
  const observationKey = `${camera.frame_id ?? "?"}|${signature}|${camera.caption_finished_at || 0}`;
  if (observationKey === previous.lastObservationKey) {
    return previous;
  }
  const currentAssessment = classifyCameraScene(description);
  let stableCount = 0;
  let changeOverTime = "Baseline frame established; future updates will report drift from this scene.";
  if (previous.lastSignature) {
    if (previous.lastSignature === signature) {
      stableCount = Number(previous.stableCount || 0) + 1;
      changeOverTime = stableCount > 1
        ? `No material change across the last ${stableCount + 1} frames.`
        : "No material change since the previous frame.";
    } else {
      changeOverTime = `Scene changed relative to the previous frame. Prior assessment: ${previous.currentAssessment || "unknown"}`;
    }
  }
  const operationalParts = [
    camera.caption_cached ? "Cached scene match." : "Fresh live scene read.",
    "Grayscale low-resolution feed; fine text and color remain unreliable.",
    camera.caption_error ? `Caption error: ${camera.caption_error}` : "",
    camera.camera_error ? `Camera error: ${camera.camera_error}` : "",
  ].filter(Boolean);
  state.cameraThread = {
    lastObservationKey: observationKey,
    lastSignature: signature,
    stableCount,
    currentAssessment,
    changeOverTime,
    operationalNote: operationalParts.join(" "),
    confidence: camera.caption_confidence ?? "?",
  };
  return state.cameraThread;
}

function buildVisionBlock(camera = {}) {
  const visionContext = camera.vision_context || {};
  const presentation = visionContext.presentation || {};
  const sceneAssessment = visionContext.scene_assessment || {};
  const tracking = visionContext.tracking || {};
  const musicVisual = visionContext.music_visual || {};
  const retrospective = visionContext.retrospective_person_inference || {};
  const liveCaption = normalizeCameraCaption(camera.caption);
  const previewCaption = normalizeCameraCaption(camera.caption_preview_text);
  const usePreviewCaption = !liveCaption && Boolean(previewCaption);
  const usingStableFallback = !liveCaption && !usePreviewCaption && Boolean(state.lastStableCameraCaption);
  const summary = liveCaption || normalizeCameraCaption(sceneAssessment.in_frame) || previewCaption || state.lastStableCameraCaption || "Waiting for camera caption...";
  const captionCached = liveCaption
    ? Boolean(camera.caption_cached)
    : (usePreviewCaption ? true : Boolean(state.lastStableCameraCached));
  const captionSource = liveCaption
    ? normalizeCameraCaption(camera.caption_source)
    : (usePreviewCaption ? "similar cached scene match" : normalizeCameraCaption(state.lastStableCameraSource));
  const layout = usePreviewCaption
    ? `Based on the shared dashboard caption from ${camera.caption_preview_match === "exact" ? "cached scene match" : "similar cached scene match"}.`
    : captionCached
      ? "Based on the shared dashboard caption from cached scene match."
      : `Based on the shared dashboard caption from ${captionSource || "live camera"}.`;
  const anomalies = (!usingStableFallback && !usePreviewCaption && camera.caption_error)
    ? `Caption error: ${camera.caption_error}`
    : (!usingStableFallback && !usePreviewCaption && camera.camera_error)
      ? `Camera error: ${camera.camera_error}`
      : "None beyond low-resolution camera and approximate Bayer-color limitations noted by the shared camera path.";
  const confidence = liveCaption
    ? camera.caption_confidence
    : (usePreviewCaption ? camera.caption_preview_confidence : state.lastStableCameraConfidence);
  return [
    "=== VISION ===",
    `Summary: ${summary}`,
    `Presentation: ${presentation.mode || (state.cameraVisionVisible ? "full_color_vision_monitor" : "classic_grayscale")} · evidence ${visionContext.evidence_source || "canonical_unwarped_camera_frame"} · physical frame ${presentation.frame_id ?? camera.frame_id ?? 0} · visual frame ${presentation.visual_frame_id ?? camera.tracked_visual_frame_id ?? 0}`,
    `In Frame: ${sceneAssessment.in_frame || summary}`,
    `On Screen: ${sceneAssessment.on_screen || "Television content is not yet described."}`,
    `Motion: ${sceneAssessment.motion || `${tracking.motion_active ? "active" : "quiet"}; ${tracking.motion_object_count ?? 0} objects outside the television region.`}`,
    `People: ${sceneAssessment.people || `${tracking.person_candidates_in_frame ?? 0} candidates; ${tracking.people_passed_total ?? 0} conservative crossings.`}`,
    `Screen Geometry: ${tracking.screen_detected ? "detected" : "fallback or unavailable"} · ${tracking.screen_detection_source || "unknown"} · confidence ${Math.round(Number(tracking.screen_confidence || 0) * 100)}%`,
    `Music Visual: phase ${musicVisual.phase || "unknown"} · orb ${Number(musicVisual.orb_scale ?? 1).toFixed(3)}x · censor floor ${musicVisual.censor_floor_active ? "active" : "real music envelope"} · beat ${Number(musicVisual.beat || 0).toFixed(3)} · screen pulse ${Number(musicVisual.screen_pulse || 0).toFixed(3)}`,
    `Retrospective Person Review: ${retrospective.status || "not_run"} · ${retrospective.summary || "No retrospective model review available."} · never affects crossing count`,
    "Objects: Only coarse objects are reliable at this resolution; fine object identity remains uncertain.",
    `Layout: ${layout}`,
    "Text: No clearly reliable text extracted in this pass.",
    "Lighting: Lighting and reconstructed color remain uncertain at this sensor resolution.",
    `Anomalies: ${anomalies}`,
    `Confidence: ${confidence ?? "?"}%`,
  ].join("\n");
}

function buildReasoningBlock(thread = state.cameraThread || {}) {
  return [
    "=== REASONING ===",
    `Current Assessment: ${thread.currentAssessment || "Camera thread pending."}`,
    `Change Over Time: ${thread.changeOverTime || "Waiting for the first stable scene description."}`,
    `Operational Note: ${thread.operationalNote || "Grayscale low-resolution feed; fine text and color remain unreliable."}`,
  ].join("\n");
}

function buildOverlayCameraReport(camera = {}) {
  const liveCaption = normalizeCameraCaption(camera.caption);
  const previewCaption = normalizeCameraCaption(camera.caption_preview_text);
  const hasStableCaption = Boolean(state.lastStableCameraCaption);
  if (!liveCaption && !previewCaption && !hasStableCaption) {
    return "";
  }
  const effectiveCamera = {
    ...camera,
    caption: liveCaption || previewCaption || camera.caption,
    caption_cached: liveCaption ? camera.caption_cached : (previewCaption ? true : camera.caption_cached),
    caption_source: liveCaption ? camera.caption_source : (previewCaption ? "cache" : camera.caption_source),
    caption_confidence: liveCaption ? camera.caption_confidence : (previewCaption ? camera.caption_preview_confidence : camera.caption_confidence),
  };
  const thread = updateCameraThreadState(effectiveCamera);
  return `${buildVisionBlock(camera)}\n\n${buildReasoningBlock(thread)}`.trim();
}

function renderCameraProgress(camera = {}) {
  if (!cameraProgressEl || !cameraProgressBarEl || !cameraProgressTrackEl) {
    return;
  }
  const active = Boolean(camera.caption_in_flight);
  const hasError = Boolean(camera.caption_error);
  cameraProgressEl.hidden = !(active || hasError);
  if (!active && !hasError) {
    cameraProgressTrackEl.setAttribute("aria-valuenow", "0");
    cameraProgressBarEl.style.width = "0%";
    return;
  }
  if (hasError && !active) {
    const hasFallbackCaption = Boolean(String(camera.caption || "").trim() || state.lastStableCameraCaption);
    if (cameraProgressLabelEl) {
      cameraProgressLabelEl.textContent = hasFallbackCaption
        ? `Caption failed; keeping previous description (${camera.caption_error}).`
        : `Caption failed: ${camera.caption_error}.`;
    }
    if (cameraProgressAgeEl) {
      cameraProgressAgeEl.textContent = formatCameraElapsed(camera.caption_finished_at || camera.caption_started_at);
    }
    cameraProgressTrackEl.setAttribute("aria-valuenow", "100");
    cameraProgressBarEl.style.width = "100%";
    return;
  }
  const elapsedMs = Math.max(0, Date.now() - (Number(camera.caption_started_at || 0) * 1000));
  const elapsedSeconds = elapsedMs / 1000;
  let progress = 0;
  if (elapsedSeconds <= 8) {
    progress = 3 + (elapsedSeconds / 8) * 17;
  } else if (elapsedSeconds <= 30) {
    progress = 20 + ((elapsedSeconds - 8) / 22) * 28;
  } else if (elapsedSeconds <= 70) {
    progress = 48 + ((elapsedSeconds - 30) / 40) * 26;
  } else {
    const tailSeconds = elapsedSeconds - 70;
    progress = 74 + (20 * (1 - Math.exp(-tailSeconds / 45)));
  }
  progress = Math.min(94, progress);
  if (cameraProgressLabelEl) {
    let phase = "Generating scene description...";
    if (elapsedSeconds >= 50) {
      phase = "Finalizing scene description...";
    } else if (elapsedSeconds >= 20) {
      phase = "Analyzing scene details...";
    }
    cameraProgressLabelEl.textContent = camera.caption
      ? `Refreshing scene description...`
      : phase;
  }
  if (cameraProgressAgeEl) {
    cameraProgressAgeEl.textContent = formatCameraElapsed(camera.caption_started_at);
  }
  cameraProgressTrackEl.setAttribute("aria-valuenow", String(Math.round(progress)));
  cameraProgressBarEl.style.width = `${progress}%`;
}

function renderCameraThread(camera = {}) {
  if (!cameraThreadEl) return;
  const thread = updateCameraThreadState(camera);
  cameraThreadEl.textContent = buildReasoningBlock(thread);
}

function formatMessageTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatServerTimestamp(value) {
  if (!value) {
    return formatMessageTime();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return formatMessageTime();
  }
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function compactText(value, maxChars = 2400) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 3)}...`;
}

function splitSpeechText(text, maxChars = 420) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  if (normalized.length <= maxChars) {
    return [normalized];
  }
  const chunks = [];
  const sentences = normalized.split(/(?<=[.!?])\s+/);
  let current = "";
  for (const sentence of sentences) {
    const next = sentence.trim();
    if (!next) continue;
    if (!current) {
      current = next;
      continue;
    }
    if ((current.length + 1 + next.length) <= maxChars) {
      current += ` ${next}`;
      continue;
    }
    chunks.push(current);
    current = next;
  }
  if (current) {
    chunks.push(current);
  }
  return chunks.filter(Boolean);
}

function buildSpeechUrl(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }
  const url = new URL(SPEAK_URL, window.location.origin);
  url.searchParams.set("text", normalized);
  url.searchParams.set("session", state.chatSession);
  return url.toString();
}

function cancelSpeechQueue(options = {}) {
  const { pauseAudio = false } = options;
  state.speechSequenceToken += 1;
  state.speechQueue = [];
  state.speechQueueIndex = 0;
  state.speechQueueOpen = false;
  state.speechPlaybackPending = false;
  if (pauseAudio && dashboardPresenceAudioEl) {
    dashboardPresenceAudioEl.pause();
  }
}

async function ensureSpeechCached(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }
  if (state.pendingSpeechUrl && state.pendingSpeechText === normalized) {
    return state.pendingSpeechUrl;
  }
  if (state.pendingSpeechPromise && state.pendingSpeechText === normalized) {
    return state.pendingSpeechPromise;
  }
  const request = (async () => {
    const response = await fetch(buildSpeechUrl(normalized), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`voice_${response.status}`);
    }
    const blob = await response.blob();
    if (!blob.size) {
      throw new Error("voice_empty_audio");
    }
    const objectUrl = URL.createObjectURL(blob);
    state.pendingSpeechUrl = objectUrl;
    return objectUrl;
  })();
  state.pendingSpeechPromise = request;
  state.pendingSpeechText = normalized;
  state.pendingSpeechUrl = "";
  try {
    return await request;
  } finally {
    if (state.pendingSpeechPromise === request) {
      state.pendingSpeechPromise = null;
    }
  }
}

async function playSpeech(text) {
  const normalized = String(text || "").trim();
  if (!normalized || !dashboardPresenceAudioEl) {
    return;
  }
  const url = await ensureSpeechCached(normalized);
  if (!url) {
    return;
  }
  dashboardPresenceAudioEl.pause();
  if (dashboardPresenceAudioEl.src !== url) {
    dashboardPresenceAudioEl.src = url;
  }
  dashboardPresenceAudioEl.currentTime = 0;
  await dashboardVoiceVisualizer?.unlock?.();
  await dashboardPresenceAudioEl.play();
  setStatus("speaking");
}

async function continueSpeechQueue(token) {
  if (token !== state.speechSequenceToken || state.speechPlaybackPending) {
    return;
  }
  const chunk = state.speechQueue[state.speechQueueIndex] || "";
  if (!chunk) {
    cancelSpeechQueue({ pauseAudio: false });
    if (!state.chatInflight) {
      setStatus("complete");
    }
    return;
  }
  state.speechPlaybackPending = true;
  try {
    await playSpeech(chunk);
  } finally {
    state.speechPlaybackPending = false;
  }
}

async function playSpeechSequence(text) {
  const normalized = String(text || "").trim();
  if (!normalized || !state.voiceEnabled) {
    return;
  }
  cancelSpeechQueue({ pauseAudio: true });
  state.speechQueue = splitSpeechText(normalized, 420);
  state.speechQueueIndex = 0;
  await continueSpeechQueue(state.speechSequenceToken);
}

function stopSpeech() {
  cancelSpeechQueue({ pauseAudio: true });
  if (dashboardPresenceAudioEl) {
    dashboardPresenceAudioEl.pause();
    dashboardPresenceAudioEl.currentTime = 0;
  }
  if (!state.chatInflight) {
    setStatus("idle");
  }
}

function initVoicePresence() {
  if (typeof window.createHueVisualizer === "function" && dashboardPresenceOrbEl && dashboardPresenceAudioEl) {
    dashboardVoiceVisualizer = window.createHueVisualizer({
      canvas: dashboardPresenceOrbEl,
      mediaEl: dashboardPresenceAudioEl,
    });
  }
  dashboardPresenceAudioEl?.addEventListener("play", () => {
    setStatus("speaking");
    updateVoiceUi();
  });
  dashboardPresenceAudioEl?.addEventListener("ended", () => {
    state.speechQueueIndex += 1;
    if (state.speechQueueIndex < state.speechQueue.length) {
      void continueSpeechQueue(state.speechSequenceToken);
      return;
    }
    cancelSpeechQueue({ pauseAudio: false });
    if (!state.chatInflight) {
      setStatus("complete");
    }
  });
  dashboardPresenceAudioEl?.addEventListener("pause", () => {
    if (!state.chatInflight && dashboardPresenceAudioEl.currentTime === 0) {
      setStatus("idle");
    }
  });
  dashboardVoiceFigureEl?.addEventListener("click", () => {
    if (state.voiceEnabled && state.lastAssistantReply && !state.chatInflight) {
      void playSpeechSequence(state.lastAssistantReply).catch(() => {});
      return;
    }
    chatInputEl?.focus();
  });
  document.addEventListener("pointerdown", () => {
    void dashboardVoiceVisualizer?.unlock?.();
  }, { once: true });
}

function normalizeCameraCaption(value) {
  return String(value || "").trim();
}

function isUsableCameraCaption(value) {
  const normalized = normalizeCameraCaption(value).toLowerCase();
  return normalized !== "" &&
    normalized !== "waiting for camera caption..." &&
    normalized !== "waiting for camera caption" &&
    normalized !== "camera thread pending.";
}

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value || "");
  }
}

function formatWorkingMemory(memory = {}) {
  const activeThreads = Array.isArray(memory.active_threads) ? memory.active_threads : [];
  const visualThreads = Array.isArray(memory.visual_threads) ? memory.visual_threads : [];
  const anomalies = Array.isArray(memory.recent_anomalies) ? memory.recent_anomalies : [];
  return [
    `last_environment_summary: ${memory.last_environment_summary || "none"}`,
    `last_user_intent: ${memory.last_user_intent || "none"}`,
    `active_threads: ${activeThreads.length ? activeThreads.map((item) => item.label || item.intent || "thread").join(" | ") : "none"}`,
    `visual_threads: ${visualThreads.length ? visualThreads.map((item) => item.scene_label || item.summary || "scene").join(" | ") : "none"}`,
    `environment_stability: ${memory.environment_stability || "unknown"}`,
    `last_scene_label: ${memory.last_scene_label || "none"}`,
    `drift_score: ${memory.drift_score ?? 0}`,
    `recent_anomalies: ${anomalies.length ? anomalies.map((item) => item.type || "anomaly").join(" | ") : "none"}`,
    `last_updated: ${memory.last_updated || "unknown"}`,
  ].join("\n");
}

function formatAnomalies(anomalies = []) {
  if (!Array.isArray(anomalies) || !anomalies.length) {
    return "No active anomalies.";
  }
  return anomalies.slice(0, 5).map((item, index) => {
    const description = item?.description || item?.type || "anomaly";
    return `${index + 1}. ${(item?.type || "anomaly")} [${item?.severity || "unknown"}] ${description}`;
  }).join("\n");
}

function formatObserverReport(report = {}) {
  return [
    `summary: ${report.summary || "Observer report pending."}`,
    `recommendations: ${Array.isArray(report.recommendations) && report.recommendations.length ? report.recommendations.join(" | ") : "none"}`,
    `drift_notes: ${Array.isArray(report.drift_notes) && report.drift_notes.length ? report.drift_notes.join(" | ") : "none"}`,
    `generated_at: ${report.generated_at || "unknown"}`,
  ].join("\n");
}

function formatEnvironmentState(environmentState = {}) {
  const recentFrames = Array.isArray(environmentState.recent_frames) ? environmentState.recent_frames : [];
  return [
    `environment_stability: ${environmentState.environment_stability || "unknown"}`,
    `stability_score: ${environmentState.stability_score ?? 0}`,
    `drift_score: ${environmentState.drift_score ?? 0}`,
    `last_scene_label: ${environmentState.last_scene_label || "none"}`,
    `recent_frame_count: ${recentFrames.length}`,
    `generated_at: ${environmentState.generated_at || "unknown"}`,
  ].join("\n");
}

function formatRecentFrames(frames = []) {
  if (!Array.isArray(frames) || !frames.length) {
    return "No recent frame history yet.";
  }
  return frames.slice(0, 5).map((frame, index) => {
    const timestamp = frame?.timestamp || "unknown";
    const scene = compactText(frame?.scene_label || frame?.summary || "unknown scene", 72);
    const change = compactText(frame?.change_text || "no confirmed change", 72);
    const confidence = frame?.confidence || "?";
    const delta = frame?.seconds_since_previous ?? "n/a";
    return `${index + 1}. ${timestamp} | ${scene} | change=${change} | confidence=${confidence} | delta_s=${delta}`;
  }).join("\n");
}

function formatRecentTraces(traces = []) {
  if (!Array.isArray(traces) || !traces.length) {
    return "No traces recorded yet.";
  }
  return traces.slice(-5).reverse().map((trace) => {
    const query = trace?.input?.user_text || trace?.input?.message || "unknown";
    const confidence = Number.isFinite(Number(trace?.confidence)) ? Number(trace.confidence).toFixed(2) : "?";
    return `${trace?.timestamp || "unknown"} | ${confidence} | ${compactText(query, 72)}`;
  }).join("\n");
}

function formatActionDecisions(traces = [], report = {}) {
  const lines = [];
  if (Array.isArray(report.action_decisions)) {
    for (const item of report.action_decisions.slice(0, 5)) {
      lines.push(`${item.type || "action"} | ${item.status || "pending"} | ${item.service || item.reason || "no detail"}`);
    }
  }
  if (!lines.length && Array.isArray(traces)) {
    for (const trace of traces.slice().reverse()) {
      const taken = trace?.action_taken;
      const considered = Array.isArray(trace?.actions_considered) ? trace.actions_considered[0] : null;
      const item = taken || considered;
      if (!item) continue;
      lines.push(`${item.type || "action"} | ${item.status || (item.human_confirm ? "pending confirm" : "considered")} | ${item.service || item.reason || "no detail"}`);
      if (lines.length >= 5) break;
    }
  }
  return lines.length ? lines.join("\n") : "No action decisions yet.";
}

function formatAiMetrics(metrics = {}) {
  return [
    `cycles: ${metrics.cycles ?? 0}`,
    `tokens_used: ${metrics.tokens_used ?? 0}`,
    `knowledge_hits: ${metrics.knowledge_hits ?? 0}`,
    `reasoning_depth: ${metrics.reasoning_depth ?? 0}`,
    `low_confidence_responses: ${metrics.low_confidence_responses ?? 0}`,
    `retry_count: ${metrics.retry_count ?? 0}`,
    `last_updated: ${metrics.last_updated || "unknown"}`,
  ].join("\n");
}

function renderCognitivePanel() {
  const cognitive = state.latestStatus?.cognitive || {};
  const workingMemory = cognitive.working_memory || {};
  const traces = Array.isArray(cognitive.recent_traces) ? cognitive.recent_traces : [];
  const observerReport = cognitive.observer_report || {};
  const aiMetrics = cognitive.ai_metrics || {};
  const environmentState = cognitive.environment_state || {};
  const recentFrames = Array.isArray(environmentState.recent_frames)
    ? environmentState.recent_frames
    : (Array.isArray(observerReport.recent_frame_history) ? observerReport.recent_frame_history : []);
  if (workingMemoryEl) {
    workingMemoryEl.textContent = formatWorkingMemory(workingMemory);
  }
  if (environmentStateEl) {
    environmentStateEl.textContent = formatEnvironmentState(environmentState);
  }
  if (activeAnomaliesEl) {
    activeAnomaliesEl.textContent = formatAnomalies(workingMemory.recent_anomalies || observerReport.active_anomalies || []);
  }
  if (observerSummaryEl) {
    observerSummaryEl.textContent = formatObserverReport(observerReport);
  }
  if (recentFramesEl) {
    recentFramesEl.textContent = formatRecentFrames(recentFrames);
  }
  if (recentTracesEl) {
    recentTracesEl.textContent = formatRecentTraces(traces);
  }
  if (actionDecisionsEl) {
    actionDecisionsEl.textContent = formatActionDecisions(traces, observerReport);
  }
  if (aiMetricsEl) {
    aiMetricsEl.textContent = formatAiMetrics(aiMetrics);
  }
}

function buildRetrievalDebugText(payload) {
  const retrieval = payload?.retrieval;
  if (!retrieval) {
    return "No retrieval metadata yet.";
  }
  const hits = Array.isArray(retrieval.hits) ? retrieval.hits : [];
  const lines = [
    `used: ${Boolean(retrieval.used)}`,
    `query: ${retrieval.query || "none"}`,
    `page_context_applied: ${payload?.page_context_applied ?? retrieval.page_context_applied ?? "unknown"}`,
    `grounded: ${payload?.grounded ?? retrieval.grounded ?? "unknown"}`,
    `fallback_grounding_used: ${payload?.fallback_grounding_used ?? retrieval.fallback_grounding_used ?? "unknown"}`,
    `backend_profile: ${payload?.backend_profile || retrieval.backend_profile || "unknown"}`,
    `backend_model_id: ${payload?.backend_model_id || retrieval.backend_model_id || "unknown"}`,
    `grounding_mode: ${retrieval.grounding_mode || "unknown"}`,
    `warning: ${retrieval.warning || "none"}`,
  ];
  if (!hits.length) {
    lines.push("", "hits: none");
    return lines.join("\n");
  }
  hits.forEach((hit, index) => {
    lines.push("");
    lines.push(`hit ${index + 1}`);
    lines.push(`score: ${Number(hit.score || 0).toFixed(4)}`);
    lines.push(`doc: ${hit.doc_key || hit.path || "unknown"}`);
    lines.push(`title: ${hit.title || "unknown"}`);
    lines.push(`snippet: ${hit.text || ""}`);
  });
  return lines.join("\n");
}

function syncDebugPanel() {
  if (!chatDebugPanelEl || !chatDebugToggleEl) {
    return;
  }
  chatDebugPanelEl.hidden = !state.chatDebug;
  chatDebugToggleEl.textContent = state.chatDebug ? "Debug on" : "Debug off";
  chatDebugToggleEl.setAttribute("aria-pressed", state.chatDebug ? "true" : "false");
  if (!state.chatDebug) {
    return;
  }
  const currentContext = buildDashboardPageContext();
  const sentContext = state.lastPageContext || currentContext;
  const requestSummary = state.lastChatRequest
    ? { ...state.lastChatRequest, page_context: sentContext }
    : { page_context: sentContext };
  chatDebugContextEl.textContent = prettyJson(requestSummary);
  chatDebugRetrievalEl.textContent = buildRetrievalDebugText(state.lastChatDebug);
  chatDebugResponseEl.textContent = state.lastChatDebug
    ? prettyJson(state.lastChatDebug)
    : "No chat response yet.";
}

function populateDashboardContextCard() {
  if (!chatDebugContextEl) {
    return;
  }
  try {
    const currentContext = buildDashboardPageContext();
    const sentContext = state.lastPageContext || currentContext;
    const requestSummary = state.lastChatRequest
      ? { ...state.lastChatRequest, page_context: sentContext }
      : { page_context: sentContext };
    chatDebugContextEl.textContent = prettyJson(requestSummary);
  } catch (error) {
    chatDebugContextEl.textContent = `Context build failed: ${error.message || error}`;
  }
}

function setChatDebug(enabled) {
  state.chatDebug = Boolean(enabled);
  localStorage.setItem(CHAT_DEBUG_KEY, state.chatDebug ? "on" : "off");
  syncDebugPanel();
}

function renderChatHealth(data) {
  const health = data.chat_health || {};
  const stack = health.stack?.profiles || [];
  const visionFast = stack.find((item) => item.id === "vision_fast");
  chatHealthEl.innerHTML = `
    <strong>${health.ok ? "Chat API reachable" : "Chat API unavailable"}</strong>
    <span>Reasoning: ${health.backend_model_id || "unknown"} / ${health.backend_profile || "unknown"}</span>
    <span>Vision fast: ${visionFast?.loaded_model_id || visionFast?.model_path || "unknown"}</span>
    <span>Voice: ${health.voice_available ? "available" : "offline"}</span>
  `;
}

function renderAccessState(access) {
  state.access = access || null;
  state.accessDenied = Boolean(access && !access.access_allowed);
  if (cameraClassicToggleEl) cameraClassicToggleEl.disabled = state.accessDenied;
  if (cameraVisionToggleEl) cameraVisionToggleEl.disabled = state.accessDenied;
  updateLocalOnlyControls();
  if (!access) {
    setAccessBanner("Dashboard access status unavailable.", "The access-control daemon did not return a usable state.");
    return;
  }
  if (!access.access_allowed) {
    setAccessBanner(
      "Public dashboard access is disabled.",
      "This page stays visible on the site desktop, but live camera, inline chat, and service data remain off until the local access daemon enables public access."
    );
    return;
  }
  if (access.local_client) {
    setAccessBanner(
      "Local dashboard access active.",
      access.public_enabled
        ? "Public access is also enabled. Local-only launch and restart controls remain available here."
        : "This connection is local, so the dashboard remains usable even while public access is disabled."
    );
    return;
  }
  setAccessBanner(
    "Public dashboard access active.",
    "Live camera, inline chat, and service telemetry are available through the public site app. Desktop launch and restart controls stay local-only."
  );
}

function updateCameraCaption(camera) {
  if (!camera) return;
  if (!camera.caption_in_flight && isUsableCameraCaption(camera.caption)) {
    state.lastStableCameraCaption = normalizeCameraCaption(camera.caption);
    state.lastStableCameraSource = normalizeCameraCaption(camera.caption_source);
    state.lastStableCameraCached = Boolean(camera.caption_cached);
    state.lastStableCameraConfidence = camera.caption_confidence ?? "?";
  }
  const overlayReport = buildOverlayCameraReport(camera);
  if (overlayReport) {
    state.lastStableCameraReport = overlayReport;
    cameraCaptionEl.textContent = overlayReport;
  } else if (state.lastStableCameraReport) {
    cameraCaptionEl.textContent = state.lastStableCameraReport;
  } else if (camera.camera_error || camera.caption_error) {
    const issue = camera.camera_error
      ? `Camera backend error: ${camera.camera_error}`
      : `Caption error: ${camera.caption_error}`;
    cameraCaptionEl.textContent = issue;
  } else {
    cameraCaptionEl.textContent = "Waiting for camera caption...";
  }
  renderCameraThread(camera);
  renderCameraProgress(camera);
  if (camera.caption_in_flight) {
    scheduleCameraFollowup();
  } else if (cameraFollowupTimer) {
    window.clearTimeout(cameraFollowupTimer);
    cameraFollowupTimer = 0;
  }
}

function updateCameraControls(camera) {
  if (!camera) return;
  const autoEnabled = Boolean(camera.auto_caption_enabled);
  cameraAutoToggleEl.textContent = autoEnabled ? "Stop auto descriptions" : "Start auto descriptions";
  cameraControlStateEl.textContent = autoEnabled ? "Auto descriptions on" : "Auto descriptions off";
  if (cameraViewerCountEl) {
    const observerCount = Math.max(0, Number(camera.viewer_count) || 0);
    cameraViewerCountEl.textContent = `${observerCount} observer${observerCount === 1 ? "" : "s"}`;
  }
  if (cameraObserverDetailEl) {
    const breakdown = camera.viewer_breakdown || {};
    const humans = Math.max(0, Number(breakdown.human) || 0);
    const crawlers = Math.max(0, Number(breakdown.crawler) || 0);
    const unknown = Math.max(0, Number(breakdown.unknown) || 0);
    const lingering = Math.max(0, Number(breakdown.lingering) || 0);
    const parts = [
      `${humans} human${humans === 1 ? "" : "s"}`,
      `${crawlers} crawler${crawlers === 1 ? "" : "s"}`,
    ];
    if (unknown) {
      parts.push(`${unknown} unverified`);
    }
    parts.push(`${lingering} lingering connection${lingering === 1 ? "" : "s"}`);
    cameraObserverDetailEl.textContent = parts.join(" · ");
    const families = camera.viewer_crawler_families || {};
    cameraObserverDetailEl.title = Object.keys(families).length
      ? `Verified crawler observers: ${Object.entries(families).map(([family, count]) => `${family} ${count}`).join(", ")}`
      : "Crawler classification requires a matching bot identity and verified source network.";
  }
  const source = camera.caption_cached ? "cached scene" : (camera.caption_source || "live scene");
  const count = Number(camera.caption_cache_entries || 0);
  if (camera.camera_device_present === false) {
    cameraCacheStateEl.textContent = "Camera disconnected";
  } else if (camera.frame_fresh === false) {
    cameraCacheStateEl.textContent = "Waiting for fresh frame";
  } else {
    cameraCacheStateEl.textContent = count ? `${source} • ${count} cached` : "Caption cache empty";
  }
  cameraDescribeNowEl.disabled = Boolean(camera.caption_in_flight) || camera.camera_device_present === false;
  cameraAutoToggleEl.disabled = false;
}

function ensureServiceOptions(services) {
  if (!Array.isArray(services) || !services.length) return false;
  const current = serviceSelectEl.value;
  serviceSelectEl.replaceChildren();
  for (const service of services) {
    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = service.description;
    serviceSelectEl.append(option);
  }
  if (current && services.some((service) => service.id === current)) {
    serviceSelectEl.value = current;
  }
  return !current;
}

async function refreshServiceConsole() {
  if (state.accessDenied) return;
  const service = serviceSelectEl.value;
  const mode = serviceModeEl.value;
  if (!service) return;
  serviceConsoleEl.textContent = "Loading service output...";
  const response = await fetch(
    `/api/dashboard/services/console?service=${encodeURIComponent(service)}&mode=${encodeURIComponent(mode)}`,
    { cache: "no-store" }
  );
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `console ${response.status}`);
  }
  serviceConsoleEl.textContent = payload.text || "(no output)";
  serviceConsoleEl.scrollTop = 0;
  state.serviceConsoleLoaded = true;
  syncDebugPanel();
}

async function restartSelectedService() {
  const service = serviceSelectEl.value;
  if (!service) return;
  const response = await fetch(`/api/dashboard/services/action/${encodeURIComponent(service)}/restart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `restart ${response.status}`);
  }
  setStatus(`Restarted ${service}.`);
  await fetchStatus();
  await refreshServiceConsole();
}

function renderEmptyChat() {
  chatMessagesEl.innerHTML = `<div class="chat-empty">No shared dashboard comments yet. Post to viewers only, or address the AI and keep the exchange in the same thread.</div>`;
}

function scrollChatToBottom() {
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function bindMessageDeleteGesture(target, getMessageIndex, deleteFn) {
  if (!target || target.dataset.deleteGestureBound === "true") {
    return;
  }
  target.dataset.deleteGestureBound = "true";
  target.title = "Right click or tap and hold to delete this message.";

  let holdTimer = 0;
  let holdPointerId = null;
  let holdTriggered = false;
  let startX = 0;
  let startY = 0;

  const clearHold = () => {
    if (holdTimer) {
      window.clearTimeout(holdTimer);
      holdTimer = 0;
    }
    holdPointerId = null;
  };

  const triggerDelete = (event) => {
    const messageIndex = getMessageIndex();
    if (!Number.isInteger(messageIndex) || messageIndex <= 0) {
      return false;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    holdTriggered = true;
    void deleteFn(messageIndex).catch((error) => {
      setStatus(`Chat delete failed: ${error.message}`);
    });
    return true;
  };

  target.addEventListener("contextmenu", (event) => {
    const actionTarget = event.target instanceof Element ? event.target : null;
    if (actionTarget?.closest("button, a, input, textarea, select, summary")) {
      return;
    }
    triggerDelete(event);
  });

  target.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || event.button !== 0) {
      return;
    }
    clearHold();
    holdTriggered = false;
    holdPointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    holdTimer = window.setTimeout(() => {
      if (holdPointerId !== event.pointerId) {
        return;
      }
      triggerDelete(event);
      clearHold();
    }, 650);
  }, { passive: true });

  target.addEventListener("pointermove", (event) => {
    if (event.pointerId !== holdPointerId) {
      return;
    }
    if (Math.abs(event.clientX - startX) > 10 || Math.abs(event.clientY - startY) > 10) {
      clearHold();
    }
  }, { passive: true });

  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
    target.addEventListener(type, (event) => {
      if (event.pointerId !== holdPointerId) {
        return;
      }
      clearHold();
      if (holdTriggered) {
        event.preventDefault();
        holdTriggered = false;
      }
    });
  });
}

function createChatMessage(role, content, options = {}) {
  const { note = "", pending = false, timestamp = formatMessageTime(), speakerLabel = role } = options;
  const article = document.createElement("article");
  article.className = `chat-message ${role}${pending ? " pending" : ""}`;

  const meta = document.createElement("div");
  meta.className = "chat-message-meta";

  const who = document.createElement("span");
  who.textContent = speakerLabel;

  const when = document.createElement("span");
  when.textContent = timestamp;

  const body = document.createElement("div");
  body.className = "chat-message-body";
  body.textContent = content || "";

  meta.append(who, when);
  article.append(meta, body);
  if (note) {
    const noteNode = document.createElement("div");
    noteNode.className = "chat-message-note";
    noteNode.textContent = note;
    article.append(noteNode);
  }
  if (chatMessagesEl.querySelector(".chat-empty")) {
    chatMessagesEl.textContent = "";
  }
  chatMessagesEl.append(article);
  scrollChatToBottom();
  return { article, body };
}

function commentSpeakerLabel(entry = {}) {
  const name = compactText(entry.name || "guest", 48);
  if (entry.role === "assistant") {
    return `${name} (AI)`;
  }
  if (entry.target === "ai") {
    return `${name} to AI`;
  }
  return `${name} to viewers`;
}

function commentNote(entry = {}) {
  if (entry.role === "assistant") {
    return "Posted into the dashboard-only IRC comment lane.";
  }
  if (entry.target === "ai") {
    return "This message is part of the shared context passed into later AI replies on this page.";
  }
  return "Viewer-only comment. It stays out of the AI path unless later included through the page context.";
}

function renderCommentFeed(messages) {
  const filtered = Array.isArray(messages)
    ? messages.filter((message) => message && message.message)
    : [];
  state.commentMessages = filtered;
  const latestAssistant = [...filtered].reverse().find((message) => (
    message?.role === "assistant" && String(message.message || "").trim()
  ));
  if (latestAssistant) {
    state.lastAssistantReply = String(latestAssistant.message || "").trim();
  }
  chatMessagesEl.textContent = "";
  if (!filtered.length) {
    renderEmptyChat();
    return;
  }
  for (const message of filtered) {
    createChatMessage(message.role || "viewer", message.message || "", {
      speakerLabel: commentSpeakerLabel(message),
      timestamp: formatServerTimestamp(message.created_at),
      note: commentNote(message),
    });
  }
}

function setChatComposerDisabled(disabled) {
  state.chatInflight = disabled;
  chatInputEl.disabled = disabled;
  chatSendEl.disabled = disabled;
  chatResetEl.disabled = disabled;
  chatNameEl.disabled = disabled;
  chatTargetEl.disabled = disabled;
  syncChatTargetControls();
}

function syncChatTargetControls() {
  const targetingAi = (chatTargetEl?.value || "ai") === "ai";
  chatIncludeCameraEl.disabled = state.chatInflight || !targetingAi;
}

function updateChatContextNote() {
  const camera = state.latestStatus?.camera || null;
  const thread = state.cameraThread || {};
  const target = chatTargetEl?.value || "ai";
  const includeCamera = target === "ai" && chatIncludeCameraEl.checked;
  const commentCount = Array.isArray(state.commentMessages) ? state.commentMessages.length : 0;
  let text = "Dashboard context is loading.";
  if (!camera) {
    chatContextNoteEl.textContent = text;
    syncDebugPanel();
    return;
  }
  if (target !== "ai") {
    text = `Viewer-only mode. Comments are posted into the shared dashboard thread without invoking the AI. ${commentCount} recent thread entr${commentCount === 1 ? "y" : "ies"} remain visible on this page.`;
  } else if (camera.caption) {
    const confidence = Number.isFinite(Number(camera.caption_confidence))
      ? ` Confidence ${Number(camera.caption_confidence)}%.`
      : "";
    const source = camera.caption_cached ? " Matched from a cached coarse scene fingerprint." : " Captured from the current coarse scene fingerprint.";
    const mode = includeCamera
      ? "AI replies receive the canonical camera frame, structured Vision Monitor metadata, the shared comment thread, and the rest of the dashboard context."
      : "AI replies receive structured Vision Monitor metadata, the shared comment thread, and the rest of the dashboard context without a fresh image attachment.";
    text = `${mode} ${commentCount} recent thread entr${commentCount === 1 ? "y" : "ies"} are included before your next AI prompt. Latest caption: ${camera.caption}${confidence}${source} ${thread.changeOverTime || ""}`.trim();
  } else if (camera.caption_in_flight) {
    text = `AI mode is active. ${commentCount} recent thread entr${commentCount === 1 ? "y" : "ies"} are included, and the camera caption is still running.`;
  } else if (camera.camera_error || camera.caption_error) {
    text = `AI mode is active. ${commentCount} recent thread entr${commentCount === 1 ? "y" : "ies"} are included, but camera context is degraded right now.`;
  } else {
    text = `AI mode is active. ${commentCount} recent thread entr${commentCount === 1 ? "y" : "ies"} are included. Waiting for the first camera caption.`;
  }
  chatContextNoteEl.textContent = text;
  syncDebugPanel();
}

function buildDashboardPageContext() {
  const data = state.latestStatus || {};
  const metrics = state.latestMetrics || {};
  const camera = data.camera || {};
  const cameraThread = state.cameraThread || {};
  const cognitive = data.cognitive || {};
  const workingMemory = cognitive.working_memory || {};
  const observerReport = cognitive.observer_report || {};
  const recentTraces = Array.isArray(cognitive.recent_traces) ? cognitive.recent_traces : [];
  const aiMetrics = cognitive.ai_metrics || {};
  const environmentState = cognitive.environment_state || {};
  const recentFrames = Array.isArray(environmentState.recent_frames) ? environmentState.recent_frames : [];
  const actionDecisionLines = formatActionDecisions(recentTraces, observerReport).split("\n");
  const services = Array.isArray(data.services) ? data.services : [];
  const commentMessages = Array.isArray(state.commentMessages) ? state.commentMessages : [];
  const selectedService = serviceSelectEl?.value || "";
  const selectedMode = serviceModeEl?.value || "status";
  const currentTarget = chatTargetEl?.value || "ai";
  const currentHandle = String(chatNameEl?.value || "").trim() || "guest";
  const serviceConsoleText = compactText(serviceConsoleEl?.textContent || "", 2200);
  const sensorReadouts = Array.isArray(metrics.sensor_snapshot?.readouts) ? metrics.sensor_snapshot.readouts : [];
  const cameraVisionReport = buildVisionBlock(camera);
  const cameraReasoningReport = buildReasoningBlock(cameraThread);
  const cameraFullReport = buildOverlayCameraReport(camera);
  const metricSummary = [
    `external_hits: ${metrics.external_hits ?? "unknown"}`,
    `hits_today: ${metrics.hits_today ?? "unknown"}`,
    `unique_ips: ${metrics.external_unique_ips ?? metrics.unique_ips ?? "unknown"}`,
    `top_path: ${metrics.top_external_paths?.[0]?.path || metrics.top_paths?.[0]?.path || "unknown"}`,
  ];
  const contentLines = [
    "Local AI dashboard state.",
    `dashboard_url: ${data.site_dashboard_url || window.location.href}`,
    `dashboard_comment_handle: ${currentHandle}`,
    `dashboard_comment_target: ${currentTarget}`,
    ...CAMERA_CONTEXT_LINES,
    `camera_observer_count: ${camera.viewer_count ?? 0}`,
    `camera_observer_breakdown: ${JSON.stringify(camera.viewer_breakdown || {})}`,
    `camera_frame_id: ${camera.frame_id || 0}`,
    `camera_visual_frame_id: ${camera.tracked_visual_frame_id || 0}`,
    `camera_last_frame: ${camera.last_frame_at || 0}`,
    `camera_selected_presentation: ${state.cameraVisionVisible ? "full_color_vision_monitor" : "classic_grayscale"}`,
    `camera_caption: ${camera.caption || "none"}`,
    `vision_context: ${JSON.stringify(camera.vision_context || {})}`,
    `camera_thread_assessment: ${state.cameraThread?.currentAssessment || "unknown"}`,
    `camera_thread_change: ${state.cameraThread?.changeOverTime || "unknown"}`,
    `camera_thread_operational_note: ${state.cameraThread?.operationalNote || "unknown"}`,
    `camera_thread_confidence: ${state.cameraThread?.confidence ?? "?"}`,
    "camera_report_vision:",
    ...cameraVisionReport.split("\n").map((line) => `- ${line}`),
    "camera_report_reasoning:",
    ...cameraReasoningReport.split("\n").map((line) => `- ${line}`),
    "camera_report_full:",
    ...cameraFullReport.split("\n").map((line) => `- ${line}`),
    `camera_caption_confidence: ${camera.caption_confidence ?? "none"}`,
    `camera_caption_in_flight: ${Boolean(camera.caption_in_flight)}`,
    `camera_auto_caption_enabled: ${Boolean(camera.auto_caption_enabled)}`,
    `camera_caption_error: ${camera.caption_error || "none"}`,
    `camera_error: ${camera.camera_error || "none"}`,
    `working_memory_summary: ${formatWorkingMemory(workingMemory).replace(/\n/g, " | ")}`,
    `environment_state_summary: ${formatEnvironmentState(environmentState).replace(/\n/g, " | ")}`,
    "working_memory_recent_anomalies:",
    ...formatAnomalies(workingMemory.recent_anomalies || []).split("\n").map((line) => `- ${line}`),
    "recent_frame_history:",
    ...formatRecentFrames(recentFrames).split("\n").map((line) => `- ${line}`),
    `observer_summary: ${observerReport.summary || "none"}`,
    "observer_recommendations:",
    ...((Array.isArray(observerReport.recommendations) ? observerReport.recommendations : ["none"]).map((line) => `- ${line}`)),
    "action_decisions:",
    ...actionDecisionLines.map((line) => `- ${line}`),
    "recent_traces:",
    ...recentTraces.slice(-5).map((trace) => `- ${trace.timestamp || "unknown"} | ${trace.confidence ?? "?"} | ${compactText(trace?.input?.user_text || "", 96)}`),
    `ai_metrics: cycles=${aiMetrics.cycles ?? 0} tokens=${aiMetrics.tokens_used ?? 0} knowledge_hits=${aiMetrics.knowledge_hits ?? 0} low_confidence=${aiMetrics.low_confidence_responses ?? 0}`,
    `metrics_generated_at: ${metrics.generated_at || "unknown"}`,
    `metrics_summary: ${metricSummary.join(" | ")}`,
    sensorReadouts.length ? "sensor_readouts:" : "",
    ...sensorReadouts.map((entry) => `- ${entry.label}: ${compactText(entry.value, 240)}`),
    `dashboard_comment_count: ${commentMessages.length}`,
    "dashboard_comment_thread:",
    ...(commentMessages.length
      ? commentMessages.slice(-40).map((entry) => `- ${entry.created_at || "unknown"} | ${commentSpeakerLabel(entry)} | ${compactText(entry.message, 240)}`)
      : ["- none"]),
    "services:",
    ...services.map((service) => `- ${service.id}: ${service.active}/${service.substate} pid=${service.pid}`),
    `selected_service_console_service: ${selectedService || "none"}`,
    `selected_service_console_mode: ${selectedMode}`,
    "selected_service_console_text:",
    serviceConsoleText || "(console not loaded)",
  ];
  return {
    target: "/dashboard",
    title: document.title || "Local AI Dashboard",
    content_type: "dashboard_ui",
    headings: ["AI Dashboard", "Live Camera", "Sol Chat", "Service Console"],
    suggested_questions: [
      "What does the live camera show?",
      "Which services are healthy right now?",
      "Summarize the current dashboard state.",
    ],
    content: contentLines.join("\n"),
  };
}

async function fetchSiteMetrics() {
  const response = await fetch(`${SITE_METRICS_URL}?ts=${Date.now()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`metrics ${response.status}`);
  }
  state.latestMetrics = await response.json();
  updateChatContextNote();
  populateDashboardContextCard();
  syncDebugPanel();
  return state.latestMetrics;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("camera_blob_read_failed"));
    reader.readAsDataURL(blob);
  });
}

async function fetchCameraAttachment() {
  const response = await fetch(`/api/dashboard/camera.png?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`camera_snapshot_${response.status}`);
  }
  const blob = await response.blob();
  return {
    name: "live-camera.png",
    mimeType: blob.type || "image/png",
    dataUrl: await blobToDataUrl(blob),
  };
}

async function loadDashboardComments() {
  const response = await fetch(`${DASHBOARD_COMMENTS_URL}?limit=80&ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`comments ${response.status}`);
  }
  const payload = await response.json();
  renderCommentFeed(payload.messages || []);
  updateChatContextNote();
  return payload.messages || [];
}

async function postCameraControl(path, body = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `camera_control_${response.status}`);
  }
  if (payload.camera) {
    state.latestStatus = state.latestStatus || {};
    state.latestStatus.camera = payload.camera;
    updateCameraCaption(payload.camera);
    updateCameraControls(payload.camera);
    updateChatContextNote();
  }
  return payload;
}

async function resetChatSession() {
  if (state.accessDenied) {
    throw new Error("dashboard_access_disabled");
  }
  const response = await fetch(CHAT_RESET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ session: state.chatSession }),
  });
  if (!response.ok) {
    let detail = `reset ${response.status}`;
    try {
      const payload = await response.json();
      detail = payload.error || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  setStatus("Dashboard AI memory reset. Shared viewer comments remain visible.");
}

async function sendChatMessage(rawMessage) {
  if (state.accessDenied) {
    setStatus("Dashboard access is disabled for this connection.");
    return;
  }
  const target = chatTargetEl.value || "ai";
  const includeCamera = target === "ai" && chatIncludeCameraEl.checked;
  const handle = String(chatNameEl.value || "").trim();
  const message = rawMessage.trim();
  if (!message || state.chatInflight) {
    return;
  }
  if (!handle) {
    setStatus("Choose a handle before posting.");
    chatNameEl.focus();
    return;
  }

  setChatComposerDisabled(true);
  updateChatContextNote();

  setChatHandle(handle);
  const requestProfile = includeCamera ? "vision_fast" : "reasoning";
  const pageContext = buildDashboardPageContext();
  let attachments = [];
  if (includeCamera) {
    try {
      attachments = [await fetchCameraAttachment()];
    } catch (error) {
      setStatus(`Camera attachment unavailable: ${error.message}. Sending text-only dashboard context.`);
    }
  }
  chatInputEl.value = "";
  state.lastPageContext = pageContext;
  state.lastChatRequest = {
    message,
    target,
    session: state.chatSession,
    stream: false,
    profile: requestProfile,
    include_camera: includeCamera,
    image_count: attachments.length,
    visible_comment_count: Array.isArray(state.commentMessages) ? state.commentMessages.length : 0,
  };
  syncDebugPanel();

  try {
    if (target === "viewers") {
      setStatus("Posting viewer comment...");
      const response = await fetch(DASHBOARD_COMMENTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: handle,
          message,
          target: "viewers",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `viewer_comment_${response.status}`);
      }
      await loadDashboardComments();
      setStatus("Viewer comment posted.");
      return;
    }

    setStatus("Waiting for AI reply...");
    const response = await fetch(DASHBOARD_COMMENT_ASK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: handle,
        message,
        session: state.chatSession,
        profile: requestProfile,
        page_context: pageContext,
        images: attachments.map((image) => ({
          name: image.name,
          mime_type: image.mimeType,
          data_url: image.dataUrl,
        })),
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      if (payload.user_message) {
        await loadDashboardComments().catch(() => {});
      }
      throw new Error(payload.error || `ai_comment_${response.status}`);
    }
    state.lastChatDebug = payload.chat || payload;
    syncDebugPanel();
    await loadDashboardComments();
    const spokenReply = String(payload.chat?.message || payload.assistant_message?.message || "").trim();
    if (spokenReply) {
      state.lastAssistantReply = spokenReply;
      void playSpeechSequence(spokenReply).catch(() => {});
    }
    setStatus("AI reply posted to the shared dashboard thread.");
  } catch (error) {
    setStatus(`Dashboard chat failed: ${error.message}`);
  } finally {
    setChatComposerDisabled(false);
    updateChatContextNote();
  }
}

async function fetchStatus() {
  if (statusFetchPromise) {
    return statusFetchPromise;
  }
  statusFetchPromise = (async () => {
    refreshStateEl.textContent = "refreshing";
    const response = await fetch("/api/dashboard/status", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    const data = await response.json();
    state.latestStatus = data;
    dashboardUrlEl.textContent = data.site_dashboard_url || window.location.href;
    renderChatHealth(data);
    updateCameraCaption(data.camera);
    updateCameraControls(data.camera);
    updateChatContextNote();
    populateDashboardContextCard();
    renderCognitivePanel();
    const needsConsoleRefresh = ensureServiceOptions(data.services || []);
    refreshStateEl.textContent = "live";
    if (needsConsoleRefresh || !state.serviceConsoleLoaded) {
      await refreshServiceConsole();
    }
    syncDebugPanel();
    return data;
  })();
  try {
    return await statusFetchPromise;
  } finally {
    statusFetchPromise = null;
  }
}

async function fetchAccessStatus() {
  const response = await fetch(ACCESS_STATUS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`access ${response.status}`);
  }
  const payload = await response.json();
  renderAccessState(payload);
  return payload;
}

function renderAccessDisabledState() {
  refreshStateEl.textContent = "restricted";
  cameraImageEl.removeAttribute("src");
  cameraCaptionEl.textContent = "Public dashboard access is currently disabled.";
  setCameraOverlayVisible(true);
  if (cameraProgressEl) {
    cameraProgressEl.hidden = true;
  }
  if (cameraThreadEl) {
    cameraThreadEl.textContent = [
      "=== REASONING ===",
      "Current Assessment: Camera thread unavailable.",
      "Change Over Time: Public dashboard access is currently disabled.",
      "Operational Note: Live camera reasoning resumes when dashboard access is enabled.",
    ].join("\n");
  }
  cameraDescribeNowEl.disabled = true;
  cameraAutoToggleEl.disabled = true;
  if (cameraVisionToggleEl) {
    cameraVisionToggleEl.disabled = true;
  }
  if (cameraClassicToggleEl) {
    cameraClassicToggleEl.disabled = true;
  }
  if (cameraViewerCountEl) {
    cameraViewerCountEl.textContent = "0 observers";
  }
  if (cameraObserverDetailEl) {
    cameraObserverDetailEl.textContent = "Observer telemetry unavailable";
  }
  cameraCacheStateEl.textContent = "Caption cache unavailable";
  chatHealthEl.innerHTML = `
    <strong>Dashboard access disabled</strong>
    <span>The local daemon has not enabled public dashboard access for this connection.</span>
    <span>Use the local machine or LAN, or enable public access from the access daemon.</span>
  `;
  chatContextNoteEl.textContent = "Live dashboard context is unavailable until access is enabled.";
  renderEmptyChat();
  serviceConsoleEl.textContent = "Public dashboard access is disabled.";
  setChatComposerDisabled(true);
}

async function triggerAction(actionId) {
  setStatus(`Launching ${actionId}...`);
  const response = await fetch(`/api/dashboard/action/${actionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `action ${response.status}`);
  }
  setStatus(`${payload.label} launched.`);
}

document.getElementById("refresh-camera")?.addEventListener("click", () => {
  if (state.accessDenied) {
    setStatus("Dashboard access is disabled for this connection.");
    return;
  }
  refreshCameraImage();
  setStatus("Reconnecting camera stream...");
});

cameraOverlayEl?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  hideCameraOverlay();
});

cameraOverlayEl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    hideCameraOverlay();
  }
});

cameraImageEl?.addEventListener("click", () => {
  showCameraOverlay();
});

cameraOverlayToggleEl?.addEventListener("click", () => {
  toggleCameraOverlay();
});

cameraFitToggleEl?.addEventListener("click", () => {
  setCameraFitMode(state.cameraFitMode === "fill" ? "fit" : "fill");
});

cameraVisionToggleEl?.addEventListener("click", () => {
  setCameraVisionVisible(true);
  setStatus("Full-color Vision Monitor stream active with the public censor floor.");
});

cameraClassicToggleEl?.addEventListener("click", () => {
  setCameraVisionVisible(false);
  setStatus("Classic grayscale stream active.");
});

cameraFullscreenEl?.addEventListener("click", async () => {
  try {
    await requestCameraFullscreen();
    setStatus("Camera frame entered fullscreen.");
  } catch (error) {
    setStatus(`Fullscreen failed: ${error.message}`);
  }
});

document.querySelectorAll(".action").forEach((button) => {
  button.addEventListener("click", async () => {
    const actionId = button.dataset.action;
    if (!actionId) return;
    if (button.dataset.localOnly === "true" && !state.access?.local_client) {
      setStatus("That control is available only from the local machine or LAN.");
      return;
    }
    try {
      await triggerAction(actionId);
    } catch (error) {
      setStatus(`Action failed: ${error.message}`);
    }
  });
});

cameraImageEl.addEventListener("load", () => {
  setStatus("Camera stream refreshed.");
});

cameraImageEl.addEventListener("error", () => {
  cameraCaptionEl.textContent = "Camera stream unavailable.";
  setStatus("Camera stream unavailable.");
});

cameraDescribeNowEl?.addEventListener("click", async () => {
  if (state.accessDenied) {
    setStatus("Dashboard access is disabled for this connection.");
    return;
  }
  cameraDescribeNowEl.disabled = true;
  try {
    await postCameraControl("/api/dashboard/camera/describe");
    setStatus("Describing current frame.");
  } catch (error) {
    setStatus(`Describe failed: ${error.message}`);
  } finally {
    if (state.latestStatus?.camera) {
      updateCameraControls(state.latestStatus.camera);
    }
  }
});

cameraAutoToggleEl?.addEventListener("click", async () => {
  if (state.accessDenied) {
    setStatus("Dashboard access is disabled for this connection.");
    return;
  }
  const current = Boolean(state.latestStatus?.camera?.auto_caption_enabled);
  cameraAutoToggleEl.disabled = true;
  try {
    await postCameraControl("/api/dashboard/camera/auto", { enabled: !current });
    setStatus(!current ? "Auto descriptions enabled." : "Auto descriptions stopped.");
  } catch (error) {
    setStatus(`Auto description toggle failed: ${error.message}`);
  } finally {
    if (state.latestStatus?.camera) {
      updateCameraControls(state.latestStatus.camera);
    }
  }
});

serviceRefreshEl?.addEventListener("click", async () => {
  if (state.accessDenied) {
    setStatus("Dashboard access is disabled for this connection.");
    return;
  }
  try {
    await refreshServiceConsole();
    setStatus("Service console refreshed.");
  } catch (error) {
    setStatus(`Service console failed: ${error.message}`);
  }
});

serviceModeEl?.addEventListener("change", () => {
  if (state.accessDenied) return;
  refreshServiceConsole().catch((error) => setStatus(`Service console failed: ${error.message}`));
});

serviceSelectEl?.addEventListener("change", () => {
  if (state.accessDenied) return;
  refreshServiceConsole().catch((error) => setStatus(`Service console failed: ${error.message}`));
});

serviceRestartEl?.addEventListener("click", async () => {
  if (!state.access?.local_client) {
    setStatus("Service restarts stay local-only.");
    return;
  }
  try {
    await restartSelectedService();
  } catch (error) {
    setStatus(`Restart failed: ${error.message}`);
  }
});

chatIncludeCameraEl?.addEventListener("change", () => {
  updateChatContextNote();
});

chatNameEl?.addEventListener("change", () => {
  setChatHandle(chatNameEl.value);
});

chatTargetEl?.addEventListener("change", () => {
  syncChatTargetControls();
  updateChatContextNote();
});

chatResetEl?.addEventListener("click", async () => {
  if (state.accessDenied) {
    setStatus("Dashboard access is disabled for this connection.");
    return;
  }
  try {
    await resetChatSession();
  } catch (error) {
    setStatus(`Chat reset failed: ${error.message}`);
  }
});

chatDebugToggleEl?.addEventListener("click", () => {
  setChatDebug(!state.chatDebug);
});

chatVoiceToggleEl?.addEventListener("click", () => {
  state.voiceEnabled = !state.voiceEnabled;
  localStorage.setItem(DASHBOARD_VOICE_KEY, state.voiceEnabled ? "on" : "off");
  if (!state.voiceEnabled) {
    stopSpeech();
  }
  updateVoiceUi();
});

chatStopAudioEl?.addEventListener("click", () => {
  stopSpeech();
});

chatComposerEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.accessDenied) {
    setStatus("Dashboard access is disabled for this connection.");
    return;
  }
  await sendChatMessage(chatInputEl.value);
});

chatInputEl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatComposerEl?.requestSubmit();
  }
});

async function init() {
  state.chatSession = getChatSessionId();
  if (chatNameEl) {
    chatNameEl.value = getChatHandle();
  }
  chatSessionLabelEl.textContent = `AI memory ${state.chatSession.slice(0, 8)}`;
  renderEmptyChat();
  setCameraOverlayVisible(state.cameraOverlayVisible);
  setCameraFitMode(state.cameraFitMode);
  setCameraVisionVisible(state.cameraVisionVisible, { reconnect: false });
  updateCameraControls({
    auto_caption_enabled: false,
    caption_in_flight: false,
    viewer_count: 0,
    viewer_breakdown: { human: 0, crawler: 0, unknown: 0, lingering: 0 },
  });
  updateLocalOnlyControls();
  syncChatTargetControls();
  setChatDebug(state.chatDebug);
  initVoicePresence();
  updateVoiceUi();
  try {
    await fetchAccessStatus();
  } catch (error) {
    refreshStateEl.textContent = "degraded";
    setStatus(`Access check failed: ${error.message}`);
    setAccessBanner("Dashboard access check failed.", "The access-control daemon did not answer. Live data is being left offline.");
    renderAccessDisabledState();
    window.setInterval(async () => {
      try {
        await fetchAccessStatus();
        if (!state.accessDenied) {
          window.location.reload();
        }
      } catch {
        // ignore
      }
    }, 15000);
    return;
  }
  if (state.accessDenied) {
    renderAccessDisabledState();
    window.setInterval(async () => {
      try {
        await fetchAccessStatus();
        if (!state.accessDenied) {
          window.location.reload();
        }
      } catch {
        // ignore
      }
    }, 15000);
    return;
  }
  refreshCameraImage();
  try {
    await fetchStatus();
  } catch (error) {
    refreshStateEl.textContent = "degraded";
    setStatus(`Dashboard refresh failed: ${error.message}`);
  }
  try {
    await fetchSiteMetrics();
  } catch (error) {
    setStatus(`Metrics refresh failed: ${error.message}`);
  }
  try {
    await loadDashboardComments();
  } catch (error) {
    setStatus(`Comment feed failed: ${error.message}`);
  }
  cameraProgressTimer = window.setInterval(() => {
    renderCameraProgress(state.latestStatus?.camera || {});
  }, 250);
  window.setInterval(() => {
    fetchAccessStatus()
      .then(() => {
        if (state.accessDenied) {
          renderAccessDisabledState();
        }
      })
      .catch(() => {});
    if (state.accessDenied) {
      refreshStateEl.textContent = "restricted";
      return;
    }
    fetchStatus().catch((error) => {
      refreshStateEl.textContent = "degraded";
      setStatus(`Dashboard refresh failed: ${error.message}`);
    });
    fetchSiteMetrics().catch(() => {});
  }, 15000);
  window.setInterval(() => {
    if (state.accessDenied) return;
    loadDashboardComments().catch(() => {});
  }, 5000);
  window.setInterval(() => {
    if (state.accessDenied) return;
    refreshServiceConsole().catch(() => {});
  }, 15000);
}

void init();
