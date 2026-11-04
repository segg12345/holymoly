/* ============================================================
   NHÀ HÀNG SEN VÀNG — MODULE: POS (FLOOR PLAN, DRAWER, CHECKOUT)
   ============================================================ */
import {
  $,
  $$,
  esc,
  fmt,
  num,
  dt,
  tag,
  tagTT,
  api,
  toast,
  debounce,
  ICONS,
  STATE,
  ensureRefs,
  openModal,
  closeModal,
  closeDrawer,
} from './core.js';

export async function loadBan() {
  try {
    STATE.BAN = await api('/ban');
    await ensureRefs();

    const zones = ['ALL', ...new Set(STATE.BAN.map((b) => b.KhuVuc))];
    const toolbar = $('#zone-filter-bar');

    toolbar.innerHTML = `
      <div class="zone-tabs">
        ${zones
          .map((z) => {
            const count = z === 'ALL' ? STATE.BAN.length : STATE.BAN.filter((b) => b.KhuVuc === z).length;
            const label = z === 'ALL' ? 'Tất cả khu vực' : z;
            return `
              <button class="zone-tab-btn ${STATE.ACTIVE_ZONE === z ? 'active' : ''}" data-action="set-zone" data-zone="${esc(z)}">
                <span>${esc(label)}</span>
                <span class="zone-tab-count">${count}</span>
              </button>
            `;
          })
          .join('')}
      </div>

      <div class="floor-legend">
        <div class="legend-item"><span class="legend-dot" style="background:var(--status-ok)"></span> Trống</div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--status-busy)"></span> Đang phục vụ</div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--status-book)"></span> Đã đặt</div>
      </div>
    `;

    renderFloorPlan();
  } catch (err) {
    toast(err.message, true);
  }
}

export function setZone(z) {
  STATE.ACTIVE_ZONE = z;
  $$('.zone-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.zone === z);
  });
  renderFloorPlan();
}

export function renderFloorPlan() {
  const floorEl = $('#floor-container');
  const filteredBan = STATE.ACTIVE_ZONE === 'ALL' ? STATE.BAN : STATE.BAN.filter((b) => b.KhuVuc === STATE.ACTIVE_ZONE);
  const zonesToRender = STATE.ACTIVE_ZONE === 'ALL' ? [...new Set(STATE.BAN.map((b) => b.KhuVuc))] : [STATE.ACTIVE_ZONE];

  floorEl.innerHTML = zonesToRender
    .map((z) => {
      const tablesInZone = filteredBan.filter((b) => b.KhuVuc === z);
      const busyCount = tablesInZone.filter((b) => b.TrangThai === 'Đang phục vụ').length;

      return `
        <div class="zone-section">
          <div class="zone-header">
            <h3>${esc(z)}</h3>
            <span class="occupancy-pill">${busyCount} / ${tablesInZone.length} bàn đang có khách (${Math.round(
        (busyCount / (tablesInZone.length || 1)) * 100
      )}%)</span>
          </div>

          <div class="tables-grid">
            ${tablesInZone
              .map((b) => {
                const isOpen = b.TrangThai === 'Đang phục vụ';
                const isBooked = b.TrangThai === 'Đã đặt';
                const statusClass = tagTT(b.TrangThai);
                const pips = Array.from({ length: Number(b.SoCho) || 0 }, () => '<span class="seat-pip"></span>').join('');

                return `
                  <div class="table-card ${statusClass}" data-action="click-ban" data-ma-ban="${Number(b.MaBan)}">
                    <div class="table-card-top">
                      <div>
                        <div class="table-code">${esc(b.TenBan)}</div>
                        <div class="table-seats-row" title="${Number(b.SoCho)} chỗ ngồi">${pips}</div>
                      </div>
                      ${tag(b.TrangThai)}
                    </div>

                    <div class="table-card-body">
                      ${
                        isOpen
                          ? `
                        <div class="table-time-badge">
                          ${ICONS.clock} ${num(Math.max(0, Number(b.SoPhutDaNgoi) || 0))} phút
                        </div>
                        <div class="table-card-total tabular">${fmt(b.TongTien)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">HĐ #${Number(b.MaHD)} · ${esc(
                              b.TenKhach || 'Khách lẻ'
                            )}</div>
                      `
                          : isBooked
                          ? `
                        <div style="color:var(--status-book);font-weight:600">Có khách đặt hôm nay</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${Number(b.SoCho)} chỗ ngồi</div>
                      `
                          : `
                        <div style="color:var(--status-ok);font-weight:500">Sẵn sàng đón khách</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${Number(b.SoCho)} chỗ ngồi</div>
                      `
                      }
                    </div>

                    <div class="table-card-action">
                      <span>${isOpen ? 'Chi tiết & Thêm món' : 'Mở bàn mới'}</span>
                      <span style="font-size:14px">→</span>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    })
    .join('');

  if (window.anime) {
    window.anime({
      targets: '.table-card',
      translateY: [24, 0],
      opacity: [0, 1],
      duration: 400,
      delay: window.anime.stagger(28),
      easing: 'easeOutQuint',
    });
  }
}

export function clickBan(maBan) {
  const b = STATE.BAN.find((x) => x.MaBan === Number(maBan));
  if (!b) return;
  if (b.MaHD) {
    openDrawer(b.MaHD);
  } else {
    openMoHoaDon(b);
  }
}

export function openMoHoaDon(b) {
  openModal(`
    <div class="modal-header">
      <h2>Mở bàn &amp; Hóa đơn — ${esc(b.TenBan)}</h2>
      <button class="close-btn" data-action="close-modal">${ICONS.close}</button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>Khu vực &amp; Số chỗ ngồi</label>
        <input type="text" disabled value="${esc(b.KhuVuc)} · Bàn ${Number(b.SoCho)} chỗ" style="background:var(--canvas-subtle)">
      </div>

      <div class="field">
        <label>Nhân viên phục vụ <span style="color:var(--status-bad)">*</span></label>
        <select id="m-nv" class="input-box">
          ${STATE.NV.map((n) => `<option value="${Number(n.MaNV)}">${esc(n.HoTen)} (${esc(n.ChucVu)})</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label>Khách hàng thành viên (tùy chọn)</label>
        <div class="input-with-icon">
          ${ICONS.search}
          <input id="m-kh" placeholder="Nhập SĐT hoặc tên để tìm khách..." autocomplete="off">
        </div>
        <div id="m-kh-results" style="margin-top:8px"></div>
        <input type="hidden" id="m-kh-id">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn ghost" data-action="close-modal">Đóng</button>
      <button class="btn primary" data-action="submit-mo-hoadon" data-ma-ban="${Number(b.MaBan)}">
        ${ICONS.plus} Mở hóa đơn ngay
      </button>
    </div>
  `);
}

export const timKhach = debounce(async () => {
  const inputEl = $('#m-kh');
  const resultBox = $('#m-kh-results');
  if (!inputEl || !resultBox) return;
  const q = inputEl.value.trim();
  if (q.length < 2) {
    resultBox.innerHTML = '';
    return;
  }
  try {
    const list = await api('/khachhang?q=' + encodeURIComponent(q));
    STATE.KH_SEARCH_CACHE = list.slice(0, 4);
    if (!STATE.KH_SEARCH_CACHE.length) {
      resultBox.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Không tìm thấy khách hàng nào khớp</div>';
      return;
    }
    resultBox.innerHTML = STATE.KH_SEARCH_CACHE.map(
      (k) => `
      <button class="btn sm" style="margin:4px 4px 0 0" type="button"
        data-action="select-khach" data-ma-kh="${Number(k.MaKH)}">
        <b>${esc(k.HoTen)}</b> · ${esc(k.SoDienThoai)} (${esc(k.HangThanhVien)})
      </button>
    `
    ).join('');
  } catch (err) {
    console.error(err);
  }
});

export function selectKhach(id, hoTen, sdt, hang) {
  const kh = STATE.KH_SEARCH_CACHE.find((x) => x.MaKH === Number(id));
  const resolvedName = kh ? kh.HoTen : hoTen;
  const resolvedSdt = kh ? kh.SoDienThoai : sdt;
  const resolvedHang = kh ? kh.HangThanhVien : hang;

  const inputEl = $('#m-kh');
  const idEl = $('#m-kh-id');
  const resultBox = $('#m-kh-results');
  if (inputEl) inputEl.value = `${resolvedName} (${resolvedSdt}) - ${resolvedHang}`;
  if (idEl) idEl.value = Number(id);
  if (resultBox) resultBox.innerHTML = '';
}

export async function submitMoHoaDon(maBan) {
  try {
    const maNV = Number($('#m-nv')?.value);
    const maKH = $('#m-kh-id')?.value ? Number($('#m-kh-id').value) : null;
    const res = await api('/hoadon', {
      method: 'POST',
      body: { maBan: Number(maBan), maNV, maKH },
    });
    closeModal();
    toast('Đã mở thành công hóa đơn #' + res.maHD);
    await loadBan();
    openDrawer(res.maHD);
  } catch (err) {
    toast(err.message, true);
  }
}

export async function openDrawer(maHD) {
  try {
    await ensureRefs();
    if (!STATE.MENU.length) STATE.MENU = await api('/monan');
    const r = await api('/hoadon/' + Number(maHD));
    STATE.CUR_HD = r;
    const h = r.hoaDon;
    const isOpen = h.TrangThai === 'Đang phục vụ';

    $('#d-title').innerHTML = `<span>${esc(h.TenBan)}</span> <small style="font-size:15px;color:var(--text-muted);font-weight:500">HĐ #${Number(
      h.MaHD
    )}</small>`;
    $('#d-meta').innerHTML = `
      ${tag(h.TrangThai)}
      <span><b>Khách:</b> ${esc(h.TenKhach)}</span>
      <span>· <b>NV:</b> ${esc(h.NhanVien)}</span>
      <span>· ${dt(h.ThoiGianLap)}</span>
    `;

    $('#d-body').innerHTML = `
      ${
        isOpen
          ? `
        <div class="add-dish-panel">
          <div class="add-dish-panel-title">Thêm món vào bàn</div>
          <div class="add-dish-controls">
            <select id="d-mon" class="input-box" style="flex:2">
              ${STATE.DM.map(
                (c) => `
                <optgroup label="${esc(c.TenDM)}">
                  ${STATE.MENU.filter((m) => m.MaDM === c.MaDM)
                    .map(
                      (m) => `
                    <option value="${Number(m.MaMon)}">${esc(m.TenMon)} — ${fmt(m.DonGia)}</option>
                  `
                    )
                    .join('')}
                </optgroup>
              `
              ).join('')}
            </select>
            <input type="number" id="d-sl" value="1" min="1" max="50" class="input-box" style="width:72px" title="Số lượng">
            <button class="btn primary" data-action="them-mon" title="Thêm món">
              ${ICONS.plus} Thêm
            </button>
          </div>
        </div>
      `
          : ''
      }

      <div style="display:flex;align-items:center;justify-content:space-between">
        <h4 style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--green-950)">Chi tiết món đã gọi (${
          r.chiTiet.length
        })</h4>
        <button class="btn ghost sm" data-action="print-receipt">
          ${ICONS.print} In hóa đơn
        </button>
      </div>

      <div class="order-items-ticket" id="order-ticket">
        ${
          r.chiTiet.length
            ? r.chiTiet
                .map(
                  (c) => `
          <div class="ticket-row" id="dish-row-${Number(c.MaMon)}">
            <div class="ticket-item-main">
              <div class="ticket-item-name">${esc(c.TenMon)}</div>
              <div class="ticket-item-sub">${fmt(c.DonGia)} / ${esc(c.DonViTinh || 'Phần')} ${
                    c.GhiChu ? `· <i>${esc(c.GhiChu)}</i>` : ''
                  }</div>
            </div>
            <span class="ticket-qty-pill">x${Number(c.SoLuong)}</span>
            <span class="ticket-item-price tabular">${fmt(c.ThanhTien)}</span>
            ${
              isOpen
                ? `
              <button class="btn ghost sm danger" style="padding:4px" data-action="xoa-mon" data-ma-mon="${Number(
                    c.MaMon
                  )}" title="Xóa món">
                ${ICONS.trash}
              </button>
            `
                : ''
            }
          </div>
        `
                )
                .join('')
            : `
          <div class="empty-state" style="padding:28px 16px">
            <p class="empty-state-desc">Bàn này chưa gọi món ăn nào</p>
          </div>
        `
        }
      </div>

      ${
        r.nhatKy && r.nhatKy.length
          ? `
        <div style="margin-top:14px">
          <h4 style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:8px">Nhật ký xử lý</h4>
          <div style="background:var(--canvas-subtle);border-radius:var(--r-md);padding:10px 14px;display:flex;flex-direction:column;gap:6px">
            ${r.nhatKy
              .map(
                (n) => `
              <div style="font-size:12px;color:var(--text-secondary)">
                <span style="color:var(--text-muted)">${dt(n.ThoiGian)}</span> — 
                <b>${esc(n.HanhDong)}:</b> ${esc(n.NoiDung || '')}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }
    `;

    const tongTien = Number(h.TongTien) || 0;
    const giamGiaPercent = Number(h.GiamGia) || 0;
    const daThanhToan = Number(h.ThanhToan) || 0;
    const phaiTra = isOpen ? Math.max(0, Math.round(tongTien * (1 - giamGiaPercent / 100))) : daThanhToan;

    $('#d-foot').innerHTML = `
      <div class="bill-breakdown">
        <div class="bill-row">
          <span>Tổng tiền hàng</span>
          <span class="tabular">${fmt(tongTien)}</span>
        </div>

        ${
          !isOpen
            ? `
          <div class="bill-row">
            <span>Chiết khấu (${giamGiaPercent}%)</span>
            <span class="tabular" style="color:var(--status-bad)">- ${fmt(Math.max(0, tongTien - daThanhToan))}</span>
          </div>
          <div class="bill-row grand-total">
            <span>Đã thanh toán (${esc(h.PhuongThucTT || 'Tiền mặt')})</span>
            <span class="amount tabular">${fmt(daThanhToan)}</span>
          </div>
        `
            : `
          <div class="bill-row" style="align-items:center">
            <span>Giảm giá (%)</span>
            <div class="discount-chips-row">
              ${[0, 5, 10, 15, 20]
                .map(
                  (p) => `
                <button type="button" class="disc-btn ${giamGiaPercent === p ? 'active' : ''}" data-action="set-discount" data-discount="${p}">
                  ${p}%
                </button>
              `
                )
                .join('')}
              <input type="number" id="d-gg" value="${giamGiaPercent}" min="0" max="100" class="input-box"
                style="width:64px;padding:4px 6px;font-size:12px">
            </div>
          </div>

          <div class="bill-row grand-total">
            <span>Khách phải trả</span>
            <span class="amount tabular" id="d-phai-tra">${fmt(phaiTra)}</span>
          </div>

          <div class="payment-actions-bar" style="margin-top:14px">
            <div style="display:flex;gap:10px;align-items:center">
              <select id="d-pt" class="input-box" style="flex:1">
                <option value="Tiền mặt">💵 Tiền mặt</option>
                <option value="Chuyển khoản">📱 Chuyển khoản (QR / Banking)</option>
                <option value="Thẻ">💳 Quẹt thẻ (POS / Credit)</option>
              </select>
              <button class="btn accent lg shimmer" data-action="thanh-toan" ${r.chiTiet.length ? '' : 'disabled'} style="flex:1">
                Thanh toán ngay
              </button>
            </div>

            <div style="display:flex;justify-content:space-between">
              <button class="btn ghost danger sm" data-action="huy-hoadon">
                ${ICONS.trash} Hủy hóa đơn
              </button>
            </div>
          </div>
        `
        }
      </div>
    `;

    $('#drawer-backdrop').classList.add('show');
    $('#pos-drawer').classList.add('show');

    if (window.anime) {
      window.anime({
        targets: '.ticket-row',
        translateX: [16, 0],
        opacity: [0, 1],
        duration: 300,
        delay: window.anime.stagger(25),
        easing: 'easeOutQuint',
      });
    }
  } catch (err) {
    toast(err.message, true);
  }
}

export function setDiscount(percent) {
  const input = $('#d-gg');
  if (input) {
    input.value = percent;
    $$('.disc-btn').forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.discount) === Number(percent)));
    recalcTotal();
  }
}

export function recalcTotal() {
  if (!STATE.CUR_HD) return;
  const tongTien = Number(STATE.CUR_HD.hoaDon.TongTien) || 0;
  const giam = Math.min(100, Math.max(0, Number($('#d-gg')?.value) || 0));
  const phaiTra = Math.max(0, Math.round(tongTien * (1 - giam / 100)));
  const label = $('#d-phai-tra');
  if (label) {
    label.textContent = fmt(phaiTra);
    if (window.anime) {
      window.anime({
        targets: label,
        scale: [1.12, 1],
        duration: 250,
        easing: 'easeOutElastic(1, 0.7)',
      });
    }
  }
}

export async function themMon() {
  if (!STATE.CUR_HD) return;
  try {
    const maMon = Number($('#d-mon')?.value);
    const soLuong = Number($('#d-sl')?.value);
    await api(`/hoadon/${STATE.CUR_HD.hoaDon.MaHD}/mon`, {
      method: 'POST',
      body: { maMon, soLuong },
    });
    toast('Đã gọi thêm món thành công');
    await openDrawer(STATE.CUR_HD.hoaDon.MaHD);
    await loadBan();
  } catch (err) {
    toast(err.message, true);
  }
}

export async function xoaMon(maMon) {
  if (!STATE.CUR_HD) return;
  if (!confirm('Bạn có chắc muốn xóa món này khỏi hóa đơn? Số lượng nguyên liệu tương ứng sẽ được hoàn lại vào kho.')) return;
  try {
    await api(`/hoadon/${STATE.CUR_HD.hoaDon.MaHD}/mon/${Number(maMon)}`, {
      method: 'DELETE',
    });
    toast('Đã xóa món khỏi hóa đơn');
    await openDrawer(STATE.CUR_HD.hoaDon.MaHD);
    await loadBan();
  } catch (err) {
    toast(err.message, true);
  }
}

export async function thanhToan() {
  if (!STATE.CUR_HD) return;
  try {
    const phuongThuc = $('#d-pt')?.value;
    const giamGia = $('#d-gg')?.value;
    const res = await api(`/hoadon/${STATE.CUR_HD.hoaDon.MaHD}/thanhtoan`, {
      method: 'POST',
      body: { phuongThuc, giamGia },
    });
    toast('Đã thanh toán thành công ' + fmt(res.soTienPhaiTra));
    closeDrawer();
    await loadBan();
  } catch (err) {
    toast(err.message, true);
  }
}

export async function huyHoaDon() {
  if (!STATE.CUR_HD) return;
  const lyDo = prompt('Nhập lý do hủy hóa đơn này:');
  if (lyDo === null) return;
  try {
    await api(`/hoadon/${STATE.CUR_HD.hoaDon.MaHD}/huy`, {
      method: 'POST',
      body: { lyDo: lyDo.trim() || 'Hủy theo yêu cầu' },
    });
    toast('Đã hủy hóa đơn');
    closeDrawer();
    await loadBan();
  } catch (err) {
    toast(err.message, true);
  }
}

export function printReceiptModal() {
  if (!STATE.CUR_HD) return;
  const h = STATE.CUR_HD.hoaDon;
  const items = STATE.CUR_HD.chiTiet;
  const tongTien = Number(h.TongTien) || 0;
  const giamGia = Number(h.GiamGia) || 0;
  const thanhToanVal = h.TrangThai === 'Đã thanh toán' ? Number(h.ThanhToan) : Math.round(tongTien * (1 - giamGia / 100));

  openModal(`
    <div class="modal-header">
      <h2>Xem trước hóa đơn in</h2>
      <button class="close-btn" data-action="close-modal">${ICONS.close}</button>
    </div>
    <div class="modal-body">
      <div style="background:#fff;border:1px dashed #999;padding:24px;border-radius:var(--r-sm);font-family:monospace;color:#111;max-width:380px;margin:0 auto">
        <div style="text-align:center;margin-bottom:12px">
          <h3 style="margin:0;font-size:18px">NHÀ HÀNG SEN VÀNG</h3>
          <p style="margin:2px 0;font-size:12px">Hệ thống ẩm thực truyền thống</p>
          <p style="margin:0;font-size:11px">Hotline: 1900 8888 · ĐT: 024.3888.9999</p>
        </div>
        <div style="border-top:1px dashed #999;border-bottom:1px dashed #999;padding:8px 0;margin:10px 0;font-size:12px">
          <div>Số HĐ: <b>#${Number(h.MaHD)}</b> | Bàn: <b>${esc(h.TenBan)}</b></div>
          <div>Thu ngân/NV: ${esc(h.NhanVien)}</div>
          <div>Khách hàng: ${esc(h.TenKhach)}</div>
          <div>Giờ vào: ${dt(h.ThoiGianLap)}</div>
        </div>
        <table style="width:100%;font-size:12px;margin-bottom:10px">
          <thead>
            <tr style="border-bottom:1px solid #ddd">
              <th style="text-align:left;padding:4px 0">Món</th>
              <th style="text-align:center;padding:4px 0">SL</th>
              <th style="text-align:right;padding:4px 0">Tiền</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (it) => `
              <tr>
                <td style="padding:4px 0">${esc(it.TenMon)}</td>
                <td style="text-align:center;padding:4px 0">${Number(it.SoLuong)}</td>
                <td style="text-align:right;padding:4px 0">${fmt(it.ThanhTien)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <div style="border-top:1px dashed #999;padding-top:8px;font-size:13px">
          <div style="display:flex;justify-content:space-between"><span>Tổng tiền hàng:</span><span>${fmt(tongTien)}</span></div>
          <div style="display:flex;justify-content:space-between"><span>Chiết khấu (${giamGia}%):</span><span>-${fmt(
    Math.max(0, tongTien - thanhToanVal)
  )}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:15px;margin-top:6px">
            <span>THANH TOÁN:</span><span>${fmt(thanhToanVal)}</span>
          </div>
          <div style="font-size:11px;margin-top:4px;color:#555">Phương thức: ${esc(h.PhuongThucTT || 'Tiền mặt')}</div>
        </div>
        <div style="text-align:center;margin-top:18px;font-size:11px;color:#555">
          Cảm ơn Quý khách &amp; Hẹn gặp lại!<br>
          Powered by Sen Vàng POS
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn ghost" data-action="close-modal">Đóng</button>
      <button class="btn primary" data-action="window-print">
        ${ICONS.print} In máy in nhiệt (80mm)
      </button>
    </div>
  `);
}
