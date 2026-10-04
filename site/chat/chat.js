const SESSION_KEY = "sol_session";
const VOICE_KEY = "sol_chat_voice";
const HEALTH_URL = "/api/chat/health";
const HISTORY_URL = "/api/chat/history";
const CHAT_URL = "/api/chat";
const QUERY_URL = "/api/chat/query";
const RESET_URL = "/api/chat/reset";
const DELETE_URL = "/api/chat/delete";
const SPEAK_URL = "/api/chat/speak";
const KNOWLEDGE_URL = "/api/knowledge/query";
const KNOWLEDGE_HEALTH_URL = "/api/knowledge/health";
const SITE_METRICS_URL = "/site-metrics.json";
const DASHBOARD_STATUS_URL = "/api/dashboard/status";
const DASHBOARD_CAMERA_SNAPSHOT_URL = "/api/dashboard/camera.png";
const DASHBOARD_CAMERA_STREAM_URL = "/api/dashboard/camera.mjpg";
const DASHBOARD_CAMERA_DESCRIBE_URL = "/api/dashboard/camera/describe";
const DASHBOARD_CAMERA_AUTO_URL = "/api/dashboard/camera/auto";
const DASHBOARD_SERVICE_CONSOLE_URL = "/api/dashboard/services/console";

const state = {
  session: "",
  inflight: false,
  debug: false,
  userScrolledUp: false,
  attachments: [],
  cameraIncluded: false,
  voiceEnabled: localStorage.getItem(VOICE_KEY) === "on",
  pendingSpeechUrl: "",
  pendingSpeechText: "",
  pendingSpeechPromise: null,
  speechQueue: [],
  speechQueueIndex: 0,
  speechQueueOpen: false,
  speechPlaybackPending: false,
  speechSequenceToken: 0,
  streamSpeechCursor: 0,
  prefetchedSpeechText: "",
  prefetchedSpeechUrl: "",
  prefetchedSpeechObjectUrl: "",
  prefetchedSpeechPromise: null,
  lastTransport: "idle",
  lastGrounded: null,
  lastChatLatencyMs: null,
  lastHistoryLatencyMs: null,
  lastHealthLatencyMs: null,
  lastResetLatencyMs: null,
  lastMetricsLatencyMs: null,
  lastMetricsRefreshAt: null,
  lastMetricsStatus: "pending",
  lastRuntimeLatencyMs: null,
  lastRuntimeStatus: "pending",
  backendProfile: "pending",
  backendModelId: "",
  backendStackSummary: "pending",
  selectedProfile: "",
  availableProfiles: [],
  persistHistory: true,
  streamResponses: true,
  allowActions: false,
  lightweightMode: false,
  contextMode: "auto",
  contextIncludeTelemetry: true,
  contextIncludeRuntime: true,
  contextIncludeTranscript: true,
  contextIncludeCamera: true,
  knowledgeHealth: null,
  lastError: "",
  dashboardStatus: null,
  dashboardServiceConsole: "Loading runtime console...",
  runtimeService: "",
  runtimeMode: "status",
  lastPageContext: null,
  lastChatDebug: null,
  lastChatRequest: null,
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

const elements = {
  composer: document.getElementById("composer"),
  input: document.getElementById("message-input"),
  imageInput: document.getElementById("image-input"),
  attachButton: document.getElementById("attach-button"),
  attachmentTray: document.getElementById("attachment-tray"),
  includeCameraToggle: document.getElementById("include-camera-toggle"),
  historyRefreshButton: document.getElementById("history-refresh"),
  messages: document.getElementById("messages"),
  sendButton: document.getElementById("send-button"),
  resetButton: document.getElementById("reset-button"),
  copyButton: document.getElementById("copy-button"),
  voiceToggle: document.getElementById("voice-toggle"),
  speakButton: document.getElementById("speak-button"),
  stopAudioButton: document.getElementById("stop-audio-button"),
  debugToggle: document.getElementById("debug-toggle"),
  sessionLabel: document.getElementById("session-label"),
  voiceStatus: document.getElementById("voice-status"),
  statusPill: document.getElementById("status-pill"),
  errorBanner: document.getElementById("error-banner"),
  stackSummary: document.getElementById("stack-summary"),
  stackGrid: document.getElementById("stack-grid"),
  controlSummary: document.getElementById("control-summary"),
  profileSelect: document.getElementById("profile-select"),
  persistToggle: document.getElementById("persist-toggle"),
  streamToggle: document.getElementById("stream-toggle"),
  allowActionsToggle: document.getElementById("allow-actions-toggle"),
  lightweightToggle: document.getElementById("lightweight-toggle"),
  contextModeSelect: document.getElementById("context-mode-select"),
  contextTelemetryToggle: document.getElementById("context-telemetry-toggle"),
  contextRuntimeToggle: document.getElementById("context-runtime-toggle"),
  contextTranscriptToggle: document.getElementById("context-transcript-toggle"),
  contextCameraToggle: document.getElementById("context-camera-toggle"),
  rawContextInput: document.getElementById("raw-context-input"),
  metricExternalHits: document.getElementById("metric-external-hits"),
  metricHitsToday: document.getElementById("metric-hits-today"),
  metricUniqueIps: document.getElementById("metric-unique-ips"),
  metricTopPath: document.getElementById("metric-top-path"),
  metricClient: document.getElementById("metric-client"),
  metricReadouts: document.getElementById("metric-readouts"),
  metricRequests: document.getElementById("metric-requests"),
  metricsDetails: document.getElementById("metrics-details"),
  metricsSummary: document.getElementById("metrics-summary"),
  runtimeRefresh: document.getElementById("runtime-refresh"),
  runtimeRestart: document.getElementById("runtime-restart"),
  runtimeServiceSelect: document.getElementById("runtime-service-select"),
  runtimeModeSelect: document.getElementById("runtime-mode-select"),
  runtimeConsole: document.getElementById("runtime-console"),
  actionLaunchers: document.getElementById("action-launchers"),
  cameraImage: document.getElementById("camera-image"),
  cameraOverlayText: document.getElementById("camera-overlay-text"),
  cameraConfidence: document.getElementById("camera-confidence"),
  cameraCache: document.getElementById("camera-cache"),
  cameraProgress: document.getElementById("camera-progress"),
  cameraProgressLabel: document.getElementById("camera-progress-label"),
  cameraProgressAge: document.getElementById("camera-progress-age"),
  cameraProgressTrack: document.getElementById("camera-progress-track"),
  cameraProgressBar: document.getElementById("camera-progress-bar"),
  cameraCaption: document.getElementById("camera-caption"),
  cameraThread: document.getElementById("camera-thread"),
  cognitiveMemory: document.getElementById("cognitive-memory"),
  cognitiveEnvironment: document.getElementById("cognitive-environment"),
  cognitiveAnomalies: document.getElementById("cognitive-anomalies"),
  cognitiveObserver: document.getElementById("cognitive-observer"),
  cognitiveFrames: document.getElementById("cognitive-frames"),
  cognitiveMetrics: document.getElementById("cognitive-metrics"),
  cameraRefresh: document.getElementById("camera-refresh"),
  cameraDescribe: document.getElementById("camera-describe"),
  cameraAuto: document.getElementById("camera-auto"),
  queryForm: document.getElementById("query-form"),
  queryInput: document.getElementById("query-input"),
  queryPersist: document.getElementById("query-persist"),
  queryOutput: document.getElementById("query-output"),
  knowledgeForm: document.getElementById("knowledge-form"),
  knowledgeInput: document.getElementById("knowledge-input"),
  knowledgeTopK: document.getElementById("knowledge-top-k"),
  knowledgeResults: document.getElementById("knowledge-results"),
  knowledgeHealthPill: document.getElementById("knowledge-health-pill"),
  knowledgeHealthMeta: document.getElementById("knowledge-health-meta"),
  chatDebugPanel: document.getElementById("chat-debug-panel"),
  debugContext: document.getElementById("debug-context"),
  debugRetrieval: document.getElementById("debug-retrieval"),
  debugResponse: document.getElementById("debug-response"),
  template: document.getElementById("message-template"),
  presenceCard: document.getElementById("presence-card"),
  presenceFigure: document.getElementById("presence-figure"),
  presenceMode: document.getElementById("presence-mode"),
  presenceSession: document.getElementById("presence-session"),
  presenceAudio: document.getElementById("presence-audio"),
  presenceOrb: document.getElementById("presence-orb"),
};

const presenceStatusText = {
  idle: "Idle on network",
  loading: "Recovering session",
  connecting: "Opening channel",
  working: "Working through context",
  streaming: "Streaming reply",
  speaking: "Speaking through orb",
  grounded: "Grounded reply ready",
  complete: "Reply ready",
  copied: "Transcript copied",
  resetting: "Resetting session",
  error: "Backend fault",
};

let presenceVisualizer = null;
let metricsRefreshTimer = null;
let cameraProgressTimer = null;
let cameraFollowupTimer = null;

function generateSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `sol-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId() {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }
  const created = generateSessionId();
  localStorage.setItem(SESSION_KEY, created);
  return created;
}

function setStatus(text) {
  elements.statusPill.textContent = text;
  if (elements.presenceCard) {
    elements.presenceCard.dataset.state = text;
  }
  if (elements.presenceMode) {
    elements.presenceMode.textContent = presenceStatusText[text] || text;
  }
}

function preferredProfile({ hasImages = false } = {}) {
  const fallback = hasImages ? "vision" : (state.backendProfile || "reasoning");
  const selected = String(state.selectedProfile || "").trim();
  if (!selected) {
    return fallback;
  }
  if (hasImages) {
    if (selected === "vision" || selected === "vision_fast") {
      return selected;
    }
    return "vision";
  }
  return selected;
}

function updateControlSummary() {
  if (!elements.controlSummary) {
    return;
  }
  const contextLabel = state.contextMode === "auto"
    ? "context auto"
    : state.contextMode === "minimal"
      ? "context minimal"
      : state.contextMode === "raw"
        ? "context raw"
        : "context off";
  const bits = [
    preferredProfile(),
    state.streamResponses ? "stream on" : "stream off",
    state.persistHistory ? "persist on" : "persist off",
    contextLabel,
  ];
  if (state.allowActions) {
    bits.push("actions on");
  }
  if (state.lightweightMode) {
    bits.push("lightweight on");
  }
  elements.controlSummary.textContent = bits.join(" · ");
}

function syncControlStateFromUi() {
  state.selectedProfile = String(elements.profileSelect?.value || state.selectedProfile || "");
  state.persistHistory = Boolean(elements.persistToggle?.checked);
  state.streamResponses = Boolean(elements.streamToggle?.checked);
  state.allowActions = Boolean(elements.allowActionsToggle?.checked);
  state.lightweightMode = Boolean(elements.lightweightToggle?.checked);
  state.contextMode = String(elements.contextModeSelect?.value || state.contextMode || "auto");
  state.contextIncludeTelemetry = Boolean(elements.contextTelemetryToggle?.checked);
  state.contextIncludeRuntime = Boolean(elements.contextRuntimeToggle?.checked);
  state.contextIncludeTranscript = Boolean(elements.contextTranscriptToggle?.checked);
  state.contextIncludeCamera = Boolean(elements.contextCameraToggle?.checked);
  if (elements.rawContextInput) {
    elements.rawContextInput.disabled = state.contextMode !== "raw";
  }
  updateControlSummary();
  renderClientDiagnostics();
  syncDebugPanel();
}

function showError(message) {
  elements.errorBanner.hidden = !message;
  elements.errorBanner.textContent = message || "";
  state.lastError = message || "";
  renderClientDiagnostics();
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
    globalThis.clearTimeout?.(cameraFollowupTimer);
  }
  cameraFollowupTimer = globalThis.setTimeout?.(() => {
    void refreshRuntimeContext().catch(() => {});
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
        ? `No material change across the last ${stableCount + 1} updates.`
        : "No material change since the previous update.";
    } else {
      changeOverTime = `Scene changed relative to the previous update. Prior assessment: ${previous.currentAssessment || "unknown"}`;
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
  const summary = String(camera.caption || "").trim() || "Waiting for camera caption...";
  const layout = camera.caption_cached
    ? "Based on the shared dashboard caption from cached scene match."
    : `Based on the ${camera.caption_source || "live"} scene read.`;
  const anomalies = camera.caption_error
    ? `Caption error: ${camera.caption_error}`
    : camera.camera_error
      ? `Camera error: ${camera.camera_error}`
      : "None beyond low-resolution grayscale limitations noted by the shared camera path.";
  return [
    "=== VISION ===",
    `Summary: ${summary}`,
    "Objects: Only coarse objects are reliable at this resolution; fine object identity remains uncertain.",
    `Layout: ${layout}`,
    "Text: No clearly reliable text extracted in this pass.",
    "Lighting: Lighting is uncertain from the grayscale shared-caption path.",
    `Anomalies: ${anomalies}`,
    `Confidence: ${camera.caption_confidence ?? "?"}%`,
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
  const thread = updateCameraThreadState(camera);
  return `${buildVisionBlock(camera)}\n\n${buildReasoningBlock(thread)}`.trim();
}

function renderCameraProgress(camera = {}) {
  if (!elements.cameraProgress || !elements.cameraProgressBar || !elements.cameraProgressTrack) {
    return;
  }
  const active = Boolean(camera.caption_in_flight);
  elements.cameraProgress.hidden = !active;
  if (!active) {
    elements.cameraProgressTrack.setAttribute("aria-valuenow", "0");
    elements.cameraProgressBar.style.width = "0%";
    return;
  }
  const elapsedMs = Math.max(0, Date.now() - (Number(camera.caption_started_at || 0) * 1000));
  const progress = Math.min(96, 12 + ((elapsedMs / 12000) * 84));
  if (elements.cameraProgressLabel) {
    elements.cameraProgressLabel.textContent = camera.caption
      ? "Refreshing scene description..."
      : "Generating scene description...";
  }
  if (elements.cameraProgressAge) {
    elements.cameraProgressAge.textContent = formatCameraElapsed(camera.caption_started_at);
  }
  elements.cameraProgressTrack.setAttribute("aria-valuenow", String(Math.round(progress)));
  elements.cameraProgressBar.style.width = `${progress}%`;
}

function renderCameraThread(camera = {}) {
  if (!elements.cameraThread) {
    return;
  }
  const thread = updateCameraThreadState(camera);
  elements.cameraThread.textContent = buildReasoningBlock(thread);
}

function updateVoiceUi() {
  if (elements.voiceToggle) {
    elements.voiceToggle.textContent = state.voiceEnabled ? "Voice on" : "Voice off";
    elements.voiceToggle.setAttribute("aria-pressed", String(state.voiceEnabled));
  }
  if (elements.voiceStatus) {
    elements.voiceStatus.textContent = state.voiceEnabled ? "voice armed" : "voice muted";
  }
}

function nearBottom() {
  const remaining = elements.messages.scrollHeight - elements.messages.scrollTop - elements.messages.clientHeight;
  return remaining < 72;
}

function maybeScroll(force = false) {
  if (force || !state.userScrolledUp) {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function compactText(value, maxChars = 2400) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 3)}...`;
}

function parseGatewayStyleError(text, fallbackPrefix = "Request failed") {
  const compact = compactText(text, 200);
  return compact || fallbackPrefix;
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
  return anomalies.slice(0, 5).map((item, index) => (
    `${index + 1}. ${(item?.type || "anomaly")} [${item?.severity || "unknown"}] ${item?.description || ""}`
  )).join("\n");
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

function renderCognitiveSummary() {
  const cognitive = state.dashboardStatus?.cognitive || {};
  const workingMemory = cognitive.working_memory || {};
  const observerReport = cognitive.observer_report || {};
  const aiMetrics = cognitive.ai_metrics || {};
  const environmentState = cognitive.environment_state || {};
  const recentFrames = Array.isArray(environmentState.recent_frames)
    ? environmentState.recent_frames
    : (Array.isArray(observerReport.recent_frame_history) ? observerReport.recent_frame_history : []);
  if (elements.cognitiveMemory) {
    elements.cognitiveMemory.textContent = formatWorkingMemory(workingMemory);
  }
  if (elements.cognitiveEnvironment) {
    elements.cognitiveEnvironment.textContent = formatEnvironmentState(environmentState);
  }
  if (elements.cognitiveAnomalies) {
    elements.cognitiveAnomalies.textContent = formatAnomalies(workingMemory.recent_anomalies || observerReport.active_anomalies || []);
  }
  if (elements.cognitiveObserver) {
    elements.cognitiveObserver.textContent = formatObserverReport(observerReport);
  }
  if (elements.cognitiveFrames) {
    elements.cognitiveFrames.textContent = formatRecentFrames(recentFrames);
  }
  if (elements.cognitiveMetrics) {
    elements.cognitiveMetrics.textContent = formatAiMetrics(aiMetrics);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(parseGatewayStyleError(text, `invalid_json_response:${response.status}`));
    }
  }
  if (!response.ok) {
    throw new Error(payload.error || payload.detail || `http_${response.status}`);
  }
  return payload;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("file_read_failed"));
    reader.readAsDataURL(blob);
  });
}

async function fetchCameraAttachment() {
  const response = await fetch(DASHBOARD_CAMERA_SNAPSHOT_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`camera_snapshot_${response.status}`);
  }
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return {
    name: "live-camera.png",
    mimeType: blob.type || "image/png",
    dataUrl,
    previewUrl: dataUrl,
    bytes: blob.size || 0,
  };
}

function buildRetrievalDebugText(retrieval, payload = null) {
  if (!retrieval) {
    return "No retrieval metadata yet.";
  }
  const hits = Array.isArray(retrieval.hits) ? retrieval.hits : [];
  const lines = [];
  lines.push(`used: ${Boolean(retrieval.used)}`);
  lines.push(`query: ${retrieval.query || "none"}`);
  if ((payload?.page_context_applied ?? retrieval.page_context_applied) !== undefined) {
    lines.push(`page_context_applied: ${Boolean(payload?.page_context_applied ?? retrieval.page_context_applied)}`);
  }
  if ((payload?.grounded ?? retrieval.grounded) !== undefined) {
    lines.push(`grounded: ${Boolean(payload?.grounded ?? retrieval.grounded)}`);
  }
  if ((payload?.fallback_grounding_used ?? retrieval.fallback_grounding_used) !== undefined) {
    lines.push(`fallback_grounding_used: ${Boolean(payload?.fallback_grounding_used ?? retrieval.fallback_grounding_used)}`);
  }
  lines.push(`backend_profile: ${payload?.backend_profile || retrieval.backend_profile || "unknown"}`);
  lines.push(`backend_model_id: ${payload?.backend_model_id || retrieval.backend_model_id || "unknown"}`);
  if (retrieval.grounding_mode) {
    lines.push(`grounding_mode: ${retrieval.grounding_mode}`);
  }
  if (retrieval.warning) {
    lines.push(`warning: ${retrieval.warning}`);
  }
  hits.forEach((hit, index) => {
    lines.push("");
    lines.push(`hit ${index + 1}`);
    lines.push(`score: ${Number(hit.score || 0).toFixed(4)}`);
    lines.push(`doc: ${hit.doc_key || hit.path || "unknown"}`);
    if (hit.title) {
      lines.push(`title: ${hit.title}`);
    }
    lines.push(`snippet: ${hit.text || ""}`);
  });
  if (!hits.length) {
    lines.push("", "hits: none");
  }
  return lines.join("\n");
}

async function deleteHistoryMessage(messageIndex) {
  if (!Number.isInteger(messageIndex) || messageIndex <= 0 || state.inflight) {
    return;
  }
  showError("");
  setStatus("working");
  try {
    const response = await fetch(DELETE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ session: state.session, persist: true, index: messageIndex }),
    });
    if (!response.ok) {
      let detail = `delete ${response.status}`;
      try {
        const payload = await response.json();
        detail = payload.error || detail;
      } catch {
        detail = parseGatewayStyleError(await response.text(), detail);
      }
      throw new Error(detail);
    }
    const payload = await response.json();
    elements.messages.textContent = "";
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const assistantDebug = Array.isArray(payload.assistant_debug) ? payload.assistant_debug : [];
    let assistantDebugIndex = 0;
    const visible = messages.filter((message) => message.role !== "system");
    if (!visible.length) {
      createMessage("assistant", "Sol is online. Text turns use the local reasoning lane; image turns route to the local vision lane. Factual text answers will ground themselves in retrieved archive context when they can.");
    } else {
      visible.forEach((message) => {
        const retrieval = message.role === "assistant" ? (assistantDebug[assistantDebugIndex++] || null) : null;
        const created = createMessage(message.role, message.content, {
          retrieval,
          messageIndex: Number.isInteger(message.index) ? message.index : null,
        });
        if (message.role === "assistant") {
          created.node._retrieval = retrieval;
        }
      });
    }
    setStatus("complete");
  } catch (error) {
    console.error(error);
    showError(error.message || "Delete failed.");
    setStatus("error");
  } finally {
    maybeScroll(true);
    renderClientDiagnostics();
  }
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
    void deleteFn(messageIndex);
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

function createMessage(role, content, { pending = false, retrieval = null, timestamp = null, images = [], messageIndex = null } = {}) {
  const fragment = elements.template.content.cloneNode(true);
  const node = fragment.querySelector(".message");
  const body = fragment.querySelector(".message-body");
  const roleNode = fragment.querySelector(".message-role");
  const timeNode = fragment.querySelector(".message-time");
  const metaNode = fragment.querySelector(".message-meta");
  const debugNode = fragment.querySelector(".message-debug");
  const debugBody = fragment.querySelector(".message-debug-body");

  node.classList.add(role);
  if (pending) {
    node.classList.add("pending");
  }
  roleNode.textContent = role;
  timeNode.textContent = timestamp || formatTime();
  body.textContent = content || "";
  if (Number.isInteger(messageIndex) && messageIndex > 0) {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost message-delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      void deleteHistoryMessage(messageIndex);
    });
    metaNode.append(deleteButton);
    bindMessageDeleteGesture(node, () => messageIndex, deleteHistoryMessage);
  }
  if (Array.isArray(images) && images.length) {
    const media = document.createElement("div");
    media.className = "message-media";
    images.forEach((image, index) => {
      const figure = document.createElement("figure");
      figure.className = "message-image";
      const img = document.createElement("img");
      img.src = image.previewUrl || image.dataUrl || "";
      img.alt = image.name || `attachment ${index + 1}`;
      const caption = document.createElement("figcaption");
      caption.textContent = image.name || `image ${index + 1}`;
      figure.append(img, caption);
      media.appendChild(figure);
    });
    body.after(media);
  }
  applyRetrievalDebug(debugNode, debugBody, retrieval, { role, pending });
  elements.messages.appendChild(fragment);
  maybeScroll(true);
  return {
    node: elements.messages.lastElementChild,
    body: elements.messages.lastElementChild.querySelector(".message-body"),
    debugNode: elements.messages.lastElementChild.querySelector(".message-debug"),
    debugBody: elements.messages.lastElementChild.querySelector(".message-debug-body"),
  };
}

function applyRetrievalDebug(debugNode, debugBody, retrieval, options = {}) {
  if (!debugNode || !debugBody) {
    return;
  }
  const role = options.role || "";
  const pending = Boolean(options.pending);
  if (!state.debug) {
    debugNode.hidden = true;
    debugBody.textContent = "";
    debugNode.open = false;
    return;
  }
  if (role && role !== "assistant") {
    debugNode.hidden = true;
    debugBody.textContent = "";
    debugNode.open = false;
    return;
  }
  if (!retrieval) {
    debugNode.hidden = pending;
    debugNode.open = !pending;
    debugBody.textContent = pending ? "" : "No retrieval metadata persisted for this turn.";
    return;
  }
  debugNode.hidden = false;
  debugNode.open = true;
  debugBody.textContent = buildRetrievalDebugText(retrieval, retrieval);
}

function setComposerDisabled(disabled) {
  elements.input.disabled = disabled;
  elements.sendButton.disabled = disabled;
  if (elements.attachButton) {
    elements.attachButton.disabled = disabled;
  }
  if (elements.imageInput) {
    elements.imageInput.disabled = disabled;
  }
  state.inflight = disabled;
}

function transcriptText() {
  const messages = [...elements.messages.querySelectorAll(".message")];
  return messages
    .map((node) => {
      const role = node.querySelector(".message-role")?.textContent || "unknown";
      const body = node.querySelector(".message-body")?.textContent || "";
      return `${role}:\n${body}`;
    })
    .join("\n\n");
}

function collectMetricLines(container) {
  if (!container) {
    return [];
  }
  return [...container.querySelectorAll(".metrics-entry")]
    .map((node) => String(node.textContent || "").trim())
    .filter(Boolean);
}

function syncDebugPanel() {
  if (!elements.chatDebugPanel || !elements.debugContext || !elements.debugRetrieval || !elements.debugResponse) {
    return;
  }
  elements.chatDebugPanel.hidden = !state.debug;
  if (!state.debug) {
    return;
  }
  const currentContext = buildChatPageContext();
  const sentContext = state.lastPageContext || currentContext;
  const requestSummary = state.lastChatRequest
    ? { ...state.lastChatRequest, page_context: sentContext }
    : { page_context: sentContext };
  elements.debugContext.textContent = prettyJson(requestSummary);
  elements.debugRetrieval.textContent = buildRetrievalDebugText(state.lastChatDebug?.retrieval || null, state.lastChatDebug);
  elements.debugResponse.textContent = state.lastChatDebug
    ? prettyJson(state.lastChatDebug)
    : "No chat response yet.";
}

function buildChatPageContext() {
  if (state.contextMode === "off") {
    return null;
  }

  if (state.contextMode === "raw") {
    const raw = String(elements.rawContextInput?.value || "").trim();
    if (!raw) {
      return {
        target: "/chat",
        title: document.title || "Sol / Chat",
        content_type: "chat_ui",
        headings: ["Sol / Chat"],
        suggested_questions: [],
        content: "",
      };
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      return {
        target: "/chat",
        title: document.title || "Sol / Chat",
        content_type: "chat_ui",
        headings: ["Sol / Chat", "Raw Context Override"],
        suggested_questions: [],
        content: raw,
      };
    }
  }

  const recentMessages = [...elements.messages.querySelectorAll(".message")]
    .slice(-6)
    .map((node) => {
      const role = String(node.querySelector(".message-role")?.textContent || "").trim();
      const body = String(node.querySelector(".message-body")?.textContent || "").replace(/\s+/g, " ").trim();
      if (!role || !body) {
        return "";
      }
      return `${role}: ${body}`;
    })
    .filter(Boolean);

  const stackCards = [...(elements.stackGrid?.querySelectorAll(".stack-card") || [])]
    .map((card) => {
      const label = String(card.querySelector("h3")?.textContent || "").trim();
      const role = String(card.querySelector(".stack-role")?.textContent || "").trim();
      const state = String(card.querySelector(".stack-state")?.textContent || "").trim();
      const blurb = String(card.querySelector(".stack-blurb")?.textContent || "").replace(/\s+/g, " ").trim();
      const path = String(card.querySelector(".stack-path")?.textContent || "").replace(/\s+/g, " ").trim();
      const parts = [label, role, state, blurb, path].filter(Boolean);
      return parts.join(" | ");
    })
    .filter(Boolean);

  const metricSummary = [
    `external_hits: ${String(elements.metricExternalHits?.textContent || "").trim()}`,
    `hits_today: ${String(elements.metricHitsToday?.textContent || "").trim()}`,
    `unique_ips: ${String(elements.metricUniqueIps?.textContent || "").trim()}`,
    `top_path: ${String(elements.metricTopPath?.textContent || "").trim()}`,
  ].filter((line) => !line.endsWith(":"));

  const dashboardServices = Array.isArray(state.dashboardStatus?.services) ? state.dashboardStatus.services : [];
  const dashboardCognitive = state.dashboardStatus?.cognitive || {};
  const workingMemory = dashboardCognitive.working_memory || {};
  const observerReport = dashboardCognitive.observer_report || {};
  const recentTraces = Array.isArray(dashboardCognitive.recent_traces) ? dashboardCognitive.recent_traces : [];
  const aiMetrics = dashboardCognitive.ai_metrics || {};
  const environmentState = dashboardCognitive.environment_state || {};
  const recentFrames = Array.isArray(environmentState.recent_frames) ? environmentState.recent_frames : [];
  const actionDecisionLines = (Array.isArray(observerReport.action_decisions) && observerReport.action_decisions.length)
    ? observerReport.action_decisions.map((item) => `${item.type || "action"} | ${item.status || "pending"} | ${item.service || item.reason || "no detail"}`)
    : ["No action decisions yet."];
  const dashboardServiceLines = dashboardServices
    .map((service) => `- ${service.id}: ${service.active}/${service.substate} pid=${service.pid}`)
    .filter(Boolean);
  const runtimeConsoleText = compactText(state.dashboardServiceConsole || "", 2200);
  const cameraCaption = String(elements.cameraCaption?.textContent || "").replace(/\s+/g, " ").trim();
  const cameraOverlay = String(elements.cameraOverlayText?.textContent || "").replace(/\s+/g, " ").trim();
  const cameraConfidence = String(elements.cameraConfidence?.textContent || "").replace(/\s+/g, " ").trim();
  const cameraCache = String(elements.cameraCache?.textContent || "").replace(/\s+/g, " ").trim();
  const cameraThread = state.cameraThread || {};
  const camera = state.dashboardStatus?.camera || {};
  const cameraVisionReport = buildVisionBlock(camera);
  const cameraReasoningReport = buildReasoningBlock(cameraThread);
  const cameraFullReport = buildOverlayCameraReport(camera);

  const contentLines = [
    `status: ${String(elements.statusPill?.textContent || "").trim()}`,
    `session: ${String(elements.sessionLabel?.textContent || "").trim()}`,
    `voice: ${String(elements.voiceStatus?.textContent || "").trim()}`,
    `stack_summary: ${String(elements.stackSummary?.textContent || "").replace(/\s+/g, " ").trim()}`,
    `camera_included: ${Boolean(elements.includeCameraToggle?.checked)}`,
    stackCards.length ? "stack_cards:" : "",
    ...stackCards.map((line) => `- ${line}`),
  ].filter(Boolean);

  if (state.contextIncludeTelemetry) {
    contentLines.push(
      metricSummary.length ? `metrics_summary: ${metricSummary.join(" | ")}` : "",
      collectMetricLines(elements.metricClient).length ? "client_diagnostics:" : "",
      ...collectMetricLines(elements.metricClient).map((line) => `- ${line}`),
      collectMetricLines(elements.metricReadouts).length ? "readouts:" : "",
      ...collectMetricLines(elements.metricReadouts).map((line) => `- ${line}`),
      collectMetricLines(elements.metricRequests).length ? "recent_requests:" : "",
      ...collectMetricLines(elements.metricRequests).map((line) => `- ${line}`),
    );
  }

  if (state.contextIncludeRuntime) {
    contentLines.push(
      `runtime_status: ${state.lastRuntimeStatus}`,
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
      dashboardServiceLines.length ? "runtime_services:" : "",
      ...dashboardServiceLines,
      `selected_service_console_service: ${state.runtimeService || "none"}`,
      `selected_service_console_mode: ${state.runtimeMode || "status"}`,
      "selected_service_console_text:",
      runtimeConsoleText || "(console unavailable)",
    );
  }

  if (state.contextIncludeCamera) {
    contentLines.push(
      `camera_overlay: ${cameraOverlay || "none"}`,
      `camera_confidence: ${cameraConfidence || "unknown"}`,
      `camera_cache: ${cameraCache || "unknown"}`,
      `camera_caption: ${cameraCaption || "none"}`,
      `camera_thread_assessment: ${cameraThread.currentAssessment || "unknown"}`,
      `camera_thread_change: ${cameraThread.changeOverTime || "unknown"}`,
      `camera_thread_operational_note: ${cameraThread.operationalNote || "unknown"}`,
      `camera_thread_confidence: ${cameraThread.confidence ?? "?"}`,
      "camera_report_vision:",
      ...cameraVisionReport.split("\n").map((line) => `- ${line}`),
      "camera_report_reasoning:",
      ...cameraReasoningReport.split("\n").map((line) => `- ${line}`),
      "camera_report_full:",
      ...cameraFullReport.split("\n").map((line) => `- ${line}`),
    );
  }

  if (state.contextIncludeTranscript) {
    contentLines.push(
      recentMessages.length ? "recent_transcript:" : "",
      ...recentMessages.map((line) => `- ${line}`),
    );
  }

  const finalContent = contentLines.filter(Boolean).join("\n");
  const minimalContent = [
    `status: ${String(elements.statusPill?.textContent || "").trim()}`,
    `stack_summary: ${String(elements.stackSummary?.textContent || "").replace(/\s+/g, " ").trim()}`,
    state.contextIncludeCamera ? `camera_summary: ${cameraThread.currentAssessment || cameraCaption || "none"}` : "",
    state.contextIncludeTelemetry && metricSummary.length ? `metrics_summary: ${metricSummary.join(" | ")}` : "",
    state.contextIncludeRuntime ? `observer_summary: ${observerReport.summary || "none"}` : "",
  ].filter(Boolean).join("\n");

  return {
    target: "/chat",
    title: document.title || "Sol / Chat",
    content_type: "chat_ui",
    headings: ["Sol / Chat", "Three-lane model routing", "Live Camera", "Site Wide Debug Metrics"],
    suggested_questions: [
      "What does the current chat page show?",
      "Summarize the debug metrics on screen.",
      "Which local models are active right now?",
      "What does the live camera show right now?",
    ],
    content: state.contextMode === "minimal" ? minimalContent : finalContent,
  };
}

function latestAssistantText() {
  const messages = [...elements.messages.querySelectorAll(".message.assistant .message-body")];
  const node = messages.at(-1);
  return String(node?.textContent || "").trim();
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
  sentences.forEach((sentence) => {
    const next = sentence.trim();
    if (!next) return;
    if (!current) {
      current = next;
      return;
    }
    if ((current.length + 1 + next.length) <= maxChars) {
      current += ` ${next}`;
      return;
    }
    chunks.push(current);
    if (next.length <= maxChars) {
      current = next;
      return;
    }
    let remainder = next;
    while (remainder.length > maxChars) {
      chunks.push(remainder.slice(0, maxChars).trim());
      remainder = remainder.slice(maxChars).trim();
    }
    current = remainder;
  });
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function attachmentSummary(images) {
  const list = Array.isArray(images) ? images : [];
  if (!list.length) {
    return "";
  }
  const names = list.map((image) => image.name || "image").join(", ");
  const label = list.length === 1 ? "Attached image" : "Attached images";
  return `${label}: ${names}`;
}

function defaultImagePrompt(count) {
  return count === 1 ? "Describe the attached image." : "Describe the attached images.";
}

function clearAttachments() {
  state.attachments = [];
  if (elements.imageInput) {
    elements.imageInput.value = "";
  }
  renderAttachmentTray();
}

function removeAttachment(index) {
  state.attachments = state.attachments.filter((_, itemIndex) => itemIndex !== index);
  renderAttachmentTray();
}

function renderAttachmentTray() {
  if (!elements.attachmentTray) {
    return;
  }
  const attachments = Array.isArray(state.attachments) ? state.attachments : [];
  elements.attachmentTray.textContent = "";
  elements.attachmentTray.hidden = attachments.length === 0;
  attachments.forEach((attachment, index) => {
    const card = document.createElement("div");
    card.className = "attachment-card";

    const preview = document.createElement("img");
    preview.className = "attachment-preview";
    preview.src = attachment.previewUrl || attachment.dataUrl || "";
    preview.alt = attachment.name || `attachment ${index + 1}`;

    const meta = document.createElement("div");
    meta.className = "attachment-meta";
    const title = document.createElement("strong");
    title.textContent = attachment.name || `image ${index + 1}`;
    const stats = document.createElement("span");
    const sizeKb = Math.max(1, Math.round((attachment.bytes || 0) / 1024));
    stats.textContent = `${attachment.mimeType || "image"} · ${sizeKb} KB`;
    meta.append(title, stats);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost attachment-remove";
    remove.textContent = "Clear";
    remove.addEventListener("click", () => removeAttachment(index));

    card.append(preview, meta, remove);
    elements.attachmentTray.appendChild(card);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed."));
    img.src = dataUrl;
  });
}

async function normalizeImageFile(file) {
  const originalUrl = await readFileAsDataUrl(file);
  if (file.size <= 2_000_000) {
    return {
      name: file.name,
      mimeType: file.type || "image/jpeg",
      dataUrl: originalUrl,
      previewUrl: originalUrl,
      bytes: file.size,
    };
  }

  const image = await loadImageElement(originalUrl);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
  const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return {
      name: file.name,
      mimeType: file.type || "image/jpeg",
      dataUrl: originalUrl,
      previewUrl: originalUrl,
      bytes: file.size,
    };
  }
  context.drawImage(image, 0, 0, width, height);
  const mimeType = "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType, 0.85);
  const bytes = Math.round((dataUrl.length * 3) / 4);
  return {
    name: file.name.replace(/\.[A-Za-z0-9]+$/, ".jpg"),
    mimeType,
    dataUrl,
    previewUrl: dataUrl,
    bytes,
  };
}

function isAudioPlaying() {
  return Boolean(
    elements.presenceAudio &&
    elements.presenceAudio.src &&
    !elements.presenceAudio.paused &&
    !elements.presenceAudio.ended &&
    elements.presenceAudio.currentTime > 0
  );
}

function buildSpeechUrl(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }
  const url = new URL(SPEAK_URL, window.location.origin);
  url.searchParams.set("text", normalized);
  url.searchParams.set("session", state.session);
  return url.toString();
}

function cancelSpeechQueue(options = {}) {
  const { pauseAudio = false } = options;
  state.speechSequenceToken += 1;
  state.speechQueue = [];
  state.speechQueueIndex = 0;
  state.speechQueueOpen = false;
  state.speechPlaybackPending = false;
  state.streamSpeechCursor = 0;
  if (pauseAudio) {
    elements.presenceAudio.pause();
  }
}

function extractSpeakableSpeechChunk(fullText, options = {}) {
  const isFirstChunk = state.streamSpeechCursor === 0;
  const minChars = Math.max(48, Number(options.minChars || (isFirstChunk ? 64 : 120)));
  const softMaxChars = Math.max(minChars, Number(options.softMaxChars || (isFirstChunk ? 140 : 280)));
  const flush = Boolean(options.flush);
  const remaining = String(fullText || "").slice(state.streamSpeechCursor);
  if (!remaining.trim()) {
    return "";
  }
  let boundary = -1;
  const sentencePattern = /[.!?](?:["')\]]+)?(?:\s+|$)/g;
  let match;
  while ((match = sentencePattern.exec(remaining))) {
    boundary = match.index + match[0].length;
    if (boundary >= minChars) break;
  }
  if (boundary < 0 && remaining.length >= softMaxChars) {
    boundary = remaining.lastIndexOf(" ", softMaxChars);
    if (boundary < 0) boundary = softMaxChars;
  }
  if (boundary < 0 && flush) {
    boundary = remaining.length;
  }
  if (boundary <= 0) {
    return "";
  }
  const chunk = remaining.slice(0, boundary).trim();
  state.streamSpeechCursor += boundary;
  return chunk;
}

function revokePrefetchedSpeechUrl() {
  if (state.prefetchedSpeechObjectUrl) {
    URL.revokeObjectURL(state.prefetchedSpeechObjectUrl);
  }
  state.prefetchedSpeechObjectUrl = "";
}

function clearPrefetchedSpeech(options = {}) {
  const preserveText = String(options.preserveText || "").trim();
  if (preserveText && state.prefetchedSpeechText === preserveText) {
    return;
  }
  revokePrefetchedSpeechUrl();
  state.prefetchedSpeechText = "";
  state.prefetchedSpeechUrl = "";
  state.prefetchedSpeechPromise = null;
}

async function prefetchSpeech(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }
  if (state.prefetchedSpeechUrl && state.prefetchedSpeechText === normalized) {
    return state.prefetchedSpeechUrl;
  }
  if (state.prefetchedSpeechPromise && state.prefetchedSpeechText === normalized) {
    return state.prefetchedSpeechPromise;
  }
  clearPrefetchedSpeech();
  state.prefetchedSpeechText = normalized;
  const request = (async () => {
    const response = await fetch(buildSpeechUrl(normalized), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Voice request failed (${response.status})`);
    }
    const blob = await response.blob();
    if (!blob.size) {
      throw new Error("Voice returned empty audio.");
    }
    const objectUrl = URL.createObjectURL(blob);
    if (state.prefetchedSpeechText !== normalized) {
      URL.revokeObjectURL(objectUrl);
      return state.prefetchedSpeechUrl || "";
    }
    revokePrefetchedSpeechUrl();
    state.prefetchedSpeechUrl = objectUrl;
    state.prefetchedSpeechObjectUrl = objectUrl;
    return objectUrl;
  })();
  state.prefetchedSpeechPromise = request;
  try {
    return await request;
  } finally {
    if (state.prefetchedSpeechPromise === request) {
      state.prefetchedSpeechPromise = null;
    }
  }
}

async function ensureSpeechCached(text, options = {}) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }
  if (state.prefetchedSpeechUrl && state.prefetchedSpeechText === normalized) {
    state.pendingSpeechUrl = state.prefetchedSpeechUrl;
    state.pendingSpeechText = normalized;
    return state.prefetchedSpeechUrl;
  }
  if (state.prefetchedSpeechPromise && state.prefetchedSpeechText === normalized) {
    const url = await state.prefetchedSpeechPromise;
    state.pendingSpeechUrl = url;
    state.pendingSpeechText = normalized;
    return url;
  }
  if (state.pendingSpeechUrl && state.pendingSpeechText === normalized) {
    return state.pendingSpeechUrl;
  }
  if (state.pendingSpeechPromise && state.pendingSpeechText === normalized) {
    return state.pendingSpeechPromise;
  }
  if (options.announceStatus !== false) {
    setStatus("working");
  }
  const request = prefetchSpeech(normalized);
  state.pendingSpeechPromise = request;
  state.pendingSpeechUrl = "";
  state.pendingSpeechText = normalized;
  try {
    const url = await request;
    state.pendingSpeechUrl = url;
    return url;
  } finally {
    if (state.pendingSpeechPromise === request) {
      state.pendingSpeechPromise = null;
    }
  }
}

async function playSpeech(text, options = {}) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return;
  }
  const url = await ensureSpeechCached(normalized, options);
  if (!url) {
    return;
  }
  elements.presenceAudio.pause();
  if (elements.presenceAudio.src !== url) {
    elements.presenceAudio.src = url;
  }
  elements.presenceAudio.currentTime = 0;
  await presenceVisualizer?.unlock?.();
  await elements.presenceAudio.play();
  setStatus("speaking");
}

async function continueSpeechQueue(token, options = {}) {
  if (token !== state.speechSequenceToken || state.speechPlaybackPending) {
    return;
  }
  const nextChunk = state.speechQueue[state.speechQueueIndex + 1] || "";
  if (nextChunk) {
    void prefetchSpeech(nextChunk).catch(() => {});
  }
  const chunk = state.speechQueue[state.speechQueueIndex] || "";
  if (!chunk) {
    if (state.speechQueueOpen) {
      if (!state.inflight) setStatus("working");
      return;
    }
    cancelSpeechQueue({ pauseAudio: false });
    if (!state.inflight) setStatus("complete");
    return;
  }
  state.speechPlaybackPending = true;
  try {
    await playSpeech(chunk, { ...options, announceStatus: false });
  } finally {
    state.speechPlaybackPending = false;
  }
}

async function enqueueSpeechText(text, options = {}) {
  if (!state.voiceEnabled) {
    return;
  }
  const chunks = splitSpeechText(text, options.maxChunkChars || 420);
  if (!chunks.length) {
    if (options.keepOpen !== undefined) {
      state.speechQueueOpen = Boolean(options.keepOpen);
    }
    return;
  }
  state.speechQueue.push(...chunks);
  if (options.keepOpen !== undefined) {
    state.speechQueueOpen = Boolean(options.keepOpen);
  }
  if (!isAudioPlaying() && !state.speechPlaybackPending) {
    void continueSpeechQueue(state.speechSequenceToken, options);
  }
}

async function enqueueStreamingSpeech(fullText, options = {}) {
  while (true) {
    const chunk = extractSpeakableSpeechChunk(fullText, options);
    if (!chunk) break;
    await enqueueSpeechText(chunk, { keepOpen: options.keepOpen !== false, maxChunkChars: 420 });
  }
  if (options.keepOpen !== undefined) {
    state.speechQueueOpen = Boolean(options.keepOpen);
  }
}

async function playSpeechSequence(text, options = {}) {
  const normalized = String(text || "").trim();
  if (!normalized || !state.voiceEnabled) {
    return;
  }
  cancelSpeechQueue({ pauseAudio: true });
  state.speechQueue = splitSpeechText(normalized, options.maxChunkChars || 420);
  state.speechQueueIndex = 0;
  state.speechQueueOpen = false;
  await continueSpeechQueue(state.speechSequenceToken, options);
}

function stopSpeech() {
  cancelSpeechQueue({ pauseAudio: true });
  elements.presenceAudio.pause();
  elements.presenceAudio.currentTime = 0;
  if (!state.inflight) {
    setStatus("idle");
  }
}

async function speakLatestAssistantMessage() {
  const text = latestAssistantText();
  if (!text) {
    showError("Nothing to read yet.");
    return;
  }
  showError("");
  try {
    await playSpeechSequence(text);
  } catch (error) {
    console.error(error);
    showError(error.message || "Voice failed.");
    setStatus("error");
  }
}

async function copyTranscript() {
  try {
    await navigator.clipboard.writeText(transcriptText());
    setStatus("copied");
    setTimeout(() => setStatus("idle"), 1200);
  } catch {
    showError("Copy failed.");
  }
}

function updateDebugVisibility() {
  const debugBlocks = elements.messages.querySelectorAll(".message");
  debugBlocks.forEach((message) => {
    const details = message.querySelector(".message-debug");
    const retrieval = message._retrieval || null;
    applyRetrievalDebug(details, message.querySelector(".message-debug-body"), retrieval, {
      role: message.classList.contains("assistant")
        ? "assistant"
        : message.classList.contains("user")
          ? "user"
          : "",
      pending: message.classList.contains("pending"),
    });
  });
  document.body.classList.toggle("debug-active", state.debug);
  if (elements.metricsDetails) {
    elements.metricsDetails.open = state.debug;
  }
  if (elements.metricsSummary) {
    elements.metricsSummary.textContent = state.debug
      ? "Site Wide Debug Metrics · Expanded"
      : "Site Wide Debug Metrics";
  }
  elements.debugToggle.textContent = state.debug ? "Debug on" : "Debug off";
  elements.debugToggle.setAttribute("aria-pressed", String(state.debug));
  renderClientDiagnostics();
  syncDebugPanel();
}

function formatMetricValue(value) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value ?? "—");
}

function renderMetricEntries(container, entries, formatter, options = {}) {
  if (!container) {
    return;
  }
  const limit = typeof options.limit === "number" ? options.limit : 6;
  container.textContent = "";
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "metrics-entry";
    empty.textContent = "No data.";
    container.appendChild(empty);
    return;
  }
  list.slice(0, limit).forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "metrics-entry";
    row.textContent = formatter(entry, index);
    container.appendChild(row);
  });
}

function formatLatency(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)} ms` : "—";
}

function renderClientDiagnostics() {
  const lines = [
    `debug: ${state.debug ? "enabled" : "disabled"}`,
    `session: ${state.session || "pending"}`,
    `transport: ${state.lastTransport}`,
    `grounded: ${
      state.lastGrounded === null || state.lastGrounded === undefined ? "unknown" : String(Boolean(state.lastGrounded))
    }`,
    `chat_latency: ${formatLatency(state.lastChatLatencyMs)}`,
    `history_latency: ${formatLatency(state.lastHistoryLatencyMs)}`,
    `health_latency: ${formatLatency(state.lastHealthLatencyMs)}`,
    `reset_latency: ${formatLatency(state.lastResetLatencyMs)}`,
    `metrics_latency: ${formatLatency(state.lastMetricsLatencyMs)}`,
    `metrics_status: ${state.lastMetricsStatus}`,
    `metrics_refreshed: ${state.lastMetricsRefreshAt || "never"}`,
    `runtime_latency: ${formatLatency(state.lastRuntimeLatencyMs)}`,
    `runtime_status: ${state.lastRuntimeStatus}`,
    `runtime_service: ${state.runtimeService || "none"}`,
    `runtime_mode: ${state.runtimeMode || "status"}`,
    `backend_profile: ${state.backendProfile || "unknown"}`,
    `backend_model: ${state.backendModelId || "unknown"}`,
    `selected_profile: ${state.selectedProfile || "auto"}`,
    `persist_history: ${state.persistHistory}`,
    `stream_responses: ${state.streamResponses}`,
    `allow_actions: ${state.allowActions}`,
    `lightweight_mode: ${state.lightweightMode}`,
    `context_mode: ${state.contextMode}`,
    `context_flags: telemetry=${state.contextIncludeTelemetry} runtime=${state.contextIncludeRuntime} transcript=${state.contextIncludeTranscript} camera=${state.contextIncludeCamera}`,
    `pending_attachments: ${state.attachments.length}`,
    `voice_enabled: ${state.voiceEnabled}`,
    `speech_cached: ${Boolean(state.pendingSpeechUrl) && Boolean(state.pendingSpeechText)}`,
    `speech_pending: ${Boolean(state.pendingSpeechPromise)}`,
    `audio_state: ${elements.presenceAudio?.paused ? "paused" : "playing"}`,
    `scroll_lock: ${state.userScrolledUp ? "manual" : "auto-follow"}`,
    `last_error: ${state.lastError || "none"}`,
  ];
  renderMetricEntries(elements.metricClient, lines, (entry) => entry, { limit: lines.length });
  syncDebugPanel();
}

function ensureRuntimeServiceOptions(services) {
  if (!elements.runtimeServiceSelect || !Array.isArray(services) || !services.length) {
    return false;
  }
  const current = elements.runtimeServiceSelect.value || state.runtimeService;
  elements.runtimeServiceSelect.textContent = "";
  services.forEach((service) => {
    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = service.description || service.id;
    elements.runtimeServiceSelect.append(option);
  });
  const nextValue = current && services.some((service) => service.id === current)
    ? current
    : services[0].id;
  elements.runtimeServiceSelect.value = nextValue;
  state.runtimeService = nextValue;
  return nextValue !== current;
}

async function refreshRuntimeConsole() {
  const service = elements.runtimeServiceSelect?.value || state.runtimeService;
  const mode = elements.runtimeModeSelect?.value || state.runtimeMode || "status";
  state.runtimeMode = mode;
  state.runtimeService = service || "";
  if (!elements.runtimeConsole) {
    return;
  }
  if (!service) {
    state.dashboardServiceConsole = "No runtime service selected.";
    elements.runtimeConsole.textContent = state.dashboardServiceConsole;
    state.lastRuntimeStatus = "no_service_selected";
    syncDebugPanel();
    return;
  }
  elements.runtimeConsole.textContent = "Loading runtime console…";
  const startedAt = performance.now();
  try {
    const response = await fetch(
      `${DASHBOARD_SERVICE_CONSOLE_URL}?service=${encodeURIComponent(service)}&mode=${encodeURIComponent(mode)}&ts=${Date.now()}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `runtime_console ${response.status}`);
    }
    state.dashboardServiceConsole = payload.text || "(no output)";
    elements.runtimeConsole.textContent = state.dashboardServiceConsole;
    state.lastRuntimeLatencyMs = performance.now() - startedAt;
    state.lastRuntimeStatus = "ok";
  } catch (error) {
    state.dashboardServiceConsole = `Runtime console unavailable: ${error.message || "fetch_failed"}`;
    elements.runtimeConsole.textContent = state.dashboardServiceConsole;
    state.lastRuntimeLatencyMs = performance.now() - startedAt;
    state.lastRuntimeStatus = `error: ${error.message || "fetch_failed"}`;
  } finally {
    syncDebugPanel();
  }
}

function renderActionLaunchers(actions) {
  if (!elements.actionLaunchers) {
    return;
  }
  elements.actionLaunchers.textContent = "";
  const localClient = Boolean(state.dashboardStatus?.access?.local_client);
  (Array.isArray(actions) ? actions : []).forEach((action) => {
    if (!action?.id) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.textContent = action.label || action.id;
    const localOnly = action.kind === "desktop";
    if (localOnly && !localClient) {
      button.disabled = true;
      button.title = "Available only from the local machine or LAN.";
    }
    button.addEventListener("click", () => {
      void launchAction(action.id).catch((error) => {
        showError(`Launcher failed: ${error.message || "request_failed"}`);
        state.dashboardServiceConsole = `Launcher failed for ${action.label || action.id}: ${error.message || "request_failed"}`;
        if (elements.runtimeConsole) {
          elements.runtimeConsole.textContent = state.dashboardServiceConsole;
        }
        setStatus("error");
      });
    });
    elements.actionLaunchers.appendChild(button);
  });
}

function renderCameraStatus(camera = {}) {
  if (!elements.cameraImage) {
    return;
  }
  if (elements.cameraImage.src !== `${window.location.origin}${DASHBOARD_CAMERA_STREAM_URL}`) {
    elements.cameraImage.src = `${DASHBOARD_CAMERA_STREAM_URL}?ts=${Date.now()}`;
  }
  if (elements.cameraOverlayText) {
    elements.cameraOverlayText.textContent = buildOverlayCameraReport(camera);
  }
  if (elements.cameraConfidence) {
    elements.cameraConfidence.textContent = `confidence ${camera.caption_confidence ?? "?"}%`;
  }
  if (elements.cameraCache) {
    elements.cameraCache.textContent = camera.caption_cached
      ? `cache hit / ${camera.caption_source || "cache"}`
      : `${camera.caption_source || "live"} / auto ${camera.auto_caption_enabled ? "on" : "off"}`;
  }
  if (elements.cameraCaption) {
    elements.cameraCaption.textContent = buildVisionBlock(camera);
  }
  if (elements.cameraAuto) {
    elements.cameraAuto.textContent = camera.auto_caption_enabled ? "Auto on" : "Auto off";
  }
  if (elements.cameraDescribe) {
    elements.cameraDescribe.disabled = Boolean(camera.caption_in_flight);
  }
  renderCameraProgress(camera);
  renderCameraThread(camera);
  if (camera.caption_in_flight) {
    scheduleCameraFollowup();
  } else if (cameraFollowupTimer) {
    globalThis.clearTimeout?.(cameraFollowupTimer);
    cameraFollowupTimer = null;
  }
}

async function describeCameraNow() {
  const payload = await fetchJson(DASHBOARD_CAMERA_DESCRIBE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  state.dashboardStatus = { ...(state.dashboardStatus || {}), camera: payload.camera || {} };
  renderCameraStatus(payload.camera || {});
  syncDebugPanel();
}

async function toggleCameraAuto() {
  const current = Boolean(state.dashboardStatus?.camera?.auto_caption_enabled);
  const payload = await fetchJson(DASHBOARD_CAMERA_AUTO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: !current }),
  });
  state.dashboardStatus = { ...(state.dashboardStatus || {}), camera: payload.camera || {} };
  renderCameraStatus(payload.camera || {});
  syncDebugPanel();
}

async function restartSelectedService() {
  const service = elements.runtimeServiceSelect?.value || state.runtimeService;
  if (!service) {
    return;
  }
  const payload = await fetchJson(`/api/dashboard/services/action/${encodeURIComponent(service)}/restart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  state.dashboardServiceConsole = prettyJson(payload);
  if (elements.runtimeConsole) {
    elements.runtimeConsole.textContent = state.dashboardServiceConsole;
  }
  await refreshRuntimeContext();
}

async function launchAction(actionId) {
  showError("");
  state.lastRuntimeStatus = `launching:${actionId}`;
  if (elements.runtimeConsole) {
    elements.runtimeConsole.textContent = `Launching ${actionId}…`;
  }
  setStatus("working");
  const payload = await fetchJson(`/api/dashboard/action/${encodeURIComponent(actionId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  state.dashboardServiceConsole = prettyJson(payload);
  if (elements.runtimeConsole) {
    elements.runtimeConsole.textContent = state.dashboardServiceConsole;
  }
  state.lastRuntimeStatus = `launched:${actionId}`;
  setStatus("complete");
}

async function handleDirectQuery(event) {
  event.preventDefault();
  const query = String(elements.queryInput?.value || "").trim();
  if (!query || !elements.queryOutput) {
    return;
  }
  elements.queryOutput.textContent = "Running direct query...";
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("profile", preferredProfile());
  const pageContext = buildChatPageContext();
  if (pageContext) {
    params.set("page_context", JSON.stringify(pageContext));
  }
  if (elements.queryPersist?.checked || state.persistHistory) {
    params.set("persist", "1");
    params.set("session", state.session);
  }
  try {
    const payload = await fetchJson(`${QUERY_URL}?${params.toString()}`);
    elements.queryOutput.textContent = prettyJson(payload);
    state.lastChatDebug = payload;
    if (elements.queryPersist?.checked) {
      await loadHistory();
    }
    syncDebugPanel();
  } catch (error) {
    elements.queryOutput.textContent = String(error.message || error);
  }
}

function renderKnowledgeResults(payload) {
  if (!elements.knowledgeResults) {
    return;
  }
  const results = Array.isArray(payload.results) ? payload.results : [];
  elements.knowledgeResults.textContent = "";
  if (!results.length) {
    const empty = document.createElement("p");
    empty.className = "utility-empty";
    empty.textContent = "No results.";
    elements.knowledgeResults.appendChild(empty);
    return;
  }
  results.forEach((result) => {
    const item = document.createElement("article");
    item.className = "knowledge-item";
    item.innerHTML = [
      `<strong>${result.path || result.doc_key || "unknown"}</strong>`,
      `<div class="knowledge-meta">rank ${result.rank} / score ${Number(result.score || 0).toFixed(4)} / chunk ${result.chunk}</div>`,
      `<code>${result.doc_key || ""}</code>`,
      `<div class="knowledge-snippet">${result.text || ""}</div>`,
    ].join("");
    elements.knowledgeResults.appendChild(item);
  });
}

function renderKnowledgeHealth(payload) {
  state.knowledgeHealth = payload || null;
  if (elements.knowledgeHealthPill) {
    if (!payload) {
      elements.knowledgeHealthPill.textContent = "knowledge unavailable";
    } else {
      elements.knowledgeHealthPill.textContent = `${payload.backend || "unknown"} · ${payload.ok ? "ready" : "cold"}`;
    }
  }
  if (elements.knowledgeHealthMeta) {
    if (!payload) {
      elements.knowledgeHealthMeta.textContent = "docs unavailable";
    } else {
      elements.knowledgeHealthMeta.textContent = `${payload.docs ?? 0} docs · ${payload.query_cache_entries ?? 0} cached queries`;
    }
  }
}

async function handleKnowledgeSearch(event) {
  event.preventDefault();
  const query = String(elements.knowledgeInput?.value || "").trim();
  if (!query || !elements.knowledgeResults) {
    return;
  }
  elements.knowledgeResults.innerHTML = '<p class="utility-empty">Searching...</p>';
  try {
    const payload = await fetchJson(
      `${KNOWLEDGE_URL}?query=${encodeURIComponent(query)}&top_k=${encodeURIComponent(elements.knowledgeTopK?.value || "5")}`
    );
    renderKnowledgeResults(payload);
  } catch (error) {
    elements.knowledgeResults.innerHTML = `<p class="utility-empty">${String(error.message || error)}</p>`;
  }
}

async function refreshKnowledgeHealth() {
  try {
    const payload = await fetchJson(`${KNOWLEDGE_HEALTH_URL}?ts=${Date.now()}`);
    renderKnowledgeHealth(payload);
  } catch (error) {
    console.error(error);
    renderKnowledgeHealth(null);
  }
}

function summarizeStackHealth(payload) {
  const stack = payload?.stack;
  const active = stack?.active;
  if (!active) {
    return "Stack metadata unavailable.";
  }
  const requested = active.requested_profile || "unknown";
  const effective = active.effective_profile || requested;
  const label = active.effective_label || active.label || effective;
  if (active.fallback_used && requested !== effective) {
    return `Backend requested ${requested}, routed to ${effective} (${label}).`;
  }
  return `Backend profile ${effective} (${label}).`;
}

function renderStack(payload) {
  const stack = payload?.stack;
  const active = stack?.active || {};
  const profiles = Array.isArray(stack?.profiles) ? stack.profiles : [];
  state.backendProfile = String(active.effective_profile || payload?.backend_profile || "unknown");
  state.backendModelId = String(payload?.backend_model_id || "");
  state.backendStackSummary = summarizeStackHealth(payload);
  if (elements.stackSummary) {
    const modelBit = state.backendModelId ? ` Active backend model: ${state.backendModelId}.` : "";
    elements.stackSummary.textContent = `${state.backendStackSummary}${modelBit}`;
  }
  if (!elements.stackGrid) {
    renderClientDiagnostics();
    return;
  }
  state.availableProfiles = profiles.map((profile) => String(profile.id || "")).filter(Boolean);
  if (elements.profileSelect) {
    const previous = String(elements.profileSelect.value || state.selectedProfile || "");
    elements.profileSelect.textContent = "";
    state.availableProfiles.forEach((profileId) => {
      const profile = profiles.find((item) => String(item.id) === profileId) || {};
      const option = document.createElement("option");
      option.value = profileId;
      option.textContent = profile.label || profileId;
      elements.profileSelect.append(option);
    });
    const fallbackSelection = previous && state.availableProfiles.includes(previous)
      ? previous
      : (state.availableProfiles.includes(state.backendProfile) ? state.backendProfile : (state.availableProfiles[0] || ""));
    elements.profileSelect.value = fallbackSelection;
    state.selectedProfile = fallbackSelection;
  }
  elements.stackGrid.textContent = "";
  profiles.forEach((profile) => {
    const card = document.createElement("article");
    const isActive = String(profile.effective_profile || profile.id) === state.backendProfile;
    card.className = "stack-card";
    card.dataset.status = profile.status || "unknown";
    card.dataset.active = String(isActive);

    const modelPath = String(profile.model_path || "");
    const provider = String(profile.provider || "local");
    const baseUrl = String(profile.base_url || profile.remote_base_url || "");
    const isRunning = Boolean(profile.running);
    const stateLabel = profile.status === "ready"
      ? (isActive
        ? (isRunning ? "active" : "standby")
        : (isRunning ? "warm" : "ready"))
      : profile.status === "missing_mmproj"
        ? "missing projector"
        : "not installed";

    card.innerHTML = `
      <div class="stack-card-head">
        <h3>${profile.label || profile.id}</h3>
        <span class="stack-role">${profile.role || "model"}</span>
      </div>
      <p class="stack-blurb">${profile.summary || ""}</p>
      <span class="stack-state">${stateLabel}</span>
      <p class="stack-blurb">provider: ${provider}${baseUrl ? ` · ${baseUrl}` : ""}</p>
      <p class="stack-path">${modelPath || "No local model file detected."}</p>
    `;
    card.addEventListener("click", () => {
      if (elements.profileSelect) {
        elements.profileSelect.value = String(profile.id || "");
      }
      state.selectedProfile = String(profile.id || "");
      updateControlSummary();
      renderClientDiagnostics();
      syncDebugPanel();
    });
    elements.stackGrid.appendChild(card);
  });
  updateControlSummary();
  renderClientDiagnostics();
}

async function refreshHealth() {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${HEALTH_URL}?ts=${Date.now()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`health ${response.status}`);
    }
    const payload = await response.json();
    state.lastHealthLatencyMs = performance.now() - startedAt;
    renderStack(payload);
  } catch (error) {
    console.error(error);
    state.lastHealthLatencyMs = performance.now() - startedAt;
    state.backendProfile = "error";
    state.backendModelId = "";
    state.backendStackSummary = `Stack probe failed: ${error.message || "fetch_failed"}`;
    if (elements.stackSummary) {
      elements.stackSummary.textContent = state.backendStackSummary;
    }
    if (elements.stackGrid) {
      elements.stackGrid.textContent = "";
    }
    renderClientDiagnostics();
  }
}

async function refreshSiteMetrics() {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${SITE_METRICS_URL}?ts=${Date.now()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`metrics ${response.status}`);
    }
    const payload = await response.json();
    if (elements.metricExternalHits) {
      elements.metricExternalHits.textContent = formatMetricValue(payload.external_hits);
    }
    if (elements.metricHitsToday) {
      elements.metricHitsToday.textContent = formatMetricValue(payload.hits_today);
    }
    if (elements.metricUniqueIps) {
      elements.metricUniqueIps.textContent = formatMetricValue(payload.external_unique_ips ?? payload.unique_ips);
    }
    if (elements.metricTopPath) {
      const topPath = payload.top_external_paths?.[0]?.path || payload.top_paths?.[0]?.path || "—";
      elements.metricTopPath.textContent = topPath;
    }
    renderMetricEntries(
      elements.metricReadouts,
      payload.sensor_snapshot?.readouts || [],
      (entry) => `${entry.label}: ${entry.value}`
    );
    renderMetricEntries(
      elements.metricRequests,
      payload.recent_requests || [],
      (entry) => `${entry.method || "GET"} ${entry.path || entry.uri || "?"} · ${entry.status ?? "?"}`
    );
    state.lastMetricsLatencyMs = performance.now() - startedAt;
    state.lastMetricsRefreshAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    state.lastMetricsStatus = "ok";
  } catch (error) {
    console.error(error);
    renderMetricEntries(elements.metricReadouts, [], () => "No data.");
    renderMetricEntries(elements.metricRequests, [], () => "No data.");
    state.lastMetricsLatencyMs = performance.now() - startedAt;
    state.lastMetricsRefreshAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    state.lastMetricsStatus = `error: ${error.message || "fetch_failed"}`;
  } finally {
    renderClientDiagnostics();
  }
}

async function refreshRuntimeContext() {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${DASHBOARD_STATUS_URL}?ts=${Date.now()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`runtime ${response.status}`);
    }
    const payload = await response.json();
    state.dashboardStatus = payload;
    state.lastRuntimeLatencyMs = performance.now() - startedAt;
    state.lastRuntimeStatus = "ok";
    renderCognitiveSummary();
    renderCameraStatus(payload.camera || {});
    renderActionLaunchers(payload.actions || []);
    const needsConsoleRefresh = ensureRuntimeServiceOptions(payload.services || []);
    if (elements.runtimeModeSelect) {
      elements.runtimeModeSelect.value = state.runtimeMode || "status";
    }
    if (needsConsoleRefresh || !state.dashboardServiceConsole) {
      await refreshRuntimeConsole();
    } else {
      syncDebugPanel();
    }
  } catch (error) {
    state.dashboardStatus = null;
    state.lastRuntimeLatencyMs = performance.now() - startedAt;
    state.lastRuntimeStatus = `error: ${error.message || "fetch_failed"}`;
    state.dashboardServiceConsole = `Runtime context unavailable: ${error.message || "fetch_failed"}`;
    if (elements.runtimeConsole) {
      elements.runtimeConsole.textContent = state.dashboardServiceConsole;
    }
    renderCameraStatus({});
    renderActionLaunchers([]);
    syncDebugPanel();
  } finally {
    renderClientDiagnostics();
  }
}

async function loadHistory() {
  setStatus("loading");
  const startedAt = performance.now();
  try {
    const response = await fetch(`${HISTORY_URL}?session=${encodeURIComponent(state.session)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`history ${response.status}`);
    }
    const payload = await response.json();
    elements.messages.textContent = "";
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const assistantDebug = Array.isArray(payload.assistant_debug) ? payload.assistant_debug : [];
    let assistantDebugIndex = 0;
    const visible = messages.filter((message) => message.role !== "system");
    if (!visible.length) {
      createMessage("assistant", "Sol is online. Text turns use the local reasoning lane; image turns route to the local vision lane. Factual text answers will ground themselves in retrieved archive context when they can.");
    } else {
      visible.forEach((message) => {
        const retrieval = message.role === "assistant" ? (assistantDebug[assistantDebugIndex++] || null) : null;
        const created = createMessage(message.role, message.content, {
          retrieval,
          messageIndex: Number.isInteger(message.index) ? message.index : null,
        });
        if (message.role === "assistant") {
          created.node._retrieval = retrieval;
        }
      });
    }
    state.lastHistoryLatencyMs = performance.now() - startedAt;
    showError("");
  } catch (error) {
    console.error(error);
    elements.messages.textContent = "";
    createMessage("assistant", "History could not be loaded. The session is still usable.");
    state.lastHistoryLatencyMs = performance.now() - startedAt;
    showError("History load failed.");
  } finally {
    setStatus("idle");
    maybeScroll(true);
    renderClientDiagnostics();
  }
}

async function resetConversation() {
  if (state.inflight) {
    return;
  }
  setStatus("resetting");
  showError("");
  const startedAt = performance.now();
  try {
    const response = await fetch(RESET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ session: state.session }),
    });
    if (!response.ok) {
      throw new Error(`reset ${response.status}`);
    }
    state.lastResetLatencyMs = performance.now() - startedAt;
    await loadHistory();
  } catch (error) {
    console.error(error);
    state.lastResetLatencyMs = performance.now() - startedAt;
    showError("Reset failed.");
    setStatus("error");
  } finally {
    renderClientDiagnostics();
  }
}

async function sendMessage(message, images = state.attachments) {
  const trimmed = message.trim();
  const attachments = Array.isArray(images) ? images.map((image) => ({ ...image })) : [];
  if ((!trimmed && !attachments.length && !elements.includeCameraToggle?.checked) || state.inflight) {
    return;
  }
  showError("");
  setComposerDisabled(true);
  setStatus("connecting");
  state.lastTransport = "connecting";
  state.lastGrounded = null;
  renderClientDiagnostics();

  if (elements.includeCameraToggle?.checked) {
    try {
      attachments.push(await fetchCameraAttachment());
      state.cameraIncluded = true;
    } catch (error) {
      console.warn("camera attachment failed", error);
      state.cameraIncluded = false;
    }
  } else {
    state.cameraIncluded = false;
  }

  const userBody = trimmed || defaultImagePrompt(attachments.length);
  const userNote = attachments.length ? `${userBody}\n\n${attachmentSummary(attachments)}` : userBody;
  createMessage("user", userNote, { images: attachments });
  const assistant = createMessage("assistant", "", { pending: true });
  assistant.node._retrieval = null;
  elements.input.value = "";
  elements.input.style.height = "";
  clearAttachments();
  const startedAt = performance.now();
  const pageContext = buildChatPageContext();
  state.lastPageContext = pageContext;
  const selectedProfile = preferredProfile({ hasImages: attachments.length > 0 });
  state.lastChatRequest = {
    message: trimmed,
    session: state.session,
    stream: state.streamResponses,
    persist: state.persistHistory,
    profile: selectedProfile,
    allow_actions: state.allowActions,
    lightweight: state.lightweightMode,
    image_count: attachments.length,
  };
  syncDebugPanel();

  try {
    state.streamSpeechCursor = 0;
    if (state.voiceEnabled) {
      cancelSpeechQueue({ pauseAudio: true });
      state.speechQueueOpen = true;
    }
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      body: JSON.stringify({
        message: trimmed,
        session: state.session,
        persist: state.persistHistory,
        stream: state.streamResponses,
        allow_actions: state.allowActions,
        lightweight: state.lightweightMode,
        profile: selectedProfile,
        page_context: pageContext,
        images: attachments.map((image) => ({
          name: image.name,
          mime_type: image.mimeType,
          data_url: image.dataUrl,
        })),
      }),
    });

    if (!response.ok) {
      let detail = `Request failed (${response.status})`;
      try {
        const payload = await response.json();
        detail = payload.detail || payload.error || detail;
      } catch {
        // ignore
      }
      throw new Error(detail);
    }

    const contentType = response.headers.get("Content-Type") || "";
    if (state.streamResponses && contentType.includes("text/event-stream") && response.body) {
      state.lastTransport = "sse";
      renderClientDiagnostics();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      let finalPayload = null;
      let streamFinished = false;

      try {
        while (!streamFinished) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const rawEvent of events) {
            const lines = rawEvent
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim());
            if (!lines.length) {
              continue;
            }
            let payload;
            try {
              payload = JSON.parse(lines.join("\n"));
            } catch {
              continue;
            }
            if (payload.type === "status") {
              setStatus(payload.state || "working");
              state.lastTransport = payload.state === "streaming" ? "sse-streaming" : "sse";
              renderClientDiagnostics();
              continue;
            }
            if (payload.type === "delta") {
              assembled += payload.delta || "";
              assistant.body.textContent = assembled;
              if (state.voiceEnabled) {
                void enqueueStreamingSpeech(assembled, { keepOpen: true });
              }
              maybeScroll();
              continue;
            }
            if (payload.type === "done") {
              finalPayload = payload;
              streamFinished = true;
              state.lastChatDebug = payload;
              assistant.node.classList.remove("pending");
              assistant.body.textContent = payload.message || assembled;
              assistant.node._retrieval = payload.retrieval || null;
              if (assistant.node._retrieval) {
                assistant.node._retrieval.grounded = Boolean(payload.grounded);
                assistant.node._retrieval.fallback_grounding_used = Boolean(payload.fallback_grounding_used);
                assistant.node._retrieval.page_context_applied = Boolean(payload.page_context_applied);
                assistant.node._retrieval.backend_profile = payload.backend_profile || "";
                assistant.node._retrieval.backend_model_id = payload.backend_model_id || "";
              }
              if (payload.backend_profile) {
                  state.backendProfile = String(payload.backend_profile);
              }
              if (payload.backend_model_id) {
                state.backendModelId = String(payload.backend_model_id);
              }
              applyRetrievalDebug(assistant.debugNode, assistant.debugBody, payload.retrieval || null);
              state.lastChatLatencyMs = performance.now() - startedAt;
              state.lastGrounded = Boolean(payload.grounded);
              state.lastTransport = "sse-complete";
              setStatus(payload.grounded ? "grounded" : "complete");
              setComposerDisabled(false);
              if (state.voiceEnabled) {
                assembled = payload.message || assembled;
                void enqueueStreamingSpeech(assembled, { keepOpen: false, flush: true }).catch((error) => {
                  console.error(error);
                });
              } else {
                void ensureSpeechCached(payload.message || assembled, { announceStatus: false }).catch(() => {});
              }
              syncDebugPanel();
              maybeScroll();
              try {
                await reader.cancel();
              } catch {
                // ignore cancellation errors after a successful done event
              }
              break;
            }
            if (payload.type === "error") {
              throw new Error(payload.error || "stream_failed");
            }
          }
        }
      } catch (error) {
        if (!finalPayload) {
          throw error;
        }
      }
      if (state.voiceEnabled && !finalPayload) {
        void enqueueStreamingSpeech(assembled, { keepOpen: false, flush: true }).catch(() => {});
      }
    } else {
      state.lastTransport = "json";
      const payload = await response.json();
      state.lastChatDebug = payload;
      assistant.node.classList.remove("pending");
      assistant.body.textContent = payload.message || "";
      assistant.node._retrieval = payload.retrieval || null;
      if (assistant.node._retrieval) {
        assistant.node._retrieval.grounded = Boolean(payload.grounded);
        assistant.node._retrieval.fallback_grounding_used = Boolean(payload.fallback_grounding_used);
        assistant.node._retrieval.page_context_applied = Boolean(payload.page_context_applied);
        assistant.node._retrieval.backend_profile = payload.backend_profile || "";
        assistant.node._retrieval.backend_model_id = payload.backend_model_id || "";
      }
      if (payload.backend_profile) {
        state.backendProfile = String(payload.backend_profile);
      }
      if (payload.backend_model_id) {
        state.backendModelId = String(payload.backend_model_id);
      }
      applyRetrievalDebug(assistant.debugNode, assistant.debugBody, payload.retrieval || null);
      state.lastChatLatencyMs = performance.now() - startedAt;
      state.lastGrounded = Boolean(payload.grounded);
      state.lastTransport = "json-complete";
      setStatus(payload.grounded ? "grounded" : "complete");
      if (state.voiceEnabled) {
        void playSpeechSequence(payload.message || "", { announceStatus: false }).catch((error) => {
          console.error(error);
        });
      } else {
        void ensureSpeechCached(payload.message || "", { announceStatus: false }).catch(() => {});
      }
      syncDebugPanel();
    }
  } catch (error) {
    console.error(error);
    cancelSpeechQueue({ pauseAudio: true });
    assistant.node.classList.remove("pending");
    assistant.body.textContent = "The request failed before Sol returned a usable answer.";
    state.lastChatLatencyMs = performance.now() - startedAt;
    state.lastTransport = "error";
    showError(error.message || "Request failed.");
    setStatus("error");
  } finally {
    state.speechQueueOpen = false;
    setComposerDisabled(false);
    elements.input.focus();
    renderClientDiagnostics();
  }
}

function initScrollTracking() {
  elements.messages.addEventListener("scroll", () => {
    state.userScrolledUp = !nearBottom();
  });
}

function initComposer() {
  elements.composer.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(elements.input.value);
  });

  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(elements.input.value);
    }
  });

  elements.input.addEventListener("input", () => {
    elements.input.style.height = "auto";
    elements.input.style.height = `${Math.min(elements.input.scrollHeight, 260)}px`;
  });

  elements.attachButton?.addEventListener("click", () => {
    elements.imageInput?.click();
  });

  elements.imageInput?.addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) {
      return;
    }
    try {
      const next = [];
      for (const file of files.slice(0, 3)) {
        next.push(await normalizeImageFile(file));
      }
      state.attachments = next;
      renderAttachmentTray();
      showError("");
    } catch (error) {
      console.error(error);
      showError(error.message || "Image attach failed.");
      clearAttachments();
    }
  });
}

function initControls() {
  [
    elements.profileSelect,
    elements.persistToggle,
    elements.streamToggle,
    elements.allowActionsToggle,
    elements.lightweightToggle,
    elements.contextModeSelect,
    elements.contextTelemetryToggle,
    elements.contextRuntimeToggle,
    elements.contextTranscriptToggle,
    elements.contextCameraToggle,
  ].forEach((control) => {
    control?.addEventListener("change", syncControlStateFromUi);
  });
  elements.rawContextInput?.addEventListener("input", () => {
    syncControlStateFromUi();
  });
  elements.copyButton.addEventListener("click", copyTranscript);
  elements.resetButton.addEventListener("click", resetConversation);
  elements.historyRefreshButton?.addEventListener("click", () => {
    void loadHistory();
  });
  elements.voiceToggle?.addEventListener("click", () => {
    state.voiceEnabled = !state.voiceEnabled;
    localStorage.setItem(VOICE_KEY, state.voiceEnabled ? "on" : "off");
    if (!state.voiceEnabled) {
      stopSpeech();
    }
    updateVoiceUi();
    renderClientDiagnostics();
  });
  elements.speakButton?.addEventListener("click", () => {
    void speakLatestAssistantMessage();
  });
  elements.stopAudioButton?.addEventListener("click", stopSpeech);
  elements.debugToggle.addEventListener("click", () => {
    state.debug = !state.debug;
    updateDebugVisibility();
  });
  elements.runtimeRefresh?.addEventListener("click", () => {
    void refreshRuntimeContext();
  });
  elements.runtimeRestart?.addEventListener("click", () => {
    void restartSelectedService();
  });
  elements.runtimeServiceSelect?.addEventListener("change", () => {
    state.runtimeService = elements.runtimeServiceSelect.value || "";
    void refreshRuntimeConsole();
  });
  elements.runtimeModeSelect?.addEventListener("change", () => {
    state.runtimeMode = elements.runtimeModeSelect.value || "status";
    void refreshRuntimeConsole();
  });
  elements.cameraRefresh?.addEventListener("click", () => {
    if (elements.cameraImage) {
      elements.cameraImage.src = `${DASHBOARD_CAMERA_STREAM_URL}?ts=${Date.now()}`;
    }
  });
  elements.cameraDescribe?.addEventListener("click", () => {
    void describeCameraNow();
  });
  elements.cameraAuto?.addEventListener("click", () => {
    void toggleCameraAuto();
  });
  elements.queryForm?.addEventListener("submit", (event) => {
    void handleDirectQuery(event);
  });
  elements.knowledgeForm?.addEventListener("submit", (event) => {
    void handleKnowledgeSearch(event);
  });
}

function initPresence() {
  if (typeof window.createHueVisualizer === "function" && elements.presenceOrb && elements.presenceAudio) {
    presenceVisualizer = window.createHueVisualizer({
      canvas: elements.presenceOrb,
      mediaEl: elements.presenceAudio,
    });
  }

  elements.presenceFigure?.addEventListener("click", () => {
    elements.input.focus();
    maybeScroll(true);
  });

  elements.presenceAudio?.addEventListener("play", () => {
    setStatus("speaking");
    renderClientDiagnostics();
  });
  elements.presenceAudio?.addEventListener("ended", () => {
    state.speechQueueIndex += 1;
    if (state.speechQueueIndex < state.speechQueue.length) {
      void continueSpeechQueue(state.speechSequenceToken);
      renderClientDiagnostics();
      return;
    }
    if (state.speechQueueOpen) {
      if (!state.inflight) setStatus("working");
      renderClientDiagnostics();
      return;
    }
    cancelSpeechQueue({ pauseAudio: false });
    if (!state.inflight) setStatus("complete");
    renderClientDiagnostics();
  });
  elements.presenceAudio?.addEventListener("pause", () => {
    if (!state.inflight && elements.presenceAudio.currentTime === 0) {
      setStatus("idle");
    }
    renderClientDiagnostics();
  });

  document.addEventListener("pointerdown", () => {
    void presenceVisualizer?.unlock?.();
  }, { once: true });
}

function init() {
  state.session = getSessionId();
  state.cameraIncluded = Boolean(elements.includeCameraToggle?.checked);
  elements.sessionLabel.textContent = `session ${state.session.slice(0, 12)}`;
  if (elements.presenceSession) {
    elements.presenceSession.textContent = state.session.slice(0, 18);
  }
  initScrollTracking();
  initComposer();
  initControls();
  initPresence();
  syncControlStateFromUi();
  updateVoiceUi();
  updateDebugVisibility();
  renderAttachmentTray();
  setStatus("idle");
  renderClientDiagnostics();
  loadHistory();
  refreshHealth();
  refreshSiteMetrics();
  refreshRuntimeContext();
  refreshKnowledgeHealth();
  cameraProgressTimer = globalThis.setInterval?.(() => {
    renderCameraProgress(state.dashboardStatus?.camera || {});
  }, 250);
  metricsRefreshTimer = globalThis.setInterval?.(() => {
    void refreshHealth();
    void refreshSiteMetrics();
    void refreshRuntimeContext();
    void refreshKnowledgeHealth();
  }, 30000);
}

init();
