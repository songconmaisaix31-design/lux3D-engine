const phaseNames = {
  approach: "接近", grasp: "夹持", lift: "抬升", cross: "越过筐沿",
  turn: "转向", lower: "降入槽内", release: "松爪", settle: "静置",
};

export function mountReplay(replay) {
  const { summary, frames, frameSeconds, phaseChanges = [] } = replay;
  const view = document.getElementById("replay-template").content.cloneNode(true);
  const controls = view.querySelector(".replay-controls");
  const result = view.querySelector(".replay-summary");
  const title = view.querySelector("[data-task]");
  const status = view.querySelector("[data-result]");
  const spec = view.querySelector("[data-spec]");
  const list = view.querySelector("[data-checks]");
  const note = view.querySelector("[data-note]");
  const play = view.querySelector("[data-play]");
  const restart = view.querySelector("[data-restart]");
  const progress = view.querySelector("[data-progress]");
  const time = view.querySelector("[data-time]");
  const phaseNav = view.querySelector("[data-phases]");
  const corn = summary.task === "corn_slot";
  title.textContent = corn ? "玉米越障并朝左入槽" : "抓取并放置";
  status.textContent = summary.success ? "实验成功" : "实验未完成";
  status.dataset.success = String(summary.success);
  spec.textContent = `${summary.robotName} · ${summary.cropName} ${summary.massGrams} 克`;
  if (corn) {
    const c = summary.checks;
    for (const [label, passed, detail] of [
      ["抬离桌面", c.grasped, `最高抬升 ${summary.liftCm} 厘米`],
      ["越过筐沿", c.clearedRim, c.rimClearanceCm === null ? "未越沿" : `最小余量 ${c.rimClearanceCm} 厘米`],
      ["尖端朝左", c.tipLeft, `偏差 ${c.tipErrorDegrees}°`],
      ["松爪后稳定入槽", c.releasedInSlot && c.stableInSlot, `槽宽 ${summary.scene.slotWidthCm} 厘米`],
    ]) {
      const dt = document.createElement("dt");
      dt.textContent = `${passed ? "通过" : "未通过"} · ${label}`;
      dt.dataset.passed = String(passed);
      const dd = document.createElement("dd");
      dd.textContent = detail;
      list.append(dt, dd);
    }
    note.textContent = `桌高 ${summary.scene.tableHeightCm} 厘米 · 筐沿 ${summary.scene.rimHeightCm} 厘米。右上俯视图的左侧为尖端目标方向。`;
    const label = document.createElement("span");
    label.className = "replay-top-label";
    label.textContent = "← 尖端目标方向";
    document.getElementById("viewport").append(label);
  } else {
    note.textContent = `目标 ${summary.target} · 最高抬升 ${summary.liftCm} 厘米`;
  }
  if (summary.modelId === "sweet-corn-detail") {
    note.textContent += " · 精细玉米 GLB，明黄色尖端标记跟随碰撞体。";
  } else if (summary.modelId) {
    note.textContent += corn ? " · GLB 用于外观，尖端标记跟随物理碰撞体。" : " · 回放外观使用 GLB。";
  }
  document.body.classList.add("show-replay");
  const toolbar = document.getElementById("toolbar");
  const side = document.getElementById("side");
  toolbar.style.display = "none";
  side.style.display = "none";
  toolbar.after(controls);
  side.after(result);

  const last = frames.length - 1;
  progress.max = String(last);
  let index = 0;
  let playing = true;
  let base;
  const seek = (next) => {
    index = next;
    base = performance.now() - index * frameSeconds * 1000;
  };
  play.addEventListener("click", () => {
    playing = !playing;
    if (playing) seek(index === last ? 0 : index);
  });
  restart.addEventListener("click", () => { playing = true; seek(0); });
  progress.addEventListener("input", () => { playing = false; seek(Number(progress.value)); });
  const phaseButtons = phaseChanges.map(({ phase, seconds }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = phaseNames[phase];
    button.addEventListener("click", () => { seek(Math.ceil(seconds / frameSeconds)); });
    phaseNav.append(button);
    return { button, seconds };
  });
  let previousIndex = -1;
  let previousPlaying;

  return () => {
    base ??= performance.now();
    if (playing) {
      index = Math.min(Math.floor((performance.now() - base) / 1000 / frameSeconds), last);
      if (index === last) playing = false;
    }
    if (playing !== previousPlaying) {
      play.textContent = playing ? "暂停" : "播放";
      previousPlaying = playing;
    }
    if (index !== previousIndex) {
      const elapsed = index * frameSeconds;
      progress.value = String(index);
      time.textContent = `${Math.min(elapsed, summary.simulatedSeconds).toFixed(1)} / ${summary.simulatedSeconds.toFixed(1)} 秒`;
      const active = phaseButtons.findLastIndex(({ seconds }) => seconds <= elapsed);
      phaseButtons.forEach(({ button }, i) => {
        if (active === i) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
      previousIndex = index;
    }
    return frames[index];
  };
}
