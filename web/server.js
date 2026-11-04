/* ============================================================
   Nhà hàng Sen Vàng — Backend API (Node.js + Express + mssql)
   Kết nối tới database QuanLyNhaHang trên SQL Server
   ============================================================ */
require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'QuanLyNhaHang',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    instanceName: process.env.DB_INSTANCE || undefined,
    useUTC: false,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};
// Khi dùng named instance (SQLEXPRESS) thì không cố định port
if (dbConfig.options.instanceName) delete dbConfig.port;

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('✔ Đã kết nối SQL Server:', dbConfig.server, '/', dbConfig.database);
    }
    return pool;
  })
  .catch((err) => {
    console.error('✖ Lỗi kết nối SQL Server:', err.message);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    throw err;
  });

// Helper: Chuẩn hóa lỗi API & ẩn lỗi SQL nội bộ khỏi client
class ApiError extends Error {
  constructor(status, message, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function mapDatabaseError(err) {
  if (err instanceof ApiError) {
    return { status: err.status, message: err.message, code: err.code };
  }

  const sqlInfo = err.originalError?.info || err;
  const errNum = Number(sqlInfo.number || err.number || 0);
  const rawMsg = String(sqlInfo.message || err.message || '');

  // Lỗi nghiệp vụ chủ động từ Stored Procedure (THROW 50001..50099)
  if (errNum >= 50000 && errNum < 50100) {
    return { status: 400, message: rawMsg, code: `BIZ_${errNum}` };
  }

  // Trigger RAISERROR (50000) với thông báo nghiệp vụ tiếng Việt rõ ràng
  if (errNum === 50000 && rawMsg.includes('Không thể thay đổi chi tiết của hóa đơn')) {
    return { status: 400, message: 'Không thể thay đổi chi tiết của hóa đơn đã thanh toán hoặc đã hủy.', code: 'INVOICE_LOCKED' };
  }

  // Vi phạm UNIQUE / Filtered Unique Index (2601, 2627)
  if (errNum === 2601 || errNum === 2627) {
    if (rawMsg.includes('UQ_KhachHang_SoDienThoai')) {
      return { status: 409, message: 'Số điện thoại khách hàng đã tồn tại trong hệ thống.', code: 'DUPLICATE_PHONE' };
    }
    if (rawMsg.includes('UQ_MonAn_TenMon')) {
      return { status: 409, message: 'Tên món ăn đã tồn tại trong thực đơn.', code: 'DUPLICATE_DISH' };
    }
    if (rawMsg.includes('UQ_BanAn_TenBan')) {
      return { status: 409, message: 'Tên bàn ăn đã tồn tại.', code: 'DUPLICATE_TABLE' };
    }
    if (rawMsg.includes('UQ_NhanVien_SoDienThoai') || rawMsg.includes('UQ_NhanVien_Email')) {
      return { status: 409, message: 'Số điện thoại hoặc Email nhân viên đã tồn tại.', code: 'DUPLICATE_EMPLOYEE' };
    }
    if (rawMsg.includes('UQ_HoaDon_BanDangPhucVu')) {
      return { status: 409, message: 'Bàn đang có khách phục vụ, không thể mở thêm hóa đơn.', code: 'TABLE_BUSY' };
    }
    return { status: 409, message: 'Dữ liệu bị trùng lặp với bản ghi đã có trong hệ thống.', code: 'DUPLICATE_ENTRY' };
  }

  // Vi phạm CHECK / FOREIGN KEY (547)
  if (errNum === 547) {
    if (rawMsg.includes('CK_KhachHang_SDT')) {
      return { status: 400, message: 'Số điện thoại không hợp lệ (chỉ gồm 9–11 chữ số).', code: 'INVALID_PHONE' };
    }
    if (rawMsg.includes('CK_KhachHang_Email') || rawMsg.includes('CK_NhanVien_Email')) {
      return { status: 400, message: 'Địa chỉ Email không đúng định dạng.', code: 'INVALID_EMAIL' };
    }
    if (rawMsg.includes('CK_KhachHang_GioiTinh') || rawMsg.includes('CK_NhanVien_GioiTinh')) {
      return { status: 400, message: 'Giới tính không hợp lệ (Nam, Nữ, Khác).', code: 'INVALID_GENDER' };
    }
    if (rawMsg.includes('CK_DatBan_TrangThai')) {
      return { status: 400, message: 'Trạng thái đặt bàn không hợp lệ.', code: 'INVALID_BOOKING_STATUS' };
    }
    if (rawMsg.includes('CK_NguyenLieu_SoLuongTon')) {
      return { status: 400, message: 'Số lượng tồn kho không đủ để thực hiện giao dịch.', code: 'INSUFFICIENT_STOCK' };
    }
    if (rawMsg.includes('FOREIGN KEY')) {
      return { status: 400, message: 'Dữ liệu tham chiếu không tồn tại hoặc đang được sử dụng.', code: 'REFERENCE_ERROR' };
    }
    return { status: 400, message: 'Dữ liệu không thỏa mãn quy tắc kiểm tra của hệ thống.', code: 'CONSTRAINT_VIOLATION' };
  }

  // Deadlock (1205)
  if (errNum === 1205) {
    return { status: 409, message: 'Giao dịch đang xung đột đồng thời, vui lòng thử lại.', code: 'CONCURRENCY_CONFLICT' };
  }

  // Các lỗi hệ thống/SQL nội bộ khác: ẩn chi tiết kỹ thuật khỏi client
  return {
    status: 500,
    message: 'Lỗi xử lý hệ thống nội bộ. Vui lòng thử lại sau.',
    code: 'INTERNAL_SERVER_ERROR',
  };
}

// Helper: Parse chuỗi thời gian theo múi giờ Việt Nam (UTC+7)
function parseVietnamDateTime(input) {
  if (!input) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const str = String(input).trim();
  if (!str) return null;

  // Nếu chuỗi datetime-local dạng YYYY-MM-DDTHH:mm hoặc YYYY-MM-DD HH:mm(:ss) chưa có timezone
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    const normalized = str.replace(' ', 'T') + (str.length === 16 ? ':00' : '') + '+07:00';
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Nếu chuỗi chỉ có ngày YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00+07:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getVietnamCurrentYear() {
  const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
  return vnNow.getUTCFullYear();
}

function validatePositiveInt(val, fieldName) {
  const n = Number(val);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ApiError(400, `${fieldName} không hợp lệ (phải là số nguyên dương).`, 'VALIDATION_ERROR');
  }
  return n;
}

// Helper: chạy query / proc với tham số, trả về recordset(s)
async function query(text, params = {}) {
  const pool = await poolPromise;
  const req = pool.request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  return req.query(text);
}

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  const mapped = mapDatabaseError(e);
  if (mapped.status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[Internal Error]:', e);
  }
  res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
});

/* ------------------------- TỔNG QUAN ------------------------- */
app.get('/api/dashboard', wrap(async (req, res) => {
  const r = await query(`
    DECLARE @TodayStart DATETIME = CAST(GETDATE() AS DATE);
    DECLARE @TomorrowStart DATETIME = DATEADD(DAY, 1, @TodayStart);
    DECLARE @ThirtyDaysAgo DATE = DATEADD(DAY, -30, @TodayStart);

    SELECT
      (SELECT ISNULL(SUM(ThanhToan),0) FROM dbo.HoaDon WHERE TrangThai=N'Đã thanh toán' AND ThoiGianThanhToan >= @TodayStart AND ThoiGianThanhToan < @TomorrowStart) AS DoanhThuHomNay,
      (SELECT COUNT(*) FROM dbo.HoaDon WHERE TrangThai=N'Đã thanh toán' AND ThoiGianThanhToan >= @TodayStart AND ThoiGianThanhToan < @TomorrowStart) AS HoaDonHomNay,
      (SELECT COUNT(*) FROM dbo.BanAn WHERE TrangThai=N'Đang phục vụ') AS BanDangPhucVu,
      (SELECT COUNT(*) FROM dbo.BanAn) AS TongBan,
      (SELECT COUNT(*) FROM dbo.DatBan WHERE ThoiGianDat >= @TodayStart AND ThoiGianDat < @TomorrowStart AND TrangThai IN (N'Chờ xác nhận',N'Đã xác nhận')) AS DatBanHomNay,
      (SELECT COUNT(*) FROM dbo.vw_NguyenLieuSapHet) AS NguyenLieuSapHet;
    SELECT TOP 14 Ngay, SoHoaDon, DoanhThu FROM dbo.vw_DoanhThuTheoNgay ORDER BY Ngay DESC;
    SELECT TOP 6 TenMon, TenDM, TongSoLuong, DoanhThu
      FROM dbo.fn_MonBanChay(@ThirtyDaysAgo, CAST(@TodayStart AS DATE)) ORDER BY TongSoLuong DESC;
    SELECT * FROM dbo.vw_NguyenLieuSapHet ORDER BY SoLuongCanNhap DESC;
    SELECT TOP 8 * FROM dbo.vw_DatBanSapToi ORDER BY ThoiGianDat;
  `);
  res.json({
    kpi: r.recordsets[0][0],
    doanhThu14Ngay: r.recordsets[1].reverse(),
    monBanChay: r.recordsets[2],
    nguyenLieuSapHet: r.recordsets[3],
    datBanSapToi: r.recordsets[4],
  });
}));

app.get('/api/baocao/thang', wrap(async (req, res) => {
  const nam = req.query.nam !== undefined && req.query.nam !== ''
    ? Number(req.query.nam)
    : getVietnamCurrentYear();
  if (!Number.isInteger(nam) || nam < 2000 || nam > 2100) {
    throw new ApiError(400, 'Năm báo cáo không hợp lệ (2000–2100).', 'VALIDATION_ERROR');
  }
  const pool = await poolPromise;
  const r = await pool.request().input('Nam', sql.Int, nam)
    .output('TongDoanhThu', sql.Decimal(16, 0)).execute('sp_BaoCaoDoanhThuTheoThang');
  res.json({ nam, thang: r.recordset, tongDoanhThu: r.output.TongDoanhThu });
}));

/* ------------------------- BÀN & HÓA ĐƠN ------------------------- */
app.get('/api/ban', wrap(async (req, res) => {
  const r = await query('SELECT * FROM dbo.vw_TinhTrangBan ORDER BY KhuVuc, TenBan');
  res.json(r.recordset);
}));

app.get('/api/nhanvien', wrap(async (req, res) => {
  const r = await query(`SELECT MaNV, HoTen, ChucVu FROM dbo.NhanVien WHERE DangLamViec=1 AND ChucVu IN (N'Thu ngân',N'Phục vụ',N'Quản lý') ORDER BY HoTen`);
  res.json(r.recordset);
}));

app.post('/api/hoadon', wrap(async (req, res) => {
  const maBan = validatePositiveInt(req.body?.maBan, 'Mã bàn');
  const maNV = validatePositiveInt(req.body?.maNV, 'Mã nhân viên');
  let maKH = null;
  if (req.body?.maKH !== undefined && req.body?.maKH !== null && req.body?.maKH !== '') {
    maKH = validatePositiveInt(req.body.maKH, 'Mã khách hàng');
  }
  const pool = await poolPromise;
  const r = await pool.request()
    .input('MaBan', sql.Int, maBan).input('MaNV', sql.Int, maNV).input('MaKH', sql.Int, maKH)
    .output('MaHD', sql.Int).execute('sp_MoHoaDon');
  res.json({ maHD: r.output.MaHD });
}));

app.get('/api/hoadon', wrap(async (req, res) => {
  const trangThai = (req.query.trangThai || '').trim() || null;
  const tuNgayStr = (req.query.tuNgay || '').trim() || null;
  const denNgayStr = (req.query.denNgay || '').trim() || null;

  if (trangThai && !['Đang phục vụ', 'Đã thanh toán', 'Đã hủy'].includes(trangThai)) {
    throw new ApiError(400, 'Trạng thái hóa đơn lọc không hợp lệ.', 'VALIDATION_ERROR');
  }
  if (tuNgayStr && !/^\d{4}-\d{2}-\d{2}$/.test(tuNgayStr)) {
    throw new ApiError(400, 'Từ ngày không đúng định dạng YYYY-MM-DD.', 'VALIDATION_ERROR');
  }
  if (denNgayStr && !/^\d{4}-\d{2}-\d{2}$/.test(denNgayStr)) {
    throw new ApiError(400, 'Đến ngày không đúng định dạng YYYY-MM-DD.', 'VALIDATION_ERROR');
  }

  const r = await query(`
    SELECT TOP 200 h.MaHD, h.ThoiGianLap, h.ThoiGianThanhToan, h.TrangThai, h.TongTien, h.GiamGia, h.ThanhToan, h.PhuongThucTT,
           b.TenBan, ISNULL(k.HoTen, N'Khách lẻ') AS TenKhach, n.HoTen AS NhanVien
    FROM dbo.HoaDon h JOIN dbo.BanAn b ON b.MaBan=h.MaBan JOIN dbo.NhanVien n ON n.MaNV=h.MaNV LEFT JOIN dbo.KhachHang k ON k.MaKH=h.MaKH
    WHERE (@trangThai IS NULL OR h.TrangThai=@trangThai)
      AND (@tuNgay IS NULL OR h.ThoiGianLap >= CAST(@tuNgay AS DATETIME))
      AND (@denNgay IS NULL OR h.ThoiGianLap < DATEADD(DAY,1,CAST(@denNgay AS DATETIME)))
    ORDER BY h.ThoiGianLap DESC`, { trangThai, tuNgay: tuNgayStr, denNgay: denNgayStr });
  res.json(r.recordset);
}));

app.get('/api/hoadon/:id', wrap(async (req, res) => {
  const id = validatePositiveInt(req.params.id, 'Mã hóa đơn');
  const r = await query(`
    SELECT h.*, b.TenBan, b.KhuVuc, ISNULL(k.HoTen, N'Khách lẻ') AS TenKhach, k.DiemTichLuy, n.HoTen AS NhanVien,
           dbo.fn_TinhTienPhaiTra(h.MaHD) AS TienPhaiTra
    FROM dbo.HoaDon h JOIN dbo.BanAn b ON b.MaBan=h.MaBan JOIN dbo.NhanVien n ON n.MaNV=h.MaNV LEFT JOIN dbo.KhachHang k ON k.MaKH=h.MaKH
    WHERE h.MaHD=@id;
    SELECT ct.MaMon, m.TenMon, m.DonViTinh, ct.SoLuong, ct.DonGia, ct.ThanhTien, ct.GhiChu
    FROM dbo.ChiTietHoaDon ct JOIN dbo.MonAn m ON m.MaMon=ct.MaMon WHERE ct.MaHD=@id ORDER BY m.TenMon;
    SELECT HanhDong, NoiDung, ThoiGian FROM dbo.NhatKyHoaDon WHERE MaHD=@id ORDER BY ThoiGian;`, { id });
  if (!r.recordsets[0].length) throw new ApiError(404, 'Không tìm thấy hóa đơn', 'NOT_FOUND');
  res.json({ hoaDon: r.recordsets[0][0], chiTiet: r.recordsets[1], nhatKy: r.recordsets[2] });
}));

app.post('/api/hoadon/:id/mon', wrap(async (req, res) => {
  const maHD = validatePositiveInt(req.params.id, 'Mã hóa đơn');
  const maMon = validatePositiveInt(req.body?.maMon, 'Mã món ăn');
  const soLuong = validatePositiveInt(req.body?.soLuong, 'Số lượng');
  if (soLuong > 1000) {
    throw new ApiError(400, 'Số lượng mỗi lần gọi không được vượt quá 1000.', 'VALIDATION_ERROR');
  }
  const ghiChu = req.body?.ghiChu ? String(req.body.ghiChu).trim().slice(0, 255) : null;
  const pool = await poolPromise;
  await pool.request()
    .input('MaHD', sql.Int, maHD).input('MaMon', sql.Int, maMon)
    .input('SoLuong', sql.Int, soLuong).input('GhiChu', sql.NVarChar(255), ghiChu)
    .execute('sp_ThemMonVaoHoaDon');
  res.json({ ok: true });
}));

app.delete('/api/hoadon/:id/mon/:maMon', wrap(async (req, res) => {
  const maHD = validatePositiveInt(req.params.id, 'Mã hóa đơn');
  const maMon = validatePositiveInt(req.params.maMon, 'Mã món ăn');
  // Xóa dòng món (chỉ hóa đơn đang phục vụ, có khóa giao dịch) + hoàn kho + ghi nhật ký
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const rq = new sql.Request(tx);
    rq.input('MaHD', sql.Int, maHD).input('MaMon', sql.Int, maMon);
    const checkRes = await rq.query(`
      SELECT h.TrangThai, ct.SoLuong
      FROM dbo.HoaDon h WITH (UPDLOCK, HOLDLOCK)
      LEFT JOIN dbo.ChiTietHoaDon ct WITH (UPDLOCK, HOLDLOCK)
        ON ct.MaHD = h.MaHD AND ct.MaMon = @MaMon
      WHERE h.MaHD = @MaHD;
    `);
    if (!checkRes.recordset.length) {
      throw new ApiError(404, 'Không tìm thấy hóa đơn.', 'NOT_FOUND');
    }
    if (checkRes.recordset[0].TrangThai !== 'Đang phục vụ') {
      throw new ApiError(400, 'Không thể xóa món của hóa đơn đã thanh toán hoặc đã hủy.', 'INVOICE_LOCKED');
    }
    if (!checkRes.recordset[0].SoLuong) {
      throw new ApiError(404, 'Món ăn không có trong hóa đơn này.', 'DISH_NOT_IN_INVOICE');
    }

    const rqDel = new sql.Request(tx);
    rqDel.input('MaHD', sql.Int, maHD).input('MaMon', sql.Int, maMon);
    await rqDel.query(`
      UPDATE nl SET SoLuongTon = nl.SoLuongTon + c.DinhLuong * ct.SoLuong
      FROM dbo.NguyenLieu nl JOIN dbo.CongThuc c ON c.MaNL=nl.MaNL JOIN dbo.ChiTietHoaDon ct ON ct.MaMon=c.MaMon
      WHERE ct.MaHD=@MaHD AND ct.MaMon=@MaMon;
      DELETE FROM dbo.ChiTietHoaDon WHERE MaHD=@MaHD AND MaMon=@MaMon;
      INSERT INTO dbo.NhatKyHoaDon (MaHD, HanhDong, NoiDung)
      VALUES (@MaHD, N'Xóa món', CONCAT(N'Xóa món mã ', @MaMon));
    `);
    await tx.commit();
    res.json({ ok: true });
  } catch (e) {
    try { await tx.rollback(); } catch (_) {}
    throw e;
  }
}));

app.post('/api/hoadon/:id/thanhtoan', wrap(async (req, res) => {
  const maHD = validatePositiveInt(req.params.id, 'Mã hóa đơn');
  const phuongThuc = String(req.body?.phuongThuc || '').trim();
  if (!['Tiền mặt', 'Chuyển khoản', 'Thẻ'].includes(phuongThuc)) {
    throw new ApiError(400, 'Phương thức thanh toán không hợp lệ (Tiền mặt, Chuyển khoản, Thẻ).', 'VALIDATION_ERROR');
  }
  const giamGia = req.body?.giamGia !== undefined && req.body?.giamGia !== '' ? Number(req.body.giamGia) : 0;
  if (Number.isNaN(giamGia) || giamGia < 0 || giamGia > 100) {
    throw new ApiError(400, 'Giảm giá phải nằm trong khoảng 0–100%.', 'VALIDATION_ERROR');
  }
  const pool = await poolPromise;
  const r = await pool.request()
    .input('MaHD', sql.Int, maHD).input('PhuongThucTT', sql.NVarChar(20), phuongThuc)
    .input('GiamGia', sql.Decimal(5, 2), giamGia)
    .output('SoTienPhaiTra', sql.Decimal(14, 0)).execute('sp_ThanhToanHoaDon');
  res.json({ soTienPhaiTra: r.output.SoTienPhaiTra });
}));

app.post('/api/hoadon/:id/huy', wrap(async (req, res) => {
  const maHD = validatePositiveInt(req.params.id, 'Mã hóa đơn');
  const lyDo = req.body?.lyDo ? String(req.body.lyDo).trim().slice(0, 255) : null;
  const pool = await poolPromise;
  await pool.request().input('MaHD', sql.Int, maHD)
    .input('LyDo', sql.NVarChar(255), lyDo).execute('sp_HuyHoaDon');
  res.json({ ok: true });
}));

/* ------------------------- THỰC ĐƠN ------------------------- */
app.get('/api/danhmuc', wrap(async (req, res) => {
  res.json((await query('SELECT * FROM dbo.DanhMucMon ORDER BY MaDM')).recordset);
}));
app.get('/api/monan', wrap(async (req, res) => {
  const all = req.query.all === '1';
  const r = await query(all
    ? 'SELECT m.*, d.TenDM FROM dbo.MonAn m JOIN dbo.DanhMucMon d ON d.MaDM=m.MaDM ORDER BY d.MaDM, m.TenMon'
    : 'SELECT * FROM dbo.vw_ThucDon ORDER BY MaDM, TenMon');
  res.json(r.recordset);
}));
app.post('/api/monan', wrap(async (req, res) => {
  const tenMon = String(req.body?.tenMon || '').trim();
  if (!tenMon || tenMon.length > 100) {
    throw new ApiError(400, 'Tên món ăn không được để trống (tối đa 100 ký tự).', 'VALIDATION_ERROR');
  }
  const maDM = validatePositiveInt(req.body?.maDM, 'Danh mục món');
  const donGia = Number(req.body?.donGia);
  if (!Number.isFinite(donGia) || donGia <= 0) {
    throw new ApiError(400, 'Đơn giá món ăn phải lớn hơn 0.', 'VALIDATION_ERROR');
  }
  const donViTinh = String(req.body?.donViTinh || '').trim().slice(0, 20);
  const moTa = req.body?.moTa ? String(req.body.moTa).trim().slice(0, 255) : null;

  const r = await query(`INSERT INTO dbo.MonAn (TenMon, MaDM, DonGia, DonViTinh, MoTa) OUTPUT INSERTED.MaMon
                         VALUES (@tenMon, @maDM, @donGia, ISNULL(NULLIF(@donViTinh,''), N'Phần'), @moTa)`,
    { tenMon, maDM, donGia, donViTinh, moTa });
  res.json({ maMon: r.recordset[0].MaMon });
}));
app.put('/api/monan/:id', wrap(async (req, res) => {
  const id = validatePositiveInt(req.params.id, 'Mã món ăn');
  const tenMon = String(req.body?.tenMon || '').trim();
  if (!tenMon || tenMon.length > 100) {
    throw new ApiError(400, 'Tên món ăn không được để trống (tối đa 100 ký tự).', 'VALIDATION_ERROR');
  }
  const maDM = validatePositiveInt(req.body?.maDM, 'Danh mục món');
  const donGia = Number(req.body?.donGia);
  if (!Number.isFinite(donGia) || donGia <= 0) {
    throw new ApiError(400, 'Đơn giá món ăn phải lớn hơn 0.', 'VALIDATION_ERROR');
  }
  const donViTinh = String(req.body?.donViTinh || '').trim().slice(0, 20) || 'Phần';
  const moTa = req.body?.moTa ? String(req.body.moTa).trim().slice(0, 255) : null;
  const conKinhDoanh = req.body?.conKinhDoanh === undefined ? 1 : (req.body.conKinhDoanh ? 1 : 0);

  const r = await query(`UPDATE dbo.MonAn SET TenMon=@tenMon, MaDM=@maDM, DonGia=@donGia, DonViTinh=@donViTinh, MoTa=@moTa, ConKinhDoanh=@ckd WHERE MaMon=@id`,
    { id, tenMon, maDM, donGia, donViTinh, moTa, ckd: conKinhDoanh });
  if (r.rowsAffected[0] === 0) throw new ApiError(404, 'Không tìm thấy món ăn cần cập nhật.', 'NOT_FOUND');
  res.json({ ok: true });
}));

/* ------------------------- KHÁCH HÀNG ------------------------- */
app.get('/api/khachhang', wrap(async (req, res) => {
  const q = (req.query.q || '').trim().slice(0, 100);
  const r = await query(`SELECT TOP 100 * FROM dbo.vw_KhachHangThanThiet
                         WHERE @q='' OR HoTen LIKE N'%'+@q+N'%' OR SoDienThoai LIKE '%'+@q+'%'
                         ORDER BY TongChiTieu DESC`, { q });
  res.json(r.recordset);
}));
app.post('/api/khachhang', wrap(async (req, res) => {
  const hoTen = String(req.body?.hoTen || '').trim();
  const soDienThoai = String(req.body?.soDienThoai || '').trim();
  const email = req.body?.email ? String(req.body.email).trim() : null;
  const gioiTinh = req.body?.gioiTinh ? String(req.body.gioiTinh).trim() : null;
  const ngaySinh = req.body?.ngaySinh ? String(req.body.ngaySinh).trim() : null;

  if (!hoTen || hoTen.length > 100) {
    throw new ApiError(400, 'Họ tên khách hàng không được để trống (tối đa 100 ký tự).', 'VALIDATION_ERROR');
  }
  if (!/^\d{9,11}$/.test(soDienThoai)) {
    throw new ApiError(400, 'Số điện thoại không hợp lệ (chỉ gồm 9–11 chữ số).', 'VALIDATION_ERROR');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Địa chỉ Email không đúng định dạng.', 'VALIDATION_ERROR');
  }
  if (gioiTinh && !['Nam', 'Nữ', 'Khác'].includes(gioiTinh)) {
    throw new ApiError(400, 'Giới tính không hợp lệ (Nam, Nữ, Khác).', 'VALIDATION_ERROR');
  }
  if (ngaySinh && (!/^\d{4}-\d{2}-\d{2}$/.test(ngaySinh) || Number.isNaN(Date.parse(ngaySinh)))) {
    throw new ApiError(400, 'Ngày sinh không hợp lệ.', 'VALIDATION_ERROR');
  }

  const r = await query(`INSERT INTO dbo.KhachHang (HoTen, SoDienThoai, Email, GioiTinh, NgaySinh) OUTPUT INSERTED.MaKH
                         VALUES (@hoTen, @sdt, @email, @gt, @ns)`,
    { hoTen, sdt: soDienThoai, email, gt: gioiTinh, ns: ngaySinh });
  res.json({ maKH: r.recordset[0].MaKH });
}));

/* ------------------------- ĐẶT BÀN ------------------------- */
app.get('/api/datban', wrap(async (req, res) => {
  const r = await query(`
    SELECT TOP 200 d.MaDatBan, d.ThoiGianDat, d.SoNguoi, d.TrangThai, d.GhiChu, b.TenBan, b.KhuVuc, b.SoCho, k.HoTen AS TenKhach, k.SoDienThoai
    FROM dbo.DatBan d JOIN dbo.BanAn b ON b.MaBan=d.MaBan JOIN dbo.KhachHang k ON k.MaKH=d.MaKH
    ORDER BY CASE WHEN d.TrangThai IN (N'Chờ xác nhận',N'Đã xác nhận') AND d.ThoiGianDat>=CAST(GETDATE() AS DATE) THEN 0 ELSE 1 END, d.ThoiGianDat DESC`);
  res.json(r.recordset);
}));
app.post('/api/datban', wrap(async (req, res) => {
  const maKH = validatePositiveInt(req.body?.maKH, 'Mã khách hàng');
  const maBan = validatePositiveInt(req.body?.maBan, 'Mã bàn');
  const soNguoi = validatePositiveInt(req.body?.soNguoi, 'Số người');
  if (soNguoi > 20) {
    throw new ApiError(400, 'Số người đặt bàn phải từ 1 đến 20.', 'VALIDATION_ERROR');
  }
  const parsedTime = parseVietnamDateTime(req.body?.thoiGianDat);
  if (!parsedTime) {
    throw new ApiError(400, 'Thời gian đặt bàn không hợp lệ.', 'VALIDATION_ERROR');
  }
  const ghiChu = req.body?.ghiChu ? String(req.body.ghiChu).trim().slice(0, 255) : null;

  const pool = await poolPromise;
  const r = await pool.request()
    .input('MaKH', sql.Int, maKH).input('MaBan', sql.Int, maBan).input('ThoiGianDat', sql.DateTime, parsedTime)
    .input('SoNguoi', sql.TinyInt, soNguoi).input('GhiChu', sql.NVarChar(255), ghiChu)
    .output('MaDatBan', sql.Int).execute('sp_DatBan');
  res.json({ maDatBan: r.output.MaDatBan });
}));
app.put('/api/datban/:id/trangthai', wrap(async (req, res) => {
  const id = validatePositiveInt(req.params.id, 'Mã đặt bàn');
  const trangThai = String(req.body?.trangThai || '').trim();
  if (!['Chờ xác nhận', 'Đã xác nhận', 'Đã đến', 'Đã hủy'].includes(trangThai)) {
    throw new ApiError(400, 'Trạng thái đặt bàn không hợp lệ.', 'VALIDATION_ERROR');
  }

  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const rq = new sql.Request(tx);
    rq.input('id', sql.Int, id).input('tt', sql.NVarChar(20), trangThai);
    const cur = await rq.query(`
      SELECT MaDatBan, MaBan, ThoiGianDat, TrangThai
      FROM dbo.DatBan WITH (UPDLOCK, HOLDLOCK)
      WHERE MaDatBan = @id;
    `);
    if (!cur.recordset.length) {
      throw new ApiError(404, 'Không tìm thấy lịch đặt bàn.', 'NOT_FOUND');
    }
    const row = cur.recordset[0];
    if (['Đã đến', 'Đã hủy'].includes(row.TrangThai) && row.TrangThai !== trangThai) {
      throw new ApiError(400, `Không thể chuyển trạng thái từ "${row.TrangThai}" sang "${trangThai}".`, 'INVALID_STATE_TRANSITION');
    }

    // Nếu chuyển sang Chờ xác nhận hoặc Đã xác nhận, kiểm tra trùng lịch
    if (['Chờ xác nhận', 'Đã xác nhận'].includes(trangThai)) {
      const rqOverlap = new sql.Request(tx);
      rqOverlap.input('id', sql.Int, id).input('maBan', sql.Int, row.MaBan).input('tg', sql.DateTime, row.ThoiGianDat);
      const ov = await rqOverlap.query(`
        SELECT 1 FROM dbo.DatBan WITH (UPDLOCK, HOLDLOCK)
        WHERE MaBan = @maBan AND MaDatBan <> @id
          AND TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
          AND ThoiGianDat > DATEADD(MINUTE, -120, @tg)
          AND ThoiGianDat < DATEADD(MINUTE, 120, @tg);
      `);
      if (ov.recordset.length) {
        throw new ApiError(409, 'Bàn đã có lịch đặt khác trong khung giờ ±2 giờ.', 'BOOKING_CONFLICT');
      }
    }

    const rqUpd = new sql.Request(tx);
    rqUpd.input('id', sql.Int, id).input('tt', sql.NVarChar(20), trangThai);
    await rqUpd.query('UPDATE dbo.DatBan SET TrangThai=@tt WHERE MaDatBan=@id');
    await tx.commit();
    res.json({ ok: true });
  } catch (e) {
    try { await tx.rollback(); } catch (_) {}
    throw e;
  }
}));

/* ------------------------- KHO ------------------------- */
app.get('/api/nguyenlieu', wrap(async (req, res) => {
  const r = await query(`SELECT *, CASE WHEN SoLuongTon<=MucToiThieu THEN 1 ELSE 0 END AS SapHet FROM dbo.NguyenLieu ORDER BY SapHet DESC, TenNL`);
  res.json(r.recordset);
}));
app.post('/api/nguyenlieu/:id/nhap', wrap(async (req, res) => {
  const maNL = validatePositiveInt(req.params.id, 'Mã nguyên liệu');
  const soLuong = Number(req.body?.soLuong);
  if (!Number.isFinite(soLuong) || soLuong <= 0) {
    throw new ApiError(400, 'Số lượng nhập kho phải lớn hơn 0.', 'VALIDATION_ERROR');
  }
  let donGiaNhap = null;
  if (req.body?.donGiaNhap !== undefined && req.body?.donGiaNhap !== null && req.body?.donGiaNhap !== '') {
    donGiaNhap = Number(req.body.donGiaNhap);
    if (!Number.isFinite(donGiaNhap) || donGiaNhap < 0) {
      throw new ApiError(400, 'Đơn giá nhập không hợp lệ.', 'VALIDATION_ERROR');
    }
  }
  const pool = await poolPromise;
  await pool.request().input('MaNL', sql.Int, maNL)
    .input('SoLuong', sql.Decimal(10, 2), soLuong)
    .input('DonGiaNhap', sql.Decimal(12, 0), donGiaNhap)
    .execute('sp_NhapKhoNguyenLieu');
  res.json({ ok: true });
}));

// Middleware bắt lỗi JSON không hợp lệ hoặc lỗi không xác định
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Dữ liệu JSON gửi lên không đúng định dạng.',
      code: 'INVALID_JSON',
    });
  }
  const mapped = mapDatabaseError(err);
  res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`✔ Web đang chạy tại http://localhost:${PORT}`));
}

module.exports = {
  app,
  poolPromise,
  ApiError,
  parseVietnamDateTime,
  getVietnamCurrentYear,
  validatePositiveInt,
  mapDatabaseError,
};
