<template>
  <div class="umc-hero-visual" aria-hidden="true">
    <div class="umc-orb umc-orb--indigo"></div>
    <div class="umc-orb umc-orb--green"></div>

    <div class="umc-terminal">
      <div class="umc-terminal__bar">
        <span class="umc-dot umc-dot--red"></span>
        <span class="umc-dot umc-dot--yellow"></span>
        <span class="umc-dot umc-dot--green"></span>
        <span class="umc-terminal__title">umc — quickstart</span>
        <span class="umc-terminal__badge">v0.1.0</span>
      </div>
      <div class="umc-terminal__body">
        <div class="umc-line"><span class="umc-prompt">$</span> umc version list</div>
        <div class="umc-line umc-muted">1.21.11 · 1.21.10 · 1.21.9 · 1.21.8</div>
        <div class="umc-line"><span class="umc-prompt">$</span> umc instance create Survival 1.21.1</div>
        <div class="umc-line umc-ok">✓ instance-8f14d9 created</div>
        <div class="umc-line">
          <span class="umc-prompt">$</span> umc instance install instance-8f14d9
        </div>
        <div class="umc-progress"><span></span></div>
        <div class="umc-line umc-muted">assets 100% · libraries 100% · client 100%</div>
        <div class="umc-line">
          <span class="umc-prompt">$</span> umc auth login
        </div>
        <div class="umc-line umc-muted">Microsoft account · session stored</div>
        <div class="umc-line">
          <span class="umc-prompt">$</span> umc launch instance-8f14d9 --online
        </div>
        <div class="umc-line umc-ok">
          <span class="umc-pulse"></span> Minecraft 1.21.1 running
        </div>
      </div>
    </div>

    <div class="umc-chip umc-chip--api">
      <span class="umc-chip__icon">{ }</span>
      <span class="umc-chip__text"><strong>JSON-RPC v1</strong><small>local IPC</small></span>
    </div>
    <div class="umc-chip umc-chip--rust">
      <span class="umc-chip__icon">R</span>
      <span class="umc-chip__text"><strong>Rust SDK</strong><small>task.events</small></span>
    </div>
  </div>
</template>

<style scoped>
.umc-hero-visual {
  position: relative;
  width: 100%;
  max-width: 560px;
  padding: 24px 0 28px;
  font-family: var(--vp-font-family-base);
  isolation: isolate;
}

.umc-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(56px);
  opacity: 0.55;
  pointer-events: none;
  z-index: -1;
}
.umc-orb--indigo {
  width: 260px;
  height: 260px;
  right: -36px;
  top: -20px;
  background: rgba(94, 112, 255, 0.42);
}
.umc-orb--green {
  width: 200px;
  height: 200px;
  left: -24px;
  bottom: -16px;
  background: rgba(34, 201, 151, 0.3);
}

.umc-terminal {
  position: relative;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: linear-gradient(155deg, #141824 0%, #0d1017 62%, #0b0e14 100%);
  box-shadow:
    0 40px 80px -32px rgba(3, 6, 18, 0.72),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset,
    0 1px 0 rgba(255, 255, 255, 0.08) inset;
  overflow: hidden;
  transform: perspective(1200px) rotateY(-3deg) rotateX(1.5deg);
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.umc-terminal:hover {
  transform: perspective(1200px) rotateY(0deg) rotateX(0deg);
}

.umc-terminal__bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}
.umc-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}
.umc-dot--red { background: #ff5f57; }
.umc-dot--yellow { background: #febc2e; }
.umc-dot--green { background: #28c840; }
.umc-terminal__title {
  margin-left: 8px;
  font-size: 12px;
  color: #8b93a7;
  letter-spacing: 0.01em;
}
.umc-terminal__badge {
  margin-left: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: #a8b1ff;
  background: rgba(124, 140, 255, 0.12);
  border: 1px solid rgba(124, 140, 255, 0.22);
  border-radius: 999px;
  padding: 2px 8px;
}

.umc-terminal__body {
  padding: 18px 20px 22px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.9;
  color: #dfe3ee;
}
.umc-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.umc-prompt {
  color: #22c997;
  margin-right: 7px;
  user-select: none;
}
.umc-muted { color: #7c869b; }
.umc-ok { color: #62e6b3; }

.umc-progress {
  height: 4px;
  margin: 8px 0 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}
.umc-progress span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f63e8, #22c997);
  transform-origin: left;
  animation: umc-progress 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.umc-pulse {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 7px;
  border-radius: 50%;
  background: #22c997;
  box-shadow: 0 0 0 0 rgba(34, 201, 151, 0.6);
  animation: umc-pulse 2s ease-out infinite;
  vertical-align: 1px;
}

.umc-chip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 10px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: color-mix(in srgb, var(--vp-c-bg-elv) 88%, transparent);
  box-shadow: 0 18px 40px -18px rgba(9, 12, 24, 0.45);
  backdrop-filter: blur(14px);
  animation: umc-float 7s ease-in-out infinite;
}
.umc-chip--api {
  right: -18px;
  top: 16px;
}
.umc-chip--rust {
  left: -22px;
  bottom: 0;
  animation-delay: -3.5s;
}
.umc-chip__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
  color: #a8b1ff;
  background: rgba(94, 112, 255, 0.14);
  border: 1px solid rgba(94, 112, 255, 0.22);
}
.umc-chip--rust .umc-chip__icon {
  color: #62e6b3;
  background: rgba(34, 201, 151, 0.12);
  border-color: rgba(34, 201, 151, 0.22);
}
.umc-chip__text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.umc-chip__text strong {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.umc-chip__text small {
  font-size: 10.5px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

@keyframes umc-progress {
  0% { transform: scaleX(0.02); opacity: 0.7; }
  45% { transform: scaleX(1); opacity: 1; }
  70% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}
@keyframes umc-pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 201, 151, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(34, 201, 151, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 201, 151, 0); }
}
@keyframes umc-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}

@media (max-width: 960px) {
  .umc-hero-visual {
    margin: 0 auto;
    max-width: 520px;
  }
  .umc-chip--api { right: -6px; }
  .umc-chip--rust { left: -6px; }
}

@media (max-width: 640px) {
  .umc-hero-visual { padding-top: 8px; }
  .umc-terminal {
    transform: none;
    border-radius: 14px;
  }
  .umc-terminal__body {
    font-size: 11px;
    padding: 14px 14px 18px;
  }
  .umc-chip { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .umc-terminal,
  .umc-chip,
  .umc-progress span,
  .umc-pulse {
    animation: none;
    transition: none;
  }
}
</style>
