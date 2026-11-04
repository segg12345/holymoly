/* ============================================================
   NHÀ HÀNG SEN VÀNG — MODULE: DASHBOARD
   ============================================================ */
import { $, esc, fmt, num, dt, tag, api, toast, ICONS, VN_TZ, toVNDateKey, parseDateSafe } from './core.js';
import { animateHeaderLotus, animateNumberCounter } from './effects.js';

export async function loadDashboard() {
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('vi-VN', {
    timeZone: VN_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const subDate = $('#dash-date-text');
  if (subDate) subDate.textContent = dateFormatted;

  try {
    const data = await api('/dashboard');
    const k = data.kpi;

    $('#kpi-cards-grid').innerHTML = `
      <div class="kpi-card c-gold">
        <div class="kpi-top">
          <span class="kpi-label">Doanh thu hôm nay</span>
          <div class="kpi-icon-box gold">${ICONS.dollar}</div>
        </div>
        <div class="kpi-value tabular" id="kpi-rev-val">${fmt(k.DoanhThuHomNay)}</div>
        <div class="kpi-subtext">
          <span class="tag ok" style="padding:2px 7px;font-size:11px">${num(k.HoaDonHomNay)} hóa đơn</span>
          <span>đã hoàn tất</span>
        </div>
      </div>

      <div class="kpi-card c-green">
        <div class="kpi-top">
          <span class="kpi-label">Bàn đang phục vụ</span>
          <div class="kpi-icon-box green">${ICONS.table}</div>
        </div>
        <div class="kpi-value">${num(k.BanDangPhucVu)} <span style="font-size:18px;color:var(--text-muted);font-weight:500">/ ${num(k.TongBan)}</span></div>
        <div class="kpi-subtext">
          <span>Hiệu suất sử dụng: <b>${Math.round((Number(k.BanDangPhucVu) / (Number(k.TongBan) || 1)) * 100)}%</b></span>
        </div>
      </div>

      <div class="kpi-card c-blue">
        <div class="kpi-top">
          <span class="kpi-label">Lịch đặt bàn hôm nay</span>
          <div class="kpi-icon-box blue">${ICONS.calendar}</div>
        </div>
        <div class="kpi-value">${num(k.DatBanHomNay)}</div>
        <div class="kpi-subtext">
          <span>Lượt khách đặt trước</span>
        </div>
      </div>

      <div class="kpi-card c-red">
        <div class="kpi-top">
          <span class="kpi-label">Nguyên liệu cần nhập</span>
          <div class="kpi-icon-box red">${ICONS.alert}</div>
        </div>
        <div class="kpi-value" style="color: ${k.NguyenLieuSapHet > 0 ? 'var(--status-bad)' : 'var(--green-950)'}">
          ${num(k.NguyenLieuSapHet)}
        </div>
        <div class="kpi-subtext">
          <span>${k.NguyenLieuSapHet > 0 ? 'Cần lên đơn nhập kho ngay' : 'Kho vật tư ổn định'}</span>
        </div>
      </div>
    `;

    const revEl = $('#kpi-rev-val');
    if (revEl) animateNumberCounter(revEl, Number(k.DoanhThuHomNay), true);

    const topBadge = $('#top-live-stats');
    if (topBadge) {
      topBadge.innerHTML = `<span class="status-dot-pulse"></span> <b>${num(k.BanDangPhucVu)}</b> bàn có khách · <b>${fmt(k.DoanhThuHomNay)}</b>`;
    }

    renderRevenueChart(data.doanhThu14Ngay);
    renderTopDishes(data.monBanChay);
    renderDashReservations(data.datBanSapToi);
    renderDashInventory(data.nguyenLieuSapHet);
    animateHeaderLotus();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderRevenueChart(daysData) {
  const chartEl = $('#chart-bars');
  if (!daysData || !daysData.length) {
    chartEl.innerHTML = `<div class="empty-state"><p class="empty-state-desc">Chưa có dữ liệu doanh thu</p></div>`;
    return;
  }

  const maxVal = Math.max(...daysData.map((x) => Number(x.DoanhThu)), 1000000);
  const todayStr = toVNDateKey(new Date());

  chartEl.innerHTML = daysData
    .map((item, idx) => {
      const val = Number(item.DoanhThu);
      const heightPercent = Math.max(4, Math.round((val / maxVal) * 100));
      const itemDate = parseDateSafe(item.Ngay) || new Date(item.Ngay);
      const itemKey = toVNDateKey(itemDate);
      const isToday = itemKey === todayStr;
      const parts = itemKey.split('-');
      const dayLabel = parts.length === 3 ? `${Number(parts[2])}/${Number(parts[1])}` : '';

      return `
        <div class="chart-col ${isToday ? 'is-today' : ''}">
          <div class="chart-tooltip">${fmt(val)}<br><small style="color:#d1fae5">${num(item.SoHoaDon)} hóa đơn</small></div>
          <div class="chart-bar-fill" id="cbar-${idx}" style="height:${heightPercent}%"></div>
          <span class="chart-col-date">${esc(dayLabel)}</span>
        </div>
      `;
    })
    .join('');

  if (window.anime) {
    window.anime({
      targets: '.chart-bar-fill',
      scaleY: [0, 1],
      opacity: [0, 1],
      duration: 800,
      delay: window.anime.stagger(30),
      easing: 'easeOutElastic(1, 0.65)',
    });
  }
}

function renderTopDishes(items) {
  const container = $('#dash-top-mon');
  if (!items || !items.length) {
    container.innerHTML = `<tr><td colspan="4" class="empty-state"><p class="empty-state-desc">Chưa có món bán chạy trong 30 ngày</p></td></tr>`;
    return;
  }

  container.innerHTML = `
    <thead>
      <tr>
        <th style="width:44px">#</th>
        <th>Món ăn</th>
        <th class="num">Đã bán</th>
        <th class="num">Doanh thu</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map((m, idx) => {
          const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other';
          return `
            <tr>
              <td><span class="rank-badge ${rankClass}">${idx + 1}</span></td>
              <td>
                <div style="font-weight:600;color:var(--green-950)">${esc(m.TenMon)}</div>
                <div style="font-size:11.5px;color:var(--text-muted)">${esc(m.TenDM)}</div>
              </td>
              <td class="num"><b style="color:var(--green-700)">${num(m.TongSoLuong)}</b></td>
              <td class="num tabular">${fmt(m.DoanhThu)}</td>
            </tr>
          `;
        })
        .join('')}
    </tbody>
  `;
}

function renderDashReservations(items) {
  const container = $('#dash-datban-table');
  if (!items || !items.length) {
    container.innerHTML = `<tr><td colspan="5" class="empty-state"><p class="empty-state-desc">Không có lượt đặt bàn nào sắp tới</p></td></tr>`;
    return;
  }

  container.innerHTML = `
    <thead>
      <tr>
        <th>Thời gian</th>
        <th>Khách hàng</th>
        <th>Bàn</th>
        <th class="num">Số khách</th>
        <th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (x) => `
          <tr>
            <td>
              <div style="font-weight:600;color:var(--green-950)">${dt(x.ThoiGianDat)}</div>
            </td>
            <td>
              <div style="font-weight:600">${esc(x.TenKhach)}</div>
              <div style="font-size:12px;color:var(--text-muted)">${esc(x.SoDienThoai)}</div>
            </td>
            <td><span class="tag grey">${esc(x.TenBan)} (${esc(x.KhuVuc)})</span></td>
            <td class="num"><b>${num(x.SoNguoi)}</b></td>
            <td>${tag(x.TrangThai)}</td>
          </tr>
        `
        )
        .join('')}
    </tbody>
  `;
}

function renderDashInventory(items) {
  const container = $('#dash-kho-table');
  if (!items || !items.length) {
    container.innerHTML = `<tr><td colspan="4" class="empty-state"><p class="empty-state-desc">Kho an toàn, không có nguyên liệu dưới mức tối thiểu</p></td></tr>`;
    return;
  }

  container.innerHTML = `
    <thead>
      <tr>
        <th>Nguyên liệu</th>
        <th class="num">Tồn hiện tại</th>
        <th class="num">Mức tối thiểu</th>
        <th class="num">Cần nhập</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (x) => `
          <tr>
            <td>
              <div style="font-weight:600;color:var(--status-bad)">${esc(x.TenNL)}</div>
            </td>
            <td class="num"><b style="color:var(--status-bad)">${num(x.SoLuongTon)} ${esc(x.DonViTinh)}</b></td>
            <td class="num">${num(x.MucToiThieu)}</td>
            <td class="num"><b style="color:var(--gold-700)">+ ${num(x.SoLuongCanNhap)}</b></td>
          </tr>
        `
        )
        .join('')}
    </tbody>
  `;
}
