/* ============================================================
   NHÀ HÀNG SEN VÀNG — MODULE: THỰC ĐƠN (MENU MANAGEMENT)
   ============================================================ */
import { $, esc, fmt, api, toast, ICONS, STATE, ensureRefs, openModal, closeModal } from './core.js';

export async function loadMenu() {
  try {
    await ensureRefs();
    STATE.ALLMON = await api('/monan?all=1');
    STATE.MENU = STATE.ALLMON.filter((m) => m.ConKinhDoanh);

    const dmSelect = $('#f-dm');
    if (dmSelect) {
      dmSelect.innerHTML =
        '<option value="">Tất cả danh mục</option>' +
        STATE.DM.map((c) => `<option value="${Number(c.MaDM)}">${esc(c.TenDM)}</option>`).join('');
    }

    renderMenu();
  } catch (err) {
    toast(err.message, true);
  }
}

export function renderMenu() {
  const dm = $('#f-dm')?.value || '';
  const q = ($('#f-mon')?.value || '').toLowerCase().trim();
  const rows = STATE.ALLMON.filter((m) => (!dm || String(m.MaDM) === String(dm)) && m.TenMon.toLowerCase().includes(q));

  const countLabel = $('#menu-count-badge');
  if (countLabel) countLabel.textContent = `${rows.length} món`;

  const container = $('#menu-table');
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = `<tr><td colspan="6" class="empty-state"><p class="empty-state-desc">Không tìm thấy món ăn nào phù hợp</p></td></tr>`;
    return;
  }

  container.innerHTML = `
    <thead>
      <tr>
        <th>Món ăn</th>
        <th>Danh mục</th>
        <th class="num">Đơn giá niêm yết</th>
        <th>Đơn vị tính</th>
        <th>Trạng thái</th>
        <th style="width:80px"></th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (m) => `
        <tr>
          <td>
            <div style="font-weight:600;color:var(--green-950)">${esc(m.TenMon)}</div>
            ${m.MoTa ? `<div style="font-size:12px;color:var(--text-muted)">${esc(m.MoTa)}</div>` : ''}
          </td>
          <td><span class="tag grey">${esc(m.TenDM)}</span></td>
          <td class="num tabular"><b style="color:var(--gold-700)">${fmt(m.DonGia)}</b></td>
          <td>${esc(m.DonViTinh || 'Phần')}</td>
          <td>
            ${m.ConKinhDoanh ? '<span class="tag ok">Đang bán</span>' : '<span class="tag grey">Ngừng bán</span>'}
          </td>
          <td>
            <button class="btn sm ghost" data-action="open-mon-form" data-ma-mon="${Number(m.MaMon)}" title="Sửa món">
              ${ICONS.edit} Sửa
            </button>
          </td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  `;

  if (window.anime) {
    window.anime({
      targets: '#menu-table tbody tr',
      translateY: [12, 0],
      opacity: [0, 1],
      duration: 300,
      delay: window.anime.stagger(15),
      easing: 'easeOutQuint',
    });
  }
}

export function openMonForm(id = 0) {
  const numericId = Number(id) || 0;
  const m = numericId
    ? STATE.ALLMON.find((x) => x.MaMon === numericId) || { ConKinhDoanh: 1, DonViTinh: 'Phần', MaDM: STATE.DM[0]?.MaDM }
    : { ConKinhDoanh: 1, DonViTinh: 'Phần', MaDM: STATE.DM[0]?.MaDM };

  openModal(`
    <div class="modal-header">
      <h2>${numericId ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}</h2>
      <button class="close-btn" data-action="close-modal">${ICONS.close}</button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>Tên món ăn <span style="color:var(--status-bad)">*</span></label>
        <input id="mf-ten" class="input-box" value="${esc(m.TenMon || '')}" placeholder="Ví dụ: Lẩu cá lăng măng chua">
      </div>

      <div class="grid g2">
        <div class="field">
          <label>Danh mục</label>
          <select id="mf-dm" class="input-box">
            ${STATE.DM.map((c) => `<option value="${Number(c.MaDM)}" ${c.MaDM === m.MaDM ? 'selected' : ''}>${esc(c.TenDM)}</option>`).join(
              ''
            )}
          </select>
        </div>
        <div class="field">
          <label>Đơn giá niêm yết (VNĐ) <span style="color:var(--status-bad)">*</span></label>
          <input id="mf-gia" type="number" min="1000" step="1000" class="input-box" value="${m.DonGia ? Number(m.DonGia) : ''}" placeholder="150000">
        </div>
      </div>

      <div class="grid g2">
        <div class="field">
          <label>Đơn vị tính</label>
          <input id="mf-dvt" class="input-box" value="${esc(m.DonViTinh || 'Phần')}" placeholder="Phần, Đĩa, Nồi...">
        </div>
        <div class="field">
          <label>Trạng thái kinh doanh</label>
          <select id="mf-ckd" class="input-box">
            <option value="1" ${m.ConKinhDoanh ? 'selected' : ''}>Đang phục vụ (Bật)</option>
            <option value="0" ${!m.ConKinhDoanh ? 'selected' : ''}>Tạm ngừng bán (Ẩn)</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label>Mô tả chi tiết</label>
        <textarea id="mf-mota" class="input-box" rows="2" placeholder="Ghi chú hương vị, thành phần...">${esc(m.MoTa || '')}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn ghost" data-action="close-modal">Hủy</button>
      <button class="btn primary" data-action="luu-mon" data-ma-mon="${numericId}">
        ${ICONS.check} Lưu thông tin
      </button>
    </div>
  `);
}

export async function luuMon(id) {
  const tenMon = $('#mf-ten')?.value.trim();
  const donGia = Number($('#mf-gia')?.value);
  if (!tenMon) return toast('Vui lòng nhập tên món ăn', true);
  if (!donGia || donGia <= 0) return toast('Vui lòng nhập đơn giá hợp lệ', true);

  const body = {
    tenMon,
    maDM: Number($('#mf-dm')?.value),
    donGia,
    donViTinh: $('#mf-dvt')?.value.trim(),
    moTa: $('#mf-mota')?.value.trim(),
    conKinhDoanh: $('#mf-ckd')?.value === '1',
  };

  try {
    const numericId = Number(id) || 0;
    if (numericId) {
      await api('/monan/' + numericId, { method: 'PUT', body });
    } else {
      await api('/monan', { method: 'POST', body });
    }
    closeModal();
    toast('Đã lưu món ăn thành công');
    await loadMenu();
  } catch (err) {
    toast(err.message, true);
  }
}
