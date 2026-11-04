/* ============================================================
   NHÀ HÀNG SEN VÀNG — MODULE: CORE (UTILITIES, API, STATE, MODAL)
   ============================================================ */

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' đ';
export const num = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);

// Múi giờ chuẩn Việt Nam (Asia/Ho_Chi_Minh)
export const VN_TZ = 'Asia/Ho_Chi_Minh';

export function parseDateSafe(s) {
  if (!s) return null;
  if (s instanceof Date) return Number.isNaN(s.getTime()) ? null : s;
  const str = String(s).trim();
  if (!str) return null;
  // Nếu chuỗi chỉ có YYYY-MM-DD, hiểu là nửa đêm giờ Việt Nam
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const dt = new Date(`${str}T00:00:00+07:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(str);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export const dt = (s) => {
  const dateObj = parseDateSafe(s);
  if (!dateObj) return '—';
  return dateObj.toLocaleString('vi-VN', {
    timeZone: VN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const d = (s) => {
  const dateObj = parseDateSafe(s);
  if (!dateObj) return '—';
  return dateObj.toLocaleDateString('vi-VN', { timeZone: VN_TZ });
};

export function toVNDateKey(s) {
  const dateObj = parseDateSafe(s);
  if (!dateObj) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
}

export function getVNNowDateTimeLocal(offsetMs = 0) {
  const target = new Date(Date.now() + offsetMs);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(target);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}T${map.hour}:00`;
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

export function debounce(fn, ms = 320) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const ICONS = {
  dashboard: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  table: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 6h16a2 2 0 0 1 2 2v2H2V8a2 2 0 0 1 2-2Z"/><path d="M4 10v10M20 10v10M9 10v6M15 10v6"/></svg>',
  menu: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
  calendar: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  receipt: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  users: '<svg class="icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  boxes: '<svg class="icon" viewBox="0 0 24 24"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>',
  chart: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
  search: '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  plus: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  refresh: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>',
  close: '<svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  alert: '<svg class="icon" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  clock: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>',
  edit: '<svg class="icon" viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  print: '<svg class="icon" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  dollar: '<svg class="icon" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
};

export function toast(message, isError = false) {
  let container = $('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const pill = document.createElement('div');
  pill.className = `toast-pill ${isError ? 'err' : ''}`;
  pill.innerHTML = `
    <div class="toast-icon">${isError ? ICONS.alert : ICONS.check}</div>
    <div style="flex:1">${esc(message)}</div>
  `;
  container.appendChild(pill);

  if (window.anime) {
    window.anime({
      targets: pill,
      translateY: [24, 0],
      opacity: [0, 1],
      scale: [0.94, 1],
      duration: 380,
      easing: 'easeOutElastic(1, 0.75)',
    });
  } else {
    pill.classList.add('show');
  }

  setTimeout(() => {
    if (window.anime) {
      window.anime({
        targets: pill,
        translateY: [0, -16],
        opacity: [1, 0],
        duration: 250,
        easing: 'easeInQuad',
        complete: () => pill.remove(),
      });
    } else {
      pill.classList.remove('show');
      setTimeout(() => pill.remove(), 260);
    }
  }, isError ? 4500 : 2800);
}

export async function api(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  };
  try {
    const res = await fetch('/api' + url, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${url}:`, err);
    throw err;
  }
}

export const tagTT = (tt) => ({
  'Trống': 'ok',
  'Đang phục vụ': 'busy',
  'Đã đặt': 'book',
  'Đã thanh toán': 'ok',
  'Đã hủy': 'bad',
  'Chờ xác nhận': 'grey',
  'Đã xác nhận': 'book',
  'Đã đến': 'ok',
  'Kim cương': 'vip',
  'Vàng': 'busy',
  'Bạc': 'grey',
  'Đồng': 'ok',
  'Thành viên': 'ok',
}[tt] || 'grey');

export const tag = (tt) => `<span class="tag ${tagTT(tt)}">${esc(tt)}</span>`;

export const STATE = {
  MENU: [],
  ALLMON: [],
  DM: [],
  NV: [],
  BAN: [],
  CUR_HD: null,
  ACTIVE_ZONE: 'ALL',
  KH_SEARCH_CACHE: [],
};

export async function ensureRefs() {
  if (!STATE.DM.length) STATE.DM = await api('/danhmuc');
  if (!STATE.NV.length) STATE.NV = await api('/nhanvien');
}

export function openModal(html) {
  const box = $('#modal-box');
  const backdrop = $('#modal-backdrop');
  box.innerHTML = html;
  backdrop.classList.add('show');

  if (window.anime) {
    window.anime({
      targets: box,
      scale: [0.88, 1],
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 350,
      easing: 'easeOutQuint',
    });
  }

  const firstInput = $('#modal-box input, #modal-box select');
  if (firstInput) setTimeout(() => firstInput.focus(), 120);
}

export function closeModal() {
  const box = $('#modal-box');
  const backdrop = $('#modal-backdrop');
  if (!backdrop) return;
  if (window.anime && box) {
    window.anime({
      targets: box,
      scale: [1, 0.94],
      opacity: [1, 0],
      duration: 200,
      easing: 'easeInQuad',
      complete: () => backdrop.classList.remove('show'),
    });
  } else {
    backdrop.classList.remove('show');
  }
}

export function closeDrawer() {
  $('#drawer-backdrop')?.classList.remove('show');
  $('#pos-drawer')?.classList.remove('show');
}
