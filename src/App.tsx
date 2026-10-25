import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Grip, Moon, Pause, Pin, PinOff, Play, RotateCcw, Settings, Sun, Volume2, VolumeX } from "lucide-react";
import { Cat } from "./Cat";
import { advanceCompletedPhase, DEFAULT_PREFERENCES, formatTime, pauseTimer, readPreferences, readTimer, resetTimer, startTimer, tickTimer, validDuration } from "./timer";
import type { Preferences, TimerState } from "./timer";

const STORAGE_FRAME = "moyu.frame.v1";
const STORAGE_PIN = "moyu.pinned.v1";
type Frame = { x: number; y: number; width: number; height: number };
const initialFrame = (): Frame => ({ x: Math.max(20, (innerWidth - 440) / 2), y: Math.max(68, (innerHeight - 590) / 2), width: 440, height: 590 });

function readFrame(): Frame {
  try {
    const frame = JSON.parse(localStorage.getItem(STORAGE_FRAME) ?? "null") as Frame | null;
    if (frame && [frame.x, frame.y, frame.width, frame.height].every(Number.isFinite)) return frame;
  } catch { /* Use a centered panel after invalid or blocked storage. */ }
  return initialFrame();
}

function clampFrame(frame: Frame): Frame {
  const width = Math.min(Math.max(360, frame.width), Math.max(360, innerWidth - 24), 680);
  const height = Math.min(Math.max(480, frame.height), Math.max(480, innerHeight - 24), 820);
  return { width, height, x: Math.min(Math.max(12, frame.x), Math.max(12, innerWidth - width - 12)), y: Math.min(Math.max(12, frame.y), Math.max(12, innerHeight - height - 12)) };
}

function App() {
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const [timer, setTimer] = useState<TimerState>(() => readTimer(readPreferences()));
  const [page, setPage] = useState<"timer" | "settings">("timer");
  const [draft, setDraft] = useState({ work: String(preferences.workMinutes), break: String(preferences.breakMinutes) });
  const [errors, setErrors] = useState({ work: "", break: "" });
  const [saved, setSaved] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | "unsupported">(() => "Notification" in window ? Notification.permission : "unsupported");
  const [frame, setFrame] = useState(readFrame);
  const [pinned, setPinned] = useState(() => localStorage.getItem(STORAGE_PIN) === "true");
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  const panelRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; frame: Frame; resizing: boolean } | null>(null);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const dark = preferences.theme === "dark" || (preferences.theme === "system" && systemDark);
  const running = timer.status === "running";
  const resting = timer.phase === "break";
  const waiting = timer.status === "awaitingWork";
  const progress = Math.min(1, Math.max(0, 1 - timer.remainingSeconds / timer.durationSeconds));
  const radius = 143;
  const circumference = 2 * Math.PI * radius;
  const statusText = waiting ? "休息结束，准备好再出发" : running ? (resting ? "好好休息，别惦记工作" : "和小猫一起，专心一会儿") : timer.status === "paused" ? "已暂停，按自己的节奏来" : "一段专注，从这一刻开始";

  const notify = useCallback((title: string, body: string) => {
    document.title = `${title} · Moyu番茄钟`;
    if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, tag: `moyu-${title}` });
    if (!preferences.soundEnabled || preferences.volume === 0) return;
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = new AudioContextClass();
      [0, 0.18].forEach((delay, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = index === 0 ? 659.25 : 783.99;
        gain.gain.setValueAtTime(0, context.currentTime + delay);
        gain.gain.linearRampToValueAtTime((preferences.volume / 100) * 0.12, context.currentTime + delay + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + 0.65);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + delay);
        oscillator.stop(context.currentTime + delay + 0.7);
      });
      window.setTimeout(() => void context.close(), 1200);
    } catch { /* Visual state remains available if audio is unavailable. */ }
  }, [preferences.soundEnabled, preferences.volume]);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission().then(setNotificationStatus).catch(() => setNotificationStatus("denied"));
    }
    const interval = window.setInterval(() => {
      setTimer((current) => {
        const next = tickTimer(current, Date.now(), preferencesRef.current.breakMinutes);
        if (next.phase !== current.phase) notify("工作时间结束", "小猫喊你休息啦");
        if (next.status === "awaitingWork" && current.status !== "awaitingWork") notify("休息时间结束", "准备好了，再开始下一段专注");
        return next;
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [notify]);

  useEffect(() => {
    localStorage.setItem("moyu.preferences.v1", JSON.stringify(preferences));
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.reduceMotion = String(preferences.reducedMotion);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#162630" : "#eaf3f7");
  }, [preferences, dark]);
  useEffect(() => { localStorage.setItem("moyu.timer.v1", JSON.stringify(timer)); }, [timer]);
  useEffect(() => { localStorage.setItem(STORAGE_PIN, String(pinned)); }, [pinned]);
  useEffect(() => {
    localStorage.setItem(STORAGE_FRAME, JSON.stringify(frame));
    const scale = Math.min(frame.width / 440, frame.height / 590);
    panelRef.current?.style.setProperty("--panel-scale", String(scale));
    panelRef.current?.style.setProperty("--content-height", `${frame.height / scale}px`);
  }, [frame]);
  useEffect(() => {
    const resize = () => setFrame((current) => clampFrame(current));
    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, []);

  function moveOrResize(event: ReactPointerEvent<HTMLDivElement>, resizing: boolean) {
    if (pinned || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, frame, resizing };
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || pinned) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setFrame(clampFrame(drag.resizing ? { ...drag.frame, width: drag.frame.width + dx, height: drag.frame.height + dy } : { ...drag.frame, x: drag.frame.x + dx, y: drag.frame.y + dy }));
  }

  function openSettings() {
    setDraft({ work: String(preferences.workMinutes), break: String(preferences.breakMinutes) });
    setErrors({ work: "", break: "" });
    setSaved(false);
    setPage("settings");
  }
  function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    const workMinutes = Number(draft.work);
    const breakMinutes = Number(draft.break);
    const nextErrors = { work: validDuration(workMinutes, "work") ? "" : "请输入 1–180 之间的整数", break: validDuration(breakMinutes, "break") ? "" : "请输入 1–60 之间的整数" };
    setErrors(nextErrors);
    if (nextErrors.work || nextErrors.break) return;
    setPreferences((current) => {
      const next = { ...current, workMinutes, breakMinutes };
      setTimer((timer) => timer.status === "ready" ? resetTimer(timer, next) : timer);
      return next;
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }
  function toggleTheme() {
    setPreferences((current) => ({ ...current, theme: dark ? "light" : "dark" }));
  }

  return (
    <main className="stage">
      <div className="ambient ambient--one"/><div className="ambient ambient--two"/>
      <div className="stage-brand"><span className="brand-paw">✳</span><span>Moyu</span><span className="stage-brand-divider"/>番茄钟<span className="prototype-badge">视觉原型</span></div>
      <div className="stage-note">认真工作，<br/>也认真休息。<span>YOUR QUIET LITTLE COMPANION</span></div>
      <div className="stage-caption"><span className="caption-dot"/>云朵玻璃 · Cloud glass<span>为专注留一点柔软</span></div>

      <section ref={panelRef} className={`pomodoro-panel ${pinned ? "is-pinned" : ""} ${page === "settings" ? "is-settings" : ""}`} style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }} aria-label="Moyu番茄钟悬浮窗">
        <div className="window-drag" onPointerDown={(event) => moveOrResize(event, false)} onPointerMove={onPointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} title={pinned ? "窗口已固定" : "拖动移动窗口"}/>
        <header className="panel-header">
          <div className="panel-identity"><span className="mini-mark">m</span><span>Moyu</span><span className="identity-divider"/><span className="identity-subtitle">番茄钟</span></div>
          <div className="window-actions">
            <button className={`icon-button ${pinned ? "is-active" : ""}`} onClick={() => setPinned(!pinned)} aria-label={pinned ? "取消固定窗口" : "固定窗口"} aria-pressed={pinned} title={pinned ? "取消固定" : "固定位置与大小"}>{pinned ? <Pin size={16}/> : <PinOff size={16}/>}</button>
            <button className="icon-button" onClick={toggleTheme} aria-label={dark ? "切换到白天模式" : "切换到黑夜模式"} title={dark ? "白天模式" : "黑夜模式"}>{dark ? <Sun size={17}/> : <Moon size={16}/>}</button>
          </div>
        </header>

        {page === "timer" ? <div className="timer-page">
          <div className="phase-row"><span className={`phase-chip ${resting ? "phase-chip--break" : ""}`}><span/>{resting ? "休息时光" : "专注时刻"}</span><button className="icon-button settings-button" onClick={openSettings} aria-label="打开设置" title="设置"><Settings size={17}/></button></div>
          <div className="timer-content">
            <div className={`timer-visual ${running ? "is-running" : ""}`}>
              <svg className="progress-ring" viewBox="0 0 320 320" aria-hidden="true"><circle className="ring-track" cx="160" cy="160" r={radius}/><circle className="ring-progress" cx="160" cy="160" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}/><circle className="ring-tip" cx="160" cy="17" r="3" style={{ transform: `rotate(${progress * 360}deg)` }}/></svg>
              <div className="time-center"><span className="time-eyebrow">{waiting ? "READY WHEN YOU ARE" : resting ? "TAKE A LITTLE BREAK" : "ONE THING AT A TIME"}</span><time className="time-display" dateTime={`PT${timer.remainingSeconds}S`}>{formatTime(timer.remainingSeconds)}</time><span className={`timer-status ${running ? "status-running" : ""}`}><span/>{timer.status === "running" ? (resting ? "正在休息" : "正在专注") : waiting ? "等待开始" : timer.status === "paused" ? "已暂停" : "准备就绪"}</span></div>
            </div>
            <p className="companion-message">{statusText}</p>
            <div className="cat-scene"><Cat resting={resting} paused={timer.status === "paused"}/></div>
          </div>
          <div className="playback-controls">
            <button className="secondary-button reset-button" onClick={() => setTimer((current) => resetTimer(current, preferences))} aria-label="重置当前阶段" title="重置"><RotateCcw size={18}/></button>
            <button className="primary-button" onClick={() => setTimer((current) => waiting ? advanceCompletedPhase(current, preferences, Date.now()) : running ? pauseTimer(current, Date.now()) : startTimer(current, Date.now()))}>{running ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}<span>{waiting ? "开始新的专注" : running ? "暂停一下" : timer.status === "paused" ? "继续计时" : "开始专注"}</span>{!running && <ArrowRight size={16}/>}</button>
            <span className="control-spacer"><span className="duration-hint">{resting ? `${Math.round(timer.durationSeconds / 60)} 分钟休息` : `${Math.round(timer.durationSeconds / 60)} 分钟专注`}</span></span>
          </div>
        </div> : <div className="settings-page">
          <div className="settings-heading"><button className="icon-button" onClick={() => setPage("timer")} aria-label="返回计时"><ArrowLeft size={18}/></button><div><h1>一点你的偏好</h1><p>让专注更适合你的节奏</p></div></div>
          <form onSubmit={saveSettings} noValidate>
            <fieldset className="settings-section"><legend>时间节奏</legend>
              <label className="duration-field"><span><strong>专注时长</strong><small>1–180 分钟</small></span><span className="number-input"><input aria-label="专注时长" inputMode="numeric" value={draft.work} onChange={(event) => { setDraft({ ...draft, work: event.target.value }); setSaved(false); }} aria-invalid={Boolean(errors.work)} aria-describedby="work-error"/><span>分钟</span></span><small className="field-error" id="work-error">{errors.work}</small></label>
              <label className="duration-field"><span><strong>休息时长</strong><small>1–60 分钟</small></span><span className="number-input"><input aria-label="休息时长" inputMode="numeric" value={draft.break} onChange={(event) => { setDraft({ ...draft, break: event.target.value }); setSaved(false); }} aria-invalid={Boolean(errors.break)} aria-describedby="break-error"/><span>分钟</span></span><small className="field-error" id="break-error">{errors.break}</small></label>
              <p className="settings-note">新时长从下一阶段生效，不打断当前计时。</p>
            </fieldset>
            <fieldset className="settings-section"><legend>氛围与提醒</legend>
              <div className="setting-line"><span className="setting-label">{preferences.soundEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}<span><strong>提示音</strong><small>阶段切换时轻轻提醒</small></span></span><button type="button" role="switch" aria-checked={preferences.soundEnabled} aria-label="提示音" className={`switch ${preferences.soundEnabled ? "is-on" : ""}`} onClick={() => setPreferences((current) => ({ ...current, soundEnabled: !current.soundEnabled }))}><span/></button></div>
              {preferences.soundEnabled && <label className="volume-line"><span>音量</span><input aria-label="提示音量" type="range" min="0" max="100" value={preferences.volume} onChange={(event) => setPreferences((current) => ({ ...current, volume: Number(event.target.value) }))}/><span>{preferences.volume}%</span></label>}
              <div className="setting-line"><span className="setting-label"><Cat resting={false} paused/><span><strong>减少动态效果</strong><small>保留安静的小猫陪伴</small></span></span><button type="button" role="switch" aria-checked={preferences.reducedMotion} aria-label="减少动态效果" className={`switch ${preferences.reducedMotion ? "is-on" : ""}`} onClick={() => setPreferences((current) => ({ ...current, reducedMotion: !current.reducedMotion }))}><span/></button></div>
            </fieldset>
            {notificationStatus !== "granted" && <p className="permission-note" role="status">{notificationStatus === "unsupported" ? "当前浏览器不支持系统通知，窗内提醒与提示音仍可使用。" : notificationStatus === "denied" ? "系统通知未开启，可在浏览器设置中允许；窗内提醒与提示音仍可使用。" : "等待系统通知授权；窗内提醒与提示音仍可使用。"}</p>}
            <button className="save-button" type="submit">{saved ? <Check size={17}/> : null}{saved ? "已保存偏好" : "保存偏好"}</button>
            <button className="restore-button" type="button" onClick={() => { setPreferences(DEFAULT_PREFERENCES); setDraft({ work: "50", break: "10" }); setErrors({ work: "", break: "" }); setSaved(false); }}>恢复默认设置</button>
          </form>
        </div>}
        <footer className="panel-footer"><span className={`pin-status ${pinned ? "pin-status--active" : ""}`}>{pinned ? <Pin size={10}/> : <Grip size={11}/>} {pinned ? "已固定" : "随心摆放"}</span><span>慢慢来，也很好。</span></footer>
        {!pinned && <div className="resize-handle" role="separator" aria-label="调整窗口大小" aria-orientation="horizontal" onPointerDown={(event) => moveOrResize(event, true)} onPointerMove={onPointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}><span/><span/><span/></div>}
      </section>
      <div className="stage-index"><span>01</span><span className="index-line"/><span>FOCUS & REST</span></div>
    </main>
  );
}

export default App;
