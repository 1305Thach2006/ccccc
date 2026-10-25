/**
 * AI Career Coach - Pure Vanilla JavaScript Application Logic
 * Full SVG, Khóa Phỏng Vấn, Điều kiện Tưới Cây, Trừ điểm khi sai, Đồng nhất biến API/Mock
 */
const API_BASE_URL = "http://localhost:8000";
// ==========================================
// 1. STATE & ÂM THANH
// ==========================================
const appState = {
  currentScreen: 'screen-home',
  selectedProfileId: null,
  selectedRoleId: null,
  activeQId: 1,
  analysisDone: false,
  user: {
    streakDays: 0,        
    currentXp: 0,         
    currentStageIndex: 0,
    hasWateredToday: false 
  },
  stages: [
    { id: 1, name: 'Hạt giống', xpRequired: 1000 },
    { id: 2, name: 'Nảy mầm', xpRequired: 2500 },
    { id: 3, name: 'Phát triển thân', xpRequired: 5000 },
    { id: 4, name: 'Phân cành', xpRequired: 8000 },
    { id: 5, name: 'Ra lá', xpRequired: 12000 },
    { id: 6, name: 'Kết trái', xpRequired: 18000 }
  ],
  questions: []
};

class SoundFX {
  constructor() { this.ctx = null; this.soundEnabled = true; }
  init() { if (!this.ctx) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) this.ctx = new AudioContext(); } }
  playSuccess() {
    if (!this.soundEnabled) return; this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(587.33, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain); gain.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.3);
  }
  playClick() {
    if (!this.soundEnabled) return; this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
    gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain); gain.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.05);
  }
}
const sfx = new SoundFX();

// ==========================================
// 3. SVG MẦM CÂY ĐẦY ĐỦ CHI TIẾT
// ==========================================
function makeSvgDataUri(svgString) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString.trim()); }

const rawSvgs = {
  stage1: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150" fill="none">
      <ellipse cx="150" cy="116" rx="98" ry="21" fill="#d7eee4" stroke="#c0e2d5" stroke-width="1.2"/>
      <ellipse cx="150" cy="117" rx="82" ry="15" fill="#cae7db" opacity="0.6"/>
      <ellipse cx="150" cy="112" rx="40" ry="12" fill="#ded3bc"/>
      <path d="M96 112 Q92 101 88 97 Q93 104 99 112" fill="#86efac"/>
      <path d="M104 114 Q106 104 109 98 Q108 106 106 114" fill="#4ade80"/>
      <path d="M204 112 Q206 102 210 96 Q206 104 201 112" fill="#86efac"/>
      <path d="M194 114 Q192 104 189 98 Q192 106 196 114" fill="#4ade80"/>
      <g transform="translate(142, 95) rotate(32)">
        <ellipse cx="10" cy="27" rx="8" ry="3" fill="#998369" opacity="0.4"/>
        <ellipse cx="10" cy="14" rx="8.5" ry="15.5" fill="#6e3919" stroke="#4a220c" stroke-width="1.2"/>
        <path d="M10 0 C6.5 7, 6.5 21, 10 28" stroke="#8c4b22" stroke-width="1.3" fill="none"/>
        <path d="M10 2 C7.5 8, 7.5 20, 10 26" stroke="#4a220c" stroke-width="0.8" fill="none"/>
      </g>
    </svg>
  `,
  stage2: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150" fill="none">
      <ellipse cx="150" cy="116" rx="98" ry="21" fill="#d7eee4" stroke="#c0e2d5" stroke-width="1.2"/>
      <ellipse cx="150" cy="117" rx="82" ry="15" fill="#cae7db" opacity="0.6"/>
      <ellipse cx="150" cy="112" rx="40" ry="12" fill="#ded3bc"/>
      <path d="M96 112 Q92 101 88 97 Q93 104 99 112" fill="#86efac"/>
      <path d="M104 114 Q106 104 109 98 Q108 106 106 114" fill="#4ade80"/>
      <path d="M204 112 Q206 102 210 96 Q206 104 201 112" fill="#86efac"/>
      <path d="M194 114 Q192 104 189 98 Q192 106 196 114" fill="#4ade80"/>
      <g transform="translate(138, 104) rotate(25)">
        <ellipse cx="6" cy="8" rx="6" ry="9" fill="#6e3919" opacity="0.85"/>
      </g>
      <path d="M150 110 Q147 88 150 78" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
      <path d="M150 78 C135 72, 133 85, 150 82 Z" fill="#34d399"/>
      <path d="M150 78 C165 72, 167 85, 150 82 Z" fill="#10b981"/>
      <circle cx="134" cy="74" r="1.5" fill="#38bdf8" opacity="0.9"/>
    </svg>
  `,
  stage3: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150" fill="none">
      <ellipse cx="150" cy="116" rx="98" ry="21" fill="#d7eee4" stroke="#c0e2d5" stroke-width="1.2"/>
      <ellipse cx="150" cy="117" rx="82" ry="15" fill="#cae7db" opacity="0.6"/>
      <ellipse cx="150" cy="112" rx="40" ry="12" fill="#ded3bc"/>
      <path d="M96 112 Q92 101 88 97 Q93 104 99 112" fill="#86efac"/>
      <path d="M104 114 Q106 104 109 98 Q108 106 106 114" fill="#4ade80"/>
      <path d="M204 112 Q206 102 210 96 Q206 104 201 112" fill="#86efac"/>
      <path d="M194 114 Q192 104 189 98 Q192 106 196 114" fill="#4ade80"/>
      <path d="M150 112 L150 56" stroke="#059669" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M150 92 C131 84, 128 100, 150 97 Z" fill="#34d399"/>
      <path d="M150 88 C169 80, 172 96, 150 93 Z" fill="#10b981"/>
      <path d="M150 72 C133 63, 129 78, 150 76 Z" fill="#4ade80"/>
      <path d="M150 68 C167 59, 171 74, 150 72 Z" fill="#059669"/>
      <path d="M150 56 C144 42, 156 42, 150 56 Z" fill="#10b981"/>
    </svg>
  `,
  stage4: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150" fill="none">
      <ellipse cx="150" cy="116" rx="98" ry="21" fill="#d7eee4" stroke="#c0e2d5" stroke-width="1.2"/>
      <ellipse cx="150" cy="117" rx="82" ry="15" fill="#cae7db" opacity="0.6"/>
      <ellipse cx="150" cy="112" rx="40" ry="12" fill="#ded3bc"/>
      <path d="M96 112 Q92 101 88 97 Q93 104 99 112" fill="#86efac"/>
      <path d="M204 112 Q206 102 210 96 Q206 104 201 112" fill="#86efac"/>
      <path d="M148 112 L148 76 Q141 62 126 54 M148 76 L152 44 M148 76 Q160 62 174 54" stroke="#78350f" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="124" cy="50" r="17" fill="#34d399" opacity="0.9"/>
      <circle cx="128" cy="46" r="14" fill="#10b981"/>
      <circle cx="152" cy="38" r="19" fill="#10b981"/>
      <circle cx="152" cy="33" r="15" fill="#34d399" opacity="0.9"/>
      <circle cx="174" cy="50" r="17" fill="#059669"/>
      <circle cx="170" cy="46" r="14" fill="#34d399"/>
    </svg>
  `,
  stage5: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150" fill="none">
      <ellipse cx="150" cy="116" rx="98" ry="21" fill="#d7eee4" stroke="#c0e2d5" stroke-width="1.2"/>
      <ellipse cx="150" cy="117" rx="82" ry="15" fill="#cae7db" opacity="0.6"/>
      <ellipse cx="150" cy="112" rx="40" ry="12" fill="#ded3bc"/>
      <path d="M96 112 Q92 101 88 97 Q93 104 99 112" fill="#86efac"/>
      <path d="M204 112 Q206 102 210 96 Q206 104 201 112" fill="#86efac"/>
      <path d="M150 112 L150 62" stroke="#5c2d13" stroke-width="7.5" stroke-linecap="round"/>
      <path d="M150 72 Q130 54 116 48 M150 68 L150 38 M150 72 Q170 54 184 48" stroke="#5c2d13" stroke-width="3.8" stroke-linecap="round"/>
      <circle cx="118" cy="46" r="23" fill="#059669"/>
      <circle cx="182" cy="46" r="23" fill="#047857"/>
      <circle cx="134" cy="33" r="25" fill="#10b981"/>
      <circle cx="166" cy="33" r="25" fill="#059669"/>
      <circle cx="150" cy="22" r="24" fill="#34d399"/>
      <circle cx="150" cy="45" r="22" fill="#10b981" opacity="0.95"/>
    </svg>
  `,
  stage6: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150" fill="none">
      <ellipse cx="150" cy="116" rx="98" ry="21" fill="#d7eee4" stroke="#c0e2d5" stroke-width="1.2"/>
      <ellipse cx="150" cy="117" rx="82" ry="15" fill="#cae7db" opacity="0.6"/>
      <ellipse cx="150" cy="112" rx="40" ry="12" fill="#ded3bc"/>
      <path d="M96 112 Q92 101 88 97 Q93 104 99 112" fill="#86efac"/>
      <path d="M204 112 Q206 102 210 96 Q206 104 201 112" fill="#86efac"/>
      <path d="M150 112 L150 62" stroke="#5c2d13" stroke-width="8" stroke-linecap="round"/>
      <circle cx="118" cy="46" r="24" fill="#047857"/>
      <circle cx="182" cy="46" r="24" fill="#065f46"/>
      <circle cx="134" cy="33" r="26" fill="#059669"/>
      <circle cx="166" cy="33" r="26" fill="#10b981"/>
      <circle cx="150" cy="21" r="25" fill="#34d399"/>
      <circle cx="150" cy="44" r="23" fill="#10b981"/>
      <circle cx="122" cy="46" r="4.8" fill="#f59e0b" stroke="#b45309" stroke-width="1"/>
      <circle cx="140" cy="30" r="4.8" fill="#ef4444" stroke="#991b1b" stroke-width="1"/>
      <circle cx="162" cy="28" r="4.8" fill="#f59e0b" stroke="#b45309" stroke-width="1"/>
      <circle cx="178" cy="48" r="4.8" fill="#ef4444" stroke="#991b1b" stroke-width="1"/>
      <circle cx="150" cy="52" r="4.8" fill="#f59e0b" stroke="#b45309" stroke-width="1"/>
      <circle cx="132" cy="56" r="4.8" fill="#ef4444" stroke="#991b1b" stroke-width="1"/>
      <path d="M102 20 L104 24 L108 26 L104 28 L102 32 L100 28 L96 26 L100 24 Z" fill="#f59e0b"/>
      <path d="M198 18 L199.5 21 L202.5 22.5 L199.5 24 L198 27 L196.5 24 L193.5 22.5 L196.5 21 Z" fill="#fbbf24"/>
    </svg>
  `
};

function showToast(title, message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const borderClass = type === 'success' ? 'border-emerald-500' : 'border-amber-500';
  toast.className = `flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-lg border-l-4 ${borderClass} mb-2 transform transition-all translate-y-[-10px]`;
  toast.innerHTML = `<div><div class="font-bold text-xs text-slate-900">${title}</div><div class="text-[11px] text-slate-600 mt-1">${message}</div></div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.transform = 'translateY(0)'; }, 10);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 250); }, 3500);
}

function checkAndUpdateStage() {
  const current = appState.user.currentStageIndex;
  const stages = appState.stages;
  
  if (current < stages.length - 1 && appState.user.currentXp >= stages[current].xpRequired) {
    appState.user.currentStageIndex++;
    sfx.playSuccess();
    showToast('Lên cấp!', `Mầm cây đã phát triển sang giai đoạn: ${stages[appState.user.currentStageIndex].name}`, 'success');
  }

  updateIllustration();
}

function updateIllustration() {
  const stage = appState.user.currentStageIndex + 1; 
  const data = appState.stages[appState.user.currentStageIndex];
  const nextData = appState.stages[Math.min(stage, appState.stages.length - 1)];

  const imgSrc = makeSvgDataUri(rawSvgs[`stage${stage}`]);
  const img = document.getElementById('plantStageImage');
  if (img) img.src = imgSrc;

  const homePlantTitle = document.getElementById('homePlantTitle');
  if(homePlantTitle) homePlantTitle.textContent = data.name;
  
  const stageBadgeText = document.getElementById('stageBadgeText');
  if(stageBadgeText) stageBadgeText.textContent = `Giai đoạn ${stage}/6`;

  const xpText = document.getElementById('homeXpRemaining');
  if (xpText) {
    if (stage === 6) xpText.textContent = "Đã hoàn thành lộ trình!";
    else xpText.textContent = `Còn ${data.xpRequired - appState.user.currentXp} XP để đạt ${nextData.name}`;
  }

  const currentXpEl = document.getElementById('homeCurrentXpDisplay');
  if (currentXpEl) {
    currentXpEl.textContent = `${appState.user.currentXp} XP`;
  }
  
  // --- ĐOẠN CODE ĐÃ ĐƯỢC CHỈNH SỬA ĐỂ THANH TIẾN TRÌNH CHẠY MƯỢT MÀ ---
  let pct = 0;
  if (appState.user.currentStageIndex === 0) {
      // Đang ở cấp 1 (Hạt giống - cần 1000 XP)
      pct = Math.min(100, Math.round((appState.user.currentXp / data.xpRequired) * 100));
  } else if (appState.user.currentStageIndex >= 5) {
      // Đã Max cấp (Kết trái)
      pct = 100;
  } else {
      // Ở các cấp trung gian: Tính phần trăm tiến độ của mốc hiện tại
      const prevXp = appState.stages[appState.user.currentStageIndex - 1].xpRequired;
      const currentLevelXp = appState.user.currentXp - prevXp;
      const targetLevelXp = data.xpRequired - prevXp;
      pct = Math.min(100, Math.round((currentLevelXp / targetLevelXp) * 100));
      if (pct < 0) pct = 0;
  }

  const progBar = document.getElementById('homePlantProgressBar');
  if(progBar) progBar.style.width = `${pct}%`;

  const badge = document.getElementById('homePlantPercentBadge');
  if(badge) badge.style.display = 'none';
  // -------------------------------------------------------------------

  for (let i = 1; i <= 6; i++) {
    const node = document.getElementById(`homeStageNode-${i}`);
    if (node) {
      if (i < stage) {
        node.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-100 transition-all';
        node.innerHTML = '✓';
      } else if (i === stage) {
        node.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#064e3b] text-white flex items-center justify-center font-bold text-xs ring-4 ring-emerald-100 transition-all';
        node.innerHTML = `0${i}`;
      } else {
        node.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-300 text-slate-400 flex items-center justify-center font-medium text-xs transition-all';
        node.innerHTML = `0${i}`;
      }
    }
  }
}

function updateActiveTabHighlight(activeId) {
  document.querySelectorAll('.nav-link-btn').forEach(btn => {
    const target = btn.getAttribute('data-target');
    if (!target) return;
    if(target === activeId) {
      btn.className = 'nav-link-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 transition-all';
    } else {
      btn.className = 'nav-link-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all border border-transparent';
    }
  });
}

function updateStreakColor() {
  const streakDays = appState.user.streakDays;
  const uiStreak = document.getElementById('uiStreakDays');
  const badge = document.getElementById('streakBadgeColor');
  if(!uiStreak || !badge) return;

  uiStreak.textContent = streakDays;
  uiStreak.className = 'text-4xl sm:text-5xl font-black tracking-tight transition-colors duration-500';
  badge.className = 'inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors';

  if(streakDays === 0) {
    uiStreak.classList.add('text-slate-400');
    badge.classList.add('text-slate-500', 'bg-slate-100', 'border-slate-200');
    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Kỷ luật học tập`;
  } else if (streakDays <= 2) {
    uiStreak.classList.add('text-orange-400');
    badge.classList.add('text-orange-600', 'bg-orange-50', 'border-orange-200');
    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping"></span> Kỷ luật học tập`;
  } else if (streakDays <= 6) {
    uiStreak.classList.add('text-orange-600');
    badge.classList.add('text-orange-700', 'bg-orange-100', 'border-orange-300');
    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping"></span> Kỷ luật học tập`;
  } else {
    uiStreak.classList.add('text-rose-600');
    badge.classList.add('text-rose-700', 'bg-rose-100', 'border-rose-300');
    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span> Kỷ luật học tập`;
  }
}

function getDetailedRoleMatch(role, profile) {
  if (!profile || !role) return { matchScore: 10, skillScore: 10, expScore: 10, interestScore: 10 };
  const pSkills = profile.skills.map(s => s.toLowerCase());
  const rSkills = role.requiredSkills.map(s => s.toLowerCase());
  let matched = 0;
  rSkills.forEach(r => { if (pSkills.some(p => p.includes(r) || r.includes(p))) matched++; });
  
  const skillScore = Math.round((matched / rSkills.length) * 100);
  const isFieldMatch = profile.major.toLowerCase().includes(role.field.toLowerCase()) || role.field === 'CNTT';
  const expScore = isFieldMatch ? 85 : 40;
  const interestScore = isFieldMatch ? 90 : 30;

  const matchScore = Math.round((skillScore * 0.50) + (expScore * 0.25) + (interestScore * 0.25));
  return { matchScore, skillScore, expScore, interestScore };
}

function renderProfiles() {
  const container = document.getElementById('sampleProfilesContainer');
  if(!container) return;
  
  container.innerHTML = DEFAULT_SAMPLE_PROFILES.map(p => `
    <div class="p-3.5 rounded-xl border ${p.id === appState.selectedProfileId ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white hover:border-slate-300'} cursor-pointer mb-3 transition-all" onclick="selectProfile('${p.id}')">
      <div class="font-bold text-sm text-slate-900">${p.name}</div>
      <div class="text-[11px] text-slate-500 mt-0.5">${p.subtitle || p.major}</div>
      
      <div class="flex flex-wrap gap-1.5 mt-3">
        ${p.skills.map(skill => `
          <span class="px-2 py-0.5 rounded bg-white text-slate-600 text-[10px] font-medium border border-slate-200 shadow-2xs">
            ${skill}
          </span>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderInterestsSliders(interests) {
  const container = document.getElementById('interestsSlidersContainer');
  if(!container) return;
  
  container.innerHTML = interests.map((it, idx) => `
    <div class="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 relative">
      <div class="flex justify-between items-center text-[11px] font-medium">
        <span class="text-slate-800 font-semibold">${idx + 1}. ${it.topic}</span>
        <div class="flex items-center gap-2">
          <span id="score-val-${idx}" class="text-indigo-700 font-bold">${it.score}/5</span>
          
          <button type="button" onclick="removeSkill(${idx})" class="text-slate-400 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors" title="Xóa kỹ năng này">
            ✕
          </button>
        </div>
      </div>
      
      <input type="range" min="1" max="5" value="${it.score}" 
             class="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600 transition-all"
             oninput="
                document.getElementById('score-val-${idx}').textContent = this.value + '/5'; 
                if (window.currentUploadedSkills && window.currentUploadedSkills[${idx}]) {
                    window.currentUploadedSkills[${idx}].score = parseInt(this.value);
                }
             ">
    </div>
  `).join('');
}

function removeSkill(index) {
  if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
  
  if (!window.currentUploadedSkills) return;

  const sliderElements = document.querySelectorAll('#interestsSlidersContainer input[type="range"]');
  sliderElements.forEach((slider, idx) => {
    if (window.currentUploadedSkills[idx]) {
      window.currentUploadedSkills[idx].score = parseInt(slider.value) || window.currentUploadedSkills[idx].score;
    }
  });

  const removedName = window.currentUploadedSkills[index].topic;
  window.currentUploadedSkills.splice(index, 1);

  renderInterestsSliders(window.currentUploadedSkills);
  
  if (typeof showToast === 'function') {
    showToast('Đã xóa', `Đã gỡ bỏ "${removedName}" khỏi danh sách.`, 'warning');
  }
}

function selectProfile(id) {
  if (!id) return;
  if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
  
  appState.selectedProfileId = id;
  appState.currentProfileId = null; // Xóa ID của CV tải lên (nếu có)
  
  const p = DEFAULT_SAMPLE_PROFILES.find(x => x.id === id);
  if (!p) return;
  
  const expInput = document.getElementById('experienceInput');
  if(expInput) expInput.value = p.experience;
  
  if (p.skills) {
      // Nếu CV mẫu chỉ lưu mảng dạng chuỗi ["Python", "React"], ta chuyển đổi thành định dạng có điểm số mặc định (ví dụ mức 4/5)
      // Hoặc nếu p.skills đã là object có sẵn điểm số thì giữ nguyên.
      window.currentUploadedSkills = p.skills.map(skillName => {
          // Nếu skillName là dạng object {topic, score} thì dùng luôn, nếu là string thì gán mức thành thạo mặc định là 4
          if (typeof skillName === 'object' && skillName !== null) {
              return skillName;
          }
          return { topic: skillName, score: 4 }; 
      });

      if (typeof renderInterestsSliders === 'function') {
          renderInterestsSliders(window.currentUploadedSkills);
      }
  }

  // 1. Tính toán điểm khớp để tìm ra JD phù hợp nhất
  const scoredRoles = ROLES.map(r => ({ ...r, match: getDetailedRoleMatch(r, p).matchScore })).sort((a,b) => b.match - a.match);
  
  // 2. SỬA LỖI TẠI ĐÂY: Xóa bỏ điều kiện cũ, BẮT BUỘC chọn JD đứng Top 1 làm mặc định
  appState.selectedRoleId = scoredRoles[0].id; 
  
  // 3. Render lại danh sách JD và tự động highlight JD Top 1
  const roleContainer = document.getElementById('contentRoleStandard');
  if (roleContainer) {
      roleContainer.innerHTML = scoredRoles.map((r, i) => `
        <div class="role-option p-3 rounded-lg border ${r.id === appState.selectedRoleId ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white hover:border-slate-300'} cursor-pointer mb-2 transition-colors" data-role-id="${r.id}" onclick="selectRole('${r.id}')">
          <div class="flex justify-between items-center">
            <div class="font-bold text-xs text-slate-900">${r.title} ${i===0 ? '<span class="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 rounded border border-amber-300">⭐ Đề xuất</span>' : ''}</div>
            <div class="text-[10px] px-2 py-0.5 rounded ${r.match >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'} font-bold">${r.match}%</div>
          </div>
          <div class="flex items-center justify-between mt-1.5">
            <span class="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">${r.field}</span>
            <span class="text-[9px] text-indigo-600 font-medium">${r.requiredSkills.length} kỹ năng yêu cầu</span>
          </div>
        </div>
      `).join('');
  }
  
  if (typeof renderProfiles === 'function') renderProfiles();
}

function selectRole(roleId) {
  sfx.playClick();
  appState.selectedRoleId = roleId;
  document.querySelectorAll('.role-option').forEach(el => {
    if(el.getAttribute('data-role-id') === roleId) {
        el.className = `role-option p-3 rounded-lg border border-indigo-600 bg-indigo-50 cursor-pointer mb-2 transition-colors`;
    } else {
         el.className = `role-option p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer mb-2 transition-colors`;
    }
  });
}

// ==========================================
// HÀM GỌI API PHÂN TÍCH SKILL GAP
// ==========================================
async function startAnalysis() {
  if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
  
  // 1. KIỂM TRA ĐĂNG NHẬP NGAY TỪ ĐẦU BẰNG HÀM guardProtectedAction()
  if (typeof guardProtectedAction === 'function' && !guardProtectedAction()) {
      return; // Dừng ngay nếu chưa đăng nhập
  }

  const btn = document.getElementById('btnStartAnalysis');
  if (btn) { 
    btn.innerHTML = `<svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Đang phân tích...</span>`; 
    btn.disabled = true;
  }

  document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
  const gapScreen = document.getElementById('screen-gap');
  if (gapScreen) gapScreen.classList.remove('hidden');
  
  // Lưu màn hình vào bộ nhớ để F5 không bị văng
  appState.currentScreen = 'screen-gap';
  localStorage.setItem('current_screen', 'screen-gap');
  if (typeof updateActiveTabHighlight === 'function') updateActiveTabHighlight('screen-gap');
  
  const skeleton = document.getElementById('gapSkeletonLoading');
  const realResults = document.getElementById('gapRealResults');
  if (skeleton) skeleton.classList.remove('hidden');
  if (realResults) realResults.classList.add('hidden');

  try {
    const isSampleMode = !appState.currentProfileId;
    const profileId = appState.currentProfileId || appState.selectedProfileId;

    if (isSampleMode && !profileId) {
        if (typeof showToast === 'function') showToast("Chưa chọn hồ sơ", "Vui lòng click chọn 1 CV mẫu hoặc tải lên CV!", "warning");
        throw new Error("Dừng phân tích - Thiếu hồ sơ");
    }

    // --- BẮT ĐẦU FIX LOGIC LẤY JD DÁN TỰ DO ---
    const tabRolePaste = document.getElementById('tabRolePaste');
    // Nhận diện tab Paste đang active dựa vào class màu xanh
    const isPasteMode = tabRolePaste && tabRolePaste.classList.contains('text-indigo-700');
    // Bắt thẻ textarea thông minh (Quét cả ID chuẩn lẫn thẻ con phòng khi HTML của bạn bị sai ID)
    const customJdInput = document.getElementById('customJdTextarea') || document.querySelector('#contentRolePaste textarea');

    let jdSkillsArray = [];
    let jdTextContent = "";
    let roleKey = String(appState.selectedRoleId || 'custom').trim();

    if (isPasteMode) {
        // NẾU ĐANG Ở TAB DÁN TỰ DO
        if (!customJdInput || customJdInput.value.trim() === "") {
            if (typeof showToast === 'function') showToast("Chưa nhập JD", "Vui lòng dán Mô tả công việc vào ô trống!", "warning");
            throw new Error("Dừng phân tích - Thiếu JD");
        }
        jdTextContent = customJdInput.value.trim(); // Lấy văn bản để gửi cho AI đọc
        roleKey = "custom"; // Ép role thành custom để Backend biết
    } else {
        // NẾU ĐANG Ở TAB JD MẪU CÓ SẴN
        if (!appState.selectedRoleId || roleKey === 'null') {
            if (typeof showToast === 'function') showToast("Chưa chọn vị trí", "Vui lòng chọn 1 vị trí ứng tuyển!", "warning");
            throw new Error("Dừng phân tích - Thiếu JD");
        }
        const selectedRole = (typeof ROLES !== 'undefined' && Array.isArray(ROLES)) 
            ? ROLES.find(r => String(r.id) === roleKey || String(r.slug) === roleKey) || ROLES[0] : null;
        jdSkillsArray = (selectedRole && selectedRole.requiredSkills) ? selectedRole.requiredSkills : [];
    }

    const expInput = document.getElementById('experienceInput');
    const currentExp = expInput ? expInput.value.trim() : "";
    const currentInterests = window.currentUploadedSkills || [];

    let requestBody = {
        is_sample: isSampleMode,
        jd_skills: jdSkillsArray, 
        jd_text: jdTextContent,
        interests: currentInterests,
        experience: currentExp       
    };

    if (isSampleMode) {
        const sampleProfile = (typeof DEFAULT_SAMPLE_PROFILES !== 'undefined' && Array.isArray(DEFAULT_SAMPLE_PROFILES)) 
            ? DEFAULT_SAMPLE_PROFILES.find(p => String(p.id) === String(profileId)) : null;

        if (sampleProfile) {
            requestBody.name = sampleProfile.name;
            let hardSkills = sampleProfile.skills || [];
            requestBody.skills = [...hardSkills, ...currentInterests];
            if (currentInterests.length === 0) requestBody.interests = sampleProfile.interests;
        } else {
            requestBody.name = "Ứng viên mẫu";
            requestBody.skills = currentInterests;
        }
    } else {
        requestBody.skills = currentInterests;
    }

    const res = await fetch(`${API_BASE_URL}/analyses/match/${profileId}/${roleKey}`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!res.ok) throw new Error("Lỗi xử lý từ hệ thống phân tích.");
    
    const data = await res.json();
    
    AppStore.setAnalysisResult(data);
    
    // Gọi hàm vẽ giao diện dùng chung
    window.renderAnalysisResult(data);
    
    // ĐIỀU HƯỚNG CHUẨN XÁC SANG TAB SKILL GAP SAU KHI PHÂN TÍCH XONG
    appState.currentScreen = 'screen-gap';
    AppStore.setScreen('screen-gap');

    AppStore.state.analysisDone = true;
    localStorage.setItem('analysis_done', 'true');

    // === LƯU TRỮ DỮ LIỆU PHÂN TÍCH GẮN LIỀN VỚI PROFILE ID CỦA TÀI KHOẢN NÀY ===
    const currentPid = localStorage.getItem('current_profile_id') || profileId;
    if (currentPid) {
        localStorage.setItem(`analysis_done_${currentPid}`, 'true');
        localStorage.setItem(`analysis_data_${currentPid}`, JSON.stringify(data));
    }
    // =========================================================================

    document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
    const gapScr = document.getElementById('screen-gap');
    if (gapScr) gapScr.classList.remove('hidden');
    if (typeof updateActiveTabHighlight === 'function') updateActiveTabHighlight('screen-gap');

  } finally {
    if (btn) { 
      btn.innerHTML = `<span>Phân tích lại</span><svg class="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
      btn.disabled = false;
    }
  }
}

function selectInterviewQuestion(id) {
  appState.activeQId = id;
  
  if (typeof ROLES === 'undefined' || typeof FIELD_QUESTIONS === 'undefined') return;

  const actR = ROLES.find(r => r.id === appState.selectedRoleId) || ROLES[0];
  const questions = FIELD_QUESTIONS[actR.field] || FIELD_QUESTIONS['CNTT'];
  const q = questions.find(x => x.id === id) || questions[0];
  
  if(q) {
    const titleEl = document.getElementById('interviewActiveTitle');
    const questionEl = document.getElementById('interviewActiveQuestion');
    if (titleEl) titleEl.textContent = q.title;
    if (questionEl) questionEl.textContent = q.question;
    
    const inputEl = document.getElementById('userAnswerInput');
    if (inputEl) inputEl.value = '';
    
    const lockOverlay = document.getElementById('lockOverlay');
    const unlockedEval = document.getElementById('unlockedAiEvaluation');
    const lockedAnswer = document.getElementById('lockedAiAnswer');
    
    if (lockOverlay) lockOverlay.style.display = 'flex';
    if (unlockedEval) unlockedEval.classList.add('hidden');
    if (lockedAnswer) lockedAnswer.classList.add('blur-md');
    
    const btn = document.getElementById('btnSubmitAnswer');
    if(btn) { btn.disabled = false; btn.textContent = 'Nộp câu trả lời'; }

    if (lockedAnswer) {
      lockedAnswer.innerHTML = `
        <div class="space-y-2 text-sm text-slate-700">
          <p><strong class="text-indigo-700">S (Tình huống):</strong> ${q.starSolution.situation}</p>
          <p><strong class="text-indigo-700">T (Nhiệm vụ):</strong> ${q.starSolution.task}</p>
          <p><strong class="text-indigo-700">A (Hành động):</strong> ${q.starSolution.action}</p>
          <p><strong class="text-indigo-700">R (Kết quả):</strong> ${q.starSolution.result}</p>
        </div>
      `;
    }
  }

  document.querySelectorAll('.interview-question-tab').forEach(tab => {
    if(parseInt(tab.getAttribute('data-qid')) === id) {
      tab.className = 'interview-question-tab p-3 rounded-lg border border-indigo-600 bg-indigo-50/50 cursor-pointer transition-colors';
    } else {
      tab.className = 'interview-question-tab p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition-colors';
    }
  });
}

const motivationalQuotes = {
  daily: [
    "Thời điểm tốt nhất để trồng một cái cây là 4 năm Đại học. Thời điểm tốt thứ hai chính là ngày hôm nay.",
    "Đừng nôn nóng đòi 'kết trái' khi chưa chịu 'gieo mầm'. Vượt qua sự lười biếng của hôm nay, bạn sẽ cảm ơn chính mình vào ngày mai.",
    "Mỗi 20 phút bạn học là một giọt nước tưới xuống mảnh đất tương lai. Đừng để sự nghiệp của mình chết khát!"
  ],
  streakLost: [
    "Mầm cây đang khát! Đừng để sự lười biếng cắt đứt mạch phát triển của bạn. Dành 15 phút phục hồi ngay!",
    "Sức ỳ đang kéo bạn lại, nhưng hạt giống của bạn vẫn chờ được nảy mầm. Đứng dậy và đi tiếp nào!"
  ],
  stages: {
    stage1_2: "Vạn sự khởi đầu nan, một hạt mầm vừa cắm rễ...",
    stage3_4: "Bạn đang làm rất tốt, đừng để sức ỳ cản bước vươn cao!",
    stage5_6: "Sự kiên trì đang đơm hoa kết trái, vòng phỏng vấn đang chờ bạn!"
  }
};

function getSmartQuote() {
  const stageIndex = appState.user.currentStageIndex; 
  const streak = appState.user.streakDays;
  const dayOfMonth = new Date().getDate(); 

  if (streak === 0) {
    const list = motivationalQuotes.streakLost;
    return list[dayOfMonth % list.length];
  }

  let currentStageQuote = "";
  if (stageIndex <= 1) {
    currentStageQuote = motivationalQuotes.stages.stage1_2;
  } else if (stageIndex <= 3) {
    currentStageQuote = motivationalQuotes.stages.stage3_4;
  } else {
    currentStageQuote = motivationalQuotes.stages.stage5_6;
  }

  const combinedQuotes = [...motivationalQuotes.daily, currentStageQuote];
  return combinedQuotes[dayOfMonth % combinedQuotes.length];
}

function renderInitialRoles() {
  const roleContainer = document.getElementById('contentRoleStandard');
  if (!roleContainer) return;
  
  roleContainer.innerHTML = ROLES.map(r => `
    <div class="role-option p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer mb-2 transition-colors" data-role-id="${r.id}" onclick="selectRole('${r.id}')">
      <div class="flex justify-between items-center">
        <div class="font-bold text-xs text-slate-900">${r.title}</div>
        <div class="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">--</div>
      </div>
      <div class="flex items-center justify-between mt-1.5">
        <span class="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">${r.field}</span>
        <span class="text-[9px] text-indigo-600 font-medium">${r.requiredSkills.length} kỹ năng yêu cầu</span>
      </div>
    </div>
  `).join('');
}


document.addEventListener('DOMContentLoaded', () => {
  
  
  
  appState.sampleProfilesData = DEFAULT_SAMPLE_PROFILES;
  appState.rolesData = ROLES;
  
  updateStreakColor(); 
  renderProfiles();
  renderInitialRoles();

  updateActiveTabHighlight(appState.currentScreen);
  updateIllustration();

  const quoteEl = document.getElementById('motivationalQuoteText');
  if (quoteEl) {
    quoteEl.textContent = `"${getSmartQuote()}"`;
  }
  
// ==========================================
  // XỬ LÝ CHUYỂN TAB TỔNG (GÁC CỔNG TRỰC TIẾP)
  // ==========================================
  document.querySelectorAll('[data-navigate]').forEach(elem => {
    elem.addEventListener('click', (e) => {
      e.preventDefault();
      const sId = elem.getAttribute('data-navigate');

      // 1. Kiểm tra trạng thái đăng nhập
      const currentPid = localStorage.getItem('current_profile_id');
      const isLoggedIn = currentPid && /^\d+$/.test(String(currentPid).trim());

      if (sId !== 'screen-home' && !isLoggedIn) {
          if (typeof showToast === 'function') {
              showToast('Yêu cầu đăng nhập', 'Bạn cần phải đăng nhập để truy cập vào tính năng này!', 'warning');
          } else {
              alert('Bạn cần phải đăng nhập để truy cập vào tính năng này!');
          }
          const authModal = document.getElementById('authModal');
          if (authModal) {
              document.getElementById('loginView')?.classList.remove('hidden');
              document.getElementById('registerView')?.classList.add('hidden');
              authModal.classList.remove('hidden');
          }
          return; // Chặn không cho chuyển tab
      }

      // 2. KIỂM TRA ĐIỀU KIỆN: Nếu bấm vào tab Phỏng vấn nhưng CHƯA PHÂN TÍCH
      const isAnalysisDone = AppStore.state.analysisDone || localStorage.getItem('analysis_done') === 'true' || localStorage.getItem(`analysis_done_${currentPid}`) === 'true';
      if (sId === 'screen-interview' && !isAnalysisDone) {
          if (typeof showToast === 'function') {
              showToast('Chưa phân tích hồ sơ', 'Bạn cần hoàn thành việc chọn hồ sơ và bấm nút "Phân tích Kỹ năng" trước khi vào phòng phỏng vấn!', 'warning');
          } else {
              alert('Bạn cần hoàn thành phân tích kỹ năng trước khi vào phòng phỏng vấn!');
          }
          return; // Chặn không cho vào phòng phỏng vấn
      }

      // 3. Cho phép chuyển tab bình thường khi đã thỏa mãn điều kiện
      AppStore.setScreen(sId);
      if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
      
      appState.currentScreen = sId;
      sessionStorage.setItem('current_screen', sId); 
      
      document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
      const targetScreen = document.getElementById(sId);
      if (targetScreen) targetScreen.classList.remove('hidden');
      if (typeof updateActiveTabHighlight === 'function') updateActiveTabHighlight(sId);

      // 4. XỬ LÝ KHI SANG TAB SKILL GAP: TỰ ĐỘNG KHÔI PHỤC DATA NẾU BỘ NHỚ ĐANG TRỐNG
      if (sId === 'screen-gap') {
          // Nếu trong AppStore chưa có dữ liệu chi tiết, tự động tìm và nạp từ localStorage theo profile_id
          if (!AppStore.state.analysisData) {
              const savedData = localStorage.getItem(`analysis_data_${currentPid}`) || localStorage.getItem('analysis_data');
              if (savedData) {
                  try {
                      const parsed = JSON.parse(savedData);
                      AppStore.state.analysisData = parsed;
                      AppStore.state.analysisDone = true;
                  } catch (err) {
                      console.error("Lỗi khôi phục data gap:", err);
                  }
              }
          }

          // Vẽ lại giao diện ngay lập tức mà không cần F5
          if ((AppStore.state.analysisDone || isAnalysisDone) && AppStore.state.analysisData) {
              if (typeof window.renderAnalysisResult === 'function') {
                  window.renderAnalysisResult(AppStore.state.analysisData);
              }
          }
      }
    });
  });

  const tabCvUpload = document.getElementById('tabCvUpload');
  const tabCvSample = document.getElementById('tabCvSample');
  const contentCvSample = document.getElementById('contentCvSample');
  const contentCvUpload = document.getElementById('contentCvUpload');
  const experienceContainer = document.getElementById('experienceContainer');
  const interestsContainer = document.getElementById('interestsContainer');

  const tabRolePaste = document.getElementById('tabRolePaste');
  const tabRoleStandard = document.getElementById('tabRoleStandard');
  const contentRoleStandard = document.getElementById('contentRoleStandard');
  const contentRolePaste = document.getElementById('contentRolePaste');

  function setCvUploadMode() {
    tabCvUpload.className = 'flex-1 py-1.5 text-xs font-semibold rounded-md bg-white text-indigo-700 shadow-sm border border-slate-200 transition-all';
    tabCvSample.className = 'flex-1 py-1.5 text-xs font-medium rounded-md text-slate-500 hover:text-slate-800 transition-all';
    if(contentCvUpload) contentCvUpload.classList.remove('hidden');
    if(contentCvSample) contentCvSample.classList.add('hidden');
    if(experienceContainer) experienceContainer.classList.add('hidden');
    if(interestsContainer) interestsContainer.classList.add('hidden');
  }

  function setCvSampleMode() {
    tabCvSample.className = 'flex-1 py-1.5 text-xs font-semibold rounded-md bg-white text-indigo-700 shadow-sm border border-slate-200 transition-all';
    tabCvUpload.className = 'flex-1 py-1.5 text-xs font-medium rounded-md text-slate-500 hover:text-slate-800 transition-all';
    if(contentCvSample) contentCvSample.classList.remove('hidden');
    if(contentCvUpload) contentCvUpload.classList.add('hidden');
    if(experienceContainer) experienceContainer.classList.remove('hidden');
    if(interestsContainer) interestsContainer.classList.remove('hidden');
    appState.currentProfileId = null;
  }

  function setRolePasteMode() {
    if(tabRolePaste && tabRoleStandard) {
      tabRolePaste.className = 'flex-1 py-1.5 text-xs font-semibold rounded-md bg-white text-indigo-700 shadow-sm border border-slate-200 transition-all';
      tabRoleStandard.className = 'flex-1 py-1.5 text-xs font-medium rounded-md text-slate-500 hover:text-slate-800 transition-all';
      if(contentRolePaste) contentRolePaste.classList.remove('hidden');
      if(contentRoleStandard) contentRoleStandard.classList.add('hidden');
    }
  }

  function setRoleStandardMode() {
    if(tabRolePaste && tabRoleStandard) {
      tabRoleStandard.className = 'flex-1 py-1.5 text-xs font-semibold rounded-md bg-white text-indigo-700 shadow-sm border border-slate-200 transition-all';
      tabRolePaste.className = 'flex-1 py-1.5 text-xs font-medium rounded-md text-slate-500 hover:text-slate-800 transition-all';
      if(contentRoleStandard) contentRoleStandard.classList.remove('hidden');
      if(contentRolePaste) contentRolePaste.classList.add('hidden');
    }
  }

  if (tabCvUpload) tabCvUpload.addEventListener('click', () => { sfx.playClick(); setCvUploadMode(); });
  if (tabCvSample) tabCvSample.addEventListener('click', () => { sfx.playClick(); setCvSampleMode(); });
  
  if (tabRolePaste) tabRolePaste.addEventListener('click', () => { sfx.playClick(); setRolePasteMode(); });
  if (tabRoleStandard) tabRoleStandard.addEventListener('click', () => { sfx.playClick(); setRoleStandardMode(); });

  document.querySelectorAll('.btn-water-plant').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
      
      const realProfileId = localStorage.getItem('current_profile_id') || appState.currentProfileId;
      if (!realProfileId) {
          if (typeof showToast === 'function') showToast('Chưa đăng nhập', 'Vui lòng đăng nhập để chăm sóc cây!', 'warning');
          return;
      }

      if(appState.user.hasWateredToday) {
        if (typeof showToast === 'function') showToast('Đã tưới cây hôm nay', 'Mỗi ngày chỉ được tưới 1 lần. Hãy quay lại vào ngày mai nhé!', 'warning');
        return; 
      }
      
      try {
          const res = await fetch(`${API_BASE_URL}/gamification/water-plant/${realProfileId}`, { method: 'POST' });
          const data = await res.json();
          
          if (!res.ok) throw new Error(data.detail);

          if(typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
          appState.user.currentXp = data.current_xp; 
          appState.user.hasWateredToday = true; 
          
          if (typeof showToast === 'function') showToast('Đã tưới nước', data.message, 'success');
          checkAndUpdateStage(); // Gọi hàm cập nhật giao diện mầm cây
      } catch (err) {
          if (typeof showToast === 'function') showToast('Lỗi', err.message, 'error');
      }
    });
  });

  document.querySelectorAll('.interview-question-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        sfx.playClick();
        selectInterviewQuestion(parseInt(tab.getAttribute('data-qid')));
    });
  });

// ==========================================
// UPLOAD CV, ĐỌC PDF & GỌI API FASTAPI (OLLAMA QWEN)
// ==========================================
const cvFileInput = document.getElementById('cvFileUpload');
const uploadStatusText = document.getElementById('uploadStatusText');
const uploadFileName = document.getElementById('uploadFileName');

if (cvFileInput) {
    cvFileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            
            if (file.size > 5 * 1024 * 1024) { 
                showToast('File quá lớn', 'File CV vượt quá 5MB. Vui lòng nén lại.', 'warning');
                e.target.value = ''; 
                return;
            }
            
            if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
            if (uploadStatusText) uploadStatusText.textContent = "Đang đọc nội dung file PDF...";
            if (uploadFileName) uploadFileName.textContent = `Đang xử lý: ${file.name}`;
            
            try {
                let extractedText = "";

               // DÙNG PDF.JS ĐỂ RÚT TRÍCH VĂN BẢN TỪ FILE PDF (CÁCH MỚI)
                if (file.type === "application/pdf") {
                    const fileUrl = URL.createObjectURL(file);
                    const loadingTask = pdfjsLib.getDocument(fileUrl);
                    const pdf = await loadingTask.promise;
                    
                    let fullText = "";
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(" ");
                        fullText += pageText + "\n";
                    }
                    extractedText = fullText;
                    URL.revokeObjectURL(fileUrl);
                } else {
                    extractedText = await file.text();
                }

                if (!extractedText || extractedText.trim() === "") {
                     showToast('Lỗi đọc file', 'Không thể đọc chữ. Đảm bảo CV của bạn không phải là file ảnh (Canva/Scan).', 'error');
                     if (uploadStatusText) uploadStatusText.textContent = "Không tìm thấy văn bản trong PDF!";
                     return;
                }

                if (uploadStatusText) uploadStatusText.textContent = "AI đang trích xuất kỹ năng...";

                // Đã gỡ bỏ việc gửi userSchedules lúc upload CV
                const payload = {
                    name: "Ứng viên", 
                    email: "temp_" + Date.now() + "@example.com", 
                    cv_text: extractedText, 
                    free_time_json: "[]"
                };

                const response = await fetch(`${API_BASE_URL}/profiles/extract-cv/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error("Lỗi phản hồi từ server Python FastAPI");
                }

                const data = await response.json();
                appState.currentProfileId = data.id;

                if (typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
                if (uploadStatusText) uploadStatusText.textContent = "Trích xuất CV thành công!";
                
                const skillsObj = JSON.parse(data.skills_json || "{}");
                window.currentUploadedSkills = Object.keys(skillsObj).map(skillName => ({
                    topic: skillName,
                    score: skillsObj[skillName]
                }));

                if (window.currentUploadedSkills.length === 0) {
                    if (typeof showToast === 'function') {
                        showToast('Lưu ý từ AI', 'Không nhận diện được từ khóa kỹ năng nào trong CV. Bạn có thể tự thêm thủ công.', 'warning');
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast('Hoàn tất!', `Đã tìm thấy ${window.currentUploadedSkills.length} kỹ năng.`, 'success');
                    }
                }
                
                const interestsContainer = document.getElementById('interestsContainer');
                if (interestsContainer) interestsContainer.classList.remove('hidden');
                
                if (typeof renderInterestsSliders === 'function') {
                    renderInterestsSliders(window.currentUploadedSkills);
                }

            } catch (error) {
                console.error("Lỗi Trích xuất CV:", error);
                if (uploadStatusText) uploadStatusText.textContent = "Lỗi khi xử lý file CV!";
                showToast('Lỗi trích xuất', 'Không thể đọc file PDF hoặc AI xử lý thất bại.', 'error');
            }
        }
    });
}

const btnAddCustomSkill = document.getElementById('btnAddCustomSkill');
const customSkillInput = document.getElementById('customSkillInput');

if (btnAddCustomSkill && customSkillInput) {
    btnAddCustomSkill.addEventListener('click', () => {
        const newSkillName = customSkillInput.value.trim();
        
        if (newSkillName !== "") {
            sfx.playClick();
            
            if (!window.currentUploadedSkills) {
                window.currentUploadedSkills = [];
            }
            
            window.currentUploadedSkills.push({ topic: newSkillName, score: 1 });
            renderInterestsSliders(window.currentUploadedSkills);
            
            customSkillInput.value = "";
            showToast('Đã thêm', `Đã bổ sung kỹ năng "${newSkillName}" vào danh sách.`, 'success');
        } else {
            showToast('Chưa nhập tên', 'Vui lòng nhập tên kỹ năng hoặc sở thích muốn thêm.', 'warning');
        }
    });
    
    customSkillInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnAddCustomSkill.click();
        }
    });
}

  // 0. KHỞI TẠO BỘ NHỚ TẠM (Đặt bên ngoài event listener để lưu dữ liệu xuyên suốt)
const interviewAnswersCache = {};
let currentQuestionId = 1; // Biến này bạn cần cập nhật khi user click đổi câu hỏi

const btnSubmit = document.getElementById('btnSubmitAnswer');
if (btnSubmit) {
  btnSubmit.addEventListener('click', async () => {
    // 1. Kiểm tra an toàn
    const inputEl = document.getElementById('userAnswerInput');
    if (!inputEl) return;
    
    const text = inputEl.value.trim();
    if (text.length < 20) return alert('Trả lời quá ngắn! Tối thiểu 20 ký tự.');

    // 2. Khóa UI trong lúc chờ AI
    if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Qwen 3.5 đang chấm điểm...';

    let numericScore = 0;
    let aiFeedback = '';
    let improvedAnswer = '';

    const currentQuestionText = document.getElementById('currentQuestionTitle')?.innerText || "Câu hỏi phỏng vấn";
    
    // Lấy ID người dùng hiện tại từ appState (Mặc định là 1 nếu chưa có)
    const activeProfileId = parseInt(localStorage.getItem('current_profile_id') || appState.currentProfileId || 1, 10);

    try {
      // 3. Gọi API (Đã truyền ID câu hỏi động và đính kèm profile_id)
      const res = await fetch(`${API_BASE_URL}/interview/submit-and-evaluate/${currentQuestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            profile_id: activeProfileId,  // <-- Đẩy ID xuống DB để cộng XP
            question_text: currentQuestionText,
            student_answer: text 
        })
      });
      
      const data = await res.json();
      numericScore = parseFloat(data.evaluation?.score) || 0;
      aiFeedback = data.evaluation?.feedback || '';
      improvedAnswer = data.evaluation?.improved_answer || '';

      // Đồng bộ XP trả về từ DB lên giao diện
      if (typeof appState !== 'undefined' && appState.user && data.current_xp) {
          appState.user.currentXp = data.current_xp;
      }
      
    } catch(e) {
      console.error("Lỗi gọi API chấm điểm:", e);
      numericScore = text.length > 80 ? 8.5 : 5.5; 
      aiFeedback = "Lỗi kết nối AI. Điểm ước lượng dựa trên độ dài.";
    }

    // 4. CẬP NHẬT UI AN TOÀN (Ngăn chặn JS crash nếu thiếu thẻ HTML)
    const overlayEl = document.getElementById('lockOverlay');
    if (overlayEl) overlayEl.style.display = 'none';

    const lockedAnswerEl = document.getElementById('lockedAiAnswer');
    if (lockedAnswerEl) lockedAnswerEl.classList.remove('blur-md');

    const unlockedEvalEl = document.getElementById('unlockedAiEvaluation');
    if (unlockedEvalEl) unlockedEvalEl.classList.remove('hidden');
    
    const scoreEl = document.querySelector('.text-2xl.font-bold');
    if (scoreEl) scoreEl.textContent = numericScore + ' / 10';

    const fbEl = document.getElementById('aiFeedbackText');
    if (fbEl) fbEl.textContent = aiFeedback; 
    
    const impEl = document.getElementById('aiImprovedAnswerText');
    if (impEl) impEl.textContent = improvedAnswer; 

    // 5. MỞ KHÓA LẠI NÚT CHO PHÉP NỘP LẦN NỮA VÀ LƯU STATE
    btnSubmit.textContent = 'Cập nhật câu trả lời';
    btnSubmit.disabled = false; 
    
    if (typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
    
    // 6. LƯU TRẠNG THÁI VÀO CACHE (Chống mất dữ liệu khi đổi câu hỏi)
    interviewAnswersCache[currentQuestionId] = {
        text: text,
        score: numericScore,
        feedback: aiFeedback,
        improved: improvedAnswer
    };

    // Tích hợp logic Game (Hiển thị toast)
    if (typeof appState !== 'undefined' && appState.user) {
      if (numericScore < 7.0) {
        showToast('Cần đào sâu thêm', `Điểm: ${numericScore}. Bạn chỉ được +10 XP. Hãy đọc đáp án mẫu để cải thiện.`, 'warning');
      } else {
        showToast('Tuyệt vời!', `Điểm: ${numericScore}. Hoàn thành bài tập xuất sắc, nhận +50 XP!`, 'success');
      }

      if(appState.user.streakDays === 0) appState.user.streakDays = 1;
      else appState.user.streakDays += 1;
      
      if (typeof updateStreakColor === 'function') updateStreakColor();
      if (typeof checkAndUpdateStage === 'function') checkAndUpdateStage(); 
    }
  });
}

  const btnToggleSound = document.getElementById('btnToggleSound');
  if (btnToggleSound) {
    btnToggleSound.addEventListener('click', () => {
      sfx.soundEnabled = !sfx.soundEnabled;
      
      if (sfx.soundEnabled) {
        btnToggleSound.innerHTML = `<svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>`;
        showToast('Cài đặt', 'Đã BẬT hiệu ứng âm thanh', 'success');
      } else {
        btnToggleSound.innerHTML = `<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>`;
        showToast('Cài đặt', 'Đã TẮT hiệu ứng âm thanh', 'warning');
      }
    });
  }

// ==========================================
  // XỬ LÝ ĐĂNG NHẬP, ĐĂNG KÝ & MENU TÀI KHOẢN
  // ==========================================
  const btnLoginOpen = document.getElementById('btnLoginOpen');
  const authModal = document.getElementById('authModal');
  const btnCloseAuth = document.getElementById('btnCloseAuth');
  
  const loginView = document.getElementById('loginView');
  const registerView = document.getElementById('registerView');
  const btnSwitchToRegister = document.getElementById('btnSwitchToRegister');
  const btnSwitchToLogin = document.getElementById('btnSwitchToLogin');
  
  const userDropdownMenu = document.getElementById('userDropdownMenu');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const btnLogout = document.getElementById('btnLogout');

  if (btnLoginOpen && authModal && btnCloseAuth) {
    btnLoginOpen.addEventListener('click', (e) => {
      e.stopPropagation();
      const savedUserId = localStorage.getItem('current_profile_id');
      
      if (savedUserId) {
        // Nếu ĐÃ ĐĂNG NHẬP: Bấm vào nút tên tài khoản sẽ bật/tắt Menu thả xuống
        if (userDropdownMenu) {
          userDropdownMenu.classList.toggle('hidden');
        }
      } else {
        // Nếu CHƯA ĐĂNG NHẬP: Mở modal Đăng nhập như bình thường
        sfx.playClick();
        loginView.classList.remove('hidden');
        registerView.classList.add('hidden');
        authModal.classList.remove('hidden');
      }
    });
    
    btnCloseAuth.addEventListener('click', () => {
      sfx.playClick();
      authModal.classList.add('hidden');
    });

    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) authModal.classList.add('hidden');
    });
    
    if (btnSwitchToRegister) {
      btnSwitchToRegister.addEventListener('click', () => {
        sfx.playClick();
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
      });
    }

    if (btnSwitchToLogin) {
      btnSwitchToLogin.addEventListener('click', () => {
        sfx.playClick();
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
      });
    }
  }

  // Đóng menu thả xuống khi bấm ra ngoài vùng menu
  document.addEventListener('click', () => {
    if (userDropdownMenu) userDropdownMenu.classList.add('hidden');
  });


  function checkAndRestoreUserAnalysis(profileId) {
    if (!profileId) return false;

    // Tìm dữ liệu theo profile_id hoặc fallback về dữ liệu chung
    const savedAnalysisDone = localStorage.getItem(`analysis_done_${profileId}`) || localStorage.getItem('analysis_done');
    const savedAnalysisData = localStorage.getItem(`analysis_data_${profileId}`) || localStorage.getItem('analysis_data');

    if (savedAnalysisDone === 'true' && savedAnalysisData) {
        try {
            const parsedData = JSON.parse(savedAnalysisData);
            
            // 1. Đồng bộ vào appState
            if (typeof appState !== 'undefined') {
                appState.analysisDone = true;
                appState.analysisData = parsedData;
                appState.currentProfileId = profileId;
            }
            
            // 2. Đồng bộ vào AppStore
            if (typeof AppStore !== 'undefined') {
                if (AppStore.state) {
                    AppStore.state.analysisDone = true;
                    AppStore.state.analysisData = parsedData;
                }
                if (typeof AppStore.setAnalysisResult === 'function') {
                    AppStore.setAnalysisResult(parsedData);
                }
            }
            
            // 3. Đặt cờ chung
            localStorage.setItem('analysis_done', 'true');
            localStorage.setItem('analysis_data', savedAnalysisData);

            // 4. Kích hoạt vẽ lại giao diện và biểu đồ Radar ngay lập tức
            if (typeof window.renderAnalysisResult === 'function') {
                window.renderAnalysisResult(parsedData);
            }
            return true;
        } catch (e) {
            console.error("Lỗi khôi phục dữ liệu phân tích:", e);
        }
    } else {
        // Nếu không có dữ liệu, reset sạch sẽ
        if (typeof appState !== 'undefined') {
            appState.analysisDone = false;
            appState.analysisData = null;
        }
        if (typeof AppStore !== 'undefined' && AppStore.state) {
            AppStore.state.analysisDone = false;
            AppStore.state.analysisData = null;
        }
        localStorage.removeItem('analysis_done');
        localStorage.removeItem('analysis_data');
    }
    return false;
}

  // --- HÀM TIỆN ÍCH: RESET VÀ CHUYỂN HƯỚNG VỀ TRANG CHỦ ---
  function forceNavigateToHome() {
    // 1. Xóa sạch tất cả các key dữ liệu phân tích cũ trong LocalStorage & SessionStorage
    localStorage.removeItem('analysis_done');
    localStorage.removeItem('analysis_data');
    sessionStorage.removeItem('analysis_done');
    sessionStorage.removeItem('analysis_data');
    sessionStorage.setItem('current_screen', 'screen-home');

    // 2. Reset các biến trạng thái appState & AppStore về mặc định ban đầu
    if (typeof appState !== 'undefined') {
        appState.analysisDone = false;
        appState.analysisData = null;
        appState.gapDetails = [];
    }
    
    if (typeof AppStore !== 'undefined') {
        if (AppStore.state) {
            AppStore.state.analysisDone = false;
            AppStore.state.analysisData = null;
            AppStore.state.gapDetails = [];
        }
        if (typeof AppStore.setScreen === 'function') {
            AppStore.setScreen('screen-home');
        }
    }

    // 3. Hủy hoàn toàn biểu đồ Radar cũ để tránh lưu vết hình ảnh
    if (typeof window.myRadarChart !== 'undefined' && window.myRadarChart) {
        window.myRadarChart.destroy();
        window.myRadarChart = null;
    }

    // 4. RESET TRẮNG GIAO DIỆN TAB SKILL GAP (Đưa về trạng thái chưa phân tích)
    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setWid = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = pct + '%'; };

    // Đưa điểm số về mặc định trống (--%)
    setTxt('finalMatchScore', '--%'); setWid('barMatchScore', 0);
    setTxt('valSkillScore', '--%'); setWid('barSkillScore', 0);
    setTxt('valInterestScore', '--%'); setWid('barInterestScore', 0);
    setTxt('valExperienceScore', '--%'); setWid('barExperienceScore', 0);
    setTxt('valExpScore', '--%'); setWid('barExpScore', 0);

    // Xóa danh sách gap details cũ
    const gapContainer = document.getElementById('gapDetailsContainer');
    if (gapContainer) gapContainer.innerHTML = '';

    // Ẩn khối kết quả thật, bật lại trạng thái chờ nếu cần
    const realResults = document.getElementById('gapRealResults');
    if (realResults) realResults.classList.add('hidden');

    // 5. Ẩn toàn bộ các screen khác, hiển thị tab Trang chủ
    document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
    const homeScreen = document.getElementById('screen-home');
    if (homeScreen) homeScreen.classList.remove('hidden');
    
    // 6. Đồng bộ thanh highlight về Trang chủ cho cả Desktop & Mobile
    if (typeof updateActiveTabHighlight === 'function') {
        updateActiveTabHighlight('screen-home');
    } else {
        document.querySelectorAll('[data-navigate]').forEach(btn => {
            const target = btn.getAttribute('data-navigate');
            if (target === 'screen-home') {
                btn.classList.add('text-indigo-700', 'bg-indigo-50', 'border-indigo-200');
                btn.classList.remove('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
            } else {
                btn.classList.remove('text-indigo-700', 'bg-indigo-50', 'border-indigo-200');
                btn.classList.add('text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-100');
            }
        });
    }
  }

// --- XỬ LÝ ĐĂNG NHẬP THỰC TẾ ---
const btnSubmitLogin = document.getElementById('btnSubmitLogin');
if (btnSubmitLogin) {
    btnSubmitLogin.addEventListener('click', async () => {
        const emailInput = document.querySelector('#loginView input[type="email"]');
        const passInput = document.querySelector('#loginView input[type="password"]');
        
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, password: passInput.value })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Lỗi đăng nhập");

            // 1. Lưu thông tin tài khoản
            localStorage.setItem('current_profile_id', data.profile_id);
            localStorage.setItem('current_user_name', data.name);
            appState.currentProfileId = data.profile_id;

            // 2. GỌI HÀM KHÔI PHỤC VÀ VẼ LẠI GIAO DIỆN LẬP TỨC
            checkAndRestoreUserAnalysis(data.profile_id);

            authModal.classList.add('hidden');
            showToast('Thành công', `Chào mừng trở lại, ${data.name}!`, 'success');
            
            // 3. Đưa về Trang chủ an toàn
            document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
            const homeScreen = document.getElementById('screen-home');
            if (homeScreen) homeScreen.classList.remove('hidden');
            
            if (typeof updateActiveTabHighlight === 'function') {
                updateActiveTabHighlight('screen-home');
            }

            if (btnLoginOpen) btnLoginOpen.textContent = data.name + ' ▾';
            if (dropdownUserName) dropdownUserName.textContent = data.name;

            loadSavedStudyPlan();
            loadGamificationData();
        } catch (err) {
            showToast('Lỗi đăng nhập', err.message, 'error');
        }
    });
}

  // Xử lý Đăng ký thực tế (Sửa lại: Đăng ký xong KHÔNG tự vào luôn mà bắt đăng nhập lại)
  const btnSubmitRegister = document.getElementById('btnSubmitRegister');
  if (btnSubmitRegister) {
      btnSubmitRegister.addEventListener('click', async () => {
          const nameInput = document.querySelector('#registerView input[type="text"]');
          const emailInput = document.querySelector('#registerView input[type="email"]');
          const passInputs = document.querySelectorAll('#registerView input[type="password"]');
          
          if (passInputs[0].value !== passInputs[1].value) {
              showToast('Lỗi', 'Mật khẩu xác nhận không khớp!', 'warning');
              return;
          }

          try {
              const res = await fetch(`${API_BASE_URL}/auth/register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: nameInput.value, email: emailInput.value, password: passInputs[0].value })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.detail || "Lỗi đăng ký");

              showToast('Đăng ký thành công', 'Vui lòng đăng nhập bằng tài khoản vừa tạo!', 'success');
              
              // Chuyển hướng giao diện modal về lại màn hình Đăng nhập thay vì lưu token/auto login
              registerView.classList.add('hidden');
              loginView.classList.remove('hidden');
          } catch (err) {
              showToast('Lỗi đăng ký', err.message, 'error');
          }
      });
  }

  // ==========================================
  // XỬ LÝ PHÍM ENTER & TAB CHO FORM ĐĂNG NHẬP / ĐĂNG KÝ
  // ==========================================
  
  // Xử lý cho Form Đăng nhập
  const loginInputs = document.querySelectorAll('#loginView input');
  loginInputs.forEach((input, index) => {
      input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              e.preventDefault(); // Tránh form bị reload
              if (index < loginInputs.length - 1) {
                  // Nếu chưa phải ô cuối cùng -> Nhảy xuống ô tiếp theo
                  loginInputs[index + 1].focus();
              } else {
                  // Nếu là ô cuối cùng (Mật khẩu) -> Bấm đăng nhập
                  if (btnSubmitLogin) btnSubmitLogin.click();
              }
          }
      });
  });

  // Xử lý cho Form Đăng ký
  const registerInputs = document.querySelectorAll('#registerView input');
  registerInputs.forEach((input, index) => {
      input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              e.preventDefault(); 
              if (index < registerInputs.length - 1) {
                  // Nếu chưa phải ô cuối cùng -> Nhảy xuống ô tiếp theo
                  registerInputs[index + 1].focus();
              } else {
                  // Nếu là ô cuối cùng (Xác nhận mật khẩu) -> Bấm đăng ký
                  if (btnSubmitRegister) btnSubmitRegister.click();
              }
          }
      });
  });

  // Xử lý Đăng xuất
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('current_profile_id');
        localStorage.removeItem('current_user_name');
        sessionStorage.clear();
        
        showToast('Đăng xuất', 'Đã đăng xuất tài khoản thành công.', 'info');
        
        // Đăng xuất xong -> Tự động kéo về Trang chủ lập tức
        forceNavigateToHome();
        
        // Đóng menu dropdown và reset nút đăng nhập
        const userDropdownMenu = document.getElementById('userDropdownMenu');
        if (userDropdownMenu) userDropdownMenu.classList.add('hidden');
        if (btnLoginOpen) btnLoginOpen.textContent = 'Đăng nhập';
    });
  } 


  // Kiểm tra localStorage khi vừa tải trang để giữ phiên đăng nhập nếu có
  const savedUserId = localStorage.getItem('current_profile_id');
  const savedUserName = localStorage.getItem('current_user_name');
  if (savedUserId && savedUserName) {
      appState.currentProfileId = savedUserId;
      if (btnLoginOpen) btnLoginOpen.textContent = savedUserName + ' ▾';
      if (dropdownUserName) dropdownUserName.textContent = savedUserName;

      loadGamificationData();
  }


// ==========================================
    // QUẢN LÝ LỊCH RẢNH (LỊCH THÁNG & CHỐNG TRÙNG LẶP)
    // ==========================================
    window.userSchedules = []; 
    let today = new Date();
    // Bỏ qua giờ phút giây để so sánh ngày chính xác
    today.setHours(0, 0, 0, 0); 
    
    let currentViewMonth = today.getMonth();
    let currentViewYear = today.getFullYear();
    let selectedFullDate = null; // Chuỗi định dạng DD/MM/YYYY
    let selectedDayOfWeek = null; // Lưu thứ (T2, T3...)

    const btnPrevMonth = document.getElementById('btnPrevMonth');
    const btnNextMonth = document.getElementById('btnNextMonth');
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');
    const calendarDaysGrid = document.getElementById('calendarDaysGrid');
    const displaySelectedDate = document.getElementById('displaySelectedDate');
    const btnAddSchedule = document.getElementById('btnAddSchedule');
    const scheduleContainer = document.getElementById('scheduleListContainer');

    function renderMonthCalendar() {
        if (!calendarDaysGrid || !currentMonthDisplay) return;

        // Cập nhật tiêu đề tháng
        currentMonthDisplay.textContent = `Tháng ${currentViewMonth + 1}/${currentViewYear}`;

        // Kiểm tra chặn nút "Tháng trước" nếu là tháng hiện tại hoặc quá khứ
        const isCurrentMonthOrPast = (currentViewYear < today.getFullYear()) || 
                                     (currentViewYear === today.getFullYear() && currentViewMonth <= today.getMonth());
        
        if (isCurrentMonthOrPast) {
            btnPrevMonth.classList.add('opacity-30', 'cursor-not-allowed');
            btnPrevMonth.disabled = true;
        } else {
            btnPrevMonth.classList.remove('opacity-30', 'cursor-not-allowed');
            btnPrevMonth.disabled = false;
        }

        // Xóa lưới cũ
        calendarDaysGrid.innerHTML = '';

        // Tính toán số ngày trong tháng và thứ của ngày đầu tiên
        const firstDayOfMonth = new Date(currentViewYear, currentViewMonth, 1);
        const lastDayOfMonth = new Date(currentViewYear, currentViewMonth + 1, 0);
        const totalDays = lastDayOfMonth.getDate();
        
        // JS getDay(): CN = 0, T2 = 1. Lưới của chúng ta T2 là cột đầu tiên.
        let startDayOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

        // In các ô trống của đầu tháng
        for (let i = 0; i < startDayOffset; i++) {
            const emptyDiv = document.createElement('div');
            calendarDaysGrid.appendChild(emptyDiv);
        }

        // In các ngày trong tháng
        for (let i = 1; i <= totalDays; i++) {
            const cellDate = new Date(currentViewYear, currentViewMonth, i);
            const dateStr = `${String(i).padStart(2, '0')}/${String(currentViewMonth + 1).padStart(2, '0')}/${currentViewYear}`;
            const isPast = cellDate < today;
            const isSelected = selectedFullDate === dateStr;

            const dayDiv = document.createElement('div');
            
            if (isPast) {
                // Ngày trong quá khứ -> Làm mờ, khóa click
                dayDiv.className = "py-2 text-center text-xs font-medium rounded-lg bg-slate-50 text-slate-300 cursor-not-allowed border border-transparent";
                dayDiv.textContent = i;
            } else {
                // Ngày hợp lệ -> Có thể click
                dayDiv.className = `py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all border ${
                    isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md transform scale-105' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 shadow-sm'
                }`;
                dayDiv.textContent = i;
                
                dayDiv.addEventListener('click', () => {
                    if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
                    selectedFullDate = dateStr;
                    
                    // Tính ra thứ mấy để lưu vào db (T2 -> CN)
                    const daysArr = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                    selectedDayOfWeek = daysArr[cellDate.getDay()];
                    
                    displaySelectedDate.textContent = `${selectedDayOfWeek} - ${selectedFullDate}`;
                    displaySelectedDate.classList.remove('text-slate-400');
                    displaySelectedDate.classList.add('text-indigo-600');
                    
                    renderMonthCalendar(); // Render lại để cập nhật màu ô được chọn
                });
            }
            calendarDaysGrid.appendChild(dayDiv);
        }
    }

    if (btnPrevMonth) {
        btnPrevMonth.addEventListener('click', () => {
            if (btnPrevMonth.disabled) return;
            if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
            currentViewMonth--;
            if (currentViewMonth < 0) { currentViewMonth = 11; currentViewYear--; }
            renderMonthCalendar();
        });
    }

    if (btnNextMonth) {
        btnNextMonth.addEventListener('click', () => {
            if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
            currentViewMonth++;
            if (currentViewMonth > 11) { currentViewMonth = 0; currentViewYear++; }
            renderMonthCalendar();
        });
    }

    // Khởi tạo lịch khi chạy app
    renderMonthCalendar();

    // HÀM KIỂM TRA TRÙNG LẶP GIỜ (OVERLAP)
    function isTimeOverlapping(newDate, newStart, newEnd) {
        const toMinutes = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };
        
        const startMin = toMinutes(newStart);
        const endMin = toMinutes(newEnd);

        for (const schedule of window.userSchedules) {
            if (schedule.exactDate === newDate) {
                const exStart = toMinutes(schedule.timeStart);
                const exEnd = toMinutes(schedule.timeEnd);
                
                // Công thức kiểm tra giao nhau: (Start1 < End2) && (End1 > Start2)
                if (startMin < exEnd && endMin > exStart) {
                    return true;
                }
            }
        }
        return false;
    }

    // NÚT GHI NHẬN GIỜ RẢNH
    if (btnAddSchedule) {
        btnAddSchedule.addEventListener('click', () => {
            if (!selectedFullDate) {
                if (typeof showToast === 'function') showToast('Chưa chọn ngày', 'Vui lòng click chọn một ngày trên lịch!', 'warning');
                return;
            }
            
            const startH = document.getElementById('startHour').value;
            const startM = document.getElementById('startMin').value;
            const endH = document.getElementById('endHour').value;
            const endM = document.getElementById('endMin').value;

            const startStr = `${startH}:${startM}`;
            const endStr = `${endH}:${endM}`;

            // 1. Kiểm tra Giờ bắt đầu phải nhỏ hơn Giờ kết thúc
            if (startStr >= endStr) {
                if (typeof showToast === 'function') showToast('Giờ không hợp lệ', 'Giờ kết thúc phải lớn hơn giờ bắt đầu!', 'error');
                return;
            }

            // 2. Kiểm tra xem có bị trùng lịch trong cùng 1 ngày không
            if (isTimeOverlapping(selectedFullDate, startStr, endStr)) {
                if (typeof showToast === 'function') showToast('Trùng lịch', `Khung giờ ${startStr}-${endStr} bị trùng với lịch đã có trong ngày ${selectedFullDate}!`, 'error');
                return;
            }

            if(typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();

            const scheduleItem = {
                id: Date.now(), 
                exactDate: selectedFullDate,
                dayOfWeek: selectedDayOfWeek,
                timeStart: startStr,
                timeEnd: endStr
            };

            window.userSchedules.push(scheduleItem);
            
            // Tự động sắp xếp lại danh sách theo ngày và giờ cho đẹp
            window.userSchedules.sort((a, b) => {
                const dateA = a.exactDate.split('/').reverse().join('');
                const dateB = b.exactDate.split('/').reverse().join('');
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                return a.timeStart.localeCompare(b.timeStart);
            });

            renderSchedules();
            if (typeof showToast === 'function') showToast('Thành công', 'Đã thêm khung giờ rảnh vào danh sách!', 'success');
        });
    }

    window.renderSchedules = function() {
        if (!scheduleContainer) return;

        if (window.userSchedules.length === 0) {
            scheduleContainer.innerHTML = `<div class="text-center py-6 text-[11px] text-slate-500 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">Chưa có lịch rảnh nào được thêm.</div>`;
            return;
        }

        scheduleContainer.innerHTML = window.userSchedules.map(item => `
            <div class="flex items-center justify-between p-3 rounded-xl border border-indigo-100 bg-indigo-50/60 shadow-2xs hover:border-indigo-300 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-white text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100 shadow-sm">${item.dayOfWeek}</div>
                    <div>
                        <div class="text-xs font-bold text-slate-900">${item.timeStart} - ${item.timeEnd}</div>
                        <div class="text-[10px] font-medium text-slate-500 mt-0.5">${item.exactDate}</div>
                    </div>
                </div>
                <button type="button" onclick="removeSchedule(${item.id})" class="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50" title="Xóa">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        `).join('');
    };

    window.removeSchedule = function(id) {
        if(typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
        window.userSchedules = window.userSchedules.filter(s => s.id !== id);
        renderSchedules();
    };

    // Sự kiện cho nút Tạo lộ trình học
    const btnGeneratePlan = document.getElementById('btnGenerateStudyPlan'); 
    
    if (btnGeneratePlan) {
        // 1. CƯỠNG CHẾ MỞ KHÓA NÚT VÀ BỎ LÀM MỜ NGAY KHI TẢI TRANG
        btnGeneratePlan.disabled = false;
        btnGeneratePlan.classList.remove('opacity-50', 'cursor-not-allowed');

        btnGeneratePlan.addEventListener('click', async () => {
            const realProfileId = localStorage.getItem('current_profile_id') || appState.currentProfileId;
            
            if (!realProfileId) {
                if (typeof showToast === 'function') showToast('Chưa đăng nhập', 'Vui lòng đăng nhập để lưu lộ trình cá nhân!', 'warning');
                return;
            }

            if (window.userSchedules.length === 0) {
                if (typeof showToast === 'function') showToast('Lỗi', 'Vui lòng thêm ít nhất 1 khung giờ rảnh!', 'warning');
                return;
            }

            // Đổi trạng thái nút khi đang chờ AI
            const originalText = btnGeneratePlan.innerHTML;
            btnGeneratePlan.disabled = true;
            btnGeneratePlan.classList.add('opacity-50', 'cursor-not-allowed');
            btnGeneratePlan.innerHTML = 'Đang tạo lộ trình... <span class="animate-spin ml-2"></span>';

            try {
                const payload = {
                    profile_id: String(realProfileId),
                    role_id: String(appState.selectedRoleId || "1"),
                    schedules: window.userSchedules,
                    gaps: (appState.gapDetails && appState.gapDetails.length > 0) 
                            ? appState.gapDetails.map(g => g.name) 
                            : ["Kỹ năng chuyên ngành"]
                };

                const res = await fetch(`${API_BASE_URL}/study-plan/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                // --- THÊM ĐOẠN XỬ LÝ 404 Ở ĐÂY ---
                if (res.status === 404) {
                    // Nếu Backend báo không tìm thấy tài khoản -> Xóa bộ nhớ tạm và bắt đăng nhập lại
                    localStorage.removeItem('current_profile_id');
                    localStorage.removeItem('current_user_name');
                    appState.currentProfileId = null;
                    
                    if (typeof showToast === 'function') {
                        showToast('Phiên hết hạn', 'Tài khoản không tồn tại (có thể do DB đã bị reset). Vui lòng đăng nhập lại!', 'error');
                    }
                    
                    // Đổi lại nút giao diện
                    const btnLoginOpen = document.getElementById('btnLoginOpen');
                    if (btnLoginOpen) btnLoginOpen.textContent = 'Đăng nhập';
                    
                    throw new Error("Tài khoản không tồn tại trong hệ thống.");
                }

                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Lỗi tạo lộ trình");

                if (typeof showToast === 'function') showToast('Thành công', 'Lộ trình cá nhân hóa đã được tạo!', 'success');
                
                // 1. Kéo dữ liệu lộ trình mới nhất và vẽ vào Sơ đồ ở Trang chủ
                await loadSavedStudyPlan();

                // 2. Chuyển ngay giao diện về Trang chủ để người dùng thấy kết quả
                appState.currentScreen = 'screen-home';
                
                // Dùng sessionStorage (hoặc localStorage) theo cấu hình hiện tại của bạn để F5 không bị mất tab
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('current_screen', 'screen-home'); 
                }

                // Ẩn tất cả các trang và mở Trang chủ
                document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
                
                const forceHideGap = document.getElementById('screen-gap');
                if (forceHideGap) forceHideGap.classList.add('hidden');
                
                const homeScreen = document.getElementById('screen-home');
                if (homeScreen) homeScreen.classList.remove('hidden');
                
                // Cập nhật lại màu của thanh menu
                if (typeof updateActiveTabHighlight === 'function') {
                    updateActiveTabHighlight('screen-home');
                }

            } catch (err) {
                if (typeof showToast === 'function' && err.message !== "Tài khoản không tồn tại trong hệ thống.") {
                    showToast('Lỗi', err.message, 'error');
                }
            } finally {
                btnGeneratePlan.disabled = false;
                btnGeneratePlan.classList.remove('opacity-50', 'cursor-not-allowed');
                btnGeneratePlan.innerHTML = originalText;
            }
        });
    }

    // --- CẬP NHẬT LẠI HÀM LỌC GIỜ KHÔNG CHO CHỌN QUÁ KHỨ NẾU LÀ HÔM NAY ---
    function updateTimeDropdowns() {
        const hourSel = document.getElementById('startHour');
        const minSel = document.getElementById('startMin');
        const hiddenInp = document.getElementById('studyTimeStart');
        if (!hourSel || !minSel || !hiddenInp) return;

        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();

        // Kiểm tra xem ngày đang chọn có phải là ngày hôm nay hay không
        // selectedFullDate có định dạng "DD/MM/YYYY"
        let isToday = false;
        if (selectedFullDate) {
            const [d, m, y] = selectedFullDate.split('/').map(Number);
            isToday = (d === now.getDate() && m === (now.getMonth() + 1) && y === now.getFullYear());
        } else {
            // Nếu chưa chọn ngày nào trên lịch thì mặc định coi như hôm nay để bảo vệ logic
            isToday = true;
        }

        // Lấy giá trị đang chọn hiện tại để giữ lại nếu hợp lệ
        const selectedH = parseInt(hourSel.value) || currentH;
        const selectedM = parseInt(minSel.value) || currentM;

        // 1. Render danh sách Giờ (00 đến 23)
        let hourOptions = '';
        let firstValidHour = -1;

        for (let i = 0; i < 24; i++) {
            // Nếu là hôm nay và giờ nhỏ hơn giờ hiện tại -> Bỏ qua (không cho chọn)
            if (isToday && i < currentH) {
                continue; 
            }
            if (firstValidHour === -1) firstValidHour = i;
            const hStr = String(i).padStart(2, '0');
            hourOptions += `<option value="${hStr}">${hStr}</option>`;
        }
        hourSel.innerHTML = hourOptions;

        // Đảm bảo giờ đang chọn không bị nằm trong quá khứ
        let finalH = selectedH;
        if (isToday && selectedH < currentH) {
            finalH = (firstValidHour !== -1) ? firstValidHour : currentH;
        }
        hourSel.value = String(finalH).padStart(2, '0');

        // 2. Render danh sách Phút (00 đến 59)
        let minOptions = '';
        const activeHour = parseInt(hourSel.value);
        let firstValidMin = -1;

        for (let i = 0; i < 60; i++) {
            // Nếu là hôm nay, trùng với giờ hiện tại nhưng phút nhỏ hơn phút hiện tại -> Bỏ qua
            if (isToday && activeHour === currentH && i < currentM) {
                continue;
            }
            if (firstValidMin === -1) firstValidMin = i;
            const mStr = String(i).padStart(2, '0');
            minOptions += `<option value="${mStr}">${mStr}</option>`;
        }
        minSel.innerHTML = minOptions;

        let finalM = selectedM;
        if (isToday && activeHour === currentH && selectedM < currentM) {
            finalM = (firstValidMin !== -1) ? firstValidMin : currentM;
        }
        // Phòng hờ nếu danh sách phút bị lọc sạch (ví dụ chọn sát nút 23:59), gán về phút hợp lệ đầu tiên
        if (!minSel.querySelector(`option[value="${String(finalM).padStart(2, '0')}"]`)) {
            finalM = firstValidMin !== -1 ? firstValidMin : 0;
        }
        minSel.value = String(finalM).padStart(2, '0');

        // Cập nhật giá trị vào input ẩn
        hiddenInp.value = `${hourSel.value}:${minSel.value}`;
    }

// --- TỰ ĐỘNG ĐIỀN DỮ LIỆU CHO HỘP CHỌN GIỜ & PHÚT HIỆN ĐẠI ---
    function initModernTimeDropdowns() {
        const hourSel = document.getElementById('startHour');
        const minSel = document.getElementById('startMin');
        const endHourSel = document.getElementById('endHour');
        const endMinSel = document.getElementById('endMin');
        const hiddenStartInp = document.getElementById('studyTimeStart');
        const hiddenEndInp = document.getElementById('studyTimeEnd');

        if (!hourSel || !minSel) return;

        // Khởi tạo cứng cho ô ĐẾN (End Time) bình thường từ 00 đến 23
        let endHOptions = '';
        for (let i = 0; i < 24; i++) {
            const hStr = String(i).padStart(2, '0');
            endHOptions += `<option value="${hStr}" ${hStr === '' ? 'selected' : ''}>${hStr}</option>`;
        }
        if (endHourSel) endHourSel.innerHTML = endHOptions;

        let endMOptions = '';
        for (let i = 0; i < 60; i++) {
            const mStr = String(i).padStart(2, '0');
            endMOptions += `<option value="${mStr}"> ${mStr}</option>`;
        }
        if (endMinSel) endMinSel.innerHTML = endMOptions;

        const updateEndValue = () => {
            if (endHourSel && endMinSel && hiddenEndInp) {
                hiddenEndInp.value = `${endHourSel.value}:${endMinSel.value}`;
            }
        };
        if (endHourSel) endHourSel.addEventListener('change', updateEndValue);
        if (endMinSel) endMinSel.addEventListener('change', updateEndValue);
        updateEndValue();

        // Lắng nghe sự kiện thay đổi của ô TỪ (Start Time) để cập nhật lại ô phút/giờ tương ứng
        hourSel.addEventListener('change', () => {
            updateTimeDropdowns();
        });
        minSel.addEventListener('change', () => {
            const hiddenInp = document.getElementById('studyTimeStart');
            if (hiddenInp) hiddenInp.value = `${hourSel.value}:${minSel.value}`;
        });

        // Chạy lần đầu tiên
        updateTimeDropdowns();
    }

    // Kích hoạt ngay khi tải trang
    initModernTimeDropdowns();
  
// --- TẢI LỘ TRÌNH ĐÃ LƯU TỪ DATABASE CỦA TÀI KHOẢN ---
    async function loadSavedStudyPlan() {
        const profileId = localStorage.getItem('current_profile_id') || appState.currentProfileId;
        if (!profileId || !/^\d+$/.test(profileId)) return; // Chỉ tải nếu đã đăng nhập (ID là số)

        try {
            const res = await fetch(`${API_BASE_URL}/study-plan/tasks/${profileId}`);
            if (!res.ok) return;
            const tasks = await res.json();
            
            if (tasks && tasks.length > 0) {
                window.userSavedStudyTasks = tasks;
                // Hiển thị ra giao diện Trang chủ có chức năng Gating Khóa/Mở
                if (typeof renderMasterRoadmapUI === 'function') {
                    renderMasterRoadmapUI(tasks);
                }
            }
        } catch (err) {
            console.error("Lỗi tải lộ trình:", err);
        }
    }

    function strIsDigit(str) {
        return /^\d+$/.test(str);
    }

    // Hàm mẫu render danh sách bài học lên giao diện (bạn có thể điều chỉnh lại tên thẻ HTML cho khớp với code của bạn)
    function renderSavedStudyTasksOnUI(tasks) {
        const planContainer = document.getElementById('studyPlanResultContainer'); // ID vùng hiển thị lộ trình
        if (!planContainer) return;

        planContainer.innerHTML = tasks.map((t, index) => `
            <div class="p-3 mb-2 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
                <div>
                    <span class="text-[10px] font-bold text-indigo-600 uppercase">Bài ${index + 1} - ${t.scheduled_day}</span>
                    <h4 class="text-xs font-semibold text-slate-800 mt-0.5">${t.title}</h4>
                </div>
                <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">${t.duration_minutes} phút</span>
            </div>
        `).join('');
    }

    // Gọi hàm load ngay khi người dùng vừa vào trang hoặc đăng nhập thành công
    loadSavedStudyPlan();

// --- RENDER LỘ TRÌNH TỪNG BƯỚC (STEP-BY-STEP GATING) TRÊN TRANG CHỦ ---
window.renderMasterRoadmapUI = function(tasks) {
    const container = document.getElementById('homeRoadmapContainer'); // ID vùng hiển thị ở trang chủ
    if (!container) return;

    if (!tasks || tasks.length === 0) {
        container.innerHTML = `<div class="text-center p-6 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Chưa có lộ trình nào. Hãy thực hiện phân tích Skill Gap và đăng ký lịch rảnh!</div>`;
        return;
    }

    let html = '';
    let unlocked = true; // Bài đầu tiên luôn được mở khóa
    let completedCount = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;

    tasks.forEach((task, index) => {
        const isCompleted = task.status === 'completed';
        const isUnscheduled = task.status === 'unscheduled';
        
        totalMinutes += (task.duration_minutes || 0);
        if (isCompleted) {
            completedCount++;
            completedMinutes += (task.duration_minutes || 0);
        }

        // Logic Gating: Nếu bài trước chưa xong và không phải bài đầu tiên -> Khóa bài này
        let isDisabled = !unlocked && !isCompleted;
        if (isUnscheduled) isDisabled = true;

        // Kiểm tra thời gian thực (Unlock time nếu có)
        const now = new Date();
        const unlockTime = task.unlock_time ? new Date(task.unlock_time) : null;
        const isTimeLocked = unlockTime && now < unlockTime && !isCompleted;

        if (isTimeLocked) {
            isDisabled = true;
        }
        
        html += `
            <div class="flex items-start gap-4 p-4 rounded-2xl border transition-all ${isCompleted ? 'bg-emerald-50/40 border-emerald-200' : (isDisabled ? 'bg-slate-50 opacity-60 border-slate-200' : 'bg-white border-indigo-100 shadow-sm')}" data-task-id="${task.id}">
                <!-- Số thứ tự bước -->
                <div class="w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-600 text-white' : (isDisabled ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white')}">
                    ${isCompleted ? '✓' : (index + 1)}
                </div>
                
                <!-- Nội dung bài học -->
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">${task.scheduled_day || 'Linh hoạt'}</span>
                        <span class="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">${task.duration_minutes || 60} phút</span>
                    </div>
                    <h4 class="text-xs font-bold text-slate-900 mt-1">${task.title}</h4>
                    ${isTimeLocked ? `<p class="text-[10px] text-amber-600 mt-0.5">Mở khóa lúc: ${unlockTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>` : ''}
                    ${isUnscheduled ? `<p class="text-[10px] text-slate-400 mt-0.5">Chờ đăng ký thêm giờ rảnh tuần tới</p>` : ''}
                </div>

                <!-- Nút hành động -->
                <div>
                    ${isCompleted ? 
                        '<span class="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-xl">Đã hoàn thành</span>' : 
                        (isDisabled ? 
                            `<span class="text-xs font-semibold text-slate-400 bg-slate-200 px-3 py-1.5 rounded-xl cursor-not-allowed">${isUnscheduled ? 'Chờ lịch' : 'Đang khóa'}</span>` : 
                            `<button onclick="completeTask(${task.id})" class="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-xl shadow-sm transition-all">Hoàn thành ✨</button>`
                        )
                    }
                </div>
            </div>
        `;

        // Cập nhật thanh tiến độ tổng thể trên giao diện nếu có
        const progressHeader = document.querySelector('#roadmapDiagramSection span.text-xs.font-semibold');
        if (progressHeader) {
            progressHeader.textContent = `Tiến độ: ${completedCount} / ${tasks.length} Bài Hoàn thành`;
        }

        // Nếu bài hiện tại chưa hoàn thành, các bài sau sẽ bị khóa lại theo nguyên lý step-by-step
        if (!isCompleted) {
            unlocked = false;
        }
    });

    container.innerHTML = html;
};

// Hàm gọi API hoàn thành task và cập nhật mầm cây
window.completeTask = async function(taskId) {
    try {
        const res = await fetch(`${API_BASE_URL}/study-plan/complete-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Lỗi hoàn thành bài học");

        if (typeof showToast === 'function') {
            showToast('Tuyệt vời!', `Đã hoàn thành bài học! +${data.added_xp} XP | Chuỗi: ${data.current_streak} ngày`, 'success');
        }

        // Tải lại lộ trình và cập nhật toàn bộ chỉ số gamification ngay lập tức
        await loadSavedStudyPlan();
        await loadGamificationData();
        
    } catch (err) {
        if (typeof showToast === 'function') showToast('Lỗi', err.message, 'error');
    }
};


// --- TẢI DỮ LIỆU GAMIFICATION (XP, STREAK) TỪ DATABASE ---
async function loadGamificationData() {
    const profileId = localStorage.getItem('current_profile_id') || appState.currentProfileId;
    if (!profileId || !/^\d+$/.test(profileId)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/gamification/${profileId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (!data.error) {
            // 1. SẮP XẾP CHUỖI NGÀY (Chỉ truyền con số vào thẻ, tránh bị lặp chữ "Ngày")
            const streakEl = document.getElementById('currentStreakText');
            if (streakEl) {
                streakEl.textContent = data.current_streak || 0;
            }

            // 2. CẬP NHẬT GIAI ĐOẠN MẦM CÂY ĐỘNG (Từ 1/6 đến 6/6)
            const stagesList = ["Hạt giống", "Nảy mầm", "Phát triển thân", "Phân cành", "Ra lá", "Kết trái"];
            let stageIndex = stagesList.indexOf(data.seed_stage);
            if (stageIndex === -1) stageIndex = 0;
            
            // BỔ SUNG DÒNG NÀY ĐỂ ĐỒNG BỘ VÀO STATE CHUNG:
            appState.user.currentStageIndex = stageIndex;
            
            let currentStageNum = stageIndex + 1;

            // GỌI LỆNH CẬP NHẬT LẠI HÌNH ẢNH MẦM CÂY:
            updateIllustration();

            // Đổi tiêu đề tên mầm cây (Ví dụ: "Hạt giống" -> "Nảy mầm")
            const plantTitleEl = document.getElementById('homePlantTitle');
            if (plantTitleEl) {
                plantTitleEl.textContent = data.seed_stage;
            }

            // Cập nhật huy hiệu hiển thị "Giai đoạn X/6"
            const stageBadgeEl = document.getElementById('homeStageBadge');
            if (stageBadgeEl) {
                stageBadgeEl.textContent = `Giai đoạn ${currentStageNum}/6`;
            }

            // Tự động làm sáng/đổi màu các vòng tròn mốc (01 đến 06) theo tiến độ thực tế
            for (let i = 1; i <= 6; i++) {
                const nodeEl = document.getElementById(`homeStageNode-${i}`);
                const labelEl = document.getElementById(`homeStageLabel-${i}`);
                if (nodeEl && labelEl) {
                    if (i <= currentStageNum) {
                        // Đã đạt hoặc đang ở chặng này -> Tô màu xanh đậm đặc trưng
                        nodeEl.className = "w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#064e3b] text-white flex items-center justify-center font-bold text-xs ring-4 ring-emerald-100 shadow-sm transition-all";
                        labelEl.className = "text-[10px] sm:text-[11px] font-bold text-[#064e3b] mt-1 whitespace-nowrap";
                    } else {
                        // Chưa tới chặng này -> Màu xám chờ mở khóa
                        nodeEl.className = "w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-300 text-slate-400 flex items-center justify-center font-medium text-xs transition-all";
                        labelEl.className = "text-[10px] sm:text-[11px] font-normal text-slate-400 mt-1 whitespace-nowrap";
                    }
                }
            }

            // 3. CẬP NHẬT CÁC THÔNG SỐ THỐNG KÊ KHÁC
            // Phân số Giờ học
            const completedHours = (data.completed_roadmap_minutes / 60).toFixed(1);
            const totalHours = (data.total_roadmap_minutes / 60).toFixed(1);
            const roadmapProgressEl = document.getElementById('roadmapProgressText');
            if (roadmapProgressEl) {
                roadmapProgressEl.textContent = `${completedHours} / ${totalHours} giờ`;
            }

            // Chỉ số Kỷ luật (%)
            const disciplineEl = document.getElementById('disciplineScoreText');
            if (disciplineEl) {
                disciplineEl.textContent = `${data.discipline_score}%`;
            }

            // XP tích lũy trong tuần
            const weeklyXpEl = document.getElementById('weeklyXpText');
            if (weeklyXpEl) {
                weeklyXpEl.textContent = `+${data.weekly_xp} XP`;
            }

            // Số bài luyện hoàn thành
            const completedTasksEl = document.getElementById('completedTasksCountText');
            if (completedTasksEl) {
                completedTasksEl.textContent = `${data.completed_tasks || 0} bài`;
            }

            // Subtitle Streak
            const streakSubtitleEl = document.getElementById('streakSubtitleText');
            if (streakSubtitleEl) {
                streakSubtitleEl.textContent = `${data.current_streak || 0} ngày streak`;
            }

            // 4. XỬ LÝ ĐỔI MÀU 7 Ô NGÀY TRONG TUẦN (Đã đưa vào trong phạm vi của data)
            for (let i = 1; i <= 7; i++) {
                const dayBox = document.getElementById(`day-box-${i}`);
                if (dayBox) {
                    if (data.registered_weekdays && data.registered_weekdays.includes(i)) {
                        // Có lịch học -> Đổi sang màu indigo nổi bật
                        dayBox.className = "w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center border border-indigo-700 shadow-sm";
                        dayBox.textContent = "✓";
                    } else {
                        // Không có lịch -> Trạng thái xám nhạt mặc định
                        dayBox.className = "w-7 h-7 rounded-lg bg-slate-100 text-slate-400 font-bold text-[10px] flex items-center justify-center border border-slate-200";
                        dayBox.textContent = "•";
                    }
                }
            }
        }
    } catch (err) {
        console.error("Lỗi đồng bộ dữ liệu thống kê lên UI:", err);
    }
}

// --- HÀM XỬ LÝ TƯỚI NƯỚC CHO CÂY ---
window.waterPlant = async function() {
    const profileId = localStorage.getItem('current_profile_id') || appState.currentProfileId;
    if (!profileId || !/^\d+$/.test(profileId)) {
        if (typeof showToast === 'function') {
            showToast('Thông báo', 'Vui lòng chọn profile trước!', 'warning');
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/gamification/water-plant/${profileId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Lỗi tưới nước");

        if (typeof showToast === 'function') {
            showToast('Thành công!', data.message || 'Tưới nước thành công! +25 XP', 'success');
        }

        // Gọi lại hàm loadGamificationData để giao diện cập nhật XP và tiến độ ngay lập tức
        await loadGamificationData();

    } catch (err) {
        if (typeof showToast === 'function') {
            showToast('Lỗi', err.message, 'error');
        }
    }
};

window.renderAnalysisResult = function(data) {
    if (!data) return;
    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setWid = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = pct + '%'; };

    // Cập nhật các thông số điểm số
    setTxt('finalMatchScore', `${data.final_total_score || 0}%`);
    setWid('barMatchScore', data.final_total_score || 0);
    setTxt('valSkillScore', `${data.skill_score || 0}%`);
    setWid('barSkillScore', data.skill_score || 0);
    setTxt('valInterestScore', `${data.interest_score || 0}%`);
    setWid('barInterestScore', data.interest_score || 0);
    setTxt('valExperienceScore', `${data.experience_score || 0}%`);
    setWid('barExperienceScore', data.experience_score || 0);

    setTxt('valMetSkills', data.met_skills_count || 0);
    setTxt('valGapSkills', data.gap_skills_count || 0);
    setTxt('gapCountTitle', data.gap_skills_count || 0);
    setTxt('aiReasoningText', data.ai_reasoning || "");

    // Vẽ biểu đồ Radar ứng dụng công thức Khoa học & Định lượng
    const ctx = document.getElementById('skillsRadarCanvas');
    if (ctx && data.radar_data && typeof Chart !== 'undefined') {
      if (window.myRadarChart) window.myRadarChart.destroy();
      
      const labels = Object.keys(data.radar_data);
      
      // Áp dụng công thức tính điểm cho từng trục (category) trên Radar dựa trên kỹ năng thực tế (1-5)
      const dataPoints = Object.values(data.radar_data).map((val, index) => {
          let categoryName = labels[index].toLowerCase();
          
          // Nếu danh mục này có kỹ năng mà ứng viên sở hữu
          if (val > 0 && window.currentUploadedSkills && window.currentUploadedSkills.length > 0) {
              // Lọc các kỹ năng của người dùng khớp với nhóm này
              let matchedSkills = window.currentUploadedSkills.filter(s => 
                  categoryName.includes(s.topic.toLowerCase()) || s.topic.toLowerCase().includes(categoryName)
              );
              
              if (matchedSkills.length > 0) {
                  // Tính điểm trung bình mức độ thành thạo (1-5) của nhóm đó
                  let avgLevel = matchedSkills.reduce((sum, s) => sum + (s.score || 3), 0) / matchedSkills.length;
                  
                  // Chuẩn hóa theo công thức Min-Max / Tỷ lệ phần trăm năng lực (Thang 1-5 -> 0-100%)
                  // Công thức: ((avgLevel - 1) / 4) * 100 hoặc (avgLevel / 5) * 100
                  return Math.round((avgLevel / 5) * 100);
              }
          }
          
          // Nếu không có kỹ năng nào hoặc mức độ = 0 thì điểm trục đó = 0%
          return val > 0 ? 60 : 0; // Mặc định 60% nếu API trả về có mà chưa khớp được tên chi tiết slider
      });

      window.myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Tỷ lệ đáp ứng năng lực (%)',
            data: dataPoints,
            backgroundColor: 'rgba(79, 70, 229, 0.25)',
            borderColor: 'rgba(79, 70, 229, 1)',
            pointBackgroundColor: 'rgba(79, 70, 229, 1)',
            borderWidth: 2,
          }]
        },
        options: { 
          responsive: true,
          maintainAspectRatio: false, // Cố định kích thước, chống lỗi lúc to lúc nhỏ
          scales: { 
            r: { 
              min: 0, 
              max: 100, 
              ticks: { stepSize: 20 } 
            } 
          } 
        }
      });
    }

    // Render danh sách khoảng cách kỹ năng (Gap Details)
    const gapContainer = document.getElementById('gapDetailsContainer');
    if (gapContainer && data.gap_details) {
      appState.gapDetails = data.gap_details;
      gapContainer.innerHTML = data.gap_details.map(gap => `
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-orange-300 transition-colors">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <h5 class="font-bold text-slate-900">${gap.name}</h5>
            </div>
            <div class="flex items-center gap-1.5">
              ${gap.is_required ? '<span class="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Bắt buộc</span>' : '<span class="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">Ưu tiên</span>'}
              <span class="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">${gap.status}</span>
            </div>
          </div>
          <p class="text-xs text-slate-600 mb-2">${gap.reason}</p>
        </div>
      `).join('');
    }

    // Hiển thị kết quả và mở khóa phỏng vấn
    const skeleton = document.getElementById('gapSkeletonLoading');
    const realResults = document.getElementById('gapRealResults');
    if (skeleton) skeleton.classList.add('hidden');
    if (realResults) realResults.classList.remove('hidden');

    const interviewPlaceholder = document.getElementById('interviewPlaceholder');
    const interviewContent = document.getElementById('interviewContent');
    if (interviewPlaceholder) interviewPlaceholder.classList.add('hidden');
    if (interviewContent) interviewContent.classList.remove('hidden');
};
  // ==========================================
  // KHÔI PHỤC MÀN HÌNH VÀ DỮ LIỆU KHI F5 XONG
  // ==========================================
  window.addEventListener('load', () => {
      // 1. Lấy tab đã lưu từ AppStore hoặc sessionStorage
      const savedScreen = (typeof AppStore !== 'undefined') ? AppStore.state.currentScreen : (sessionStorage.getItem('current_screen') || 'screen-home');
      
      if (savedScreen) {
          // Ẩn toàn bộ các màn hình
          document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
          
          // Hiển thị đúng màn hình đã lưu
          const target = document.getElementById(savedScreen);
          if (target) {
              target.classList.remove('hidden');
              if (typeof updateActiveTabHighlight === 'function') {
                  updateActiveTabHighlight(savedScreen);
              }
          } else {
              document.getElementById('screen-home')?.classList.remove('hidden');
          }
      }

      // 2. Khôi phục dữ liệu phân tích và vẽ lại giao diện nếu đang ở tab skill gap hoặc có dữ liệu cũ
      if (typeof AppStore !== 'undefined' && AppStore.state.analysisDone && AppStore.state.analysisData) {
          if (typeof window.renderAnalysisResult === 'function') {
              window.renderAnalysisResult(AppStore.state.analysisData);
          }
      }
  });

  // --- 1. QUẢN LÝ TRẠNG THÁI LỰA CHỌN (Click active các thẻ) ---
document.querySelectorAll('.persona-option-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.persona-option-card').forEach(c => {
            c.classList.remove('active', 'border-blue-600', 'bg-blue-50/50');
            c.classList.add('border-slate-200');
        });
        card.classList.add('active', 'border-blue-600', 'bg-blue-50/50');
        card.classList.remove('border-slate-200');
    });
});

document.querySelectorAll('.btn-level-select').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-level-select').forEach(b => {
            b.classList.remove('active', 'border-blue-600', 'bg-blue-50', 'font-bold', 'text-blue-700');
            b.classList.add('border-slate-200', 'text-slate-700', 'bg-white');
        });
        btn.classList.add('active', 'border-blue-600', 'bg-blue-50', 'font-bold', 'text-blue-700');
        btn.classList.remove('border-slate-200', 'text-slate-700', 'bg-white');
    });
});

document.querySelectorAll('.btn-lang-select').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-lang-select').forEach(b => {
            b.classList.remove('active', 'border-blue-600', 'bg-blue-50', 'font-bold', 'text-blue-700');
            b.classList.add('border-slate-200', 'text-slate-700', 'bg-white');
        });
        btn.classList.add('active', 'border-blue-600', 'bg-blue-50', 'font-bold', 'text-blue-700');
        btn.classList.remove('border-slate-200', 'text-slate-700', 'bg-white');
    });
});

// --- 2. XỬ LÝ GỬI REQUEST GỌI AI TẠO BỘ CÂU HỎI ĐỘC QUYỀN ---
const btnStartInterview = document.getElementById('btnStartInterviewSession');
if (btnStartInterview) {
    btnStartInterview.addEventListener('click', async () => {
        const activePersona = document.querySelector('.persona-option-card.active')?.getAttribute('data-persona') || 'tech_lead';
        const activeLevel = document.querySelector('.btn-level-select.active')?.getAttribute('data-level') || 'mid';
        const activeLang = document.querySelector('.btn-lang-select.active')?.getAttribute('data-lang') || 'vi';

        const currentPid = localStorage.getItem('current_profile_id');
        const analysisData = (typeof AppStore !== 'undefined' && AppStore.state.analysisData) 
            ? AppStore.state.analysisData 
            : JSON.parse(localStorage.getItem(`analysis_data_${currentPid}`) || localStorage.getItem('analysis_data') || '{}');

        if (!analysisData || Object.keys(analysisData).length === 0) {
            if (typeof showToast === 'function') {
                showToast('Chưa có dữ liệu', 'Vui lòng hoàn thành phân tích kỹ năng (Skill Gap) trước khi vào phòng phỏng vấn!', 'warning');
            } else {
                alert('Vui lòng hoàn thành phân tích kỹ năng trước khi vào phòng phỏng vấn!');
            }
            return;
        }

        btnStartInterview.innerHTML = `<svg class="animate-spin w-5 h-5 text-white inline mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>AI đang tạo bộ câu hỏi...</span>`;
        btnStartInterview.disabled = true;

        try {
            const res = await fetch(`${API_BASE_URL}/interview/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile_id: currentPid,
                    persona: activePersona,
                    level: activeLevel,
                    language: activeLang,
                    analysis_context: analysisData,
                    random_nonce: Date.now()
                })
            });

            if (!res.ok) throw new Error("Lỗi kết nối tới mô hình AI phỏng vấn.");

            const data = await res.json();
            
            // Render câu hỏi ra giao diện
            if (typeof window.renderInterviewQuestions === 'function') {
                window.renderInterviewQuestions(data.questions);
            }

            // Chuyển view sang phòng phỏng vấn trực tiếp
            const setupView = document.getElementById('interviewSetupView');
            const liveRoomView = document.getElementById('interviewLiveRoomView');
            if (setupView) setupView.classList.add('hidden');
            if (liveRoomView) liveRoomView.classList.remove('hidden');

            // 👇 TỰ ĐỘNG CHUYỂN HIGHLIGHT NÚT PHÍA TRÊN SANG "PHÒNG PHỎNG VẤN AI" 👇
            const btnTabModeSetup = document.getElementById('btnTabModeSetup');
            const btnTabModeRoom = document.getElementById('btnTabModeRoom');
            if (btnTabModeSetup && btnTabModeRoom) {
                btnTabModeSetup.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 cursor-pointer";
                btnTabModeRoom.className = "px-3 py-1.5 rounded-md bg-white text-blue-700 font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer";
            }
            // -----------------------------------------------------------------------

            if (typeof showToast === 'function') {
                showToast('Thành công', 'Phòng phỏng vấn đã sẵn sàng với bộ câu hỏi mới!', 'success');
            }

        } catch (err) {
            console.error("Lỗi phỏng vấn:", err);
            if (typeof showToast === 'function') {
                showToast('Lỗi hệ thống', err.message || 'Không thể tạo bộ câu hỏi.', 'error');
            } else {
                alert(err.message);
            }
        } finally {
            btnStartInterview.innerHTML = `<span>Bắt đầu phỏng vấn ngay</span>`;
            btnStartInterview.disabled = false;
        }
    });
}

let currentSelectedQuestionIndex = 0;
let activeInterviewQuestionsList = [];

window.renderInterviewQuestions = function(questions) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) return;
    activeInterviewQuestionsList = questions;

    const tabsContainer = document.getElementById('interviewQuestionTabsContainer');
    if (!tabsContainer) return;

    // 1. Render danh sách các tab câu hỏi động từ API
    tabsContainer.innerHTML = questions.map((q, index) => {
        const qNum = String(index + 1).padStart(2, '0');
        const isActive = index === 0;
        return `
            <div class="interview-question-tab p-2.5 rounded-lg border ${isActive ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-slate-300'} cursor-pointer" data-index="${index}">
              <div class="text-[10px] font-bold ${isActive ? 'text-indigo-700' : 'text-slate-700'} mb-0.5">Câu ${qNum} • ${q.tag || 'Bắt buộc'}</div>
              <div class="font-semibold text-xs text-slate-900 truncate">${q.title || q.category || 'Câu hỏi phỏng vấn'}</div>
            </div>
        `;
    }).join('');

    // 2. Hàm hiển thị chi tiết câu hỏi lên card chính
    const showQuestionDetail = (qIndex) => {
        currentSelectedQuestionIndex = qIndex;
        const q = questions[qIndex];
        if (!q) return;

        // 🌟 ĐỒNG BỘ ID CÂU HỎI VÀO BIẾN TOÀN CỤC ĐỂ LƯU CACHE VÀ GỌI API ĐÚNG CÂU 🌟
        currentQuestionId = q.id || (qIndex + 1);

        // Đổ dữ liệu lên các thẻ HTML đã gắn ID
        const titleEl = document.getElementById('interviewActiveTitle');
        const questionEl = document.getElementById('interviewActiveQuestion');
        const categoryEl = document.getElementById('interviewActiveCategory');
        const diffEl = document.getElementById('interviewActiveDifficulty');
        const lockedAnsEl = document.getElementById('lockedAiAnswer');

        if (titleEl) titleEl.textContent = q.title || 'Câu hỏi phỏng vấn';
        if (questionEl) questionEl.textContent = `"${q.question}"`;
        if (categoryEl) categoryEl.textContent = q.category || 'Chuyên môn';
        if (diffEl) diffEl.textContent = `Độ khó: ${q.difficulty || '3.5/5'}`;

        // Đổ nội dung đáp án mẫu STAR
        if (lockedAnsEl) {
            const star = q.suggested_star || {
                situation: "Tình huống...", task: "Nhiệm vụ...", action: "Hành động...", result: "Kết quả..."
            };
            lockedAnsEl.innerHTML = `
                <p><strong>Situation:</strong> ${star.situation}</p>
                <p><strong>Task:</strong> ${star.task}</p>
                <p><strong>Action:</strong> ${star.action}</p>
                <p><strong>Result:</strong> ${star.result}</p>
            `;
        }

        // Highlight tab đang được chọn
        document.querySelectorAll('.interview-question-tab').forEach((tab, idx) => {
            if (idx === qIndex) {
                tab.className = "interview-question-tab p-2.5 rounded-lg border border-indigo-600 bg-indigo-50/50 cursor-pointer";
                const label = tab.querySelector('div:first-child');
                if (label) label.className = "text-[10px] font-bold text-indigo-700 mb-0.5";
            } else {
                tab.className = "interview-question-tab p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer";
                const label = tab.querySelector('div:first-child');
                if (label) label.className = "text-[10px] font-bold text-slate-700 mb-0.5";
            }
        });

        // ==========================================
        // 🌟 3. KIỂM TRA BỘ NHỚ TẠM (CACHE) VÀ HIỂN THỊ 🌟
        // ==========================================
        const answerInput = document.getElementById('userAnswerInput');
        const lockOverlay = document.getElementById('lockOverlay');
        const unlockedEval = document.getElementById('unlockedAiEvaluation');
        const btnSubmit = document.getElementById('btnSubmitAnswer');
        
        const scoreEl = document.querySelector('.text-2xl.font-bold');
        const fbEl = document.getElementById('aiFeedbackText');
        const impEl = document.getElementById('aiImprovedAnswerText');

        if (interviewAnswersCache[currentQuestionId]) {
            // TRƯỜNG HỢP A: CÂU NÀY ĐÃ CHẤM ĐIỂM -> Đổ dữ liệu cũ ra
            const savedData = interviewAnswersCache[currentQuestionId];
            
            if (answerInput) answerInput.value = savedData.text;
            if (scoreEl) scoreEl.textContent = savedData.score + ' / 10';
            if (fbEl) fbEl.textContent = savedData.feedback;
            if (impEl) impEl.textContent = savedData.improved;
            
            // Mở khóa giao diện hiển thị AI chấm điểm
            if (lockOverlay) lockOverlay.style.display = 'none';
            if (unlockedEval) unlockedEval.classList.remove('hidden');
            if (lockedAnsEl) lockedAnsEl.classList.remove('blur-md', 'select-none', 'pointer-events-none');
            
            // Đổi nút thành "Cập nhật"
            if (btnSubmit) {
                btnSubmit.textContent = 'Cập nhật câu trả lời';
                btnSubmit.disabled = false;
            }
        } else {
            // TRƯỜNG HỢP B: CÂU NÀY CHƯA LÀM -> Trả màn hình về trạng thái trống & khóa AI
            if (answerInput) answerInput.value = '';
            if (scoreEl) scoreEl.textContent = '0 / 10';
            if (fbEl) fbEl.textContent = '';
            if (impEl) impEl.textContent = '';
            
            // Khóa UI hiển thị AI lại
            if (lockOverlay) lockOverlay.style.display = 'flex';
            if (unlockedEval) unlockedEval.classList.add('hidden');
            if (lockedAnsEl) lockedAnsEl.classList.add('blur-md', 'select-none', 'pointer-events-none');
            
            // Đổi nút thành "Nộp bài"
            if (btnSubmit) {
                btnSubmit.textContent = 'Nộp câu trả lời';
                btnSubmit.disabled = false;
            }
        }
    };

    // Mặc định hiển thị câu đầu tiên
    showQuestionDetail(0);

    // Gắn sự kiện click cho các tab câu hỏi
    document.querySelectorAll('.interview-question-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const idx = parseInt(tab.getAttribute('data-index'), 10);
            showQuestionDetail(idx);
        });
    });
};


// 4. Xử lý nút quay lại thiết lập
const btnBackToSetup = document.getElementById('btnBackToSetup');
if (btnBackToSetup) {
    btnBackToSetup.addEventListener('click', () => {
        const setupView = document.getElementById('interviewSetupView');
        const liveRoomView = document.getElementById('interviewLiveRoomView');
        if (setupView) setupView.classList.remove('hidden');
        if (liveRoomView) liveRoomView.classList.add('hidden');

        // 👇 TRẢ HIGHLIGHT NÚT PHÍA TRÊN VỀ LẠI "THIẾT LẬP BUỔI LUYỆN" 👇
        const btnTabModeSetup = document.getElementById('btnTabModeSetup');
        const btnTabModeRoom = document.getElementById('btnTabModeRoom');
        if (btnTabModeSetup && btnTabModeRoom) {
            btnTabModeSetup.className = "px-3 py-1.5 rounded-md bg-white text-blue-700 font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer";
            btnTabModeRoom.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 cursor-pointer";
        }
    });
}

});