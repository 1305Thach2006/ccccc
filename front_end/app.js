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

function updateIllustration(previewStageNum) {
  const stage = (typeof previewStageNum === 'number' && previewStageNum >= 1 && previewStageNum <= 6)
    ? previewStageNum
    : (appState.user.currentStageIndex + 1);
  const stageIdx = Math.max(0, Math.min(5, stage - 1));
  const data = appState.stages[stageIdx] || appState.stages[0];
  const nextData = appState.stages[Math.min(stage, appState.stages.length - 1)];

  const imgSrc = makeSvgDataUri(rawSvgs[`stage${stage}`]);
  const img = document.getElementById('plantStageImage');
  if (img) img.src = imgSrc;

  const homePlantTitle = document.getElementById('homePlantTitle');
  if (homePlantTitle) homePlantTitle.textContent = data.name;

  const homeStageBadge = document.getElementById('homeStageBadge');
  if (homeStageBadge) homeStageBadge.textContent = `Giai đoạn ${stage}/6`;

  const stageBadgeText = document.getElementById('stageBadgeText');
  if (stageBadgeText) stageBadgeText.textContent = `Giai đoạn ${stage}/6`;

  const badge = document.getElementById('homePlantPercentBadge');
  if (badge) badge.style.display = 'none';

  for (let i = 1; i <= 6; i++) {
    const node = document.getElementById(`homeStageNode-${i}`);
    const label = document.getElementById(`homeStageLabel-${i}`);
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
    if (label) {
      label.className = (i <= stage)
        ? 'text-[10px] sm:text-[11px] font-bold text-[#064e3b] mt-1 whitespace-nowrap'
        : 'text-[10px] sm:text-[11px] font-normal text-slate-400 mt-1 whitespace-nowrap';
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
  const pSkills = (profile.skills || []).map(s => (typeof s === 'object' ? s.topic : String(s)).toLowerCase());
  const rSkills = (role.requiredSkills || []).map(s => String(s).toLowerCase());
  let matched = 0;
  rSkills.forEach(r => { if (pSkills.some(p => p.includes(r) || r.includes(p))) matched++; });
  
  const skillScore = rSkills.length > 0 ? Math.round((matched / rSkills.length) * 100) : 50;
  const majorLower = (profile.major || '').toLowerCase();
  const fieldLower = (role.field || '').toLowerCase();
  const isFieldMatch = majorLower.includes(fieldLower) ||
    (fieldLower === 'cntt' && (majorLower.includes('công nghệ') || majorLower.includes('it') || majorLower.includes('phần mềm')));
  const expScore = isFieldMatch ? 85 : (matched > 0 ? 60 : 40);
  const interestScore = isFieldMatch ? 90 : (matched > 0 ? 65 : 35);

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
  appState.uploadedProfileId = null;
  appState.cvMode = 'sample';
  
  const p = DEFAULT_SAMPLE_PROFILES.find(x => x.id === id);
  if (!p) return;
  
  const expInput = document.getElementById('experienceInput');
  if(expInput) expInput.value = p.experience;
  
  if (p.skills) {
      window.currentUploadedSkills = p.skills.map(skillName => {
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
  
  // 2. Chọn JD đứng Top 1 làm mặc định
  appState.selectedRoleId = scoredRoles[0].id; 
  
  // 3. Render lại danh sách JD và tự động highlight JD Top 1
  const roleContainer = document.getElementById('contentRoleStandard');
  if (roleContainer) {
      roleContainer.innerHTML = scoredRoles.map((r, i) => `
        <div class="role-option p-3 rounded-lg border ${r.id === appState.selectedRoleId ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white hover:border-slate-300'} cursor-pointer mb-2 transition-colors" data-role-id="${r.id}" onclick="selectRole('${r.id}')">
          <div class="flex justify-between items-center">
            <div class="font-bold text-xs text-slate-900">${r.title} ${i===0 ? '<span class="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 rounded border border-amber-300">Đề xuất</span>' : ''}</div>
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

  const contentCvUpload = document.getElementById('contentCvUpload');
  const isUploadTabActive = contentCvUpload && !contentCvUpload.classList.contains('hidden');
  const isSampleMode = !isUploadTabActive;
  const currentInterests = window.currentUploadedSkills || [];

  if (isSampleMode && !appState.selectedProfileId) {
      if (typeof showToast === 'function') showToast("Chưa chọn hồ sơ", "Vui lòng click chọn 1 CV mẫu hoặc tải lên CV PDF!", "warning");
      return;
  }
  if (!isSampleMode && currentInterests.length === 0 && !appState.uploadedProfileId) {
      if (typeof showToast === 'function') showToast("Chưa có dữ liệu CV", "Vui lòng tải lên file CV PDF hoặc thêm kỹ năng thủ công trước khi phân tích!", "warning");
      return;
  }

  const tabRolePaste = document.getElementById('tabRolePaste');
  const contentRolePaste = document.getElementById('contentRolePaste');
  const isPasteMode = (contentRolePaste && !contentRolePaste.classList.contains('hidden')) ||
                      (tabRolePaste && tabRolePaste.classList.contains('text-indigo-700'));
  const customJdInput = document.getElementById('customJdTextarea') || document.querySelector('#contentRolePaste textarea');
  const pasteRoleTitleInput = document.getElementById('pasteRoleTitle');

  if (isPasteMode) {
      if (!customJdInput || customJdInput.value.trim() === "") {
          if (typeof showToast === 'function') showToast("Chưa nhập JD", "Vui lòng dán Mô tả công việc (JD) vào ô trống!", "warning");
          return;
      }
  } else {
      const roleKeyCheck = String(appState.selectedRoleId || '').trim();
      if (!appState.selectedRoleId || roleKeyCheck === 'null' || roleKeyCheck === '') {
          if (typeof showToast === 'function') showToast("Chưa chọn vị trí", "Vui lòng chọn 1 vị trí ứng tuyển (JD mẫu) hoặc chuyển sang Dán JD Tự do!", "warning");
          return;
      }
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
  sessionStorage.setItem('current_screen', 'screen-gap');
  if (typeof updateActiveTabHighlight === 'function') updateActiveTabHighlight('screen-gap');
  
  const skeleton = document.getElementById('gapSkeletonLoading');
  const realResults = document.getElementById('gapRealResults');
  if (skeleton) skeleton.classList.remove('hidden');
  if (realResults) realResults.classList.add('hidden');

  try {
    const profileId = localStorage.getItem('current_profile_id') || appState.uploadedProfileId || appState.currentProfileId || appState.selectedProfileId || 1;

    let jdSkillsArray = [];
    let jdTextContent = "";
    let roleKey = String(appState.selectedRoleId || 'custom').trim();

    if (isPasteMode) {
        const customTitle = pasteRoleTitleInput ? pasteRoleTitleInput.value.trim() : "";
        const rawJdBody = customJdInput.value.trim();
        jdTextContent = customTitle ? `Vị trí tuyển dụng: ${customTitle}\n${rawJdBody}` : rawJdBody;
        roleKey = customTitle ? encodeURIComponent(customTitle) : "custom";
    } else {
        const selectedRole = (typeof ROLES !== 'undefined' && Array.isArray(ROLES)) 
            ? ROLES.find(r => String(r.id) === roleKey || String(r.slug) === roleKey) || ROLES[0] : null;
        jdSkillsArray = (selectedRole && selectedRole.requiredSkills) ? selectedRole.requiredSkills : [];
        if (selectedRole && selectedRole.title) {
            jdTextContent = `${selectedRole.title} (${selectedRole.field || ''}): ${jdSkillsArray.join(', ')}`;
        }
    }

    const expInput = document.getElementById('experienceInput');
    const currentExp = expInput ? expInput.value.trim() : "";

    let requestBody = {
        is_sample: isSampleMode,
        jd_skills: jdSkillsArray, 
        jd_text: jdTextContent,
        interests: currentInterests,
        experience: currentExp       
    };

    if (isSampleMode) {
        const sampleProfile = (typeof DEFAULT_SAMPLE_PROFILES !== 'undefined' && Array.isArray(DEFAULT_SAMPLE_PROFILES)) 
            ? DEFAULT_SAMPLE_PROFILES.find(p => String(p.id) === String(appState.selectedProfileId)) : null;

        if (sampleProfile) {
            requestBody.name = sampleProfile.name;
            let hardSkills = sampleProfile.skills || [];
            requestBody.skills = currentInterests.length > 0 ? currentInterests : hardSkills;
            requestBody.interests = currentInterests.length > 0 ? currentInterests : (sampleProfile.interests || []);
            if (!requestBody.experience) requestBody.experience = sampleProfile.experience || "";
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
    
    appState.currentJobId = data.job_id || null;
    appState.currentAnalysisId = data.analysis_id || null;
    appState.targetRoleTitle = data.target_role || '';
    
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

    if (typeof showToast === 'function') {
      showToast('Phân tích hoàn tất!', `Độ tương thích với vị trí mục tiêu: ${data.final_total_score || 0}%`, 'success');
    }

  } catch (err) {
    console.error("Lỗi phân tích:", err);
    if (typeof showToast === 'function') {
      showToast('Lỗi phân tích', err.message || 'Không thể kết nối máy chủ phân tích.', 'error');
    }
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
    appState.cvMode = 'upload';
    if (!appState.uploadedProfileId) {
      if(experienceContainer) experienceContainer.classList.add('hidden');
      if(interestsContainer) interestsContainer.classList.add('hidden');
    } else {
      if(experienceContainer) experienceContainer.classList.remove('hidden');
      if(interestsContainer) interestsContainer.classList.remove('hidden');
    }
  }

  function setCvSampleMode() {
    tabCvSample.className = 'flex-1 py-1.5 text-xs font-semibold rounded-md bg-white text-indigo-700 shadow-sm border border-slate-200 transition-all';
    tabCvUpload.className = 'flex-1 py-1.5 text-xs font-medium rounded-md text-slate-500 hover:text-slate-800 transition-all';
    if(contentCvSample) contentCvSample.classList.remove('hidden');
    if(contentCvUpload) contentCvUpload.classList.add('hidden');
    if(experienceContainer) experienceContainer.classList.remove('hidden');
    if(interestsContainer) interestsContainer.classList.remove('hidden');
    appState.cvMode = 'sample';
    if (appState.selectedProfileId) {
      selectProfile(appState.selectedProfileId);
    }
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
      
      const realProfileId = localStorage.getItem('current_profile_id') || appState.currentProfileId || appState.uploadedProfileId;
      if (!realProfileId) {
          if (typeof showToast === 'function') showToast('Chưa đăng nhập', 'Vui lòng đăng nhập để chăm sóc cây!', 'warning');
          return;
      }
      
      try {
          const res = await fetch(`${API_BASE_URL}/gamification/water-plant/${realProfileId}`, { method: 'POST' });
          const data = await res.json();
          
          if (!res.ok) throw new Error(data.detail || 'Không thể tưới cây lúc này');

          if(typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
          appState.user.currentXp = data.current_xp; 
          appState.user.hasWateredToday = true; 
          
          if (typeof showToast === 'function') showToast('Đã tưới nước', data.message, 'success');
          checkAndUpdateStage(); // Gọi hàm cập nhật giao diện mầm cây
          if (typeof loadGamificationData === 'function') {
              await loadGamificationData();
          }
      } catch (err) {
          if (typeof showToast === 'function') showToast('Thông báo', err.message, 'warning');
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
            const errBox = document.getElementById('cvUploadErrorMsg');
            const errText = document.getElementById('cvUploadErrorText');
            if (errBox) errBox.classList.add('hidden');

            // NGĂN CHẶN FILE KHÔNG PHẢI .PDF NGAY TỪ ĐẦU
            const fileName = (file.name || '').toLowerCase();
            const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';
            if (!isPdf) {
                const msg = 'Định dạng file không hợp lệ! Hệ thống chỉ chấp nhận định dạng tài liệu .PDF.';
                if (errBox && errText) {
                    errText.textContent = msg;
                    errBox.classList.remove('hidden');
                }
                if (uploadStatusText) uploadStatusText.textContent = 'Sai định dạng file!';
                if (uploadFileName) uploadFileName.textContent = file.name;
                showToast('Lỗi định dạng', msg, 'error');
                e.target.value = '';
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) { 
                const msg = 'File CV vượt quá 5MB. Vui lòng nén lại file PDF.';
                if (errBox && errText) {
                    errText.textContent = msg;
                    errBox.classList.remove('hidden');
                }
                showToast('File quá lớn', msg, 'warning');
                e.target.value = ''; 
                return;
            }
            
            if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
            if (uploadStatusText) {
                uploadStatusText.classList.remove('text-rose-600');
                uploadStatusText.textContent = "Đang đọc nội dung file PDF...";
            }
            if (uploadFileName) uploadFileName.textContent = `Đang xử lý: ${file.name}`;
            
            try {
                let extractedText = "";

               // DÙNG PDF.JS ĐỂ RÚT TRÍCH VĂN BẢN TỪ FILE PDF
                if (file.type === "application/pdf" || fileName.endsWith('.pdf')) {
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

                const words = (extractedText || '').trim().split(/\s+/).filter(Boolean);
                if (words.length < 15) {
                    throw new Error('Nội dung file quá ngắn hoặc không đọc được chữ (file ảnh scan / không có dữ liệu văn bản). Vui lòng tải lên CV định dạng PDF có chứa chữ!');
                }

                if (uploadStatusText) uploadStatusText.textContent = "AI đang trích xuất kỹ năng đa ngành...";

                const payload = {
                    name: localStorage.getItem('current_user_name') || "Ứng viên", 
                    email: "temp_" + Date.now() + "@example.com", 
                    cv_text: extractedText, 
                    free_time_json: "[]"
                };

                const response = await fetch(`${API_BASE_URL}/profiles/extract-cv/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // BẮT LỖI NẾU SERVER TRẢ VỀ MÃ LỖI (400, 422, 500...)
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || "File PDF không hợp lệ hoặc không phải là CV!");
                }

                if (errBox) errBox.classList.add('hidden');

                const data = await response.json();
                appState.uploadedProfileId = data.id;
                appState.cvMode = 'upload';
                if (!localStorage.getItem('current_profile_id')) {
                    appState.currentProfileId = data.id;
                }

                if (typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
                if (uploadStatusText) {
                    uploadStatusText.classList.remove('text-rose-600');
                    uploadStatusText.textContent = "Trích xuất CV thành công!";
                }
                
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
                        showToast('Hoàn tất!', `Đã trích xuất thành công ${window.currentUploadedSkills.length} kỹ năng từ CV.`, 'success');
                    }
                }
                
                const expContainer = document.getElementById('experienceContainer');
                if (expContainer) expContainer.classList.remove('hidden');
                const expInput = document.getElementById('experienceInput');
                if (expInput) {
                    expInput.value = data.experience_text || extractedText.trim().slice(0, 600);
                }

                const interestsContainer = document.getElementById('interestsContainer');
                if (interestsContainer) interestsContainer.classList.remove('hidden');
                
                if (typeof renderInterestsSliders === 'function') {
                    renderInterestsSliders(window.currentUploadedSkills);
                }

                // Tự động gợi ý và sắp xếp lại danh sách JD mẫu theo kỹ năng vừa trích xuất
                if (typeof ROLES !== 'undefined' && Array.isArray(ROLES)) {
                    const tempProfile = {
                        skills: window.currentUploadedSkills.map(s => s.topic),
                        major: extractedText.slice(0, 300)
                    };
                    const scoredRoles = ROLES.map(r => ({ ...r, match: getDetailedRoleMatch(r, tempProfile).matchScore })).sort((a,b) => b.match - a.match);
                    if (!appState.selectedRoleId && scoredRoles.length > 0) {
                        appState.selectedRoleId = scoredRoles[0].id;
                    }
                    const roleContainer = document.getElementById('contentRoleStandard');
                    if (roleContainer) {
                        roleContainer.innerHTML = scoredRoles.map((r, i) => `
                          <div class="role-option p-3 rounded-lg border ${r.id === appState.selectedRoleId ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white hover:border-slate-300'} cursor-pointer mb-2 transition-colors" data-role-id="${r.id}" onclick="selectRole('${r.id}')">
                            <div class="flex justify-between items-center">
                              <div class="font-bold text-xs text-slate-900">${r.title} ${i===0 ? '<span class="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 rounded border border-amber-300">Đề xuất</span>' : ''}</div>
                              <div class="text-[10px] px-2 py-0.5 rounded ${r.match >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'} font-bold">${r.match}%</div>
                            </div>
                            <div class="flex items-center justify-between mt-1.5">
                              <span class="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">${r.field}</span>
                              <span class="text-[9px] text-indigo-600 font-medium">${r.requiredSkills.length} kỹ năng yêu cầu</span>
                            </div>
                          </div>
                        `).join('');
                    }
                }

            } catch (error) {
                console.error("Lỗi Trích xuất CV:", error);
                if (errBox && errText) {
                    errText.textContent = error.message || "File PDF không hợp lệ hoặc không phải là CV!";
                    errBox.classList.remove('hidden');
                }
                if (uploadStatusText) {
                    uploadStatusText.textContent = "Trích xuất thất bại. Vui lòng tải lên đúng file CV (PDF)!";
                    uploadStatusText.classList.add('text-rose-600');
                }
                if (uploadFileName) uploadFileName.textContent = "";
                e.target.value = ''; // Reset input để người dùng chọn lại file khác
                window.currentUploadedSkills = []; // Xóa sạch danh sách kỹ năng tạm
                
                if (typeof showToast === 'function') {
                    showToast('Lỗi đọc CV', error.message, 'error');
                }
            }
        }
    });
}

const btnAddCustomSkill = document.getElementById('btnAddCustomSkill');
const customSkillInput = document.getElementById('customSkillInput');

if (btnAddCustomSkill && customSkillInput) {
    btnAddCustomSkill.addEventListener('click', () => {
        const newSkillName = customSkillInput.value.trim();
        
        if (newSkillName.length < 2 || newSkillName.length > 50) {
            if (typeof showToast === 'function') {
                showToast('Kỹ năng không hợp lệ', 'Kỹ năng phải dài từ 2 đến 50 ký tự', 'error');
            }
            return;
        }

        sfx.playClick();
        
        if (!window.currentUploadedSkills) {
            window.currentUploadedSkills = [];
        }
        
        window.currentUploadedSkills.push({ topic: newSkillName, score: 3 });
        renderInterestsSliders(window.currentUploadedSkills);
        
        customSkillInput.value = "";
        showToast('Đã thêm', `Đã bổ sung kỹ năng "${newSkillName}" vào danh sách.`, 'success');
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
let currentQuestionId = 1; // Biến này cập nhật khi user click đổi câu hỏi

const btnSubmit = document.getElementById('btnSubmitAnswer');
if (btnSubmit) {
  btnSubmit.addEventListener('click', async () => {
    // 1. Kiểm tra an toàn
    const inputEl = document.getElementById('userAnswerInput');
    if (!inputEl) return;
    
    const text = inputEl.value.trim();
    if (text.length < 15) {
      if (typeof showToast === 'function') {
        showToast('Câu trả lời quá ngắn', 'Vui lòng nhập tối thiểu 15 ký tự để AI có đủ dữ liệu chấm điểm!', 'warning');
      } else {
        alert('Trả lời quá ngắn! Tối thiểu 15 ký tự.');
      }
      return;
    }

    // 2. Khóa UI trong lúc chờ AI
    if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
    const isEnLang = (appState.interviewLanguage === 'en');
    btnSubmit.disabled = true;
    btnSubmit.textContent = isEnLang ? 'AI Evaluator is grading your answer...' : 'AI Giám khảo đang chấm điểm...';

    let numericScore = 0;
    let aiFeedback = '';
    let improvedAnswer = '';

    const activeQObj = (typeof activeInterviewQuestionsList !== 'undefined' && activeInterviewQuestionsList[currentSelectedQuestionIndex])
        ? activeInterviewQuestionsList[currentSelectedQuestionIndex]
        : null;
    const domTitle = document.getElementById('interviewActiveTitle')?.innerText || '';
    const domQuestion = document.getElementById('interviewActiveQuestion')?.innerText || '';
    const currentQuestionText = activeQObj
        ? `${activeQObj.title || ''}: ${activeQObj.question || ''}`
        : (`${domTitle}: ${domQuestion}`.trim() || "Câu hỏi phỏng vấn");
    
    const activeProfileId = parseInt(localStorage.getItem('current_profile_id') || appState.currentProfileId || appState.uploadedProfileId || 1, 10);

    try {
      // 3. Gọi API chấm điểm và cộng XP (kèm ngôn ngữ VI / EN, không dùng fallback)
      const res = await fetch(`${API_BASE_URL}/interview/submit-and-evaluate/${currentQuestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            profile_id: activeProfileId,
            question_text: currentQuestionText,
            student_answer: text,
            language: isEnLang ? 'en' : 'vi',
            job_id: appState.currentJobId || null,
            question_category: activeQObj?.category || null
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Không thể chấm điểm câu trả lời.");
      }
      numericScore = parseFloat(data.evaluation?.score) || 0;
      aiFeedback = data.evaluation?.feedback || '';
      improvedAnswer = data.evaluation?.improved_answer || '';

      if (typeof appState !== 'undefined' && appState.user && data.current_xp) {
          appState.user.currentXp = data.current_xp;
      }
      
    } catch(e) {
      console.error("Lỗi gọi API chấm điểm:", e);
      btnSubmit.textContent = isEnLang ? 'Submit Answer & AI Grading' : 'Nộp câu trả lời & Chấm điểm AI';
      btnSubmit.disabled = false;
      if (typeof showToast === 'function') {
        showToast('Lỗi chấm điểm AI', e.message || 'Không thể kết nối tới mô hình AI chấm điểm.', 'error');
      }
      return;
    }

    // 4. CẬP NHẬT UI AN TOÀN
    const overlayEl = document.getElementById('lockOverlay');
    if (overlayEl) overlayEl.style.display = 'none';

    const lockedAnswerEl = document.getElementById('lockedAiAnswer');
    if (lockedAnswerEl) lockedAnswerEl.classList.remove('blur-md', 'select-none', 'pointer-events-none');

    const unlockedEvalEl = document.getElementById('unlockedAiEvaluation');
    if (unlockedEvalEl) unlockedEvalEl.classList.remove('hidden');
    
    const scoreEl = document.getElementById('aiScoreValue') || document.querySelector('#unlockedAiEvaluation .text-2xl.font-bold');
    if (scoreEl) scoreEl.textContent = numericScore + ' / 10';

    const fbEl = document.getElementById('aiFeedbackText');
    if (fbEl) fbEl.textContent = aiFeedback; 
    
    const impEl = document.getElementById('aiImprovedAnswerText');
    if (impEl) impEl.textContent = improvedAnswer; 

    // 5. MỞ KHÓA LẠI NÚT CHO PHÉP NỘP LẦN NỮA VÀ LƯU STATE
    btnSubmit.textContent = isEnLang ? 'Update Answer & Re-evaluate' : 'Cập nhật câu trả lời & Chấm lại';
    btnSubmit.disabled = false; 
    
    if (typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
    
    // 6. LƯU TRẠNG THÁI VÀO CACHE (Chống mất dữ liệu khi đổi câu hỏi trong cùng vòng)
    interviewAnswersCache[currentQuestionId] = {
        text: text,
        score: numericScore,
        feedback: aiFeedback,
        improved: improvedAnswer
    };

    // Tích hợp logic Game (Hiển thị toast & đồng bộ DB)
    if (typeof appState !== 'undefined' && appState.user) {
      if (numericScore < 7.0) {
        showToast(isEnLang ? 'Graded!' : 'Đã chấm điểm!', `Điểm: ${numericScore}/10 (+10 XP). Hãy xem nhận xét và gợi ý nâng cấp STAR bên dưới!`, 'warning');
      } else {
        showToast(isEnLang ? 'Excellent!' : 'Tuyệt vời!', `Điểm: ${numericScore}/10. Câu trả lời rất tốt, bạn nhận được +50 XP!`, 'success');
      }

      if (typeof checkAndUpdateStage === 'function') checkAndUpdateStage();
      if (typeof loadGamificationData === 'function') {
        await loadGamificationData();
      }
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
          
          const name = nameInput.value.trim();
          const email = emailInput.value.trim();
          const pass = passInputs[0].value.trim();
          const confirmPass = passInputs[1].value.trim();

          if (!name || !email || !pass) {
              showToast('Thiếu thông tin', 'Vui lòng điền đầy đủ Họ và tên, Email và Mật khẩu!', 'warning');
              return;
          }

          // KIỂM TRA ĐỊNH DẠNG EMAIL HỢP LỆ (Chặn các chuỗi thiếu @domain.com như "nguyenvana")
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
          if (!emailRegex.test(email)) {
              showToast('Email không hợp lệ', 'Vui lòng nhập đúng định dạng Email (Ví dụ: ten@gmail.com)!', 'error');
              emailInput.focus();
              return;
          }

          // KIỂM TRA ĐỘ DÀI & ĐỘ MẠNH CỦA MẬT KHẨU
          if (pass.length < 6) {
              showToast('Mật khẩu quá ngắn', 'Mật khẩu phải có tối thiểu 6 ký tự để bảo vệ tài khoản!', 'warning');
              passInputs[0].focus();
              return;
          }

          const weakList = ['123456', '12345678', '123456789', 'abcdef', 'password', '111111', '000000', 'qwerty', 'admin123'];
          const isWeak = weakList.includes(pass.toLowerCase()) || (new Set(pass).size <= 2);
          if (isWeak) {
              showToast('Mật khẩu quá yếu', 'Mật khẩu quá đơn giản và dễ đoán. Vui lòng kết hợp cả chữ cái và số!', 'warning');
              passInputs[0].focus();
              return;
          }

          if (pass !== confirmPass) {
              showToast('Lỗi xác nhận', 'Mật khẩu xác nhận không khớp!', 'warning');
              passInputs[1].focus();
              return;
          }

          try {
              const res = await fetch(`${API_BASE_URL}/auth/register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: name, email: email, password: pass })
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
      // Xác thực lại với Backend xem profile_id này có thực sự tồn tại trong Database không
      // (Phòng trường hợp Database vừa bị xóa/reset trong Docker)
      fetch(`${API_BASE_URL}/auth/verify/${savedUserId}`)
          .then(res => {
              if (res.ok) {
                  appState.currentProfileId = savedUserId;
                  if (btnLoginOpen) btnLoginOpen.textContent = savedUserName + ' ▾';
                  if (dropdownUserName) dropdownUserName.textContent = savedUserName;
                  loadGamificationData();
              } else if (res.status === 404) {
                  // Tài khoản không còn trong Database (DB mới tinh) -> tự động dọn sạch phiên cũ trong trình duyệt
                  Object.keys(localStorage)
                      .filter(k => k === 'current_profile_id' || k === 'current_user_name' || k.startsWith('analysis_') || k.startsWith('has_analyzed_'))
                      .forEach(k => localStorage.removeItem(k));
                  sessionStorage.clear();
                  appState.currentProfileId = null;
                  window.userSavedStudyTasks = [];
                  if (typeof window.renderMasterRoadmapUI === 'function') window.renderMasterRoadmapUI([]);
                  if (btnLoginOpen) btnLoginOpen.textContent = 'Đăng nhập';
                  if (typeof forceNavigateToHome === 'function') forceNavigateToHome();
              }
          })
          .catch(() => {
              // Nếu chưa kết nối được backend lúc load
              appState.currentProfileId = savedUserId;
              if (btnLoginOpen) btnLoginOpen.textContent = savedUserName + ' ▾';
              if (dropdownUserName) dropdownUserName.textContent = savedUserName;
          });
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
                    updateTimeDropdowns(); // Cập nhật lại danh sách giờ theo ngày đã chọn (hôm nay vs tương lai)
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

    // Hàm tải lịch rảnh đã lưu của người dùng từ Server
    window.loadSavedSchedulesFromServer = async function() {
        const profileId = localStorage.getItem('current_profile_id') || appState.currentProfileId || appState.uploadedProfileId;
        if (!profileId || !/^\d+$/.test(String(profileId))) return;
        try {
            const res = await fetch(`${API_BASE_URL}/study-plan/schedules/${profileId}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data && Array.isArray(data.schedules) && data.schedules.length > 0) {
                window.userSchedules = data.schedules;
                renderSchedules();
            }
        } catch (err) {
            console.error("Lỗi tải lịch rảnh đã lưu:", err);
        }
    };

    // Hàm mở nhanh khu vực Cập nhật lịch rảnh (Giữ lộ trình) từ Trang chủ
    window.openQuickScheduleEditor = async function() {
        const realProfileId = localStorage.getItem('current_profile_id') || appState.currentProfileId;
        if (!realProfileId) {
            if (typeof showToast === 'function') showToast('Chưa đăng nhập', 'Vui lòng đăng nhập để cập nhật lịch rảnh!', 'warning');
            return;
        }
        await window.loadSavedSchedulesFromServer();

        appState.currentScreen = 'screen-gap';
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('current_screen', 'screen-gap');
        }
        document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
        const gapScreen = document.getElementById('screen-gap');
        if (gapScreen) gapScreen.classList.remove('hidden');

        const skeleton = document.getElementById('gapSkeletonLoading');
        const realResults = document.getElementById('gapRealResults');
        if (skeleton) skeleton.classList.add('hidden');
        if (realResults) realResults.classList.remove('hidden');

        if (typeof updateActiveTabHighlight === 'function') {
            updateActiveTabHighlight('screen-gap');
        }

        const schedBox = document.getElementById('scheduleListContainer');
        if (schedBox) {
            setTimeout(() => schedBox.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
        }
        if (typeof showToast === 'function') {
            showToast('Cập nhật lịch rảnh', 'Hãy thêm/xóa khung giờ rảnh và bấm "Cập nhật lịch rảnh (Giữ lộ trình)"!', 'success');
        }
    };

    // Sự kiện cho nút Tạo lộ trình mới (Reset lại toàn bộ thống kê, Streak và Hạt giống theo lộ trình mới)
    const btnGeneratePlan = document.getElementById('btnGenerateStudyPlan'); 
    
    if (btnGeneratePlan) {
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

            const originalText = btnGeneratePlan.innerHTML;
            btnGeneratePlan.disabled = true;
            btnGeneratePlan.classList.add('opacity-50', 'cursor-not-allowed');
            btnGeneratePlan.innerHTML = 'Đang tạo lộ trình mới...';

            try {
                const customJdEl = document.getElementById('customJdTextarea') || document.getElementById('customJdInput');
                const jdText = (customJdEl ? customJdEl.value.trim() : '') || (appState.customJdText || '');
                const targetRole = appState.targetRoleTitle || (document.getElementById('targetRoleBadge') ? document.getElementById('targetRoleBadge').textContent.trim() : '');

                const payload = {
                    profile_id: String(realProfileId),
                    role_id: String(appState.selectedRoleId || "1"),
                    schedules: window.userSchedules,
                    gaps: (appState.gapDetails && appState.gapDetails.length > 0) 
                            ? appState.gapDetails.map(g => g.name) 
                            : ["Nâng cao chuyên môn tổng hợp", "Kỹ năng mềm"],
                    jd_text: jdText,
                    target_role: targetRole
                };

                const res = await fetch(`${API_BASE_URL}/study-plan/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.status === 404) {
                    localStorage.removeItem('current_profile_id');
                    localStorage.removeItem('current_user_name');
                    appState.currentProfileId = null;
                    if (typeof showToast === 'function') {
                        showToast('Phiên hết hạn', 'Tài khoản không tồn tại. Vui lòng đăng nhập lại!', 'error');
                    }
                    const btnLoginOpen = document.getElementById('btnLoginOpen');
                    if (btnLoginOpen) btnLoginOpen.textContent = 'Đăng nhập';
                    throw new Error("Tài khoản không tồn tại trong hệ thống.");
                }

                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Lỗi tạo lộ trình");

                if (typeof showToast === 'function') {
                    showToast('Đã tạo lộ trình mới', data.message || 'Đã tạo lộ trình mới và đặt lại thống kê học tập, Streak, Hạt giống!', 'success');
                }
                
                await loadSavedStudyPlan();
                await loadGamificationData();

                appState.currentScreen = 'screen-home';
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('current_screen', 'screen-home'); 
                }

                document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
                const forceHideGap = document.getElementById('screen-gap');
                if (forceHideGap) forceHideGap.classList.add('hidden');
                const homeScreen = document.getElementById('screen-home');
                if (homeScreen) homeScreen.classList.remove('hidden');
                
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

    // Sự kiện cho nút Cập nhật lịch rảnh (Giữ nguyên lộ trình hiện tại, tiến độ và Streak)
    const btnUpdateScheduleKeep = document.getElementById('btnUpdateScheduleKeepRoadmap');
    if (btnUpdateScheduleKeep) {
        btnUpdateScheduleKeep.addEventListener('click', async () => {
            const realProfileId = localStorage.getItem('current_profile_id') || appState.currentProfileId;
            if (!realProfileId) {
                if (typeof showToast === 'function') showToast('Chưa đăng nhập', 'Vui lòng đăng nhập để cập nhật lịch rảnh!', 'warning');
                return;
            }
            if (window.userSchedules.length === 0) {
                if (typeof showToast === 'function') showToast('Thiếu lịch rảnh', 'Vui lòng thêm ít nhất 1 khung giờ rảnh để xếp lại các bài học!', 'warning');
                return;
            }

            const originalHtml = btnUpdateScheduleKeep.innerHTML;
            btnUpdateScheduleKeep.disabled = true;
            btnUpdateScheduleKeep.classList.add('opacity-50', 'cursor-not-allowed');
            btnUpdateScheduleKeep.innerHTML = 'Đang cập nhật lịch rảnh...';

            try {
                const res = await fetch(`${API_BASE_URL}/study-plan/update-schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        profile_id: String(realProfileId),
                        schedules: window.userSchedules
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Không thể cập nhật lịch rảnh');

                if (typeof showToast === 'function') {
                    showToast('Đã cập nhật lịch rảnh', data.message || 'Đã cập nhật lịch rảnh và giữ nguyên lộ trình hiện tại!', 'success');
                }

                await loadSavedStudyPlan();
                await loadGamificationData();

                appState.currentScreen = 'screen-home';
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('current_screen', 'screen-home');
                }
                document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
                const homeScreen = document.getElementById('screen-home');
                if (homeScreen) homeScreen.classList.remove('hidden');
                if (typeof updateActiveTabHighlight === 'function') {
                    updateActiveTabHighlight('screen-home');
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast('Thông báo', err.message, 'warning');
            } finally {
                btnUpdateScheduleKeep.disabled = false;
                btnUpdateScheduleKeep.classList.remove('opacity-50', 'cursor-not-allowed');
                btnUpdateScheduleKeep.innerHTML = originalHtml;
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

        let isToday = false;
        if (selectedFullDate) {
            const [d, m, y] = selectedFullDate.split('/').map(Number);
            isToday = (d === now.getDate() && m === (now.getMonth() + 1) && y === now.getFullYear());
        } else {
            isToday = true;
        }

        const selectedH = parseInt(hourSel.value) || currentH;
        const selectedM = parseInt(minSel.value) || currentM;

        let hourOptions = '';
        let firstValidHour = -1;

        for (let i = 0; i < 24; i++) {
            if (isToday && i < currentH) {
                continue; 
            }
            if (firstValidHour === -1) firstValidHour = i;
            const hStr = String(i).padStart(2, '0');
            hourOptions += `<option value="${hStr}">${hStr}</option>`;
        }
        hourSel.innerHTML = hourOptions;

        let finalH = selectedH;
        if (isToday) {
            finalH = (selectedH < currentH) ? currentH : selectedH;
        }
        hourSel.value = String(finalH).padStart(2, '0');

        let minOptions = '';
        const activeHour = parseInt(hourSel.value);
        let firstValidMin = -1;

        for (let i = 0; i < 60; i++) {
            if (isToday && activeHour === currentH && i < currentM) {
                continue;
            }
            if (firstValidMin === -1) firstValidMin = i;
            const mStr = String(i).padStart(2, '0');
            minOptions += `<option value="${mStr}">${mStr}</option>`;
        }
        minSel.innerHTML = minOptions;

        let finalM = selectedM;
        if (isToday && finalH === currentH) {
            finalM = (selectedM <= currentM) ? Math.min(59, currentM + 2) : selectedM;
        }
        if (!minSel.querySelector(`option[value="${String(finalM).padStart(2, '0')}"]`)) {
            finalM = firstValidMin !== -1 ? firstValidMin : 0;
        }
        minSel.value = String(finalM).padStart(2, '0');

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

        hourSel.addEventListener('change', () => {
            updateTimeDropdowns();
        });
        minSel.addEventListener('change', () => {
            const hiddenInp = document.getElementById('studyTimeStart');
            if (hiddenInp) hiddenInp.value = `${hourSel.value}:${minSel.value}`;
        });

        updateTimeDropdowns();
    }

    initModernTimeDropdowns();
  
// --- TẢI LỘ TRÌNH ĐÃ LƯU TỪ DATABASE CỦA TÀI KHOẢN ---
    async function loadSavedStudyPlan() {
        const profileId = localStorage.getItem('current_profile_id') || appState.currentProfileId || appState.uploadedProfileId;
        if (!profileId || !/^\d+$/.test(String(profileId))) return;

        try {
            const res = await fetch(`${API_BASE_URL}/study-plan/tasks/${profileId}`);
            if (!res.ok) return;
            const tasks = await res.json();
            
            if (tasks && tasks.length > 0) {
                window.userSavedStudyTasks = tasks;
                if (typeof renderMasterRoadmapUI === 'function') {
                    renderMasterRoadmapUI(tasks);
                }
            }
        } catch (err) {
            console.error("Lỗi tải lộ trình:", err);
        }
    }
    window.loadSavedStudyPlan = loadSavedStudyPlan;

    function strIsDigit(str) {
        return /^\d+$/.test(str);
    }

    function renderSavedStudyTasksOnUI(tasks) {
        const planContainer = document.getElementById('studyPlanResultContainer');
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

    loadSavedStudyPlan();
    window.loadSavedSchedulesFromServer();

    setInterval(() => {
        if (window.userSavedStudyTasks && window.userSavedStudyTasks.length > 0 && typeof window.renderMasterRoadmapUI === 'function') {
            window.renderMasterRoadmapUI(window.userSavedStudyTasks);
        }
    }, 15000);

// --- RENDER SƠ ĐỒ LỘ TRÌNH ĐỐI XỨNG 1 TRÁI - 1 PHẢI (GIỐNG GIAO DIỆN KHI CHƯA ĐĂNG NHẬP) ĐẾN HẾT LỘ TRÌNH ---
window.renderMasterRoadmapUI = function(tasks) {
    const container = document.getElementById('homeRoadmapContainer');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
        container.innerHTML = `<div class="text-center p-6 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Chưa có lộ trình nào. Hãy thực hiện phân tích Skill Gap và đăng ký lịch rảnh!</div>`;
        return;
    }

    let html = `<div class="absolute top-6 bottom-6 left-1/2 -translate-x-1/2 w-0 border-r-2 border-dashed border-slate-200 z-0 hidden sm:block"></div>`;
    let unlocked = true;
    let completedCount = 0;

    tasks.forEach((task, index) => {
        const isCompleted = task.status === 'completed';
        const isExcused = task.status === 'excused';
        const isUnscheduled = task.status === 'unscheduled';
        const isLeft = (index % 2 === 0); // 1 Trái (chẵn) - 1 Phải (lẻ) luân phiên đến hết lộ trình
        const stepNum = String(index + 1).padStart(2, '0');

        if (isCompleted || isExcused) {
            completedCount++;
        }

        let isDisabled = !unlocked && !isCompleted && !isExcused;
        if (isUnscheduled || isExcused) isDisabled = true;

        const now = new Date();
        const unlockTime = task.unlock_time ? new Date(task.unlock_time) : null;
        const isTimeLocked = unlockTime && !isNaN(unlockTime.getTime()) && (now.getTime() + 60000 < unlockTime.getTime()) && !isCompleted && !isExcused;

        if (isTimeLocked) {
            isDisabled = true;
        }

        const unlockTimeFormatted = (unlockTime && !isNaN(unlockTime.getTime()))
            ? `${unlockTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} ${String(unlockTime.getDate()).padStart(2, '0')}/${String(unlockTime.getMonth() + 1).padStart(2, '0')}`
            : '';

        let cardClass = '';
        let badgeLabel = '';
        let badgeColorClass = '';
        let centerCircleHtml = '';
        let actionHtml = '';

        if (isCompleted) {
            cardClass = 'bg-emerald-50/60 border border-emerald-400 shadow-xs';
            badgeLabel = `Bài ${stepNum} • Đã hoàn thành`;
            badgeColorClass = 'text-emerald-700';
            centerCircleHtml = `<div class="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center ring-4 ring-emerald-50 shadow-sm flex-shrink-0 hidden sm:flex">✓</div>`;
            actionHtml = `<div class="mt-2"><span class="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200">Đã hoàn thành (+50 XP)</span></div>`;
        } else if (isExcused) {
            cardClass = 'bg-sky-50/70 border border-sky-300 shadow-xs';
            badgeLabel = `Bài ${stepNum} • Đã nghỉ phép (Miễn học)`;
            badgeColorClass = 'text-sky-700 font-bold';
            centerCircleHtml = `<div class="w-9 h-9 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center ring-4 ring-sky-50 shadow-sm flex-shrink-0 hidden sm:flex">🏖️</div>`;
            actionHtml = `<div class="mt-2"><span class="inline-block text-[11px] font-bold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-md border border-sky-200">Đã miễn học (Thẻ nghỉ phép)</span></div>`;
        } else if (!isDisabled) {
            cardClass = 'bg-amber-50/50 border border-amber-400 shadow-xs hover:border-amber-500';
            badgeLabel = `Bài ${stepNum} • Sẵn sàng`;
            badgeColorClass = 'text-amber-700';
            centerCircleHtml = `<div class="w-9 h-9 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center ring-4 ring-amber-50 shadow-sm flex-shrink-0 hidden sm:flex">${stepNum}</div>`;
            actionHtml = `<div class="mt-2.5"><button type="button" onclick="completeTask(${task.id})" class="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer">Hoàn thành (+50 XP)</button></div>`;
        } else {
            cardClass = 'bg-slate-50 border border-slate-200 opacity-80';
            const lockReason = isUnscheduled ? 'Chờ xếp lịch' : (isTimeLocked ? 'Chưa đến giờ' : 'Khóa');
            badgeLabel = `Bài ${stepNum} • ${lockReason}`;
            badgeColorClass = 'text-slate-500';
            centerCircleHtml = `
                <div class="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 text-slate-500 font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0 hidden sm:flex">
                    <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>`;
            actionHtml = `<div class="mt-2"><span class="inline-block text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-md">${lockReason}</span></div>`;
        }

        const timeAndDurationInfo = `
            <div class="text-[11px] text-slate-500 mt-1">
                <span>${task.scheduled_day || 'Linh hoạt'}</span> • <span>${task.duration_minutes || 45} phút</span>
            </div>
            ${isTimeLocked ? `<div class="text-[10px] text-amber-700 font-semibold mt-0.5">Mở khóa lúc: ${unlockTimeFormatted}</div>` : ''}
            ${isUnscheduled ? `<div class="text-[10px] text-slate-400 mt-0.5">Cập nhật thêm giờ rảnh để xếp lịch</div>` : ''}
        `;

        const buildNodeCard = (alignClass) => `
            <div class="${cardClass} rounded-lg p-3.5 transition-all ${alignClass}" data-task-id="${task.id}">
                <span class="text-[10px] font-semibold ${badgeColorClass} uppercase tracking-wider block">${badgeLabel}</span>
                <h4 class="font-semibold text-xs sm:text-sm text-slate-900 mt-0.5">${task.title}</h4>
                ${timeAndDurationInfo}
                ${actionHtml}
            </div>
        `;

        html += `
            <div class="relative z-10 flex items-center justify-between mb-8">
                <div class="w-5/12 text-right pr-6 hidden sm:block">
                    ${isLeft ? buildNodeCard('text-right') : ''}
                </div>
                ${centerCircleHtml}
                <div class="w-full sm:w-5/12 sm:pl-6">
                    <div class="hidden sm:block">
                        ${!isLeft ? buildNodeCard('text-left') : ''}
                    </div>
                    <div class="sm:hidden">
                        ${buildNodeCard('text-left')}
                    </div>
                </div>
            </div>
        `;

        if (!isCompleted && !isExcused) {
            unlocked = false;
        }
    });

    const progressBadge = document.getElementById('roadmapProgressBadge') || document.querySelector('#roadmapDiagramSection span.text-xs.font-semibold');
    if (progressBadge) {
        progressBadge.textContent = `Tiến độ: ${completedCount} / ${tasks.length} Bài Hoàn thành`;
    }

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

        if (typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
        if (typeof showToast === 'function') {
            showToast('Hoàn thành bài học!', `${data.message || 'Đã hoàn thành!'} | +${data.added_xp} XP | Chuỗi: ${data.current_streak} ngày`, 'success');
        }

        await loadSavedStudyPlan();
        await loadGamificationData();
        
    } catch (err) {
        if (typeof showToast === 'function') showToast('Thông báo', err.message, 'warning');
    }
};


// --- TẢI DỮ LIỆU GAMIFICATION (XP, STREAK, CÂY TRỒNG THEO LỘ TRÌNH, PHIẾU NGHỈ PHÉP) ---
async function loadGamificationData() {
    const profileId = localStorage.getItem('current_profile_id') || appState.currentProfileId || appState.uploadedProfileId;
    if (!profileId || !/^\d+$/.test(String(profileId))) return;

    try {
        const res = await fetch(`${API_BASE_URL}/gamification/${profileId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (!data.error) {
            appState.user.currentXp = data.current_xp || 0;
            appState.user.streakDays = data.current_streak || 0;
            appState.targetPlantXp = data.target_plant_xp || 0;
            appState.roadmapDays = data.roadmap_days || 0;

            if (Array.isArray(data.stage_thresholds) && data.stage_thresholds.length === 6) {
                data.stage_thresholds.forEach((thr, idx) => {
                    if (appState.stages[idx]) {
                        appState.stages[idx].xpRequired = thr;
                    }
                });
            }

            const streakEl = document.getElementById('currentStreakText');
            if (streakEl) {
                streakEl.textContent = data.current_streak || 0;
            }
            if (typeof updateStreakColor === 'function') updateStreakColor();

            const stagesList = ["Hạt giống", "Nảy mầm", "Phát triển thân", "Phân cành", "Ra lá", "Kết trái"];
            let stageIndex = stagesList.indexOf(data.seed_stage);
            if (stageIndex === -1) stageIndex = 0;
            
            appState.user.currentStageIndex = stageIndex;
            updateIllustration();

            // Cập nhật trạng thái Thẻ Phiếu Nghỉ Phép (Giới hạn 1 lần / 1 tuần)
            const leaveBadgeEl = document.getElementById('leavePassBadge');
            const leaveStatusEl = document.getElementById('leavePassStatusText');
            const btnUseLeaveEl = document.getElementById('btnUseLeavePass');
            const remainingLeave = (typeof data.leave_pass_remaining === 'number') ? data.leave_pass_remaining : 1;

            if (leaveBadgeEl) {
                leaveBadgeEl.textContent = `Còn ${remainingLeave}/1 tuần này`;
                leaveBadgeEl.className = remainingLeave > 0
                    ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-amber-800 border border-amber-300"
                    : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-300";
            }
            if (leaveStatusEl) {
                leaveStatusEl.textContent = remainingLeave > 0
                    ? "Được đăng ký nghỉ tối đa 1 lần/tuần để bảo lưu không mất chuỗi Streak."
                    : `Đã đăng ký nghỉ phép ngày ${data.last_leave_date} (Đã hết lượt tuần này).`;
            }
            if (btnUseLeaveEl) {
                if (remainingLeave > 0) {
                    btnUseLeaveEl.disabled = false;
                    btnUseLeaveEl.textContent = "Đăng ký nghỉ phép hôm nay";
                    btnUseLeaveEl.className = "w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer";
                } else {
                    btnUseLeaveEl.disabled = true;
                    btnUseLeaveEl.textContent = "Đã dùng phiếu nghỉ tuần này";
                    btnUseLeaveEl.className = "w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-200 text-slate-500 cursor-not-allowed";
                }
            }

            // Cập nhật các thông số thống kê báo cáo học tập
            const completedHours = ((data.completed_roadmap_minutes || 0) / 60).toFixed(1);
            const totalHours = ((data.total_roadmap_minutes || 0) / 60).toFixed(1);
            const roadmapProgressEl = document.getElementById('roadmapProgressText');
            if (roadmapProgressEl) {
                roadmapProgressEl.textContent = `${completedHours} / ${totalHours} giờ`;
            }

            const disciplineEl = document.getElementById('disciplineScoreText');
            if (disciplineEl) {
                disciplineEl.textContent = `${data.discipline_score || 0}%`;
            }

            const weeklyXpEl = document.getElementById('weeklyXpText');
            if (weeklyXpEl) {
                weeklyXpEl.textContent = `+${data.weekly_xp || 0} XP`;
            }

            const completedTasksEl = document.getElementById('completedTasksCountText');
            if (completedTasksEl) {
                completedTasksEl.textContent = `${data.completed_tasks || 0} bài`;
            }

            const streakSubtitleEl = document.getElementById('streakSubtitleText');
            if (streakSubtitleEl) {
                streakSubtitleEl.textContent = `${data.current_streak || 0} ngày streak`;
            }

            // Cập nhật 7 ô ngày trong tuần: CHỈ đánh dấu tích (✓) khi người dùng đã bấm Hoàn thành bài học (kèm ngày nghỉ phép 'P')
            const completedDays = Array.isArray(data.completed_weekdays)
                ? data.completed_weekdays
                : (Array.isArray(data.registered_weekdays) ? data.registered_weekdays : []);
            for (let i = 1; i <= 7; i++) {
                const dayBox = document.getElementById(`day-box-${i}`);
                if (dayBox) {
                    if (completedDays.includes(i)) {
                        dayBox.className = "w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center border border-indigo-700 shadow-sm";
                        dayBox.textContent = "✓";
                        dayBox.title = "Ngày đã hoàn thành bài học";
                    } else if (data.leave_weekday === i) {
                        dayBox.className = "w-7 h-7 rounded-lg bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center border border-amber-600 shadow-sm";
                        dayBox.textContent = "P";
                        dayBox.title = "Ngày đã đăng ký Phiếu nghỉ phép";
                    } else {
                        dayBox.className = "w-7 h-7 rounded-lg bg-slate-100 text-slate-400 font-bold text-[10px] flex items-center justify-center border border-slate-200";
                        dayBox.textContent = "•";
                        dayBox.title = "";
                    }
                }
            }
        }
    } catch (err) {
        console.error("Lỗi đồng bộ dữ liệu thống kê lên UI:", err);
    }
}

// --- HÀM ĐĂNG KÝ PHIẾU NGHỈ PHÉP (GIỚI HẠN 1 LẦN / 1 TUẦN) ---
window.useLeavePass = async function() {
    const profileId = localStorage.getItem('current_profile_id') || appState.currentProfileId || appState.uploadedProfileId;
    if (!profileId) {
        if (typeof showToast === 'function') {
            showToast('Chưa đăng nhập', 'Vui lòng đăng nhập để đăng ký Phiếu nghỉ phép!', 'warning');
        }
        return;
    }

    try {
        if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
        const res = await fetch(`${API_BASE_URL}/gamification/use-leave-pass/${profileId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Không thể đăng ký Phiếu nghỉ phép");

        if (typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
        if (typeof showToast === 'function') {
            showToast('Đăng ký nghỉ phép thành công', data.message, 'success');
        }
        await loadGamificationData();
        if (typeof window.loadSavedStudyPlan === 'function') {
            await window.loadSavedStudyPlan();
        }
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast('Thông báo', err.message, 'warning');
        }
    }
};

// --- HÀM GỬI PHẢN HỒI ĐÁNH GIÁ ĐỘ TƯƠNG THÍCH (LƯU VÀO DATABASE FEEDBACKS) ---
window.submitMatchFeedback = async function(isMatch) {
    const profileId = localStorage.getItem('current_profile_id') || appState.currentProfileId || appState.uploadedProfileId;
    if (!profileId) {
        if (typeof showToast === 'function') showToast('Thông báo', 'Vui lòng đăng nhập để gửi phản hồi!', 'warning');
        return;
    }
    const jobId = appState.currentJobId || null;
    try {
        const res = await fetch(`${API_BASE_URL}/analyses/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profile_id: String(profileId),
                job_id: jobId,
                is_match: Boolean(isMatch)
            })
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.detail || "Không thể gửi phản hồi");
        if (typeof showToast === 'function') {
            showToast('Cảm ơn bạn', isMatch ? 'Đã ghi nhận phản hồi: Khớp và chính xác!' : 'Đã ghi nhận phản hồi: Chưa khớp để hệ thống cải tiến!', 'success');
        }
        const feedbackContainer = document.getElementById('matchingFeedbackContainer');
        if (feedbackContainer) {
            feedbackContainer.innerHTML = `<span class="text-emerald-700 font-semibold text-xs">✓ Cảm ơn bạn đã phản hồi! Dữ liệu đã được lưu trữ an toàn trong Database.</span>`;
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('Thông báo', e.message || 'Lỗi gửi phản hồi', 'error');
    }
};

// --- HÀM XỬ LÝ TƯỚI NƯỚC CHO CÂY ---
window.waterPlant = async function() {
    const profileId = localStorage.getItem('current_profile_id') || appState.currentProfileId || appState.uploadedProfileId;
    if (!profileId) {
        if (typeof showToast === 'function') {
            showToast('Thông báo', 'Vui lòng đăng nhập để chăm sóc mầm cây!', 'warning');
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

        if (typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
        appState.user.currentXp = data.current_xp;
        appState.user.hasWateredToday = true;

        if (typeof showToast === 'function') {
            showToast('Thành công!', data.message || 'Tưới nước thành công! +25 XP', 'success');
        }

        checkAndUpdateStage();
        await loadGamificationData();

    } catch (err) {
        if (typeof showToast === 'function') {
            showToast('Thông báo', err.message, 'warning');
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
    setTxt('aiReasoningText', data.ai_reasoning || "Hệ thống đã hoàn tất đối chiếu năng lực ứng viên và yêu cầu công việc.");
    if (data.target_role) {
      setTxt('targetRoleBadge', data.target_role);
    }

    // Hiển thị các kỹ năng đã đáp ứng (matched_skills)
    const matchedContainer = document.getElementById('matchedSkillsContainer');
    const matchedList = document.getElementById('matchedSkillsList');
    if (matchedContainer && matchedList) {
      if (data.matched_skills && Array.isArray(data.matched_skills) && data.matched_skills.length > 0) {
        matchedContainer.classList.remove('hidden');
        matchedList.innerHTML = data.matched_skills.map(s => `
          <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200 shadow-2xs">
            ✓ ${s}
          </span>
        `).join('');
      } else {
        matchedContainer.classList.add('hidden');
      }
    }

    // Vẽ biểu đồ Radar ứng dụng công thức Khoa học & Định lượng
    const ctx = document.getElementById('skillsRadarCanvas');
    if (ctx && data.radar_data && typeof Chart !== 'undefined') {
      if (window.myRadarChart) window.myRadarChart.destroy();
      
      const labels = Object.keys(data.radar_data);
      const dataPoints = Object.values(data.radar_data).map(val => {
          const numVal = Number(val) || 0;
          return Math.min(100, Math.max(0, Math.round(numVal)));
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
          maintainAspectRatio: false,
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
      if (data.gap_details.length === 0) {
        gapContainer.innerHTML = `
          <div class="col-span-full bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 text-center">
            <div class="font-bold text-sm text-emerald-800">Xuất sắc! Hồ sơ của bạn đã đáp ứng đầy đủ các kỹ năng trọng tâm của JD.</div>
            <p class="text-xs text-emerald-700 mt-1">Bạn có thể tạo lộ trình ôn tập chuyên sâu hoặc tiến thẳng vào Phòng Phỏng vấn AI!</p>
          </div>
        `;
      } else {
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
      const savedScreen = (typeof AppStore !== 'undefined') ? AppStore.state.currentScreen : (sessionStorage.getItem('current_screen') || 'screen-home');
      
      if (savedScreen) {
          document.querySelectorAll('.screen-page').forEach(p => p.classList.add('hidden'));
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

// --- 2. XỬ LÝ GỬI REQUEST GỌI AI TẠO BỘ CÂU HỎI NGẪU NHIÊN ĐỘC QUYỀN (VI / EN) ---
const PERSONA_DISPLAY_LABELS = {
    hr: 'Vòng Nhân sự (HR)',
    tech_lead: 'Vòng Chuyên môn (Tech Lead)',
    culture_fit: 'Vòng Văn hóa (Culture Fit)',
    hiring_manager: 'Vòng Cuối (Hiring Manager)'
};

const PERSONA_DISPLAY_LABELS_EN = {
    hr: 'HR Interview Round',
    tech_lead: 'Technical / Domain Round',
    culture_fit: 'Culture Fit Round',
    hiring_manager: 'Final Hiring Manager Round'
};

async function generateNewRandomInterviewSession(triggerBtn, defaultLabelHtml) {
    const activePersona = document.querySelector('.persona-option-card.active')?.getAttribute('data-persona') || 'tech_lead';
    const activeLevel = document.querySelector('.btn-level-select.active')?.getAttribute('data-level') || 'mid';
    const activeLang = document.querySelector('.btn-lang-select.active')?.getAttribute('data-lang') || 'vi';
    const resolvedLang = (activeLang === 'en') ? 'en' : 'vi';
    appState.interviewLanguage = resolvedLang;

    const currentPid = localStorage.getItem('current_profile_id') || appState.currentProfileId || appState.uploadedProfileId || 1;
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

    if (triggerBtn) {
        const loadingLabel = (resolvedLang === 'en')
            ? 'AI is generating English interview questions...'
            : 'AI đang sinh câu hỏi ngẫu nhiên...';
        triggerBtn.innerHTML = `<svg class="animate-spin w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>${loadingLabel}</span>`;
        triggerBtn.disabled = true;
    }

    try {
        Object.keys(interviewAnswersCache).forEach(k => delete interviewAnswersCache[k]);

        const enrichedContext = {
            ...analysisData,
            role_id: analysisData.role_id || appState.selectedRoleId || 'Chuyên viên',
            target_role: analysisData.target_role || appState.selectedRoleId || 'Chuyên viên',
            skills: analysisData.matched_skills || (window.currentUploadedSkills ? window.currentUploadedSkills.map(s => s.topic || s) : []),
            gaps: analysisData.missing_skills || (analysisData.gap_details ? analysisData.gap_details.map(g => g.name) : [])
        };

        const res = await fetch(`${API_BASE_URL}/interview/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profile_id: String(currentPid),
                persona: activePersona,
                level: activeLevel,
                language: resolvedLang,
                analysis_context: enrichedContext,
                random_nonce: Date.now() + Math.floor(Math.random() * 100000)
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Lỗi kết nối tới mô hình AI phỏng vấn.");

        const personaBadge = document.getElementById('interviewActivePersonaBadge');
        if (personaBadge) {
            personaBadge.textContent = (resolvedLang === 'en')
                ? (PERSONA_DISPLAY_LABELS_EN[activePersona] || 'Interview Panel')
                : (PERSONA_DISPLAY_LABELS[activePersona] || 'Hội đồng Phỏng vấn');
        }
        
        if (typeof window.renderInterviewQuestions === 'function') {
            window.renderInterviewQuestions(data.questions);
        }

        const setupView = document.getElementById('interviewSetupView');
        const liveRoomView = document.getElementById('interviewLiveRoomView');
        if (setupView) setupView.classList.add('hidden');
        if (liveRoomView) liveRoomView.classList.remove('hidden');

        const btnTabModeSetup = document.getElementById('btnTabModeSetup');
        const btnTabModeRoom = document.getElementById('btnTabModeRoom');
        if (btnTabModeSetup && btnTabModeRoom) {
            btnTabModeSetup.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 cursor-pointer";
            btnTabModeRoom.className = "px-3 py-1.5 rounded-md bg-white text-blue-700 font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer";
        }

        if (typeof showToast === 'function') {
            const msg = (resolvedLang === 'en')
                ? `Generated 3 new English interview questions for ${PERSONA_DISPLAY_LABELS_EN[activePersona] || 'your session'}!`
                : `Đã khởi tạo ngẫu nhiên 3 câu hỏi cho ${PERSONA_DISPLAY_LABELS[activePersona] || 'buổi phỏng vấn'}!`;
            showToast(resolvedLang === 'en' ? 'Interview Ready!' : 'Bộ câu hỏi mới sẵn sàng!', msg, 'success');
        }

    } catch (err) {
        console.error("Lỗi phỏng vấn:", err);
        if (typeof showToast === 'function') {
            showToast('Lỗi hệ thống', err.message || 'Không thể tạo bộ câu hỏi.', 'error');
        } else {
            alert(err.message);
        }
    } finally {
        if (triggerBtn) {
            triggerBtn.innerHTML = defaultLabelHtml;
            triggerBtn.disabled = false;
        }
    }
}

const btnStartInterview = document.getElementById('btnStartInterviewSession');
if (btnStartInterview) {
    btnStartInterview.addEventListener('click', () => {
        generateNewRandomInterviewSession(
            btnStartInterview,
            `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Bắt đầu phỏng vấn ngay</span>`
        );
    });
}

const btnRandomizeQuestions = document.getElementById('btnRandomizeQuestions');
if (btnRandomizeQuestions) {
    btnRandomizeQuestions.addEventListener('click', () => {
        if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
        generateNewRandomInterviewSession(
            btnRandomizeQuestions,
            `<span>Đổi bộ câu hỏi ngẫu nhiên mới</span>`
        );
    });
}

let currentSelectedQuestionIndex = 0;
let activeInterviewQuestionsList = [];

window.renderInterviewQuestions = function(questions) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) return;
    activeInterviewQuestionsList = questions;
    const isEn = (appState.interviewLanguage === 'en');

    const tabsContainer = document.getElementById('interviewQuestionTabsContainer');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = questions.map((q, index) => {
        const qNum = String(index + 1).padStart(2, '0');
        const isActive = index === 0;
        const prefixLabel = isEn ? `Question ${qNum}` : `Câu ${qNum}`;
        const defaultTag = isEn ? 'Required' : 'Bắt buộc';
        return `
            <div class="interview-question-tab p-2.5 rounded-lg border ${isActive ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-slate-300'} cursor-pointer" data-index="${index}">
              <div class="text-[10px] font-bold ${isActive ? 'text-indigo-700' : 'text-slate-700'} mb-0.5">${prefixLabel} • ${q.tag || defaultTag}</div>
              <div class="font-semibold text-xs text-slate-900 truncate">${q.title || q.category || (isEn ? 'Interview Question' : 'Câu hỏi phỏng vấn')}</div>
            </div>
        `;
    }).join('');

    const showQuestionDetail = (qIndex) => {
        currentSelectedQuestionIndex = qIndex;
        const q = questions[qIndex];
        if (!q) return;

        currentQuestionId = q.id || (qIndex + 1);

        const titleEl = document.getElementById('interviewActiveTitle');
        const questionEl = document.getElementById('interviewActiveQuestion');
        const categoryEl = document.getElementById('interviewActiveCategory');
        const diffEl = document.getElementById('interviewActiveDifficulty');
        const lockedAnsEl = document.getElementById('lockedAiAnswer');

        if (titleEl) titleEl.textContent = q.title || (isEn ? 'Interview Question' : 'Câu hỏi phỏng vấn');
        if (questionEl) questionEl.textContent = `"${q.question}"`;
        if (categoryEl) categoryEl.textContent = q.category || (isEn ? 'Technical' : 'Chuyên môn');
        if (diffEl) diffEl.textContent = isEn ? `Difficulty: ${q.difficulty || '3.5/5'}` : `Độ khó: ${q.difficulty || '3.5/5'}`;

        if (lockedAnsEl) {
            const star = q.suggested_star || (isEn
                ? { situation: "Situation context...", task: "Your task...", action: "Actions taken...", result: "Measurable results..." }
                : { situation: "Tình huống...", task: "Nhiệm vụ...", action: "Hành động...", result: "Kết quả..." }
            );
            lockedAnsEl.innerHTML = `
                <p><strong>Situation:</strong> ${star.situation}</p>
                <p><strong>Task:</strong> ${star.task}</p>
                <p><strong>Action:</strong> ${star.action}</p>
                <p><strong>Result:</strong> ${star.result}</p>
            `;
        }

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

        const answerInput = document.getElementById('userAnswerInput');
        const lockOverlay = document.getElementById('lockOverlay');
        const unlockedEval = document.getElementById('unlockedAiEvaluation');
        const btnSubmit = document.getElementById('btnSubmitAnswer');
        
        if (answerInput) {
            answerInput.placeholder = isEn
                ? "Type your answer in English following the STAR structure (Situation - Task - Action - Result)..."
                : "Gõ câu trả lời theo chuẩn STAR (Situation - Task - Action - Result)...";
        }

        const scoreEl = document.getElementById('aiScoreValue') || document.querySelector('#unlockedAiEvaluation .text-2xl.font-bold');
        const fbEl = document.getElementById('aiFeedbackText');
        const impEl = document.getElementById('aiImprovedAnswerText');

        if (interviewAnswersCache[currentQuestionId]) {
            const savedData = interviewAnswersCache[currentQuestionId];
            
            if (answerInput) answerInput.value = savedData.text;
            if (scoreEl) scoreEl.textContent = savedData.score + ' / 10';
            if (fbEl) fbEl.textContent = savedData.feedback;
            if (impEl) impEl.textContent = savedData.improved;
            
            if (lockOverlay) lockOverlay.style.display = 'none';
            if (unlockedEval) unlockedEval.classList.remove('hidden');
            if (lockedAnsEl) lockedAnsEl.classList.remove('blur-md', 'select-none', 'pointer-events-none');
            
            if (btnSubmit) {
                btnSubmit.textContent = isEn ? 'Update Answer & Re-evaluate' : 'Cập nhật câu trả lời & Chấm lại';
                btnSubmit.disabled = false;
            }
        } else {
            if (answerInput) answerInput.value = '';
            if (scoreEl) scoreEl.textContent = '0 / 10';
            if (fbEl) fbEl.textContent = '';
            if (impEl) impEl.textContent = '';
            
            if (lockOverlay) lockOverlay.style.display = 'flex';
            if (unlockedEval) unlockedEval.classList.add('hidden');
            if (lockedAnsEl) lockedAnsEl.classList.add('blur-md', 'select-none', 'pointer-events-none');
            
            if (btnSubmit) {
                btnSubmit.textContent = isEn ? 'Submit Answer & AI Grading' : 'Nộp câu trả lời & Chấm điểm AI';
                btnSubmit.disabled = false;
            }
        }
    };

    showQuestionDetail(0);

    document.querySelectorAll('.interview-question-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const idx = parseInt(tab.getAttribute('data-index'), 10);
            showQuestionDetail(idx);
        });
    });
};


// 4. Xử lý nút quay lại thiết lập & nút chuyển đổi chế độ ở trên cùng
const btnBackToSetup = document.getElementById('btnBackToSetup');
const btnTabModeSetup = document.getElementById('btnTabModeSetup');
const btnTabModeRoom = document.getElementById('btnTabModeRoom');

function switchToInterviewSetupView() {
    const setupView = document.getElementById('interviewSetupView');
    const liveRoomView = document.getElementById('interviewLiveRoomView');
    if (setupView) setupView.classList.remove('hidden');
    if (liveRoomView) liveRoomView.classList.add('hidden');

    if (btnTabModeSetup && btnTabModeRoom) {
        btnTabModeSetup.className = "px-3 py-1.5 rounded-md bg-white text-blue-700 font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer";
        btnTabModeRoom.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 cursor-pointer";
    }
}

if (btnBackToSetup) {
    btnBackToSetup.addEventListener('click', switchToInterviewSetupView);
}
if (btnTabModeSetup) {
    btnTabModeSetup.addEventListener('click', switchToInterviewSetupView);
}
if (btnTabModeRoom) {
    btnTabModeRoom.addEventListener('click', () => {
        if (activeInterviewQuestionsList && activeInterviewQuestionsList.length > 0) {
            const setupView = document.getElementById('interviewSetupView');
            const liveRoomView = document.getElementById('interviewLiveRoomView');
            if (setupView) setupView.classList.add('hidden');
            if (liveRoomView) liveRoomView.classList.remove('hidden');
            if (btnTabModeSetup && btnTabModeRoom) {
                btnTabModeSetup.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 cursor-pointer";
                btnTabModeRoom.className = "px-3 py-1.5 rounded-md bg-white text-blue-700 font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer";
            }
        } else if (btnStartInterview) {
            btnStartInterview.click();
        }
    });
}

});