const SESSION_KEY = "sol_ai_app_session";
const VOICE_KEY = "sol_ai_app_voice_auto";
const DEBUG_KEY = "sol_ai_app_debug";
const CHAT_URL = "/api/chat";
const CHAT_HISTORY_URL = "/api/chat/history";
const CHAT_RESET_URL = "/api/chat/reset";
const CHAT_DELETE_URL = "/api/chat/delete";
const CHAT_SPEAK_URL = "/api/chat/speak";
const CHAT_HEALTH_URL = "/api/chat/health";
const QUERY_URL = "/api/chat/query";
const KNOWLEDGE_URL = "/api/knowledge/query";
const KNOWLEDGE_HEALTH_URL = "/api/knowledge/health";
const DASHBOARD_STATUS_URL = "/api/dashboard/status";
const DASHBOARD_CAMERA_SNAPSHOT_URL = "/api/dashboard/camera.png";
const DASHBOARD_CAMERA_STREAM_URL = "/api/dashboard/camera.mjpg";
const DASHBOARD_CAMERA_DESCRIBE_URL = "/api/dashboard/camera/describe";
const DASHBOARD_CAMERA_AUTO_URL = "/api/dashboard/camera/auto";
const DASHBOARD_SERVICE_CONSOLE_URL = "/api/dashboard/services/console";

const state = {
  session: "",
  attachments: [],
  dashboard: null,
  chatHealth: null,
  knowledgeHealth: null,
  debug: localStorage.getItem(DEBUG_KEY) === "on",
  voiceAuto: localStorage.getItem(VOICE_KEY) === "on",
  lastChatPayload: null,
  lastHistoryPayload: null,
  lastAssistantText: "",
  speechCacheText: "",
  speechCacheUrl: "",
  speechCachePromise: null,
  serviceLoaded: false,
  refreshTimer: null,
};

const elements = {
  heroSession: document.getElementById("hero-session"),
  heroStack: document.getElementById("hero-stack"),
  heroVoice: document.getElementById("hero-voice"),
  heroRefresh: document.getElementById("hero-refresh"),
  chatProfile: document.getElementById("chat-profile"),
  chatIncludeCamera: document.getElementById("chat-include-camera"),
  chatVoiceAuto: document.getElementById("chat-voice-auto"),
  chatDebugToggle: document.getElementById("chat-debug-toggle"),
  chatHistoryRefresh: document.getElementById("chat-history-refresh"),
  chatReset: document.getElementById("chat-reset"),
  chatStatus: document.getElementById("chat-status"),
  chatGrounding: document.getElementById("chat-grounding"),
  chatError: document.getElementById("chat-error"),
  chatMessages: document.getElementById("chat-messages"),
  chatComposer: document.getElementById("chat-composer"),
  chatInput: document.getElementById("chat-input"),
  chatImageInput: document.getElementById("chat-image-input"),
  chatAttachments: document.getElementById("chat-attachments"),
  chatAttach: document.getElementById("chat-attach"),
  chatSpeakLast: document.getElementById("chat-speak-last"),
  chatStopAudio: document.getElementById("chat-stop-audio"),
  chatSend: document.getElementById("chat-send"),
  cameraImage: document.getElementById("camera-image"),
  cameraOverlayText: document.getElementById("camera-overlay-text"),
  cameraConfidence: document.getElementById("camera-confidence"),
  cameraCache: document.getElementById("camera-cache"),
  cameraCaption: document.getElementById("camera-caption"),
  cameraRefresh: document.getElementById("camera-refresh"),
  cameraDescribe: document.getElementById("camera-describe"),
  cameraAuto: document.getElementById("camera-auto"),
  statusRefresh: document.getElementById("status-refresh"),
  stackGrid: document.getElementById("stack-grid"),
  healthChat: document.getElementById("health-chat"),
  healthKnowledge: document.getElementById("health-knowledge"),
  healthAccess: document.getElementById("health-access"),
  healthDashboardUrl: document.getElementById("health-dashboard-url"),
  statusSummary: document.getElementById("status-summary"),
  queryForm: document.getElementById("query-form"),
  queryInput: document.getElementById("query-input"),
  queryPersist: document.getElementById("query-persist"),
  queryOutput: document.getElementById("query-output"),
  knowledgeForm: document.getElementById("knowledge-form"),
  knowledgeInput: document.getElementById("knowledge-input"),
  knowledgeTopK: document.getElementById("knowledge-top-k"),
  knowledgeResults: document.getElementById("knowledge-results"),
  serviceSelect: document.getElementById("service-select"),
  serviceMode: document.getElementById("service-mode"),
  serviceRefresh: document.getElementById("service-refresh"),
  serviceRestart: document.getElementById("service-restart"),
  serviceConsole: document.getElementById("service-console"),
  actionLaunchers: document.getElementById("action-launchers"),
  debugPanel: document.getElementById("debug-panel"),
  debugContext: document.getElementById("debug-context"),
  debugResponse: document.getElementById("debug-response"),
  debugHistory: document.getElementById("debug-history"),
  speechAudio: document.getElementById("speech-audio"),
  messageTemplate: document.getElementById("message-template"),
};

function generateSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `sol-app-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value || "");
  }
}

function compactText(value, maxChars = 400) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 3)}...`;
}

function formatTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function setChatError(message = "") {
  elements.chatError.hidden = !message;
  elements.chatError.textContent = message;
}

function isGatewayTimeoutError(error) {
  const message = String(error?.message || error || "");
  return (
    message.includes("http_504") ||
    (message.includes("invalid_json_response:") && message.includes("504 Gateway Time-out"))
  );
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
      throw new Error(`invalid_json_response:${compactText(text, 200)}`);
    }
  }
  if (!response.ok) {
    throw new Error(payload.error || payload.detail || `http_${response.status}`);
  }
  return payload;
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("file_read_failed"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

async function fileToAttachment(file) {
  const dataUrl = await blobToDataUrl(file);
  return {
    name: file.name || "attachment",
    mime_type: file.type || "application/octet-stream",
    data_url: dataUrl,
  };
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
    mime_type: blob.type || "image/png",
    data_url: dataUrl,
  };
}

function setVoiceUi() {
  elements.chatVoiceAuto.checked = state.voiceAuto;
  elements.heroVoice.textContent = state.voiceAuto ? "voice auto on" : "voice muted";
}

function setDebugUi() {
  elements.debugPanel.hidden = !state.debug;
  elements.chatDebugToggle.textContent = state.debug ? "Debug on" : "Debug off";
  elements.chatDebugToggle.setAttribute("aria-pressed", state.debug ? "true" : "false");
  if (state.debug) {
    elements.debugContext.textContent = prettyJson(buildPageContext());
    elements.debugResponse.textContent = state.lastChatPayload
      ? prettyJson(state.lastChatPayload)
      : "No chat response yet.";
    elements.debugHistory.textContent = state.lastHistoryPayload
      ? prettyJson(state.lastHistoryPayload)
      : "History not loaded.";
  }
}

function scrollMessages() {
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
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

function createMessageNode(role, content, options = {}) {
  const fragment = elements.messageTemplate.content.cloneNode(true);
  const node = fragment.querySelector(".message");
  const roleNode = fragment.querySelector(".message-role");
  const timeNode = fragment.querySelector(".message-time");
  const bodyNode = fragment.querySelector(".message-body");
  const metaNode = fragment.querySelector(".message-meta");
  node.classList.add(role);
  if (options.pending) {
    node.classList.add("pending");
  }
  roleNode.textContent = role;
  timeNode.textContent = options.timestamp || formatTime();
  bodyNode.textContent = content || "";
  if (Number.isInteger(options.messageIndex) && options.messageIndex > 0) {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost message-delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      void deleteChatMessage(options.messageIndex);
    });
    metaNode.append(deleteButton);
    bindMessageDeleteGesture(node, () => options.messageIndex, deleteChatMessage);
  }
  return node;
}

function renderMessages(messages = []) {
  elements.chatMessages.replaceChildren();
  const filtered = messages.filter((item) => item.role !== "system");
  if (!filtered.length) {
    elements.chatMessages.append(createMessageNode("assistant", "Session ready. Ask Sol anything local.", {
      timestamp: formatTime(),
    }));
    return;
  }
  filtered.forEach((message) => {
    const node = createMessageNode(message.role || "assistant", message.content || "", {
      timestamp: formatTime(),
      messageIndex: Number.isInteger(message.index) ? message.index : null,
    });
    elements.chatMessages.append(node);
    if (message.role === "assistant" && message.content) {
      state.lastAssistantText = message.content;
    }
  });
  scrollMessages();
}

function renderAttachments() {
  const attachments = state.attachments;
  elements.chatAttachments.hidden = !attachments.length;
  elements.chatAttachments.replaceChildren();
  attachments.forEach((attachment, index) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    const label = document.createElement("span");
    label.textContent = attachment.name;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "x";
    removeButton.addEventListener("click", () => {
      state.attachments.splice(index, 1);
      renderAttachments();
    });
    chip.append(label, removeButton);
    elements.chatAttachments.append(chip);
  });
}

function summarizeServices(services = []) {
  return services
    .map((service) => `${service.id}: ${service.active}/${service.substate}`)
    .join("\n");
}

function buildPageContext() {
  const dashboard = state.dashboard || {};
  const camera = dashboard.camera || {};
  const services = Array.isArray(dashboard.services) ? dashboard.services : [];
  const stackProfiles = state.chatHealth?.stack?.profiles || [];
  return {
    target: "/sol-ai/",
    title: "Sol-AI Local App",
    content_type: "application/x.sol.local-app",
    headings: [
      "Sol Console",
      "Live Camera",
      "Service Console",
      "Knowledge Search",
      "Direct Query",
    ],
    suggested_questions: [
      "What does the live camera show right now?",
      "Which local services look unhealthy?",
      "What is the current model routing stack?",
      "Summarize this Sol app surface.",
    ],
    content: [
      "app_surface: Sol-AI Local App",
      `session: ${state.session}`,
      `voice_auto: ${state.voiceAuto}`,
      `chat_profile_selected: ${elements.chatProfile.value}`,
      `camera_caption: ${camera.caption || "none"}`,
      `camera_confidence: ${camera.caption_confidence ?? "unknown"}`,
      `camera_cached: ${Boolean(camera.caption_cached)}`,
      `camera_auto_caption: ${Boolean(camera.auto_caption_enabled)}`,
      "services:",
      summarizeServices(services) || "none",
      "stack_profiles:",
      stackProfiles
        .map((profile) => `${profile.id}: ${profile.status} running=${profile.running} model=${profile.loaded_model_id || profile.model_path || "unknown"}`)
        .join("\n") || "none",
    ].join("\n"),
  };
}

function renderStackGrid() {
  const profiles = state.chatHealth?.stack?.profiles || [];
  elements.stackGrid.replaceChildren();
  if (!profiles.length) {
    const card = document.createElement("div");
    card.className = "stack-card";
    card.innerHTML = "<strong>No stack data</strong><span>Chat health has not loaded yet.</span>";
    elements.stackGrid.append(card);
    return;
  }
  profiles.forEach((profile) => {
    const card = document.createElement("div");
    card.className = "stack-card";
    card.innerHTML = [
      `<strong>${profile.label || profile.id}</strong>`,
      `<span>${profile.summary || "No summary."}</span>`,
      `<span>status: ${profile.status || "unknown"} / running: ${profile.running ? "yes" : "no"}</span>`,
      `<code>${profile.loaded_model_id || profile.model_path || "unknown model"}</code>`,
    ].join("");
    elements.stackGrid.append(card);
  });
}

function renderDashboardStatus() {
  const dashboard = state.dashboard;
  if (!dashboard) {
    return;
  }
  const camera = dashboard.camera || {};
  const access = dashboard.access || {};
  elements.heroSession.textContent = `session ${state.session.slice(0, 8)}`;
  elements.heroStack.textContent = state.chatHealth?.backend_profile
    ? `${state.chatHealth.backend_profile} lane`
    : "stack pending";
  elements.heroRefresh.textContent = `updated ${formatTime(new Date())}`;
  elements.healthChat.textContent = state.chatHealth?.ok ? "reachable" : "offline";
  elements.healthKnowledge.textContent = state.knowledgeHealth?.ok
    ? `${state.knowledgeHealth.backend || "ready"} / ${state.knowledgeHealth.docs ?? "?"} docs`
    : "offline";
  elements.healthAccess.textContent = access.local_client
    ? "local client"
    : access.access_allowed
      ? "public enabled"
      : "blocked";
  elements.healthDashboardUrl.textContent = dashboard.site_dashboard_url || dashboard.site_base || "unknown";
  elements.statusSummary.textContent = [
    `site_base: ${dashboard.site_base || "unknown"}`,
    `chat_url: ${dashboard.chat_url || "unknown"}`,
    `camera_stream: ${dashboard.camera_stream_url || "unknown"}`,
    `services_ok: ${Array.isArray(dashboard.services) ? dashboard.services.filter((item) => item.ok).length : 0}/${Array.isArray(dashboard.services) ? dashboard.services.length : 0}`,
    `actions: ${(dashboard.actions || []).map((item) => item.id).join(", ") || "none"}`,
    `camera_caption_source: ${camera.caption_source || "unknown"}`,
    `camera_error: ${camera.camera_error || "none"}`,
    `caption_error: ${camera.caption_error || "none"}`,
  ].join("\n");

  elements.cameraImage.src = `${DASHBOARD_CAMERA_STREAM_URL}?ts=${Date.now()}`;
  elements.cameraOverlayText.textContent = camera.caption
    ? compactText(camera.caption, 140)
    : "Live stream connected. Waiting for caption.";
  elements.cameraConfidence.textContent = `confidence ${camera.caption_confidence ?? "?"}%`;
  elements.cameraCache.textContent = camera.caption_cached
    ? `cache hit / ${camera.caption_source || "cache"}`
    : `${camera.caption_source || "live"} / auto ${camera.auto_caption_enabled ? "on" : "off"}`;
  elements.cameraCaption.textContent = camera.caption || "Waiting for camera caption...";
  elements.cameraAuto.textContent = camera.auto_caption_enabled ? "Auto on" : "Auto off";

  const services = Array.isArray(dashboard.services) ? dashboard.services : [];
  const currentService = elements.serviceSelect.value;
  elements.serviceSelect.replaceChildren();
  services.forEach((service) => {
    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = service.description;
    elements.serviceSelect.append(option);
  });
  if (currentService && services.some((service) => service.id === currentService)) {
    elements.serviceSelect.value = currentService;
  }
  if (!elements.serviceSelect.value && services.length) {
    elements.serviceSelect.value = services[0].id;
  }

  elements.actionLaunchers.replaceChildren();
  (dashboard.actions || []).forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", () => launchAction(action.id));
    elements.actionLaunchers.append(button);
  });
}

async function refreshHealth() {
  const [dashboard, chatHealth, knowledgeHealth] = await Promise.all([
    fetchJson(DASHBOARD_STATUS_URL),
    fetchJson(CHAT_HEALTH_URL),
    fetchJson(KNOWLEDGE_HEALTH_URL).catch(() => null),
  ]);
  state.dashboard = dashboard;
  state.chatHealth = chatHealth;
  state.knowledgeHealth = knowledgeHealth;
  renderStackGrid();
  renderDashboardStatus();
  setDebugUi();
}

async function refreshHistory() {
  const payload = await fetchJson(`${CHAT_HISTORY_URL}?session=${encodeURIComponent(state.session)}`);
  state.lastHistoryPayload = payload;
  renderMessages(payload.messages || []);
  setDebugUi();
  return payload;
}

async function recoverTimedOutChatTurn(previousHistoryCount) {
  const attempts = 18;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, attempt < 6 ? 3000 : 5000));
    const payload = await refreshHistory();
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    const lastMessage = messages[messages.length - 1];
    if (
      messages.length > previousHistoryCount + 1 &&
      lastMessage &&
      lastMessage.role === "assistant" &&
      String(lastMessage.content || "").trim()
    ) {
      state.lastAssistantText = lastMessage.content;
      return lastMessage.content;
    }
  }
  return "";
}

async function deleteChatMessage(messageIndex) {
  if (!Number.isInteger(messageIndex) || messageIndex <= 0) {
    return;
  }
  setChatError("");
  elements.chatStatus.textContent = "deleting";
  try {
    const payload = await fetchJson(CHAT_DELETE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: state.session, persist: true, index: messageIndex }),
    });
    state.lastHistoryPayload = payload;
    renderMessages(payload.messages || []);
    setDebugUi();
    elements.chatStatus.textContent = "message deleted";
  } catch (error) {
    elements.chatStatus.textContent = "delete failed";
    setChatError(error.message || "delete_failed");
  }
}

async function refreshServiceConsole() {
  const service = elements.serviceSelect.value;
  const mode = elements.serviceMode.value;
  if (!service) {
    elements.serviceConsole.textContent = "No service selected.";
    return;
  }
  elements.serviceConsole.textContent = "Loading service output...";
  const payload = await fetchJson(
    `${DASHBOARD_SERVICE_CONSOLE_URL}?service=${encodeURIComponent(service)}&mode=${encodeURIComponent(mode)}`
  );
  elements.serviceConsole.textContent = payload.text || "(no output)";
  state.serviceLoaded = true;
}

async function launchAction(actionId) {
  const payload = await fetchJson(`/api/dashboard/action/${encodeURIComponent(actionId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  elements.serviceConsole.textContent = prettyJson(payload);
}

async function restartSelectedService() {
  const service = elements.serviceSelect.value;
  if (!service) {
    return;
  }
  const payload = await fetchJson(`/api/dashboard/services/action/${encodeURIComponent(service)}/restart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  elements.serviceConsole.textContent = prettyJson(payload);
  await refreshHealth();
  await refreshServiceConsole();
}

async function describeCameraNow() {
  const payload = await fetchJson(DASHBOARD_CAMERA_DESCRIBE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  state.dashboard = { ...(state.dashboard || {}), camera: payload.camera };
  renderDashboardStatus();
  elements.serviceConsole.textContent = prettyJson(payload);
}

async function toggleCameraAuto() {
  const current = Boolean(state.dashboard?.camera?.auto_caption_enabled);
  const payload = await fetchJson(DASHBOARD_CAMERA_AUTO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: !current }),
  });
  state.dashboard = { ...(state.dashboard || {}), camera: payload.camera };
  renderDashboardStatus();
}

async function sendChat(event) {
  event.preventDefault();
  const message = elements.chatInput.value.trim();
  if (!message && !state.attachments.length && !elements.chatIncludeCamera.checked) {
    setChatError("Enter a message or attach an image.");
    return;
  }
  setChatError("");
  elements.chatStatus.textContent = "sending";
  elements.chatSend.disabled = true;
  const pendingNode = createMessageNode("user", message || "[image turn]", {
    timestamp: formatTime(),
  });
  elements.chatMessages.append(pendingNode);
  scrollMessages();

  const images = [];
  for (const attachment of state.attachments) {
    images.push({ ...attachment });
  }
  if (elements.chatIncludeCamera.checked) {
    try {
      images.push(await fetchCameraAttachment());
    } catch (error) {
      console.warn("camera attachment failed", error);
    }
  }
  const pageContext = buildPageContext();
  const selectedProfile = elements.chatProfile.value || "reasoning";
  const previousHistoryCount = Array.isArray(state.lastHistoryPayload?.messages)
    ? state.lastHistoryPayload.messages.length
    : 0;
  const payload = {
    session: state.session,
    persist: true,
    stream: false,
    profile: images.length ? selectedProfile : "reasoning",
    message: message || "Describe the supplied image context.",
    page_context: pageContext,
  };
  if (images.length) {
    payload.images = images;
  }

  try {
    const response = await fetchJson(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    state.lastChatPayload = response;
    state.lastAssistantText = response.message || "";
    elements.chatGrounding.textContent = response.page_context_applied
      ? `grounded / ${response.backend_profile || "unknown"}`
      : `ungrounded / ${response.backend_profile || "unknown"}`;
    elements.chatStatus.textContent = response.fallback_grounding_used ? "fallback answer" : "reply ready";
    elements.chatInput.value = "";
    state.attachments = [];
    renderAttachments();
    await refreshHistory();
    setDebugUi();
    if (state.voiceAuto && state.lastAssistantText) {
      await speakText(state.lastAssistantText);
    }
  } catch (error) {
    if (isGatewayTimeoutError(error)) {
      elements.chatStatus.textContent = "waiting for late reply";
      setChatError("Gateway timed out. Waiting for the backend to finish the turn...");
      try {
        const recovered = await recoverTimedOutChatTurn(previousHistoryCount);
        if (recovered) {
          elements.chatStatus.textContent = "reply recovered";
          setChatError("");
          if (state.voiceAuto && state.lastAssistantText) {
            await speakText(state.lastAssistantText);
          }
          return;
        }
      } catch (historyError) {
        console.warn("timed-out chat recovery failed", historyError);
      }
    }
    elements.chatStatus.textContent = "send failed";
    setChatError(error.message || "send_failed");
  } finally {
    elements.chatSend.disabled = false;
  }
}

async function resetChat() {
  await fetchJson(CHAT_RESET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: state.session, persist: true }),
  });
  state.lastChatPayload = null;
  state.lastAssistantText = "";
  elements.chatGrounding.textContent = "grounding pending";
  elements.chatStatus.textContent = "reset";
  await refreshHistory();
  setDebugUi();
}

async function speakText(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return;
  }
  if (state.speechCacheUrl && state.speechCacheText === normalized) {
    elements.speechAudio.pause();
    elements.speechAudio.src = state.speechCacheUrl;
    await elements.speechAudio.play();
    return;
  }
  if (state.speechCachePromise && state.speechCacheText === normalized) {
    const cachedUrl = await state.speechCachePromise;
    elements.speechAudio.pause();
    elements.speechAudio.src = cachedUrl;
    await elements.speechAudio.play();
    return;
  }
  if (state.speechCacheUrl) {
    URL.revokeObjectURL(state.speechCacheUrl);
    state.speechCacheUrl = "";
    state.speechCacheText = "";
  }
  state.speechCacheText = normalized;
  const request = (async () => {
    const response = await fetch(CHAT_SPEAK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: normalized }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `speech_${response.status}`);
    }
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    if (state.speechCacheText !== normalized) {
      URL.revokeObjectURL(audioUrl);
      return state.speechCacheUrl || "";
    }
    state.speechCacheUrl = audioUrl;
    return audioUrl;
  })();
  state.speechCachePromise = request;
  let audioUrl = "";
  try {
    audioUrl = await request;
  } finally {
    if (state.speechCachePromise === request) {
      state.speechCachePromise = null;
    }
  }
  elements.speechAudio.pause();
  elements.speechAudio.src = audioUrl;
  await elements.speechAudio.play();
}

async function handleDirectQuery(event) {
  event.preventDefault();
  const query = elements.queryInput.value.trim();
  if (!query) {
    return;
  }
  elements.queryOutput.textContent = "Running direct query...";
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("profile", elements.chatProfile.value || "reasoning");
  params.set("page_context", JSON.stringify(buildPageContext()));
  if (elements.queryPersist.checked) {
    params.set("persist", "1");
    params.set("session", state.session);
  }
  try {
    const payload = await fetchJson(`${QUERY_URL}?${params.toString()}`);
    elements.queryOutput.textContent = prettyJson(payload);
    state.lastChatPayload = payload;
    if (elements.queryPersist.checked) {
      await refreshHistory();
    }
    setDebugUi();
  } catch (error) {
    elements.queryOutput.textContent = String(error.message || error);
  }
}

function renderKnowledgeResults(payload) {
  const results = Array.isArray(payload.results) ? payload.results : [];
  elements.knowledgeResults.replaceChildren();
  if (!results.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No results.";
    elements.knowledgeResults.append(empty);
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
    elements.knowledgeResults.append(item);
  });
}

async function handleKnowledgeSearch(event) {
  event.preventDefault();
  const query = elements.knowledgeInput.value.trim();
  if (!query) {
    return;
  }
  elements.knowledgeResults.innerHTML = '<p class="empty-state">Searching...</p>';
  try {
    const payload = await fetchJson(
      `${KNOWLEDGE_URL}?query=${encodeURIComponent(query)}&top_k=${encodeURIComponent(elements.knowledgeTopK.value)}`
    );
    renderKnowledgeResults(payload);
  } catch (error) {
    elements.knowledgeResults.innerHTML = `<p class="empty-state">${String(error.message || error)}</p>`;
  }
}

function bindEvents() {
  elements.chatComposer.addEventListener("submit", sendChat);
  elements.chatAttach.addEventListener("click", () => elements.chatImageInput.click());
  elements.chatImageInput.addEventListener("change", async () => {
    const files = Array.from(elements.chatImageInput.files || []);
    const nextAttachments = [];
    for (const file of files) {
      nextAttachments.push(await fileToAttachment(file));
    }
    state.attachments.push(...nextAttachments);
    renderAttachments();
    elements.chatImageInput.value = "";
  });
  elements.chatReset.addEventListener("click", resetChat);
  elements.chatHistoryRefresh.addEventListener("click", refreshHistory);
  elements.chatDebugToggle.addEventListener("click", () => {
    state.debug = !state.debug;
    localStorage.setItem(DEBUG_KEY, state.debug ? "on" : "off");
    setDebugUi();
  });
  elements.chatVoiceAuto.addEventListener("change", () => {
    state.voiceAuto = elements.chatVoiceAuto.checked;
    localStorage.setItem(VOICE_KEY, state.voiceAuto ? "on" : "off");
    setVoiceUi();
  });
  elements.chatSpeakLast.addEventListener("click", async () => {
    try {
      await speakText(state.lastAssistantText);
    } catch (error) {
      setChatError(error.message || "speech_failed");
    }
  });
  elements.chatStopAudio.addEventListener("click", () => {
    elements.speechAudio.pause();
    elements.speechAudio.currentTime = 0;
  });
  elements.cameraRefresh.addEventListener("click", () => {
    elements.cameraImage.src = `${DASHBOARD_CAMERA_STREAM_URL}?ts=${Date.now()}`;
  });
  elements.cameraDescribe.addEventListener("click", describeCameraNow);
  elements.cameraAuto.addEventListener("click", toggleCameraAuto);
  elements.statusRefresh.addEventListener("click", async () => {
    await refreshHealth();
    await refreshServiceConsole();
  });
  elements.queryForm.addEventListener("submit", handleDirectQuery);
  elements.knowledgeForm.addEventListener("submit", handleKnowledgeSearch);
  elements.serviceRefresh.addEventListener("click", refreshServiceConsole);
  elements.serviceRestart.addEventListener("click", restartSelectedService);
  elements.serviceMode.addEventListener("change", refreshServiceConsole);
  elements.serviceSelect.addEventListener("change", refreshServiceConsole);
  elements.chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      elements.chatComposer.requestSubmit();
    }
  });
}

async function initialLoad() {
  state.session = getSessionId();
  setVoiceUi();
  setDebugUi();
  elements.heroSession.textContent = `session ${state.session.slice(0, 8)}`;
  elements.cameraOverlayText.textContent = "Connecting camera stream...";
  elements.chatStatus.textContent = "loading";
  elements.chatGrounding.textContent = "grounding pending";
  await refreshHealth();
  await refreshHistory();
  await refreshServiceConsole();
  elements.chatStatus.textContent = "ready";
  elements.cameraImage.src = `${DASHBOARD_CAMERA_STREAM_URL}?ts=${Date.now()}`;
  state.refreshTimer = window.setInterval(async () => {
    try {
      await refreshHealth();
      if (state.serviceLoaded) {
        await refreshServiceConsole();
      }
    } catch (error) {
      console.warn("periodic refresh failed", error);
    }
  }, 30000);
}

bindEvents();
initialLoad().catch((error) => {
  elements.chatStatus.textContent = "bootstrap failed";
  setChatError(error.message || "bootstrap_failed");
});
