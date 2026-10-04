(function () {
  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function blendAngle(from, to, amount) {
    const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
    return from + delta * clamp01(amount);
  }

  function createHueVisualizer(options) {
    const canvas = options.canvas;
    const mediaEls = Array.isArray(options.mediaEls) && options.mediaEls.length
      ? options.mediaEls.filter(Boolean)
      : [options.mediaEl].filter(Boolean);
    const variant = options.variant || "hue";
    if (!canvas || !mediaEls.length) {
      throw new Error("createHueVisualizer requires { canvas, mediaEl } or { canvas, mediaEls }");
    }

    const drawCanvas = variant === "multiversal"
      ? document.createElement("canvas")
      : canvas;
    if (variant === "multiversal") {
      drawCanvas.setAttribute("aria-hidden", "true");
      drawCanvas.style.position = "fixed";
      drawCanvas.style.inset = "0";
      drawCanvas.style.width = "100vw";
      drawCanvas.style.height = "100vh";
      drawCanvas.style.pointerEvents = "none";
      drawCanvas.style.zIndex = "45";
      drawCanvas.style.mixBlendMode = "normal";
      drawCanvas.style.opacity = "0";
      drawCanvas.style.transition = "opacity 320ms ease";
      document.body.appendChild(drawCanvas);
    }

    let transparentBackground = Boolean(options.transparentBackground);
    const ctx = drawCanvas.getContext("2d", { alpha: true });
    const orbCtx = variant === "multiversal"
      ? canvas.getContext("2d", { alpha: true })
      : null;
    let ac = null;
    let analyser = null;
    let outputGain = null;
    const sourceNodes = [];
    const mediaGains = new Map();
    let freq = null;
    let timeData = null;
    let started = false;
    let rafId = 0;
    let t = 0;
    let smoothedAmp = 0;
    let visualActivitySmoothed = 0;
    let externalLevel = 0;
    let externalBands = { low: 0, mid: 0, high: 0 };
    let externalActive = false;
    let mouseAngle = -Math.PI * 0.2;
    let mouseAngleTarget = mouseAngle;
    const restAngle = -Math.PI * 0.18;
    let pointerMotionGlow = 0;
    let idleDark = 0;
    let activationCharge = 0;
    let fieldPresence = 0;
    let desktopVacuumComplete = false;
    let holdGravity = 0;
    let pointerHeld = false;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let pointerIdleFrames = 180;
    let pointerStillHoldFrames = 180;
    let immersionFrames = 0;
    let lastNarrationFrame = -1200;
    const perturbations = [];
    const starBirths = [];
    const iconParticles = [];
    const iconStates = new WeakMap();
    const stars = Array.from({ length: 56 }, (_, index) => {
      const seed = Math.sin((index + 1) * 989.123) * 10000;
      const seed2 = Math.sin((index + 1) * 313.77) * 10000;
      const seed3 = Math.sin((index + 1) * 719.41) * 10000;
      return {
        x: seed - Math.floor(seed),
        y: seed2 - Math.floor(seed2),
        r: 0.45 + (seed3 - Math.floor(seed3)) * 1.4,
        phase: index * 0.73,
      };
    });
    const touchOnlyMedia = typeof window.matchMedia === "function"
      ? window.matchMedia("(hover: none), (pointer: coarse)")
      : null;

    function pointerPoint(event) {
      const rect = drawCanvas.getBoundingClientRect();
      const x = rect.width ? clamp01((event.clientX - rect.left) / rect.width) : 0.5;
      const y = rect.height ? clamp01((event.clientY - rect.top) / rect.height) : 0.5;
      const angle = Math.atan2(y - 0.5, x - 0.5);
      return {
        angle,
        x,
        y,
      };
    }

    function shouldSuppressDesktopPointerDefault(event) {
      if (variant !== "multiversal") return false;
      if (!event || !event.cancelable) return false;
      if (typeof event.button === "number" && event.button !== 0) return false;
      const target = event.target;
      if (!(target instanceof Element)) return false;
      if (
        target.closest(
          "input, textarea, select, option, button, label, summary, iframe, video, audio, .win95-window, .start-menu, .taskbar, .push-notification-panel"
        )
      ) {
        return false;
      }
      return Boolean(target.closest(".desktop, .assistant-figure, .assistant-orb-shell, #assistant-orb"));
    }

    function trackMouse(event) {
      const point = pointerPoint(event);
      const motion = Math.hypot(point.x - pointerX, point.y - pointerY);
      mouseAngleTarget = point.angle;
      pointerX = point.x;
      pointerY = point.y;
      if (motion > 0.002) {
        pointerIdleFrames = 0;
        pointerStillHoldFrames = 0;
        pointerMotionGlow = Math.max(pointerMotionGlow, clamp01(motion * 32));
      }
    }

    function triggerFlare(event) {
      if (shouldSuppressDesktopPointerDefault(event)) {
        event.preventDefault();
      }
      const point = pointerPoint(event);
      mouseAngleTarget = point.angle;
      pointerX = point.x;
      pointerY = point.y;
      pointerIdleFrames = 0;
      pointerStillHoldFrames = 0;
      pointerHeld = true;
      pointerMotionGlow = Math.max(pointerMotionGlow, 1);
      activationCharge = clamp01(activationCharge + 0.34);
      perturbations.push({
        x: point.x,
        y: point.y,
        angle: point.angle,
        age: 0,
        life: 96,
      });
      if (perturbations.length > 6) perturbations.shift();
    }

    function releaseFlare(event) {
      if (event) trackMouse(event);
      pointerHeld = false;
    }

    function ensureAudioContext() {
      if (ac) return ac;
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      ac = new AudioCtor();
      return ac;
    }

    function ensureGraph() {
      if (started) return true;
      if (!ac) return false;
      analyser = ac.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      outputGain = ac.createGain();
      mediaEls.forEach((mediaEl) => {
        try {
          const srcNode = ac.createMediaElementSource(mediaEl);
          const mediaGain = ac.createGain();
          srcNode.connect(analyser);
          srcNode.connect(mediaGain);
          sourceNodes.push(srcNode);
          mediaGains.set(mediaEl, mediaGain);
        } catch (err) {
          console.warn("Hue visualizer could not attach media element", err);
        }
      });
      mediaGains.forEach((mediaGain) => {
        mediaGain.connect(outputGain);
      });
      outputGain.connect(ac.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);
      started = true;
      return true;
    }

    function setOutputMuted(muted) {
      if (!outputGain) return;
      outputGain.gain.value = muted ? 0 : 1;
    }

    function setMediaMuted(mediaEl, muted) {
      const mediaGain = mediaGains.get(mediaEl);
      if (!mediaGain) return;
      mediaGain.gain.value = muted ? 0 : 1;
    }

    async function unlock() {
      ensureAudioContext();
      if (ac && ac.state !== "running") {
        try {
          await ac.resume();
        } catch {}
      }
      if (!ac || ac.state !== "running") return false;
      ensureGraph();
      return true;
    }

    function resize() {
      const rect = drawCanvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width || drawCanvas.clientWidth || 1));
      const height = Math.max(1, Math.floor(rect.height || drawCanvas.clientHeight || 1));
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);
      if (drawCanvas.width !== pixelWidth || drawCanvas.height !== pixelHeight) {
        drawCanvas.width = pixelWidth;
        drawCanvas.height = pixelHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function particleColor(seed, red, green, blue) {
      if (seed % 3 === 0) return { r: Math.min(255, red + 38), g: 76, b: 82 };
      if (seed % 3 === 1) return { r: 104, g: Math.min(255, green + 42), b: 136 };
      return { r: 132, g: 188, b: Math.min(255, blue + 54) };
    }

    function spawnIconDisintegration(icon, index, w, h, horizonX, horizonY, red, green, blue) {
      let state = iconStates.get(icon);
      if (state?.disintegrated) return;

      const rect = icon.getBoundingClientRect();
      const homeX = rect.left + rect.width * 0.5;
      const homeY = rect.top + rect.height * 0.5;
      state = {
        disintegrated: true,
        reassembling: false,
        homeX,
        homeY,
      };
      iconStates.set(icon, state);
      icon.style.pointerEvents = "none";

      // Share the bounded budget across icons rather than evicting entire icons.
      const iconCount = document.querySelectorAll(".desktop a.icon").length;
      const count = Math.max(1, Math.min(18 + (index % 5) * 2, Math.floor(520 / Math.max(1, iconCount))));
      for (let i = 0; i < count; i += 1) {
        const color = particleColor(i + index, red, green, blue);
        const angle = (i / count) * Math.PI * 2 + Math.sin((index + 1) * 14.37 + i) * 0.6;
        const ring = 0.2 + (i % 7) / 7;
        const sx = homeX + Math.cos(angle) * rect.width * 0.34 * ring;
        const sy = homeY + Math.sin(angle) * rect.height * 0.34 * ring;
        const hx = horizonX + (Math.random() - 0.5) * Math.max(8, rect.width * 0.5);
        const hy = horizonY + (Math.random() - 0.5) * Math.max(8, rect.height * 0.5);
        const burstAngle = Math.atan2(hy - homeY, hx - homeX) + (Math.random() - 0.5) * 1.1;
        iconParticles.push({
          icon,
          x: sx,
          y: sy,
          vx: Math.cos(burstAngle) * (1.2 + Math.random() * 2.4),
          vy: Math.sin(burstAngle) * (1.2 + Math.random() * 2.4),
          homeX: sx,
          homeY: sy,
          horizonX: hx,
          horizonY: hy,
          age: 0,
          phase: Math.random() * Math.PI * 2,
          size: 0.8 + Math.random() * 2.4,
          state: "falling",
          r: color.r,
          g: color.g,
          b: color.b,
        });
      }
      if (iconParticles.length > 520) iconParticles.splice(0, iconParticles.length - 520);
    }

    function updateIconParticles(w, h, red, green, blue, reassemble, disk) {
      if (!iconParticles.length) return;
      ctx.globalCompositeOperation = "lighter";
      for (let i = iconParticles.length - 1; i >= 0; i -= 1) {
        const p = iconParticles[i];
        const iconState = iconStates.get(p.icon);
        if (!iconState) {
          iconParticles.splice(i, 1);
          continue;
        }
        const iconRect = p.icon.getBoundingClientRect();
        const homeX = iconRect.left + iconRect.width * 0.5 + (p.homeX - iconState.homeX) * 0.42;
        const homeY = iconRect.top + iconRect.height * 0.5 + (p.homeY - iconState.homeY) * 0.42;
        p.age += 1;

        if (reassemble) {
          if (iconState) iconState.reassembling = true;
          p.state = "returning";
        }

        if (p.state === "falling") {
          p.x += (p.horizonX - p.x) * 0.11 + p.vx * 0.24;
          p.y += (p.horizonY - p.y) * 0.11 + p.vy * 0.24;
          if (Math.hypot(p.horizonX - p.x, p.horizonY - p.y) < 8 || p.age > 26) {
            const drift = Math.atan2(p.y - p.horizonY, p.x - p.horizonX) + (Math.random() - 0.5) * 0.8;
            p.state = "star";
            p.vx = Math.cos(drift) * (0.12 + Math.random() * 0.38);
            p.vy = Math.sin(drift) * (0.12 + Math.random() * 0.38);
          }
        } else if (p.state === "star") {
          if (disk) {
            const slot = p.phase + t * (0.008 + p.size * 0.0015);
            const along = Math.cos(slot) * disk.major * (0.32 + (p.size % 2.4) * 0.18);
            const perp = Math.sin(slot * 1.7) * disk.minor * (0.45 + (p.size % 1.7) * 0.16);
            const targetX = disk.cx + Math.cos(disk.angle) * along + Math.cos(disk.angle + Math.PI * 0.5) * perp;
            const targetY = disk.cy + Math.sin(disk.angle) * along + Math.sin(disk.angle + Math.PI * 0.5) * perp;
            p.x += (targetX - p.x) * 0.055 + p.vx * 0.12;
            p.y += (targetY - p.y) * 0.055 + p.vy * 0.12;
            p.vx *= 0.96;
            p.vy *= 0.96;
          } else {
            p.vx *= 0.994;
            p.vy *= 0.994;
            p.x += p.vx;
            p.y += p.vy;
          }
        } else {
          p.x += (homeX - p.x) * 0.12;
          p.y += (homeY - p.y) * 0.12;
          p.vx *= 0.82;
          p.vy *= 0.82;
          if (Math.hypot(homeX - p.x, homeY - p.y) < 1.8) {
            iconParticles.splice(i, 1);
            const stillHasParticles = iconParticles.some((particle) => particle.icon === p.icon);
            if (!stillHasParticles) {
              p.icon.style.pointerEvents = "";
              p.icon.style.opacity = "";
              p.icon.style.filter = "";
              iconStates.delete(p.icon);
            }
            continue;
          }
        }

        if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) {
          p.x = clamp01(p.x / w) * w;
          p.y = clamp01(p.y / h) * h;
        }

        const starAlpha = p.state === "returning"
          ? 0.34 + 0.44 * clamp01(1 - Math.hypot(homeX - p.x, homeY - p.y) / Math.max(1, Math.hypot(w, h) * 0.12))
          : 0.38 + 0.5 * Math.sin(t * 0.05 + p.phase) ** 2;
        ctx.fillStyle = `rgba(${p.r || red},${p.g || green},${p.b || blue},${starAlpha * Math.max(0.45, fieldPresence)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.state === "returning" ? 1.3 : disk && p.state === "star" ? 1.18 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function updateDesktopGravity(w, h, cursorX, cursorY, orbX, orbY, horizonRadius, red, green, blue, reassemble, disk) {
      if (variant !== "multiversal") return;
      const icons = Array.from(document.querySelectorAll(".desktop a.icon")).filter((icon) => {
        const style = window.getComputedStyle?.(icon);
        if (style?.display === "none" || style?.visibility === "hidden" || icon.hidden) return false;
        const rect = icon.getBoundingClientRect();
        return Boolean(iconStates.get(icon)?.disintegrated) || (rect.width > 0 && rect.height > 0);
      });
      const strength = Math.max(fieldPresence, holdGravity);
      const musicScreensaverHold = document.body.classList.contains("music-screensaver");
      if (!icons.length || strength <= 0.01) {
        updateIconParticles(w, h, red, green, blue, !musicScreensaverHold && !pointerHeld, disk);
        resetDesktopGravity();
        desktopVacuumComplete = false;
        return;
      }
      icons.forEach((icon, index) => {
        const state = iconStates.get(icon);
        if (state?.disintegrated) {
          icon.style.transform = "";
          icon.style.opacity = reassemble ? "0.28" : "0";
          icon.style.filter = reassemble ? "blur(1.2px)" : "blur(3px)";
          return;
        }
        const rect = icon.getBoundingClientRect();
        const ix = rect.left + rect.width * 0.5;
        const iy = rect.top + rect.height * 0.5;
        const dcx = cursorX - ix;
        const dcy = cursorY - iy;
        const dox = orbX - ix;
        const doy = orbY - iy;
        const cursorDistance = Math.max(1, Math.hypot(dcx, dcy));
        const orbDistance = Math.max(1, Math.hypot(dox, doy));
        const cursorWeight = 1 / cursorDistance;
        const orbWeight = 0.7 / orbDistance;
        const combinedWeight = cursorWeight + orbWeight;
        const dx = (dcx * cursorWeight + dox * orbWeight) / combinedWeight;
        const dy = (dcy * cursorWeight + doy * orbWeight) / combinedWeight;
        const distance = Math.max(1, Math.min(cursorDistance, orbDistance));
        const reach = Math.max(w, h) * (0.34 + holdGravity * 0.34);
        const pull = clamp01(1 - distance / reach) * strength;
        const swallow = clamp01(1 - distance / Math.max(1, horizonRadius * 2.35)) * holdGravity;
        const drift = pull * pull * (0.22 + holdGravity * 0.58);
        const tx = dx * drift;
        const ty = dy * drift;
        const scale = 1 - swallow * 0.92;
        const spin = (index % 2 ? -1 : 1) * pull * holdGravity * 16;
        icon.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${spin.toFixed(2)}deg) scale(${Math.max(0.08, scale).toFixed(3)})`;
        icon.style.opacity = String(Math.max(0.08, 1 - swallow * 0.86));
        icon.style.filter = swallow > 0.08 ? `blur(${(swallow * 2.2).toFixed(2)}px) brightness(${(1 + swallow * 0.8).toFixed(2)})` : "";
        if (swallow > 0.78) {
          const horizonX = cursorDistance < orbDistance ? cursorX : orbX;
          const horizonY = cursorDistance < orbDistance ? cursorY : orbY;
          spawnIconDisintegration(icon, index, w, h, horizonX, horizonY, red, green, blue);
          icon.style.opacity = "0";
          icon.style.filter = "blur(3px)";
          icon.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${spin.toFixed(2)}deg) scale(0.04)`;
          return;
        }
        if (swallow > 0.58 && t % 5 === index % 5) {
          const horizonX = cursorDistance < orbDistance ? cursorX : orbX;
          const horizonY = cursorDistance < orbDistance ? cursorY : orbY;
          starBirths.push({
            x: (horizonX + (Math.random() - 0.5) * horizonRadius * 2.2) / w,
            y: (horizonY + (Math.random() - 0.5) * horizonRadius * 2.2) / h,
            vx: (Math.random() - 0.5) * 0.004,
            vy: (Math.random() - 0.5) * 0.004,
            age: 0,
            life: 92 + Math.random() * 80,
            phase: Math.random() * Math.PI * 2,
          });
          if (starBirths.length > 90) starBirths.splice(0, starBirths.length - 90);
        }
      });
      updateIconParticles(w, h, red, green, blue, reassemble, disk);
      // Recover even an icon whose final particle was evicted by the budget.
      if (reassemble) resetDesktopGravity();
      const complete = icons.length > 0 && icons.every((icon) => iconStates.get(icon)?.disintegrated);
      if (complete && !desktopVacuumComplete && pointerHeld) {
        window.dispatchEvent(new CustomEvent("sol:desktop-icons-vacuumed", { detail: { count: icons.length } }));
      }
      desktopVacuumComplete = complete;
    }

    function resetDesktopGravity(force = false) {
      if (variant !== "multiversal") return;
      document.querySelectorAll(".desktop a.icon").forEach((icon) => {
        if (!force && iconStates.get(icon)?.disintegrated
          && (document.body.classList.contains("music-screensaver") || pointerHeld
            || iconParticles.some((particle) => particle.icon === icon))) return;
        iconStates.delete(icon);
        icon.style.transform = "";
        icon.style.opacity = "";
        icon.style.filter = "";
        icon.style.pointerEvents = "";
      });
    }

    function maybeDispatchImmersionNarration(detail) {
      if (variant !== "multiversal") return;
      const screenSaverActive = pointerHeld || fieldPresence > 0.18 || holdGravity > 0.18 || iconParticles.length > 0 || perturbations.length > 0;
      const active = fieldPresence > 0.68 || holdGravity > 0.52 || iconParticles.length > 8;
      immersionFrames = active ? Math.min(2400, immersionFrames + 1) : Math.max(0, immersionFrames - 4);
      const heldStillReady = pointerHeld && pointerStillHoldFrames > 72;
      if (!screenSaverActive) return;
      if (!heldStillReady && immersionFrames < 420) return;
      if (t - lastNarrationFrame < 960) return;
      lastNarrationFrame = t;
      window.dispatchEvent(new CustomEvent("sol:assistant-immersion", {
        detail: {
          screenSaver: true,
          fieldPresence,
          holdGravity,
          pointerHeld,
          pointerIdleFrames,
          particleCount: iconParticles.length,
          ...detail,
        },
      }));
    }

    function drawOrbMirror(red, green, blue, ampCurve, fieldAlpha, bandPeak, activity = 1) {
      if (!orbCtx) return;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width || canvas.clientWidth || 1));
      const h = Math.max(1, Math.floor(rect.height || canvas.clientHeight || 1));
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const pixelWidth = Math.floor(w * dpr);
      const pixelHeight = Math.floor(h * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      orbCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = w * 0.5;
      const cy = h * 0.5;
      const minDim = Math.min(w, h);
      const quietPull = 1 - ampCurve;
      const motion = clamp01(activity);
      const idleMotion = 0.16 + motion * 0.84;
      const breath = 0.5 + 0.5 * Math.sin(t * (0.012 + motion * 0.02));
      const surfaceAlpha = clamp01(0.32 + fieldAlpha * 0.62 + pointerMotionGlow * 0.62 + ampCurve * 0.22);
      const baseAngle = blendAngle(restAngle, mouseAngle, clamp01(motion * 1.25));
      const angle =
        baseAngle +
        Math.sin(t * (0.001 + motion * 0.013) + blue * 0.018) * motion * (0.16 + bandPeak * 0.24) +
        pointerMotionGlow * 0.18;
      const gazeDrive = clamp01(motion);
      const directionalScale = 0.22 + gazeDrive * 0.78;
      const orbit = minDim * (0.03 + (ampCurve * 0.23 + bandPeak * 0.08 + pointerMotionGlow * 0.035) * idleMotion);
      const collapse = minDim * quietPull * 0.17 * gazeDrive;
      const lensX = cx + Math.cos(angle) * (orbit - collapse) * directionalScale;
      const lensY = cy + Math.sin(angle) * (orbit - collapse) * 0.76 * directionalScale;
      const lightDistance = minDim * (0.045 + (0.115 + ampCurve * 0.27 + bandPeak * 0.09 + pointerMotionGlow * 0.03) * gazeDrive);
      const lightX = cx + Math.cos(angle) * lightDistance;
      const lightY = cy + Math.sin(angle) * lightDistance * (0.74 + bandPeak * 0.18);
      const eventRadius = minDim * (0.125 + quietPull * 0.085 - ampCurve * 0.018);
      const lensRadius = minDim * (0.19 + ampCurve * 0.1 + bandPeak * 0.035 + pointerMotionGlow * 0.025);
      const haloRadius = minDim * (0.37 + ampCurve * 0.25 + bandPeak * 0.09 + pointerMotionGlow * 0.05);
      const ringRadius = minDim * (0.34 + ampCurve * 0.1 + pointerMotionGlow * 0.026);
      orbCtx.globalCompositeOperation = "source-over";
      orbCtx.clearRect(0, 0, w, h);

      orbCtx.save();
      orbCtx.beginPath();
      orbCtx.arc(cx, cy, minDim * 0.5, 0, Math.PI * 2);
      orbCtx.clip();

      const bg = orbCtx.createRadialGradient(cx * 0.85, cy * 0.8, minDim * 0.04, cx, cy, minDim * 0.58);
      bg.addColorStop(0, "rgba(14,31,39,0.95)");
      bg.addColorStop(0.45, "rgba(6,14,19,0.98)");
      bg.addColorStop(1, "rgba(1,4,7,1)");
      orbCtx.fillStyle = bg;
      orbCtx.fillRect(0, 0, w, h);

      const lensField = orbCtx.createRadialGradient(lightX, lightY, minDim * 0.012, cx, cy, haloRadius);
      lensField.addColorStop(0, `rgba(255,255,255,${0.84 + bandPeak * 0.12 + pointerMotionGlow * 0.04})`);
      lensField.addColorStop(0.12, `rgba(${red},${green},${blue},${0.68 + bandPeak * 0.2})`);
      lensField.addColorStop(0.34, `rgba(${red},${green},${blue},${0.22 + ampCurve * 0.22 + pointerMotionGlow * 0.08})`);
      lensField.addColorStop(0.64, `rgba(${Math.round(red * 0.55)},${Math.round(green * 0.55)},${Math.round(blue * 0.65)},${0.07 + surfaceAlpha * 0.08})`);
      lensField.addColorStop(1, "rgba(5,20,28,0)");
      orbCtx.globalCompositeOperation = "lighter";
      orbCtx.fillStyle = lensField;
      orbCtx.beginPath();
      orbCtx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      orbCtx.fill();

      for (let i = 0; i < 34; i += 1) {
        const starAngle = i * 2.399 + t * ((0.0006 + (i % 5) * 0.0002) + motion * (0.0034 + (i % 5) * 0.0008)) + mouseAngle * 0.08;
        const radius = minDim * (0.09 + ((Math.sin(i * 73.17) + 1) * 0.5) * 0.33);
        const lens = 1 + Math.cos(starAngle - angle) * (0.18 + pointerMotionGlow * 0.16);
        const sx = cx + Math.cos(starAngle) * radius * lens;
        const sy = cy + Math.sin(starAngle) * radius * (0.72 + (i % 4) * 0.045);
        const alpha = (0.045 + (i % 7) * 0.012) * surfaceAlpha;
        orbCtx.fillStyle = `rgba(210,235,255,${alpha})`;
        orbCtx.beginPath();
        orbCtx.arc(sx, sy, Math.max(0.4, minDim * 0.0045 * (1 + (i % 3) * 0.45)), 0, Math.PI * 2);
        orbCtx.fill();
      }

      const accretionAlpha = 0.2 + quietPull * 0.3 + bandPeak * 0.12 + pointerMotionGlow * 0.16;
      orbCtx.strokeStyle = `rgba(${red},${green},${blue},${accretionAlpha})`;
      orbCtx.lineWidth = minDim * (0.013 + bandPeak * 0.011);
      orbCtx.beginPath();
      orbCtx.ellipse(cx, cy, eventRadius * (1.9 + ampCurve * 0.42 + pointerMotionGlow * 0.18), eventRadius * (0.62 + ampCurve * 0.16), angle, 0, Math.PI * 2);
      orbCtx.stroke();
      orbCtx.strokeStyle = `rgba(255,255,255,${0.05 + quietPull * 0.12 + pointerMotionGlow * 0.08})`;
      orbCtx.lineWidth = minDim * 0.006;
      orbCtx.beginPath();
      orbCtx.ellipse(cx, cy, eventRadius * 1.45, eventRadius * 0.45, angle + Math.PI * 0.5, 0, Math.PI * 2);
      orbCtx.stroke();

      orbCtx.globalCompositeOperation = "source-over";
      const eventHorizon = orbCtx.createRadialGradient(cx, cy, 0, cx, cy, eventRadius * 1.7);
      eventHorizon.addColorStop(0, "rgba(0,0,0,1)");
      eventHorizon.addColorStop(0.58, "rgba(0,0,0,0.98)");
      eventHorizon.addColorStop(0.74, `rgba(0,0,0,${0.82 + quietPull * 0.15})`);
      eventHorizon.addColorStop(1, "rgba(0,0,0,0)");
      orbCtx.fillStyle = eventHorizon;
      orbCtx.beginPath();
      orbCtx.arc(cx, cy, eventRadius * 1.7, 0, Math.PI * 2);
      orbCtx.fill();

      const lens = orbCtx.createRadialGradient(lensX - lensRadius * 0.2, lensY - lensRadius * 0.22, minDim * 0.02, lensX, lensY, lensRadius);
      lens.addColorStop(0, `rgba(${Math.round(red * 0.16)},${Math.round(green * 0.2)},${Math.round(blue * 0.25)},0.94)`);
      lens.addColorStop(0.54, "rgba(4,11,16,0.98)");
      lens.addColorStop(1, "rgba(0,3,6,1)");
      orbCtx.fillStyle = lens;
      orbCtx.beginPath();
      orbCtx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2);
      orbCtx.fill();

      orbCtx.globalCompositeOperation = "lighter";
      orbCtx.strokeStyle = `rgba(${red},${green},${blue},${0.18 + ampCurve * 0.16 + pointerMotionGlow * 0.16})`;
      orbCtx.lineWidth = minDim * 0.014;
      orbCtx.beginPath();
      orbCtx.arc(lensX, lensY, lensRadius * 1.08, 0, Math.PI * 2);
      orbCtx.stroke();
      orbCtx.strokeStyle = `rgba(${red},${green},${blue},${0.16 + bandPeak * 0.24 + pointerMotionGlow * 0.1})`;
      orbCtx.lineWidth = minDim * 0.008;
      orbCtx.beginPath();
      orbCtx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      orbCtx.stroke();

      const glareAngle = angle + Math.PI;
      const glareX = lensX + Math.cos(glareAngle) * lensRadius * 0.23;
      const glareY = lensY + Math.sin(glareAngle) * lensRadius * 0.19;
      const glare = orbCtx.createRadialGradient(glareX, glareY, 0, glareX, glareY, lensRadius * 0.52);
      glare.addColorStop(0, `rgba(255,255,255,${0.17 + bandPeak * 0.08 + pointerMotionGlow * 0.08})`);
      glare.addColorStop(1, "rgba(255,255,255,0)");
      orbCtx.fillStyle = glare;
      orbCtx.beginPath();
      orbCtx.arc(glareX, glareY, lensRadius * 0.52, 0, Math.PI * 2);
      orbCtx.fill();

      const coreRadius = minDim * (0.045 + ampCurve * 0.09 + bandPeak * 0.03 + pointerMotionGlow * 0.016);
      const core = orbCtx.createRadialGradient(lightX, lightY, 0, lightX, lightY, coreRadius * 2.8);
      core.addColorStop(0, "rgba(255,255,255,1)");
      core.addColorStop(0.2, `rgba(${Math.min(255, red + 34)},${Math.min(255, green + 34)},${Math.min(255, blue + 34)},0.98)`);
      core.addColorStop(0.5, `rgba(${red},${green},${blue},${0.72 + bandPeak * 0.2})`);
      core.addColorStop(1, `rgba(${red},${green},${blue},0)`);
      orbCtx.fillStyle = core;
      orbCtx.beginPath();
      orbCtx.arc(lightX, lightY, coreRadius * 2.8, 0, Math.PI * 2);
      orbCtx.fill();

      const rayAlpha = 0.08 + quietPull * 0.08 + ampCurve * 0.08 + pointerMotionGlow * 0.14;
      orbCtx.strokeStyle = `rgba(${red},${green},${blue},${rayAlpha})`;
      orbCtx.lineWidth = minDim * 0.01;
      orbCtx.beginPath();
      orbCtx.moveTo(lightX, lightY);
      orbCtx.quadraticCurveTo(
        lensX + Math.cos(angle + Math.PI * 0.5) * lensRadius * 0.35,
        lensY + Math.sin(angle + Math.PI * 0.5) * lensRadius * 0.25,
        cx,
        cy
      );
      orbCtx.stroke();

      for (let i = 0; i < 18; i += 1) {
        const radiationAngle = angle + i * 0.349 + t * ((0.0018 + (i % 4) * 0.0004) + motion * (0.0132 + (i % 4) * 0.0016));
        const r0 = ringRadius * (0.92 + Math.sin(t * (0.006 + motion * 0.024) + i) * (0.012 + motion * 0.023));
        const sx = cx + Math.cos(radiationAngle) * r0;
        const sy = cy + Math.sin(radiationAngle) * r0;
        const tail = minDim * (0.018 + (i % 4) * 0.004 + pointerMotionGlow * 0.012);
        orbCtx.strokeStyle = `rgba(214,240,255,${(0.045 + pointerMotionGlow * 0.08 + breath * 0.025) * surfaceAlpha})`;
        orbCtx.lineWidth = Math.max(0.55, minDim * 0.0038);
        orbCtx.beginPath();
        orbCtx.moveTo(sx, sy);
        orbCtx.lineTo(sx + Math.cos(radiationAngle + Math.PI * 0.5) * tail, sy + Math.sin(radiationAngle + Math.PI * 0.5) * tail);
        orbCtx.stroke();
      }

      const pulseRadius = lensRadius * (1.02 + ampCurve * 0.16 + pointerMotionGlow * 0.08);
      orbCtx.strokeStyle = `rgba(${red},${green},${blue},${0.14 + ampCurve * 0.24 + bandPeak * 0.12 + pointerMotionGlow * 0.12})`;
      orbCtx.lineWidth = minDim * 0.01;
      orbCtx.beginPath();
      orbCtx.arc(lensX, lensY, pulseRadius, 0, Math.PI * 2);
      orbCtx.stroke();
      orbCtx.restore();
    }

    function getAmplitudeRms() {
      const fallback = externalActive ? clamp01(externalLevel) : 0;
      if (!analyser || !timeData) return fallback;
      analyser.getByteTimeDomainData(timeData);
      let sumSq = 0;
      for (let i = 0; i < timeData.length; i += 1) {
        const v = (timeData[i] - 128) / 128;
        sumSq += v * v;
      }
      return Math.max(Math.sqrt(sumSq / timeData.length), fallback);
    }

    function getBands() {
      if (!analyser || !freq) {
        return externalActive ? { ...externalBands } : { low: 0, mid: 0, high: 0 };
      }
      analyser.getByteFrequencyData(freq);
      const n = freq.length;
      const lowEnd = Math.floor(n * 0.18);
      const midEnd = Math.floor(n * 0.55);
      let low = 0;
      let mid = 0;
      let high = 0;
      for (let i = 0; i < lowEnd; i += 1) low += freq[i];
      for (let i = lowEnd; i < midEnd; i += 1) mid += freq[i];
      for (let i = midEnd; i < n; i += 1) high += freq[i];
      low /= Math.max(1, lowEnd * 255);
      mid /= Math.max(1, (midEnd - lowEnd) * 255);
      high /= Math.max(1, (n - midEnd) * 255);
      const nativeBands = {
        low: Math.pow(clamp01(low), 0.85),
        mid: Math.pow(clamp01(mid), 0.85),
        high: Math.pow(clamp01(high), 0.85),
      };
      if (!externalActive) return nativeBands;
      return {
        low: Math.max(nativeBands.low, externalBands.low),
        mid: Math.max(nativeBands.mid, externalBands.mid),
        high: Math.max(nativeBands.high, externalBands.high),
      };
    }

    function drawVideoOverlay(w, h, cx, cy, ampCurve, low, mid, high, breath) {
      const minDim = Math.min(w, h);
      const maxDim = Math.max(w, h);
      const bandPeak = clamp01(Math.max(low, mid, high) * 1.25);
      const activity = clamp01(ampCurve * 1.1 + bandPeak * 0.65);
      const phase = t * (0.006 + activity * 0.006);
      const red = Math.round(126 + low * 84 + bandPeak * 18);
      const green = Math.round(174 + mid * 62 + bandPeak * 12);
      const blue = Math.round(204 + high * 48 + bandPeak * 24);
      const warmR = Math.round(230 + low * 20);
      const warmG = Math.round(180 + mid * 40);
      const warmB = Math.round(104 + high * 28);

      ctx.globalCompositeOperation = "lighter";

      const edgeField = ctx.createRadialGradient(cx, cy, minDim * 0.14, cx, cy, maxDim * 0.7);
      edgeField.addColorStop(0, `rgba(${red},${green},${blue},${0.012 + activity * 0.02})`);
      edgeField.addColorStop(0.58, `rgba(${red},${green},${blue},${0.026 + activity * 0.04})`);
      edgeField.addColorStop(1, `rgba(${warmR},${warmG},${warmB},0)`);
      ctx.fillStyle = edgeField;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 4; i += 1) {
        const alpha = (0.035 + activity * 0.12) * (1 - i * 0.16);
        ctx.strokeStyle = i % 2 === 0
          ? `rgba(${red},${green},${blue},${alpha})`
          : `rgba(${warmR},${warmG},${warmB},${alpha * 0.72})`;
        ctx.lineWidth = Math.max(1, minDim * (0.002 + activity * 0.0028));
        ctx.beginPath();
        ctx.ellipse(
          cx + Math.cos(phase + i) * minDim * 0.014,
          cy + Math.sin(phase * 0.85 + i) * minDim * 0.01,
          minDim * (0.38 + i * 0.075 + low * 0.06),
          minDim * (0.21 + i * 0.044 + high * 0.035),
          phase * 0.28 + i * 0.46,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      if (freq && freq.length) {
        const bars = 24;
        const baseY = h - minDim * 0.06;
        const step = w / bars;
        for (let i = 0; i < bars; i += 1) {
          const start = Math.floor((i / bars) * freq.length * 0.38);
          const end = Math.max(start + 1, Math.floor(((i + 1) / bars) * freq.length * 0.38));
          let sum = 0;
          for (let j = start; j < end; j += 1) sum += freq[j] || 0;
          const level = clamp01((sum / Math.max(1, end - start)) / 255);
          const barH = minDim * (0.012 + Math.pow(level, 0.72) * 0.09);
          const alpha = 0.055 + level * 0.13 + activity * 0.035;
          ctx.fillStyle = i % 2
            ? `rgba(${warmR},${warmG},${warmB},${alpha * 0.7})`
            : `rgba(${red},${green},${blue},${alpha})`;
          ctx.fillRect(i * step + step * 0.28, baseY - barH, Math.max(1, step * 0.45), barH);
        }
      }

      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * (0.18 + activity * 0.12));
      centerGlow.addColorStop(0, `rgba(255,255,255,${0.025 + activity * 0.055})`);
      centerGlow.addColorStop(0.38, `rgba(${red},${green},${blue},${0.035 + activity * 0.07})`);
      centerGlow.addColorStop(1, `rgba(${red},${green},${blue},0)`);
      ctx.fillStyle = centerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, minDim * (0.18 + activity * 0.12 + breath * 0.008), 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
    }

    function draw() {
      rafId = window.requestAnimationFrame(draw);
      resize();
      t += 1;

      const rect = drawCanvas.getBoundingClientRect();
      const w = Math.max(1, rect.width || drawCanvas.clientWidth || 1);
      const h = Math.max(1, rect.height || drawCanvas.clientHeight || 1);
      const cx = w * 0.5;
      const cy = h * 0.5;

      if (transparentBackground) {
        ctx.clearRect(0, 0, w, h);
      } else {
        ctx.fillStyle = "rgba(5,6,10,0.22)";
        ctx.fillRect(0, 0, w, h);
      }

      if (!started && variant !== "multiversal") {
        if (transparentBackground) return;
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      const amp = getAmplitudeRms();
      const { low, mid, high } = getBands();
      const breath = 0.5 + 0.5 * Math.sin(t * 0.02);
      if (variant === "multiversal") {
        smoothedAmp = smoothedAmp * 0.84 + amp * 0.16;
        mouseAngle += Math.atan2(Math.sin(mouseAngleTarget - mouseAngle), Math.cos(mouseAngleTarget - mouseAngle)) * 0.08;
        pointerMotionGlow *= 0.93;

        const minDim = Math.min(w, h);
        const ampCurve = Math.pow(clamp01(smoothedAmp * 4.2), 0.72);
        const audioActive = (started && mediaEls.some((mediaEl) => !mediaEl.paused && !mediaEl.ended)) || externalActive;
        // The shell owns activation, including a latch awaiting autoplay permission.
        const musicScreensaverHold = document.body.classList.contains("music-screensaver");
        const mobileLike = Boolean(touchOnlyMedia?.matches);
        pointerIdleFrames = pointerHeld ? 0 : Math.min(240, pointerIdleFrames + 1);
        pointerStillHoldFrames = pointerHeld ? Math.min(240, pointerStillHoldFrames + 1) : 180;
        const reassembleIcons = !musicScreensaverHold && !pointerHeld && pointerIdleFrames > 54;
        activationCharge = clamp01(activationCharge - (pointerHeld ? 0 : 0.0025));
        holdGravity += ((pointerHeld ? 1 : 0) - holdGravity) * (pointerHeld ? 0.13 : 0.045);
        const bandPeak = clamp01(Math.max(low, mid, high) * 1.38);
        const visualActivity = clamp01((audioActive ? 0.18 : 0) + ampCurve * 0.82 + bandPeak * 0.58 + pointerMotionGlow * 0.72 + fieldPresence * 0.46 + holdGravity * 0.42);
        visualActivitySmoothed += (visualActivity - visualActivitySmoothed) * (visualActivity > visualActivitySmoothed ? 0.12 : 0.045);
        // Embedded page audio animates the orb only. The screen-wide field is opt-in.
        const mediaFieldDrive = audioActive && musicScreensaverHold
          ? clamp01(0.24 + ampCurve * 0.72 + bandPeak * 0.34)
          : 0;
        const screenSaverActive = pointerHeld || activationCharge > 0.18 || iconParticles.length > 0 || perturbations.length > 0 || mediaFieldDrive > 0.04;
        const fieldTarget = musicScreensaverHold || pointerHeld || activationCharge > 0.72
          ? 1
          : iconParticles.length > 0
            ? 0.82
            : mediaFieldDrive > 0
              ? Math.max(0.34, mediaFieldDrive)
            : screenSaverActive
              ? 0.56
              : 0;
        // The final swallowed icon latches the shell: snap fully on next frame.
        if (musicScreensaverHold) fieldPresence = 1;
        else fieldPresence += (fieldTarget - fieldPresence) * (fieldTarget > fieldPresence ? 0.085 : 0.028);
        if (mediaFieldDrive > 0) {
          pointerMotionGlow = Math.max(pointerMotionGlow, mediaFieldDrive * (mobileLike ? 0.28 : 0.14));
        }
        drawCanvas.style.opacity = String(clamp01(fieldPresence * 0.96));
        canvas.style.opacity = String(1 - fieldPresence * 0.82);
        if (fieldPresence <= 0.015) resetDesktopGravity();
        idleDark += (((!started || ampCurve < 0.08 || fieldPresence > 0.2) ? 1 : 0) - idleDark) * 0.045;
        const quietPull = 1 - ampCurve;
        const red = Math.round(58 + clamp01(low * 1.75) * 184 + bandPeak * 24);
        const green = Math.round(78 + clamp01(mid * 1.65) * 170 + bandPeak * 26);
        const blue = Math.round(112 + clamp01(high * 1.75) * 136 + bandPeak * 32);
        const orbRect = canvas.getBoundingClientRect();
        const orbX = clamp01((orbRect.left + orbRect.width * 0.5) / Math.max(1, w)) * w;
        const orbY = clamp01((orbRect.top + orbRect.height * 0.5) / Math.max(1, h)) * h;
        const cursorX = pointerX * w;
        const cursorY = pointerY * h;
        const binaryAngle = Math.atan2(cursorY - orbY, cursorX - orbX);
        const binaryDistance = Math.max(minDim * 0.08, Math.hypot(cursorX - orbX, cursorY - orbY));
        const baryX = (cursorX * (0.62 + holdGravity * 0.16) + orbX * 0.74) / (1.36 + holdGravity * 0.16);
        const baryY = (cursorY * (0.62 + holdGravity * 0.16) + orbY * 0.74) / (1.36 + holdGravity * 0.16);
        const directionDrive = clamp01(visualActivitySmoothed);
        const stableBinaryAngle = blendAngle(restAngle, binaryAngle, clamp01(directionDrive * 1.35 + holdGravity * 0.28));
        const phase = stableBinaryAngle
          + Math.sin(t * (0.0015 + directionDrive * 0.0105) + high * 6.0) * directionDrive * (0.22 + bandPeak * 0.26)
          + (mid * 0.55 - low * 0.34) * directionDrive;
        const altPhase = phase + Math.PI * (0.72 + Math.sin(t * (0.0012 + directionDrive * 0.0078)) * 0.11 * directionDrive);
        const directionScale = 0.22 + directionDrive * 0.78;
        const orbit = minDim * (0.035 + (ampCurve * 0.24 + bandPeak * 0.08) * directionDrive);
        const collapse = minDim * quietPull * 0.16 * directionDrive;
        const lensX = baryX + Math.cos(phase) * (orbit - collapse) * directionScale;
        const lensY = baryY + Math.sin(phase) * (orbit - collapse) * 0.78 * directionScale;
        const shadowX = baryX + Math.cos(altPhase) * (orbit * 0.6 - collapse * 0.4) * directionScale;
        const shadowY = baryY + Math.sin(altPhase) * (orbit * 0.6 - collapse * 0.4) * 0.72 * directionScale;
        const lightDistance = minDim * (0.05 + (0.12 + ampCurve * 0.27 + high * 0.11) * directionDrive);
        const lightX = baryX + Math.cos(phase) * lightDistance;
        const lightY = baryY + Math.sin(phase) * lightDistance * (0.76 + mid * 0.24);
        const eventRadius = minDim * (0.105 + quietPull * 0.075);
        const lensRadius = minDim * (0.17 + ampCurve * 0.105 + bandPeak * 0.032);
        const haloRadius = minDim * (0.34 + ampCurve * 0.26 + bandPeak * 0.1);
        const cursorRadius = minDim * (0.038 + holdGravity * 0.068 + fieldPresence * 0.026);
        const orbRadius = minDim * (0.045 + fieldPresence * 0.05 + ampCurve * 0.03);
        const accretionDisk = {
          cx: (cursorX + orbX) * 0.5,
          cy: (cursorY + orbY) * 0.5,
          angle: stableBinaryAngle,
          major: Math.max(minDim * 0.12, binaryDistance * 0.52),
          minor: Math.max(minDim * 0.018, Math.min(minDim * 0.08, binaryDistance * 0.12)),
        };
        drawOrbMirror(red, green, blue, ampCurve, fieldPresence, bandPeak, directionDrive);
        maybeDispatchImmersionNarration({
          reassembling: reassembleIcons,
          phase: reassembleIcons ? "reassembly" : pointerHeld ? "held-binary" : "star-field",
          barycenter: { x: baryX / w, y: baryY / h },
          cursor: { x: pointerX, y: pointerY },
        });

        ctx.globalCompositeOperation = "source-over";
        const deepSpace = ctx.createRadialGradient(baryX * 0.56, baryY * 0.52, 0, baryX, baryY, Math.max(w, h) * 0.74);
        deepSpace.addColorStop(0, `rgba(${Math.round(26 - idleDark * 16)},${Math.round(34 - idleDark * 20)},${Math.round(60 - idleDark * 32)},0.9)`);
        deepSpace.addColorStop(0.45, "rgba(7,10,22,0.96)");
        deepSpace.addColorStop(1, "rgba(2,3,8,1)");
        ctx.fillStyle = deepSpace;
        ctx.fillRect(0, 0, w, h);

        if (idleDark > 0.03) {
          ctx.globalCompositeOperation = "lighter";
          for (const star of stars) {
            const twinkle = 0.45 + 0.55 * Math.sin(t * 0.018 + star.phase);
            ctx.fillStyle = `rgba(205,226,255,${idleDark * (0.28 + twinkle * 0.58)})`;
            ctx.beginPath();
            ctx.arc(star.x * w, star.y * h, star.r * (0.75 + idleDark * 1.05), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.globalCompositeOperation = "lighter";
        const field = ctx.createRadialGradient(lightX, lightY, minDim * 0.01, cx, cy, haloRadius);
        field.addColorStop(0, `rgba(255,255,255,${(0.86 + bandPeak * 0.12) * (1 - idleDark * 0.84)})`);
        field.addColorStop(0.12, `rgba(${red},${green},${blue},${(0.68 + bandPeak * 0.24) * (1 - idleDark * 0.78)})`);
        field.addColorStop(0.38, `rgba(${red},${green},${blue},${(0.18 + ampCurve * 0.24) * (1 - idleDark * 0.7)})`);
        field.addColorStop(1, "rgba(8,12,26,0)");
        ctx.fillStyle = field;
        ctx.beginPath();
        ctx.arc(baryX, baryY, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        for (let i = starBirths.length - 1; i >= 0; i -= 1) {
          const star = starBirths[i];
          star.age += 1;
          const life = clamp01(1 - star.age / star.life);
          if (life <= 0) {
            starBirths.splice(i, 1);
            continue;
          }
          star.x += star.vx;
          star.y += star.vy;
          if (fieldPresence > 0.08) {
            const slot = (star.phase || 0) + t * 0.006;
            const targetX = accretionDisk.cx + Math.cos(stableBinaryAngle) * Math.cos(slot) * accretionDisk.major * 0.88
              + Math.cos(stableBinaryAngle + Math.PI * 0.5) * Math.sin(slot * 1.6) * accretionDisk.minor;
            const targetY = accretionDisk.cy + Math.sin(stableBinaryAngle) * Math.cos(slot) * accretionDisk.major * 0.88
              + Math.sin(stableBinaryAngle + Math.PI * 0.5) * Math.sin(slot * 1.6) * accretionDisk.minor;
            star.x += (targetX / w - star.x) * 0.045;
            star.y += (targetY / h - star.y) * 0.045;
          }
          const born = 1 - life;
          ctx.fillStyle = `rgba(210,236,255,${fieldPresence * Math.sin(born * Math.PI) * 0.95})`;
          ctx.beginPath();
          ctx.arc(star.x * w, star.y * h, (0.8 + born * 2.8) * fieldPresence, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = 0; i < 3; i += 1) {
          const probability = (i - 1) * 0.11;
          ctx.strokeStyle = `rgba(${red},${green},${blue},${0.08 + ampCurve * 0.08 + i * 0.025})`;
          ctx.lineWidth = minDim * (0.006 + i * 0.003);
          ctx.beginPath();
          ctx.ellipse(
            baryX,
            baryY,
            eventRadius * (1.85 + ampCurve * 0.5 + i * 0.26),
            eventRadius * (0.54 + ampCurve * 0.16 + i * 0.08),
            phase + probability,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }

        if (fieldPresence > 0.04) {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = `rgba(210,232,255,${0.13 * fieldPresence + holdGravity * 0.18})`;
          ctx.lineWidth = minDim * (0.003 + holdGravity * 0.005);
          ctx.beginPath();
          ctx.moveTo(orbX, orbY);
          ctx.bezierCurveTo(
            orbX + Math.cos(stableBinaryAngle - Math.PI * 0.5) * binaryDistance * 0.24,
            orbY + Math.sin(stableBinaryAngle - Math.PI * 0.5) * binaryDistance * 0.24,
            cursorX + Math.cos(stableBinaryAngle + Math.PI * 0.5) * binaryDistance * 0.24,
            cursorY + Math.sin(stableBinaryAngle + Math.PI * 0.5) * binaryDistance * 0.24,
            cursorX,
            cursorY
          );
          ctx.stroke();

          ctx.strokeStyle = `rgba(${red},${green},${blue},${0.1 + fieldPresence * 0.22})`;
          ctx.lineWidth = minDim * (0.006 + fieldPresence * 0.006);
          ctx.beginPath();
          ctx.ellipse(
            accretionDisk.cx,
            accretionDisk.cy,
            accretionDisk.major,
            accretionDisk.minor,
            accretionDisk.angle,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }

        const shadowLens = ctx.createRadialGradient(shadowX, shadowY, 0, shadowX, shadowY, lensRadius * 1.25);
        shadowLens.addColorStop(0, `rgba(${Math.round(red * 0.35)},${Math.round(green * 0.32)},${blue},${0.12 + bandPeak * 0.14})`);
        shadowLens.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = shadowLens;
        ctx.beginPath();
        ctx.arc(shadowX, shadowY, lensRadius * 1.25, 0, Math.PI * 2);
        ctx.fill();

        for (let i = perturbations.length - 1; i >= 0; i -= 1) {
          const p = perturbations[i];
          p.age += 1;
          const life = clamp01(1 - p.age / p.life);
          if (life <= 0) {
            perturbations.splice(i, 1);
            continue;
          }
          const eased = Math.pow(life, 0.68);
          const px = p.x * w;
          const py = p.y * h;
          const ripple = minDim * (0.06 + (1 - life) * 0.46);
          const horizonR = minDim * (0.035 + eased * 0.07);

          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = `rgba(${red},${green},${blue},${0.24 * eased})`;
          ctx.lineWidth = minDim * (0.005 + eased * 0.01);
          ctx.beginPath();
          ctx.ellipse(px, py, ripple * 1.28, ripple * 0.5, p.angle, 0, Math.PI * 2);
          ctx.stroke();

          const clickFlare = ctx.createRadialGradient(px, py, 0, px, py, minDim * (0.1 + eased * 0.22));
          clickFlare.addColorStop(0, `rgba(255,255,255,${0.72 * eased})`);
          clickFlare.addColorStop(0.22, `rgba(${Math.min(255, red + 44)},${Math.min(255, green + 44)},${Math.min(255, blue + 44)},${0.5 * eased})`);
          clickFlare.addColorStop(0.62, `rgba(${red},${green},${blue},${0.16 * eased})`);
          clickFlare.addColorStop(1, `rgba(${red},${green},${blue},0)`);
          ctx.fillStyle = clickFlare;
          ctx.beginPath();
          ctx.arc(px, py, minDim * (0.1 + eased * 0.22), 0, Math.PI * 2);
          ctx.fill();

          ctx.globalCompositeOperation = "source-over";
          const clickHorizon = ctx.createRadialGradient(px, py, 0, px, py, horizonR * 1.65);
          clickHorizon.addColorStop(0, `rgba(0,0,0,${0.92 * eased})`);
          clickHorizon.addColorStop(0.62, `rgba(0,0,0,${0.78 * eased})`);
          clickHorizon.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = clickHorizon;
          ctx.beginPath();
          ctx.arc(px, py, horizonR * 1.65, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = `rgba(238,248,255,${0.18 * eased})`;
          ctx.lineWidth = minDim * (0.004 + eased * 0.008);
          ctx.beginPath();
          ctx.moveTo(lightX, lightY);
          ctx.bezierCurveTo(
            lensX + Math.cos(p.angle + Math.PI * 0.5) * lensRadius * 0.7,
            lensY + Math.sin(p.angle + Math.PI * 0.5) * lensRadius * 0.45,
            px - Math.cos(p.angle) * minDim * 0.14,
            py - Math.sin(p.angle) * minDim * 0.08,
            px,
            py
          );
          ctx.stroke();
        }

        ctx.globalCompositeOperation = "source-over";
        const eventHorizon = ctx.createRadialGradient(baryX, baryY, 0, baryX, baryY, eventRadius * 1.85);
        eventHorizon.addColorStop(0, "rgba(0,0,0,1)");
        eventHorizon.addColorStop(0.54, "rgba(0,0,0,0.98)");
        eventHorizon.addColorStop(0.78, `rgba(0,0,0,${0.74 + quietPull * 0.2})`);
        eventHorizon.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = eventHorizon;
        ctx.beginPath();
        ctx.arc(baryX, baryY, eventRadius * 1.85, 0, Math.PI * 2);
        ctx.fill();

        const lens = ctx.createRadialGradient(lensX - lensRadius * 0.18, lensY - lensRadius * 0.22, minDim * 0.016, lensX, lensY, lensRadius);
        lens.addColorStop(0, "rgba(235,246,255,0.32)");
        lens.addColorStop(0.28, `rgba(${Math.round(red * 0.2)},${Math.round(green * 0.24)},${Math.round(blue * 0.32)},0.96)`);
        lens.addColorStop(0.72, "rgba(3,7,15,0.98)");
        lens.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = lens;
        ctx.beginPath();
        ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(${red},${green},${blue},${0.18 + ampCurve * 0.22 + bandPeak * 0.16})`;
        ctx.lineWidth = minDim * 0.012;
        ctx.beginPath();
        ctx.arc(lensX, lensY, lensRadius * (1.05 + ampCurve * 0.08), 0, Math.PI * 2);
        ctx.stroke();

        const coreRadius = minDim * (0.035 + ampCurve * 0.095 + bandPeak * 0.034);
        const core = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, coreRadius * 3.0);
        core.addColorStop(0, "rgba(255,255,255,1)");
        core.addColorStop(0.2, `rgba(${Math.min(255, red + 38)},${Math.min(255, green + 38)},${Math.min(255, blue + 38)},0.98)`);
        core.addColorStop(0.5, `rgba(${red},${green},${blue},${0.7 + bandPeak * 0.24})`);
        core.addColorStop(1, `rgba(${red},${green},${blue},0)`);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(lightX, lightY, coreRadius * 3.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(238,248,255,${0.08 + quietPull * 0.08 + ampCurve * 0.09})`;
        ctx.lineWidth = minDim * 0.006;
        ctx.beginPath();
        ctx.moveTo(lightX, lightY);
        ctx.bezierCurveTo(
          lensX + Math.cos(phase + Math.PI * 0.5) * lensRadius * 0.58,
          lensY + Math.sin(phase + Math.PI * 0.5) * lensRadius * 0.42,
          baryX + Math.cos(altPhase) * eventRadius * 1.4,
          baryY + Math.sin(altPhase) * eventRadius * 0.9,
          shadowX,
          shadowY
        );
        ctx.stroke();

        if (fieldPresence > 0.03) {
          const drawBody = (x, y, radius, massAlpha) => {
            ctx.globalCompositeOperation = "source-over";
            const horizon = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.35);
            horizon.addColorStop(0, `rgba(0,0,0,${0.98 * massAlpha})`);
            horizon.addColorStop(0.58, `rgba(0,0,0,${0.9 * massAlpha})`);
            horizon.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = horizon;
            ctx.beginPath();
            ctx.arc(x, y, radius * 2.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalCompositeOperation = "lighter";
            ctx.strokeStyle = `rgba(${red},${green},${blue},${0.3 * massAlpha})`;
            ctx.lineWidth = minDim * 0.005;
            ctx.beginPath();
            ctx.ellipse(x, y, radius * 2.35, radius * 0.76, binaryAngle, 0, Math.PI * 2);
            ctx.stroke();
          };
          drawBody(orbX, orbY, orbRadius, fieldPresence * 0.86);
          drawBody(cursorX, cursorY, cursorRadius, Math.max(fieldPresence, holdGravity) * 0.98);
          updateDesktopGravity(w, h, cursorX, cursorY, orbX, orbY, Math.max(cursorRadius, orbRadius), red, green, blue, reassembleIcons, accretionDisk);
        } else if (iconParticles.length) {
          updateIconParticles(w, h, red, green, blue, true, accretionDisk);
        }

        ctx.globalCompositeOperation = "source-over";
        return;
      }
      const ampCurve = Math.pow(clamp01(amp * 2.2), 0.9);
      if (transparentBackground) {
        drawVideoOverlay(w, h, cx, cy, ampCurve, low, mid, high, breath);
        return;
      }
      const minR = Math.min(w, h) * 0.03;
      const maxR = Math.min(w, h) * 0.28;
      const radius = minR + (maxR - minR) * clamp01(ampCurve) + breath * 2;

      const mag = Math.max(0.001, low + mid + high);
      const r0 = low / mag;
      const g0 = mid / mag;
      const b0 = high / mag;
      let colorMix = clamp01((ampCurve - 0.06) / 0.55);
      colorMix = Math.pow(colorMix, 0.45);

      const r = (1 - colorMix) * 1.0 + colorMix * r0;
      const g = (1 - colorMix) * 1.0 + colorMix * g0;
      const b = (1 - colorMix) * 1.0 + colorMix * b0;

      const coreBright = 0.95;
      const haloBright = 0.55 + 0.35 * (1 - clamp01(ampCurve));

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const core = `rgba(${Math.round(255 * coreBright)},${Math.round(255 * coreBright)},${Math.round(255 * coreBright)},1)`;
      const midC = `rgba(${Math.round(255 * r)},${Math.round(255 * g)},${Math.round(255 * b)},0.92)`;
      const edge = `rgba(${Math.round(255 * r)},${Math.round(255 * g)},${Math.round(255 * b)},0)`;
      grad.addColorStop(0.0, core);
      grad.addColorStop(0.22, core);
      grad.addColorStop(0.55, midC);
      grad.addColorStop(1.0, edge);

      const haloR = radius * (1.6 + ampCurve * 1.2);
      const halo = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, haloR);
      halo.addColorStop(0.0, `rgba(${Math.round(255 * r)},${Math.round(255 * g)},${Math.round(255 * b)},${0.35 * haloBright})`);
      halo.addColorStop(1.0, `rgba(${Math.round(255 * r)},${Math.round(255 * g)},${Math.round(255 * b)},0)`);

      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      const hlR = radius * 0.22;
      const hx = cx - radius * 0.25;
      const hy = cy - radius * 0.25;
      const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, hlR);
      hl.addColorStop(0, "rgba(255,255,255,0.55)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.beginPath();
      ctx.arc(hx, hy, hlR, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
    }

    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => resize())
      : null;
    resizeObserver?.observe(canvas);
    window.addEventListener("resize", resize);
    if (variant === "multiversal") {
      window.addEventListener("pointermove", trackMouse, { passive: true });
      window.addEventListener("pointerdown", triggerFlare, { passive: false });
      window.addEventListener("pointerup", releaseFlare, { passive: true });
      window.addEventListener("pointercancel", releaseFlare, { passive: true });
    }
    rafId = window.requestAnimationFrame(draw);

    return {
      unlock,
      setOutputMuted,
      setMediaMuted,
      getCurrentLevel() {
        return clamp01(getAmplitudeRms());
      },
      getCurrentBands() {
        return getBands();
      },
      setTransparentBackground(enabled) {
        transparentBackground = Boolean(enabled);
      },
      setExternalLevel(level, active = true, bands = null) {
        externalLevel = clamp01(level);
        externalActive = Boolean(active) && externalLevel > 0.001;
        if (bands && typeof bands === "object") {
          externalBands = {
            low: clamp01(bands.low ?? externalLevel),
            mid: clamp01(bands.mid ?? externalLevel),
            high: clamp01(bands.high ?? externalLevel),
          };
        } else {
          externalBands = {
            low: clamp01(externalLevel * 0.92),
            mid: clamp01(externalLevel * 0.98),
            high: clamp01(externalLevel),
          };
        }
      },
      destroy() {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        resizeObserver?.disconnect();
        window.removeEventListener("resize", resize);
        if (variant === "multiversal") {
          window.removeEventListener("pointermove", trackMouse);
          window.removeEventListener("pointerdown", triggerFlare);
          window.removeEventListener("pointerup", releaseFlare);
          window.removeEventListener("pointercancel", releaseFlare);
          iconParticles.length = 0;
          resetDesktopGravity(true);
          drawCanvas.remove();
          canvas.style.opacity = "";
        }
        sourceNodes.forEach((srcNode) => {
          try { srcNode.disconnect(); } catch {}
        });
        mediaGains.forEach((mediaGain) => {
          try { mediaGain.disconnect(); } catch {}
        });
        if (analyser) {
          try { analyser.disconnect(); } catch {}
        }
        if (outputGain) {
          try { outputGain.disconnect(); } catch {}
        }
        if (ac) {
          try { ac.close(); } catch {}
        }
      },
    };
  }

  window.createHueVisualizer = createHueVisualizer;
})();
