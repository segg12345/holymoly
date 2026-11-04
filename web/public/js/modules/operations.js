/* ============================================================
   NHÀ HÀNG SEN VÀNG — MODULE: ĐẶT BÀN, HÓA ĐƠN, KHÁCH HÀNG, KHO, BÁO CÁO
   ============================================================ */
import {
  $,
  esc,
  fmt,
  num,
  dt,
  d,
  tag,
  tagTT,
  api,
  toast,
  ICONS,
  STATE,
  openModal,
  closeModal,
  getVNNowDateTimeLocal,
  VN_TZ,
} from './core.js';
import { animateNumberCounter } from './effects.js';
import { loadBan } from './pos.js';

/* ================= 5. ĐẶT BÀN ================= */
export async function loadDatBan() {
  try {
    const list = await api('/datban');
    const container = $('#datban-table');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `<tr><td colspan="7" class="empty-state"><p class="empty-state-desc">Chưa có lịch đặt bàn nào</p></td></tr>`;
      return;
    }

    container.innerHTML = `
      <thead>
        <tr>
          <th>Thời gian đón khách</th>
          <th>Khách hàng</th>
          <th>Bàn chỉ định</th>
          <th class="num">Số người</th>
          <th>Ghi chú</th>
          <th>Trạng thái</th>
          <th style="width:140px">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        ${list
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
            <td>
              <span class="tag grey">${esc(x.TenBan)} (${esc(x.KhuVuc)} · ${Number(x.SoCho)} chỗ)</span>
            </td>
            <td class="num"><b style="color:var(--green-700)">${Number(x.SoNguoi)}</b></td>
            <td><span style="font-size:12.5px;color:var(--text-secondary)">${esc(x.GhiChu || '—')}</span></td>
            <td>${tag(x.TrangThai)}</td>
            <td>
              <div style="display:flex;gap:4px">
                ${
                  x.TrangThai === 'Chờ xác nhận'
                    ? `
                  <button class="btn sm primary" data-action="cap-nhat-db" data-ma-dat-ban="${Number(
                    x.MaDatBan
                  )}" data-trang-thai="Đã xác nhận" title="Xác nhận lịch đặt">
                    Xác nhận
                  </button>
                `
                    : ''
                }
                ${
                  ['Chờ xác nhận', 'Đã xác nhận'].includes(x.TrangThai)
                    ? `
                  <button class="btn sm danger" data-action="cap-nhat-db" data-ma-dat-ban="${Number(
                    x.MaDatBan
                  )}" data-trang-thai="Đã hủy" title="Hủy lượt đặt">
                    Hủy
                  </button>
                `
                    : ''
                }
              </div>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    `;

    if (window.anime) {
      window.anime({
        targets: '#datban-table tbody tr',
        translateY: [12, 0],
        opacity: [0, 1],
        duration: 300,
        delay: window.anime.stagger(15),
        easing: 'easeOutQuint',
      });
    }
  } catch (err) {
    toast(err.message, true);
  }
}

export async function capNhatDB(id, tt) {
  try {
    await api(`/datban/${Number(id)}/trangthai`, {
      method: 'PUT',
      body: { trangThai: tt },
    });
    toast('Đã cập nhật trạng thái đặt bàn: ' + tt);
    await loadDatBan();
    if ($('#page-ban')?.classList.contains('active')) {
      await loadBan();
    }
  } catch (err) {
    toast(err.message, true);
  }
}

export async function openDatBanForm() {
  if (!STATE.BAN.length) STATE.BAN = await api('/ban');
  const local = getVNNowDateTimeLocal(3600e3);

  openModal(`
    <div class="modal-header">
      <h2>Đặt bàn mới</h2>
      <button class="close-btn" data-action="close-modal">${ICONS.close}</button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>Khách hàng <span style="color:var(--status-bad)">*</span></label>
        <div class="input-with-icon">
          ${ICONS.search}
          <input id="m-kh" placeholder="Tìm theo tên hoặc SĐT khách hàng..." autocomplete="off">
        </div>
        <div id="m-kh-results" style="margin-top:6px"></div>
        <input type="hidden" id="m-kh-id">
      </div>

      <div class="grid g2">
        <div class="field">
          <label>Thời gian đặt bàn <span style="color:var(--status-bad)">*</span></label>
          <input type="datetime-local" id="db-tg" class="input-box" value="${esc(local)}">
        </div>
        <div class="field">
          <label>Số lượng khách</label>
          <input type="number" id="db-sn" class="input-box" value="4" min="1" max="20">
        </div>
      </div>

      <div class="field">
        <label>Bàn phục vụ <span style="color:var(--status-bad)">*</span></label>
        <select id="db-ban" class="input-box">
          ${STATE.BAN.map(
            (b) => `
            <option value="${Number(b.MaBan)}">${esc(b.TenBan)} — ${esc(b.KhuVuc)} (${Number(b.SoCho)} chỗ) [${esc(
              b.TrangThai
            )}]</option>
          `
          ).join('')}
        </select>
      </div>

      <div class="field">
        <label>Ghi chú đặc biệt</label>
        <input id="db-gc" class="input-box" placeholder="Ví dụ: Sinh nhật, bàn gần cửa sổ, ăn chay...">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn ghost" data-action="close-modal">Đóng</button>
      <button class="btn primary" data-action="submit-datban">
        ${ICONS.calendar} Tạo lịch đặt bàn
      </button>
    </div>
  `);
}

export async function submitDatBan() {
  const maKH = $('#m-kh-id')?.value ? Number($('#m-kh-id').value) : null;
  if (!maKH) return toast('Vui lòng chọn khách hàng đặt bàn', true);

  try {
    await api('/datban', {
      method: 'POST',
      body: {
        maKH,
        maBan: Number($('#db-ban')?.value),
        thoiGianDat: $('#db-tg')?.value,
        soNguoi: Number($('#db-sn')?.value),
        ghiChu: $('#db-gc')?.value.trim(),
      },
    });
    closeModal();
    toast('Đã ghi nhận lịch đặt bàn thành công');
    await loadDatBan();
  } catch (err) {
    toast(err.message, true);
  }
}

/* ================= 6. HÓA ĐƠN ================= */
export function locNam() {
  const y = $('#hd-nam')?.value;
  if (y) {
    $('#hd-tu').value = `${y}-01-01`;
    $('#hd-den').value = `${y}-12-31`;
  } else {
    $('#hd-tu').value = '';
    $('#hd-den').value = '';
  }
  loadHoaDon();
}

export async function loadHoaDon() {
  try {
    const p = new URLSearchParams({
      trangThai: $('#hd-tt')?.value || '',
      tuNgay: $('#hd-tu')?.value || '',
      denNgay: $('#hd-den')?.value || '',
    });
    const list = await api('/hoadon?' + p);
    const container = $('#hoadon-table');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `<tr><td colspan="9" class="empty-state"><p class="empty-state-desc">Không tìm thấy hóa đơn nào trong khoảng thời gian này</p></td></tr>`;
      return;
    }

    container.innerHTML = `
      <thead>
        <tr>
          <th>Mã HĐ</th>
          <th>Thời gian lập</th>
          <th>Bàn</th>
          <th>Khách hàng</th>
          <th>Nhân viên</th>
          <th class="num">Tổng tiền</th>
          <th class="num">Giảm giá</th>
          <th class="num">Thanh toán</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            (h) => `
          <tr class="row-clickable" data-action="open-drawer" data-ma-hd="${Number(h.MaHD)}">
            <td><b>#${Number(h.MaHD)}</b></td>
            <td>${dt(h.ThoiGianLap)}</td>
            <td><span class="tag grey">${esc(h.TenBan)}</span></td>
            <td>${esc(h.TenKhach)}</td>
            <td style="color:var(--text-muted)">${esc(h.NhanVien)}</td>
            <td class="num tabular">${fmt(h.TongTien)}</td>
            <td class="num tabular">${Number(h.GiamGia)}%</td>
            <td class="num tabular"><b style="color:var(--gold-700)">${fmt(h.ThanhToan)}</b></td>
            <td>${tag(h.TrangThai)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    `;

    if (window.anime) {
      window.anime({
        targets: '#hoadon-table tbody tr',
        translateY: [12, 0],
        opacity: [0, 1],
        duration: 300,
        delay: window.anime.stagger(12),
        easing: 'easeOutQuint',
      });
    }
  } catch (err) {
    toast(err.message, true);
  }
}

/* ================= 7. KHÁCH HÀNG (CRM) ================= */
export async function loadKhachHang() {
  try {
    const q = ($('#kh-q')?.value || '').trim();
    const list = await api('/khachhang?q=' + encodeURIComponent(q));
    const container = $('#kh-table');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `<tr><td colspan="8" class="empty-state"><p class="empty-state-desc">Không tìm thấy khách hàng nào</p></td></tr>`;
      return;
    }

    container.innerHTML = `
      <thead>
        <tr>
          <th>Khách hàng</th>
          <th>Liên hệ</th>
          <th class="num">Tuổi</th>
          <th class="num">Số lần đến</th>
          <th class="num">Tổng chi tiêu</th>
          <th class="num">Điểm tích lũy</th>
          <th>Hạng thành viên</th>
          <th>Lần ghé gần nhất</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            (k) => `
          <tr>
            <td>
              <div style="font-weight:600;color:var(--green-950)">${esc(k.HoTen)}</div>
              ${k.GioiTinh ? `<div style="font-size:12px;color:var(--text-muted)">${esc(k.GioiTinh)}</div>` : ''}
            </td>
            <td>
              <div style="font-weight:500">${esc(k.SoDienThoai)}</div>
              ${k.Email ? `<div style="font-size:11.5px;color:var(--text-muted)">${esc(k.Email)}</div>` : ''}
            </td>
            <td class="num">${k.Tuoi !== null && k.Tuoi !== undefined ? Number(k.Tuoi) : '—'}</td>
            <td class="num"><b style="color:var(--green-700)">${num(k.SoLanDung)}</b></td>
            <td class="num tabular"><b style="color:var(--gold-700)">${fmt(k.TongChiTieu)}</b></td>
            <td class="num tabular">${num(k.DiemTichLuy)}</td>
            <td><span class="tag ${tagTT(k.HangThanhVien)}">${esc(k.HangThanhVien)}</span></td>
            <td style="color:var(--text-muted)">${d(k.LanGanNhat)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    `;

    if (window.anime) {
      window.anime({
        targets: '#kh-table tbody tr',
        translateY: [12, 0],
        opacity: [0, 1],
        duration: 300,
        delay: window.anime.stagger(12),
        easing: 'easeOutQuint',
      });
    }
  } catch (err) {
    toast(err.message, true);
  }
}

export function openKhForm() {
  openModal(`
    <div class="modal-header">
      <h2>Thêm khách hàng thành viên</h2>
      <button class="close-btn" data-action="close-modal">${ICONS.close}</button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>Họ và tên <span style="color:var(--status-bad)">*</span></label>
        <input id="kf-ten" class="input-box" placeholder="Ví dụ: Nguyễn Văn An">
      </div>

      <div class="grid g2">
        <div class="field">
          <label>Số điện thoại <span style="color:var(--status-bad)">*</span></label>
          <input id="kf-sdt" class="input-box" placeholder="09xxxxxxxx">
        </div>
        <div class="field">
          <label>Email</label>
          <input id="kf-email" type="email" class="input-box" placeholder="name@example.com">
        </div>
      </div>

      <div class="grid g2">
        <div class="field">
          <label>Giới tính</label>
          <select id="kf-gt" class="input-box">
            <option value="">Chưa xác định</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Khác">Khác</option>
          </select>
        </div>
        <div class="field">
          <label>Ngày sinh</label>
          <input type="date" id="kf-ns" class="input-box">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn ghost" data-action="close-modal">Hủy</button>
      <button class="btn primary" data-action="submit-kh">
        ${ICONS.plus} Lưu hồ sơ khách hàng
      </button>
    </div>
  `);
}

export async function submitKh() {
  const hoTen = $('#kf-ten')?.value.trim();
  const sdt = $('#kf-sdt')?.value.trim();
  if (!hoTen) return toast('Vui lòng nhập họ tên khách hàng', true);
  if (!sdt) return toast('Vui lòng nhập số điện thoại', true);

  try {
    await api('/khachhang', {
      method: 'POST',
      body: {
        hoTen,
        soDienThoai: sdt,
        email: $('#kf-email')?.value.trim(),
        gioiTinh: $('#kf-gt')?.value,
        ngaySinh: $('#kf-ns')?.value,
      },
    });
    closeModal();
    toast('Đã thêm khách hàng thành công');
    await loadKhachHang();
  } catch (err) {
    toast(err.message, true);
  }
}

/* ================= 8. KHO NGUYÊN LIỆU ================= */
export async function loadKho() {
  try {
    const list = await api('/nguyenlieu');
    const container = $('#kho-table');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `<tr><td colspan="5" class="empty-state"><p class="empty-state-desc">Kho nguyên liệu trống</p></td></tr>`;
      return;
    }

    container.innerHTML = `
      <thead>
        <tr>
          <th>Nguyên liệu</th>
          <th class="num">Tồn kho hiện tại</th>
          <th class="num">Định mức tối thiểu</th>
          <th class="num">Giá nhập tham chiếu</th>
          <th style="width:220px">Nhập kho bổ sung</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            (x) => `
          <tr>
            <td>
              <div style="font-weight:600;display:flex;align-items:center;gap:6px">
                ${x.SapHet ? '<span class="tag bad" style="padding:1px 6px;font-size:11px">Sắp hết</span>' : ''}
                <span style="color:var(--green-950)">${esc(x.TenNL)}</span>
              </div>
            </td>
            <td class="num">
              <b style="color:${x.SapHet ? 'var(--status-bad)' : 'var(--green-700)'}">
                ${num(x.SoLuongTon)} ${esc(x.DonViTinh)}
              </b>
            </td>
            <td class="num">${num(x.MucToiThieu)} ${esc(x.DonViTinh)}</td>
            <td class="num tabular">${fmt(x.DonGiaNhap)}</td>
            <td>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="number" id="nk-${Number(x.MaNL)}" placeholder="SL" min="0.1" step="0.5" class="input-box" style="width:84px;padding:5px 8px">
                <button class="btn sm primary" data-action="nhap-kho" data-ma-nl="${Number(x.MaNL)}">
                  ${ICONS.plus} Nhập
                </button>
              </div>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    `;

    if (window.anime) {
      window.anime({
        targets: '#kho-table tbody tr',
        translateY: [12, 0],
        opacity: [0, 1],
        duration: 300,
        delay: window.anime.stagger(10),
        easing: 'easeOutQuint',
      });
    }
  } catch (err) {
    toast(err.message, true);
  }
}

export async function nhapKho(id) {
  const numericId = Number(id);
  const input = $('#nk-' + numericId);
  const sl = input ? input.value : null;
  if (!sl || Number(sl) <= 0) return toast('Vui lòng nhập số lượng hợp lệ', true);

  try {
    await api(`/nguyenlieu/${numericId}/nhap`, {
      method: 'POST',
      body: { soLuong: Number(sl) },
    });
    toast('Đã nhập kho thành công');
    input.value = '';
    await loadKho();
  } catch (err) {
    toast(err.message, true);
  }
}

/* ================= 9. BÁO CÁO THÁNG ================= */
export async function loadBaoCao() {
  try {
    const vnYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ, year: 'numeric' }).format(new Date()));
    const nam = $('#bc-nam')?.value || vnYear;
    const r = await api('/baocao/thang?nam=' + encodeURIComponent(nam));

    $('#bc-kpi-summary').innerHTML = `
      <div class="kpi-card c-gold">
        <div class="kpi-top">
          <span class="kpi-label">Tổng doanh thu năm ${Number(r.nam)}</span>
          <div class="kpi-icon-box gold">${ICONS.dollar}</div>
        </div>
        <div class="kpi-value tabular" id="bc-rev-val">${fmt(r.tongDoanhThu)}</div>
        <div class="kpi-subtext">
          <span>Dữ liệu từ Stored Procedure sp_BaoCaoDoanhThuTheoThang</span>
        </div>
      </div>
    `;

    const revEl = $('#bc-rev-val');
    if (revEl) animateNumberCounter(revEl, Number(r.tongDoanhThu), true);

    const container = $('#bc-table');
    if (!container) return;
    if (!r.thang || !r.thang.length) {
      container.innerHTML = `<tr><td colspan="7" class="empty-state"><p class="empty-state-desc">Không có dữ liệu cho năm ${Number(
        r.nam
      )}</p></td></tr>`;
      return;
    }

    container.innerHTML = `
      <thead>
        <tr>
          <th>Tháng</th>
          <th class="num">Số hóa đơn</th>
          <th class="num">Tổng tiền hàng</th>
          <th class="num">Tiền giảm giá</th>
          <th class="num">Doanh thu thực tế</th>
          <th class="num">TB / Hóa đơn</th>
          <th class="num">Khách thành viên</th>
        </tr>
      </thead>
      <tbody>
        ${r.thang
          .map(
            (t) => `
          <tr>
            <td><b>Tháng ${Number(t.Thang)}</b></td>
            <td class="num">${num(t.SoHoaDon)}</td>
            <td class="num tabular">${fmt(t.TongTienHang)}</td>
            <td class="num tabular" style="color:var(--status-bad)">-${fmt(t.TienGiamGia)}</td>
            <td class="num tabular"><b style="color:var(--gold-700)">${fmt(t.DoanhThu)}</b></td>
            <td class="num tabular">${fmt(t.TrungBinhHoaDon)}</td>
            <td class="num">${num(t.SoKhachThanhVien)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    `;

    if (window.anime) {
      window.anime({
        targets: '#bc-table tbody tr',
        translateY: [12, 0],
        opacity: [0, 1],
        duration: 300,
        delay: window.anime.stagger(15),
        easing: 'easeOutQuint',
      });
    }
  } catch (err) {
    toast(err.message, true);
  }
}
