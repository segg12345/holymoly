/* ============================================================
   Nhà hàng Sen Vàng — Backend API (Node.js + Express + mssql)
   Kết nối tới database QuanLyNhaHang trên SQL Server
   ============================================================ */
require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const path = require('path');

const app = express();
app.use(express.json());
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
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};
// Khi dùng named instance (SQLEXPRESS) thì không cố định port
if (dbConfig.options.instanceName) delete dbConfig.port;

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => { console.log('✔ Đã kết nối SQL Server:', dbConfig.server, '/', dbConfig.database); return pool; })
  .catch((err) => { console.error('✖ Lỗi kết nối SQL Server:', err.message); process.exit(1); });

// helper: chạy query / proc với tham số, trả về recordset(s)
async function query(text, params = {}) {
  const pool = await poolPromise;
  const req = pool.request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  return req.query(text);
}
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e.message);
  res.status(400).json({ error: e.originalError?.info?.message || e.message });
});

/* ------------------------- TỔNG QUAN ------------------------- */
app.get('/api/dashboard', wrap(async (req, res) => {
  const r = await query(`
    SELECT
      (SELECT ISNULL(SUM(ThanhToan),0) FROM HoaDon WHERE TrangThai=N'Đã thanh toán' AND CAST(ThoiGianThanhToan AS DATE)=CAST(GETDATE() AS DATE)) AS DoanhThuHomNay,
      (SELECT COUNT(*) FROM HoaDon WHERE TrangThai=N'Đã thanh toán' AND CAST(ThoiGianThanhToan AS DATE)=CAST(GETDATE() AS DATE)) AS HoaDonHomNay,
      (SELECT COUNT(*) FROM BanAn WHERE TrangThai=N'Đang phục vụ') AS BanDangPhucVu,
      (SELECT COUNT(*) FROM BanAn) AS TongBan,
      (SELECT COUNT(*) FROM DatBan WHERE CAST(ThoiGianDat AS DATE)=CAST(GETDATE() AS DATE) AND TrangThai IN (N'Chờ xác nhận',N'Đã xác nhận')) AS DatBanHomNay,
      (SELECT COUNT(*) FROM vw_NguyenLieuSapHet) AS NguyenLieuSapHet;
    SELECT TOP 14 Ngay, SoHoaDon, DoanhThu FROM vw_DoanhThuTheoNgay ORDER BY Ngay DESC;
    SELECT TOP 6 TenMon, TenDM, TongSoLuong, DoanhThu
      FROM fn_MonBanChay(DATEADD(DAY,-30,CAST(GETDATE() AS DATE)), CAST(GETDATE() AS DATE)) ORDER BY TongSoLuong DESC;
    SELECT * FROM vw_NguyenLieuSapHet ORDER BY SoLuongCanNhap DESC;
    SELECT TOP 8 * FROM vw_DatBanSapToi ORDER BY ThoiGianDat;
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
  const nam = Number(req.query.nam) || new Date().getFullYear();
  const pool = await poolPromise;
  const r = await pool.request().input('Nam', sql.Int, nam)
    .output('TongDoanhThu', sql.Decimal(16, 0)).execute('sp_BaoCaoDoanhThuTheoThang');
  res.json({ nam, thang: r.recordset, tongDoanhThu: r.output.TongDoanhThu });
}));

/* ------------------------- BÀN & HÓA ĐƠN ------------------------- */
app.get('/api/ban', wrap(async (req, res) => {
  const r = await query('SELECT * FROM vw_TinhTrangBan ORDER BY KhuVuc, TenBan');
  res.json(r.recordset);
}));

app.get('/api/nhanvien', wrap(async (req, res) => {
  const r = await query(`SELECT MaNV, HoTen, ChucVu FROM NhanVien WHERE DangLamViec=1 AND ChucVu IN (N'Thu ngân',N'Phục vụ',N'Quản lý') ORDER BY HoTen`);
  res.json(r.recordset);
}));

app.post('/api/hoadon', wrap(async (req, res) => {
  const { maBan, maNV, maKH } = req.body;
  const pool = await poolPromise;
  const r = await pool.request()
    .input('MaBan', sql.Int, maBan).input('MaNV', sql.Int, maNV).input('MaKH', sql.Int, maKH || null)
    .output('MaHD', sql.Int).execute('sp_MoHoaDon');
  res.json({ maHD: r.output.MaHD });
}));

app.get('/api/hoadon', wrap(async (req, res) => {
  const { trangThai, tuNgay, denNgay } = req.query;
  const r = await query(`
    SELECT TOP 200 h.MaHD, h.ThoiGianLap, h.ThoiGianThanhToan, h.TrangThai, h.TongTien, h.GiamGia, h.ThanhToan, h.PhuongThucTT,
           b.TenBan, ISNULL(k.HoTen, N'Khách lẻ') AS TenKhach, n.HoTen AS NhanVien
    FROM HoaDon h JOIN BanAn b ON b.MaBan=h.MaBan JOIN NhanVien n ON n.MaNV=h.MaNV LEFT JOIN KhachHang k ON k.MaKH=h.MaKH
    WHERE (@trangThai IS NULL OR h.TrangThai=@trangThai)
      AND (@tuNgay IS NULL OR h.ThoiGianLap >= @tuNgay)
      AND (@denNgay IS NULL OR h.ThoiGianLap < DATEADD(DAY,1,@denNgay))
    ORDER BY h.ThoiGianLap DESC`, { trangThai: trangThai || null, tuNgay: tuNgay || null, denNgay: denNgay || null });
  res.json(r.recordset);
}));

app.get('/api/hoadon/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const r = await query(`
    SELECT h.*, b.TenBan, b.KhuVuc, ISNULL(k.HoTen, N'Khách lẻ') AS TenKhach, k.DiemTichLuy, n.HoTen AS NhanVien,
           dbo.fn_TinhTienPhaiTra(h.MaHD) AS TienPhaiTra
    FROM HoaDon h JOIN BanAn b ON b.MaBan=h.MaBan JOIN NhanVien n ON n.MaNV=h.MaNV LEFT JOIN KhachHang k ON k.MaKH=h.MaKH
    WHERE h.MaHD=@id;
    SELECT ct.MaMon, m.TenMon, m.DonViTinh, ct.SoLuong, ct.DonGia, ct.ThanhTien, ct.GhiChu
    FROM ChiTietHoaDon ct JOIN MonAn m ON m.MaMon=ct.MaMon WHERE ct.MaHD=@id ORDER BY m.TenMon;
    SELECT HanhDong, NoiDung, ThoiGian FROM NhatKyHoaDon WHERE MaHD=@id ORDER BY ThoiGian;`, { id });
  if (!r.recordsets[0].length) return res.status(404).json({ error: 'Không tìm thấy hóa đơn' });
  res.json({ hoaDon: r.recordsets[0][0], chiTiet: r.recordsets[1], nhatKy: r.recordsets[2] });
}));

app.post('/api/hoadon/:id/mon', wrap(async (req, res) => {
  const { maMon, soLuong, ghiChu } = req.body;
  const pool = await poolPromise;
  await pool.request()
    .input('MaHD', sql.Int, Number(req.params.id)).input('MaMon', sql.Int, maMon)
    .input('SoLuong', sql.Int, soLuong).input('GhiChu', sql.NVarChar(255), ghiChu || null)
    .execute('sp_ThemMonVaoHoaDon');
  res.json({ ok: true });
}));

app.delete('/api/hoadon/:id/mon/:maMon', wrap(async (req, res) => {
  // Xóa dòng món (chỉ hóa đơn đang phục vụ, trigger sẽ chặn nếu đã thanh toán) + hoàn kho
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const rq = new sql.Request(tx);
    rq.input('MaHD', sql.Int, Number(req.params.id)).input('MaMon', sql.Int, Number(req.params.maMon));
    await rq.query(`
      UPDATE nl SET SoLuongTon = nl.SoLuongTon + c.DinhLuong * ct.SoLuong
      FROM NguyenLieu nl JOIN CongThuc c ON c.MaNL=nl.MaNL JOIN ChiTietHoaDon ct ON ct.MaMon=c.MaMon
      WHERE ct.MaHD=@MaHD AND ct.MaMon=@MaMon;
      DELETE FROM ChiTietHoaDon WHERE MaHD=@MaHD AND MaMon=@MaMon;`);
    await tx.commit();
    res.json({ ok: true });
  } catch (e) { await tx.rollback(); throw e; }
}));

app.post('/api/hoadon/:id/thanhtoan', wrap(async (req, res) => {
  const { phuongThuc, giamGia } = req.body;
  const pool = await poolPromise;
  const r = await pool.request()
    .input('MaHD', sql.Int, Number(req.params.id)).input('PhuongThucTT', sql.NVarChar(20), phuongThuc)
    .input('GiamGia', sql.Decimal(5, 2), Number(giamGia) || 0)
    .output('SoTienPhaiTra', sql.Decimal(14, 0)).execute('sp_ThanhToanHoaDon');
  res.json({ soTienPhaiTra: r.output.SoTienPhaiTra });
}));

app.post('/api/hoadon/:id/huy', wrap(async (req, res) => {
  const pool = await poolPromise;
  await pool.request().input('MaHD', sql.Int, Number(req.params.id))
    .input('LyDo', sql.NVarChar(255), req.body.lyDo || null).execute('sp_HuyHoaDon');
  res.json({ ok: true });
}));

/* ------------------------- THỰC ĐƠN ------------------------- */
app.get('/api/danhmuc', wrap(async (req, res) => {
  res.json((await query('SELECT * FROM DanhMucMon ORDER BY MaDM')).recordset);
}));
app.get('/api/monan', wrap(async (req, res) => {
  const all = req.query.all === '1';
  const r = await query(all
    ? 'SELECT m.*, d.TenDM FROM MonAn m JOIN DanhMucMon d ON d.MaDM=m.MaDM ORDER BY d.MaDM, m.TenMon'
    : 'SELECT * FROM vw_ThucDon ORDER BY MaDM, TenMon');
  res.json(r.recordset);
}));
app.post('/api/monan', wrap(async (req, res) => {
  const { tenMon, maDM, donGia, donViTinh, moTa } = req.body;
  const r = await query(`INSERT INTO MonAn (TenMon, MaDM, DonGia, DonViTinh, MoTa) OUTPUT INSERTED.MaMon
                         VALUES (@tenMon, @maDM, @donGia, ISNULL(NULLIF(@donViTinh,''), N'Phần'), @moTa)`,
    { tenMon, maDM, donGia, donViTinh: donViTinh || '', moTa: moTa || null });
  res.json({ maMon: r.recordset[0].MaMon });
}));
app.put('/api/monan/:id', wrap(async (req, res) => {
  const { tenMon, maDM, donGia, donViTinh, moTa, conKinhDoanh } = req.body;
  await query(`UPDATE MonAn SET TenMon=@tenMon, MaDM=@maDM, DonGia=@donGia, DonViTinh=@donViTinh, MoTa=@moTa, ConKinhDoanh=@ckd WHERE MaMon=@id`,
    { id: Number(req.params.id), tenMon, maDM, donGia, donViTinh, moTa: moTa || null, ckd: conKinhDoanh ? 1 : 0 });
  res.json({ ok: true });
}));

/* ------------------------- KHÁCH HÀNG ------------------------- */
app.get('/api/khachhang', wrap(async (req, res) => {
  const q = (req.query.q || '').trim();
  const r = await query(`SELECT TOP 100 * FROM vw_KhachHangThanThiet
                         WHERE @q='' OR HoTen LIKE '%'+@q+'%' OR SoDienThoai LIKE '%'+@q+'%'
                         ORDER BY TongChiTieu DESC`, { q });
  res.json(r.recordset);
}));
app.post('/api/khachhang', wrap(async (req, res) => {
  const { hoTen, soDienThoai, email, gioiTinh, ngaySinh } = req.body;
  const r = await query(`INSERT INTO KhachHang (HoTen, SoDienThoai, Email, GioiTinh, NgaySinh) OUTPUT INSERTED.MaKH
                         VALUES (@hoTen, @sdt, @email, @gt, @ns)`,
    { hoTen, sdt: soDienThoai, email: email || null, gt: gioiTinh || null, ns: ngaySinh || null });
  res.json({ maKH: r.recordset[0].MaKH });
}));

/* ------------------------- ĐẶT BÀN ------------------------- */
app.get('/api/datban', wrap(async (req, res) => {
  const r = await query(`
    SELECT TOP 200 d.MaDatBan, d.ThoiGianDat, d.SoNguoi, d.TrangThai, d.GhiChu, b.TenBan, b.KhuVuc, b.SoCho, k.HoTen AS TenKhach, k.SoDienThoai
    FROM DatBan d JOIN BanAn b ON b.MaBan=d.MaBan JOIN KhachHang k ON k.MaKH=d.MaKH
    ORDER BY CASE WHEN d.TrangThai IN (N'Chờ xác nhận',N'Đã xác nhận') AND d.ThoiGianDat>=CAST(GETDATE() AS DATE) THEN 0 ELSE 1 END, d.ThoiGianDat DESC`);
  res.json(r.recordset);
}));
app.post('/api/datban', wrap(async (req, res) => {
  const { maKH, maBan, thoiGianDat, soNguoi, ghiChu } = req.body;
  const pool = await poolPromise;
  const r = await pool.request()
    .input('MaKH', sql.Int, maKH).input('MaBan', sql.Int, maBan).input('ThoiGianDat', sql.DateTime, new Date(thoiGianDat))
    .input('SoNguoi', sql.TinyInt, soNguoi).input('GhiChu', sql.NVarChar(255), ghiChu || null)
    .output('MaDatBan', sql.Int).execute('sp_DatBan');
  res.json({ maDatBan: r.output.MaDatBan });
}));
app.put('/api/datban/:id/trangthai', wrap(async (req, res) => {
  await query('UPDATE DatBan SET TrangThai=@tt WHERE MaDatBan=@id', { id: Number(req.params.id), tt: req.body.trangThai });
  res.json({ ok: true });
}));

/* ------------------------- KHO ------------------------- */
app.get('/api/nguyenlieu', wrap(async (req, res) => {
  const r = await query(`SELECT *, CASE WHEN SoLuongTon<=MucToiThieu THEN 1 ELSE 0 END AS SapHet FROM NguyenLieu ORDER BY SapHet DESC, TenNL`);
  res.json(r.recordset);
}));
app.post('/api/nguyenlieu/:id/nhap', wrap(async (req, res) => {
  const pool = await poolPromise;
  await pool.request().input('MaNL', sql.Int, Number(req.params.id))
    .input('SoLuong', sql.Decimal(10, 2), Number(req.body.soLuong))
    .input('DonGiaNhap', sql.Decimal(12, 0), req.body.donGiaNhap ? Number(req.body.donGiaNhap) : null)
    .execute('sp_NhapKhoNguyenLieu');
  res.json({ ok: true });
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✔ Web đang chạy tại http://localhost:${PORT}`));
