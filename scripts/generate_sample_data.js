/**
 * Script generate 3000 dữ liệu mẫu trải dài từ 2020 đến 2025
 * Cho Hệ thống Quản lý Nhà hàng (SQL Server)
 */

const fs = require('fs');
const path = require('path');
const sql = require('../web/node_modules/mssql');
require('../web/node_modules/dotenv').config({ path: path.join(__dirname, '..', 'web', '.env') });

const config = {
  user: process.env.DB_USER || 'nhahang_app',
  password: process.env.DB_PASSWORD || 'NhaHang@123',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'QuanLyNhaHang',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  }
};

// 60 khách hàng bổ sung (MaKH 41..100)
const extraCustomers = [
  { hoTen: 'Lê Văn Hùng', sdt: '0912000041', email: 'hung.lv@gmail.com', gt: 'Nam', ns: '1985-04-12', namDK: 2020 },
  { hoTen: 'Trần Ngọc Bích', sdt: '0912000042', email: 'bich.tn@gmail.com', gt: 'Nữ', ns: '1992-08-25', namDK: 2020 },
  { hoTen: 'Nguyễn Duy Anh', sdt: '0912000043', email: 'anh.nd@yahoo.com', gt: 'Nam', ns: '1989-11-03', namDK: 2020 },
  { hoTen: 'Phạm Thị Thu Trang', sdt: '0912000044', email: 'trang.ptt@gmail.com', gt: 'Nữ', ns: '1995-02-17', namDK: 2020 },
  { hoTen: 'Hoàng Quốc Bảo', sdt: '0912000045', email: 'bao.hq@gmail.com', gt: 'Nam', ns: '1991-06-30', namDK: 2020 },
  { hoTen: 'Vũ Thanh Thảo', sdt: '0912000046', email: 'thao.vt@gmail.com', gt: 'Nữ', ns: '1998-09-14', namDK: 2020 },
  { hoTen: 'Đỗ Minh Triết', sdt: '0912000047', email: 'triet.dm@gmail.com', gt: 'Nam', ns: '1987-12-05', namDK: 2020 },
  { hoTen: 'Bùi Thị Kim Ngân', sdt: '0912000048', email: 'ngan.btk@gmail.com', gt: 'Nữ', ns: '1994-03-21', namDK: 2020 },
  { hoTen: 'Ngô Tấn Phát', sdt: '0912000049', email: 'phat.nt@gmail.com', gt: 'Nam', ns: '1990-07-19', namDK: 2020 },
  { hoTen: 'Đặng Phương Thảo', sdt: '0912000050', email: 'thao.dp@gmail.com', gt: 'Nữ', ns: '1996-10-10', namDK: 2020 },
  { hoTen: 'Lý Thành Đạt', sdt: '0912000051', email: 'dat.lt@gmail.com', gt: 'Nam', ns: '1988-01-28', namDK: 2021 },
  { hoTen: 'Trương Mỹ Hạnh', sdt: '0912000052', email: 'hanh.tm@gmail.com', gt: 'Nữ', ns: '1993-05-15', namDK: 2021 },
  { hoTen: 'Phan Trọng Hiếu', sdt: '0912000053', email: 'hieu.pt@gmail.com', gt: 'Nam', ns: '1997-08-08', namDK: 2021 },
  { hoTen: 'Mai Thị Cẩm Tú', sdt: '0912000054', email: 'tu.mtc@gmail.com', gt: 'Nữ', ns: '1990-11-23', namDK: 2021 },
  { hoTen: 'Cao Tuấn Kiệt', sdt: '0912000055', email: 'kiet.ct@gmail.com', gt: 'Nam', ns: '1995-04-04', namDK: 2021 },
  { hoTen: 'Đinh Hải Yến', sdt: '0912000056', email: 'yen.dh@gmail.com', gt: 'Nữ', ns: '1999-07-12', namDK: 2021 },
  { hoTen: 'Võ Đức Duy', sdt: '0912000057', email: 'duy.vd@gmail.com', gt: 'Nam', ns: '1986-12-30', namDK: 2021 },
  { hoTen: 'Dương Quỳnh Như', sdt: '0912000058', email: 'nhu.dq@gmail.com', gt: 'Nữ', ns: '1992-03-09', namDK: 2021 },
  { hoTen: 'Tạ Quang Minh', sdt: '0912000059', email: 'minh.tq@gmail.com', gt: 'Nam', ns: '1989-06-18', namDK: 2021 },
  { hoTen: 'Hồ Thùy Dung', sdt: '0912000060', email: 'dung.ht@gmail.com', gt: 'Nữ', ns: '1994-09-27', namDK: 2021 },
  { hoTen: 'Lưu Thế Vinh', sdt: '0912000061', email: 'vinh.lt@gmail.com', gt: 'Nam', ns: '1991-01-14', namDK: 2022 },
  { hoTen: 'Chu Ánh Tuyết', sdt: '0912000062', email: 'tuyet.ca@gmail.com', gt: 'Nữ', ns: '1997-05-02', namDK: 2022 },
  { hoTen: 'Quách Gia Huy', sdt: '0912000063', email: 'huy.qg@gmail.com', gt: 'Nam', ns: '1993-08-20', namDK: 2022 },
  { hoTen: 'Tô Diệu Huyền', sdt: '0912000064', email: 'huyen.td@gmail.com', gt: 'Nữ', ns: '1998-11-11', namDK: 2022 },
  { hoTen: 'Kiều Đăng Khoa', sdt: '0912000065', email: 'khoa.kd@gmail.com', gt: 'Nam', ns: '1985-02-24', namDK: 2022 },
  { hoTen: 'Hà Bích Thủy', sdt: '0912000066', email: 'thuy.hb@gmail.com', gt: 'Nữ', ns: '1990-06-07', namDK: 2022 },
  { hoTen: 'Lâm Văn Đạt', sdt: '0912000067', email: 'dat.lv@gmail.com', gt: 'Nam', ns: '1996-09-15', namDK: 2022 },
  { hoTen: 'Thái Diễm My', sdt: '0912000068', email: 'my.td@gmail.com', gt: 'Nữ', ns: '1992-12-03', namDK: 2022 },
  { hoTen: 'Ông Hoàng Nam', sdt: '0912000069', email: 'nam.oh@gmail.com', gt: 'Nam', ns: '1988-03-19', namDK: 2022 },
  { hoTen: 'Nghiêm Thúy Hằng', sdt: '0912000070', email: 'hang.nt@gmail.com', gt: 'Nữ', ns: '1995-07-28', namDK: 2022 },
  { hoTen: 'Từ Xuân Bách', sdt: '0912000071', email: 'bach.tx@gmail.com', gt: 'Nam', ns: '1991-10-06', namDK: 2023 },
  { hoTen: 'Bạch Lan Hương', sdt: '0912000072', email: 'huong.bl@gmail.com', gt: 'Nữ', ns: '1994-01-22', namDK: 2023 },
  { hoTen: 'Doãn Hữu Thắng', sdt: '0912000073', email: 'thang.dh@gmail.com', gt: 'Nam', ns: '1987-04-16', namDK: 2023 },
  { hoTen: 'Khúc Ngọc Mai', sdt: '0912000074', email: 'mai.kn@gmail.com', gt: 'Nữ', ns: '1999-08-04', namDK: 2023 },
  { hoTen: 'Ma Minh Khang', sdt: '0912000075', email: 'khang.mm@gmail.com', gt: 'Nam', ns: '1993-11-25', namDK: 2023 },
  { hoTen: 'Sử Kim Oanh', sdt: '0912000076', email: 'oanh.sk@gmail.com', gt: 'Nữ', ns: '1996-02-13', namDK: 2023 },
  { hoTen: 'Ưng Công Vinh', sdt: '0912000077', email: 'vinh.uc@gmail.com', gt: 'Nam', ns: '1989-05-31', namDK: 2023 },
  { hoTen: 'Giang Hồng Ngọc', sdt: '0912000078', email: 'ngoc.gh@gmail.com', gt: 'Nữ', ns: '1995-09-08', namDK: 2023 },
  { hoTen: 'Hứa Tuấn Đạt', sdt: '0912000079', email: 'dat.ht@gmail.com', gt: 'Nam', ns: '1992-12-19', namDK: 2023 },
  { hoTen: 'Âu Dương Yến', sdt: '0912000080', email: 'yen.ad@gmail.com', gt: 'Nữ', ns: '1997-03-05', namDK: 2023 },
  { hoTen: 'Nguyễn Anh Dũng', sdt: '0912000081', email: 'dung.na@gmail.com', gt: 'Nam', ns: '1986-07-22', namDK: 2024 },
  { hoTen: 'Trần Thu Hoài', sdt: '0912000082', email: 'hoai.tt@gmail.com', gt: 'Nữ', ns: '1990-10-14', namDK: 2024 },
  { hoTen: 'Lê Hoàng Long', sdt: '0912000083', email: 'long.lh@gmail.com', gt: 'Nam', ns: '1994-01-08', namDK: 2024 },
  { hoTen: 'Phạm Khánh Linh', sdt: '0912000084', email: 'linh.pk@gmail.com', gt: 'Nữ', ns: '1998-04-26', namDK: 2024 },
  { hoTen: 'Hoàng Hải Nam', sdt: '0912000085', email: 'nam.hh@gmail.com', gt: 'Nam', ns: '1991-08-17', namDK: 2024 },
  { hoTen: 'Vũ Minh Châu', sdt: '0912000086', email: 'chau.vm@gmail.com', gt: 'Nữ', ns: '1996-11-29', namDK: 2024 },
  { hoTen: 'Đỗ Nhật Nam', sdt: '0912000087', email: 'nam.dn@gmail.com', gt: 'Nam', ns: '1988-02-10', namDK: 2024 },
  { hoTen: 'Bùi Thảo Vy', sdt: '0912000088', email: 'vy.bt@gmail.com', gt: 'Nữ', ns: '1993-06-04', namDK: 2024 },
  { hoTen: 'Ngô Quang Khải', sdt: '0912000089', email: 'khai.nq@gmail.com', gt: 'Nam', ns: '1997-09-23', namDK: 2024 },
  { hoTen: 'Đặng Cẩm Ly', sdt: '0912000090', email: 'ly.dc@gmail.com', gt: 'Nữ', ns: '1992-12-11', namDK: 2024 },
  { hoTen: 'Lý Quốc Huy', sdt: '0912000091', email: 'huy.lq@gmail.com', gt: 'Nam', ns: '1985-03-30', namDK: 2024 },
  { hoTen: 'Trương Diệu Linh', sdt: '0912000092', email: 'linh.td@gmail.com', gt: 'Nữ', ns: '1999-07-07', namDK: 2024 },
  { hoTen: 'Phan Thanh Tùng', sdt: '0912000093', email: 'tung.pt@gmail.com', gt: 'Nam', ns: '1990-10-18', namDK: 2024 },
  { hoTen: 'Mai Thảo Nhi', sdt: '0912000094', email: 'nhi.mt@gmail.com', gt: 'Nữ', ns: '1995-01-25', namDK: 2024 },
  { hoTen: 'Cao Văn Hậu', sdt: '0912000095', email: 'hau.cv@gmail.com', gt: 'Nam', ns: '1989-05-14', namDK: 2024 },
  { hoTen: 'Đinh Ngọc Trâm', sdt: '0912000096', email: 'tram.dn@gmail.com', gt: 'Nữ', ns: '1994-08-09', namDK: 2024 },
  { hoTen: 'Võ Minh Quân', sdt: '0912000097', email: 'quan.vm@gmail.com', gt: 'Nam', ns: '1996-11-01', namDK: 2024 },
  { hoTen: 'Dương Thị Sen', sdt: '0912000098', email: 'sen.dt@gmail.com', gt: 'Nữ', ns: '1991-02-19', namDK: 2024 },
  { hoTen: 'Tạ Hữu Đạt', sdt: '0912000099', email: 'dat.th@gmail.com', gt: 'Nam', ns: '1987-06-27', namDK: 2024 },
  { hoTen: 'Hồ Thảo Vân', sdt: '0912000100', email: 'van.ht@gmail.com', gt: 'Nữ', ns: '1993-09-16', namDK: 2024 },
];

const employees = [2, 3, 4, 5, 6, 7, 14, 15];

const yearlyTarget = {
  2020: 380,
  2021: 420,
  2022: 480,
  2023: 530,
  2024: 580,
  2025: 610
};

const monthWeights = [1.10, 1.15, 0.90, 0.95, 0.95, 1.05, 1.10, 1.00, 0.90, 0.95, 1.00, 1.20];

const cancelReasons = [
  'Khách bận đột xuất',
  'Đổi sang ngày khác',
  'Hủy do chờ lâu',
  'Khách đổi ý',
  'Đặt nhầm bàn',
  'Khách bận việc gia đình'
];

let seed = 42;
function rnd() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function rndInt(min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function rndChoice(arr) {
  return arr[rndInt(0, arr.length - 1)];
}

async function run() {
  const pool = await sql.connect(config);
  console.log('Đã kết nối cơ sở dữ liệu SQL Server!');

  // 1. Lấy danh sách MaKH thực tế
  const khRes = await pool.request().query('SELECT MaKH FROM dbo.KhachHang ORDER BY MaKH');
  const validKhachHang = khRes.recordset.map(r => r.MaKH);
  console.log(`Số khách hàng hiện có trong DB: ${validKhachHang.length}`);

  // 2. Lấy danh sách món ăn đang kinh doanh kèm giá thực tế
  const monRes = await pool.request().query('SELECT MaMon, TenMon, MaDM, DonGia FROM dbo.MonAn WHERE ConKinhDoanh = 1 ORDER BY MaMon');
  const allDishes = monRes.recordset;
  const dishMap = new Map();
  allDishes.forEach(d => dishMap.set(d.MaMon, d));

  const appetizers = allDishes.filter(d => d.MaDM === 1);
  const mains = allDishes.filter(d => d.MaDM === 2);
  const hotpots = allDishes.filter(d => d.MaDM === 3);
  const seafoods = allDishes.filter(d => d.MaDM === 4);
  const desserts = allDishes.filter(d => d.MaDM === 5);
  const drinks = allDishes.filter(d => d.MaDM === 6);

  console.log(`Số món: Khai vị=${appetizers.length}, Chính=${mains.length}, Lẩu=${hotpots.length}, Hải sản=${seafoods.length}, Tráng miệng=${desserts.length}, Đồ uống=${drinks.length}`);

  // 3. Chuẩn bị SQL
  const sqlLines = [];

  sqlLines.push(`/* =====================================================================
   HỆ THỐNG QUẢN LÝ NHÀ HÀNG
   SCRIPT BỔ SUNG: 3,000 HÓA ĐƠN MẪU + CHI TIẾT + ĐẶT BÀN (2020 - 2025)
   - Trải dài đầy đủ 6 năm (2020 -> 2025), 72 tháng liên tục
   - Đảm bảo tính nhất quán ràng buộc PK/FK/CHECK/Triggers
   - Tối ưu thực thi trực tiếp trên SQL Server
   ===================================================================== */
USE QuanLyNhaHang;
GO
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT N'>> Bắt đầu nạp 3,000 dữ liệu mẫu giai đoạn 2020 - 2025...';
GO

/* =====================================================================
   1. ĐIỀU CHỈNH NGÀY ĐĂNG KÝ KHÁCH HÀNG & BỔ SUNG KHÁCH MỚI
   ===================================================================== */
UPDATE dbo.KhachHang
   SET NgayDangKy = DATEADD(YEAR, -5, NgayDangKy)
 WHERE MaKH <= 40 AND NgayDangKy >= '2025-01-01';
GO
`);

  for (const c of extraCustomers) {
    const thang = rndInt(1, 12);
    const ngay = rndInt(1, 28);
    const ngayDK = `${c.namDK}-${String(thang).padStart(2, '0')}-${String(ngay).padStart(2, '0')}`;
    sqlLines.push(`IF NOT EXISTS (SELECT 1 FROM dbo.KhachHang WHERE SoDienThoai = '${c.sdt}')
    INSERT INTO dbo.KhachHang (HoTen, SoDienThoai, Email, GioiTinh, NgaySinh, DiemTichLuy, NgayDangKy)
    VALUES (N'${c.hoTen}', '${c.sdt}', '${c.email}', N'${c.gt}', '${c.ns}', 0, '${ngayDK}');`);
  }
  sqlLines.push(`GO
PRINT N'>> Đã đồng bộ khách hàng thành viên.';
GO

/* =====================================================================
   2. TẠM TẮT TRIGGERS & XÓA DỮ LIỆU CŨ THUỘC GIAI ĐOẠN 2020 - 2025 (NẾU CÓ)
   ===================================================================== */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
ALTER TABLE dbo.ChiTietHoaDon DISABLE TRIGGER trg_ChiTietHoaDon_KhoaHoaDonDaThanhToan;
ALTER TABLE dbo.ChiTietHoaDon DISABLE TRIGGER trg_ChiTietHoaDon_CapNhatTongTien;
GO

DELETE FROM dbo.ChiTietHoaDon
 WHERE MaHD IN (SELECT MaHD FROM dbo.HoaDon WHERE YEAR(ThoiGianLap) BETWEEN 2020 AND 2025);

DELETE FROM dbo.HoaDon
 WHERE YEAR(ThoiGianLap) BETWEEN 2020 AND 2025;

DELETE FROM dbo.DatBan
 WHERE YEAR(ThoiGianDat) BETWEEN 2020 AND 2025;
GO
`);

  // 3. Đặt bàn 2020-2025 (~450 lượt)
  sqlLines.push(`/* =====================================================================
   3. TẠO 450 LƯỢT ĐẶT BÀN LỊCH SỬ (2020 - 2025)
   ===================================================================== */
`);

  const datBanList = [];
  const datBanNotes = [
    'Tiệc sinh nhật', 'Họp mặt gia đình', 'Họp lớp cũ', 'Tiệc công ty cuối năm',
    'Gần cửa sổ thoáng mát', 'Kỷ niệm ngày cưới', 'Tiệc liên hoan phòng ban', 'Cần ghế trẻ em',
    null, null, null
  ];

  for (let year = 2020; year <= 2025; year++) {
    for (let i = 0; i < 75; i++) {
      const month = rndInt(1, 12);
      const day = rndInt(1, 28);
      const isLunch = rnd() < 0.35;
      const hour = isLunch ? rndInt(11, 13) : rndInt(17, 20);
      const minute = rndChoice([0, 15, 30, 45]);
      const timeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      
      const maKH = rndChoice(validKhachHang);
      const maBan = rndInt(1, 24);
      let soNguoi = rndInt(2, 6);
      if (maBan >= 21) soNguoi = rndInt(8, 16);
      else if (maBan <= 2) soNguoi = 2;

      const trangThai = rnd() < 0.88 ? 'Đã đến' : 'Đã hủy';
      const ghiChu = rndChoice(datBanNotes);
      const ngayTaoStr = `${year}-${String(month).padStart(2, '0')}-${String(Math.max(1, day - rndInt(1, 3))).padStart(2, '0')}`;

      datBanList.push({ maKH, maBan, timeStr, soNguoi, trangThai, ghiChu, ngayTaoStr });
    }
  }

  for (let b = 0; b < datBanList.length; b += 100) {
    const chunk = datBanList.slice(b, b + 100);
    sqlLines.push(`INSERT INTO dbo.DatBan (MaKH, MaBan, ThoiGianDat, SoNguoi, TrangThai, GhiChu, NgayTao) VALUES`);
    const valRows = chunk.map(d => {
      const gc = d.ghiChu ? `N'${d.ghiChu}'` : 'NULL';
      return `(${d.maKH}, ${d.maBan}, '${d.timeStr}', ${d.soNguoi}, N'${d.trangThai}', ${gc}, '${d.ngayTaoStr}')`;
    });
    sqlLines.push(valRows.join(',\n') + ';\n');
  }
  sqlLines.push(`GO
PRINT N'>> Đã chèn 450 lượt đặt bàn lịch sử (2020 - 2025).';
GO
`);

  // 4. Sinh 3,000 Hóa đơn và chi tiết
  sqlLines.push(`/* =====================================================================
   4. TẠO 3,000 HÓA ĐƠN & BẢNG TẠM CHI TIẾT (2020 - 2025)
   ===================================================================== */
CREATE TABLE #TempHD (
    TempID             INT IDENTITY(1,1) PRIMARY KEY,
    MaBan              INT,
    MaKH               INT,
    MaNV               INT,
    ThoiGianLap        DATETIME,
    ThoiGianThanhToan  DATETIME,
    GiamGia            DECIMAL(5,2),
    PhuongThucTT       NVARCHAR(20),
    TrangThai          NVARCHAR(20),
    GhiChu             NVARCHAR(255)
);

CREATE TABLE #TempCT (
    TempID             INT,
    MaMon              INT,
    SoLuong            INT,
    DonGia             DECIMAL(12,0)
);
GO
`);

  const invoices = [];
  const invoiceDetails = [];
  let tempIdCounter = 1;

  for (let year = 2020; year <= 2025; year++) {
    const yearTarget = yearlyTarget[year];
    const sumWeights = monthWeights.reduce((a, b) => a + b, 0);
    const monthCounts = monthWeights.map(w => Math.round((w / sumWeights) * yearTarget));
    let diff = yearTarget - monthCounts.reduce((a, b) => a + b, 0);
    monthCounts[11] += diff;

    for (let m = 0; m < 12; m++) {
      const month = m + 1;
      const count = monthCounts[m];
      const maxDays = (month === 2) ? ((year % 4 === 0) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;

      for (let i = 0; i < count; i++) {
        const tempId = tempIdCounter++;
        const day = rndInt(1, maxDays);
        const isLunch = rnd() < 0.35;
        const hour = isLunch ? rndInt(11, 13) : rndInt(17, 21);
        const minute = rndInt(0, 59);
        const second = rndInt(0, 59);
        const lapStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

        let maBan;
        const rBan = rnd();
        if (rBan < 0.40) maBan = rndInt(1, 8);
        else if (rBan < 0.65) maBan = rndInt(9, 14);
        else if (rBan < 0.85) maBan = rndInt(15, 20);
        else maBan = rndInt(21, 24);

        const maNV = rndChoice(employees);

        let maKH = null;
        if (rnd() < 0.68) {
          if (rnd() < 0.45) maKH = rndChoice(validKhachHang.slice(0, 15));
          else maKH = rndChoice(validKhachHang);
        }

        const isCancel = rnd() < 0.04;
        const trangThai = isCancel ? 'Đã hủy' : 'Đã thanh toán';

        let pttt = null;
        let thoiGianTT = null;
        let giamGia = 0;
        let ghiChu = null;

        if (isCancel) {
          ghiChu = rndChoice(cancelReasons);
        } else {
          const duration = rndInt(40, 105);
          thoiGianTT = `DATEADD(MINUTE, ${duration}, '${lapStr}')`;

          const rP = rnd();
          if (year === 2020) pttt = rP < 0.50 ? 'Tiền mặt' : rP < 0.80 ? 'Thẻ' : 'Chuyển khoản';
          else if (year === 2021) pttt = rP < 0.45 ? 'Tiền mặt' : rP < 0.75 ? 'Thẻ' : 'Chuyển khoản';
          else if (year === 2022) pttt = rP < 0.35 ? 'Tiền mặt' : rP < 0.70 ? 'Thẻ' : 'Chuyển khoản';
          else if (year === 2023) pttt = rP < 0.25 ? 'Tiền mặt' : rP < 0.60 ? 'Thẻ' : 'Chuyển khoản';
          else if (year === 2024) pttt = rP < 0.20 ? 'Tiền mặt' : rP < 0.50 ? 'Thẻ' : 'Chuyển khoản';
          else pttt = rP < 0.15 ? 'Tiền mặt' : rP < 0.45 ? 'Thẻ' : 'Chuyển khoản';

          const rD = rnd();
          if (rD < 0.70) giamGia = 0;
          else if (rD < 0.85) giamGia = 5;
          else if (rD < 0.95) giamGia = 10;
          else if (rD < 0.98) giamGia = 15;
          else giamGia = 20;
        }

        invoices.push({ tempId, maBan, maKH, maNV, lapStr, thoiGianTT, giamGia, pttt, trangThai, ghiChu });

        // Sinh chi tiết món ăn chân thực và đa dạng
        const usedDishes = new Set();
        function pickDish(list, qty) {
          const avail = list.filter(d => !usedDishes.has(d.MaMon));
          if (!avail.length) return;
          const chosen = rndChoice(avail);
          usedDishes.add(chosen.MaMon);
          invoiceDetails.push({ tempId, maMon: chosen.MaMon, soLuong: qty, donGia: chosen.DonGia });
        }

        // 1. Đồ uống luôn có (1 hoặc 2 loại)
        pickDish(drinks, rndInt(2, maBan >= 21 ? 8 : 4));
        if (rnd() < 0.50) {
          pickDish(drinks, rndInt(1, 3));
        }

        // 2. Món khai vị hoặc hải sản
        if (rnd() < 0.65) pickDish(appetizers, rndInt(1, 2));
        else pickDish(seafoods, rndInt(1, 2));

        // 3. Món chính (1 hoặc 2 món)
        pickDish(mains, rndInt(1, 2));
        if (rnd() < 0.75) pickDish(mains, rndInt(1, 2));

        // 4. Nếu bàn từ 4 người hoặc VIP: thêm Lẩu hoặc Hải sản cao cấp
        if (maBan >= 21 || maBan === 6 || maBan === 7 || maBan === 8 || maBan === 12 || maBan === 13 || maBan === 14 || maBan >= 17) {
          if (rnd() < 0.70) pickDish(hotpots, 1);
          else pickDish(seafoods, rndInt(1, 2));
        }

        // 5. Tráng miệng (45% hóa đơn)
        if (rnd() < 0.45) {
          pickDish(desserts, rndInt(1, maBan >= 21 ? 4 : 2));
        }
      }
    }
  }

  console.log(`Đã tạo: ${invoices.length} hóa đơn và ${invoiceDetails.length} dòng chi tiết.`);

  // Insert #TempHD
  for (let b = 0; b < invoices.length; b += 500) {
    const chunk = invoices.slice(b, b + 500);
    sqlLines.push(`INSERT INTO #TempHD (MaBan, MaKH, MaNV, ThoiGianLap, ThoiGianThanhToan, GiamGia, PhuongThucTT, TrangThai, GhiChu) VALUES`);
    const valRows = chunk.map(inv => {
      const mkh = inv.maKH ? inv.maKH : 'NULL';
      const tgtt = inv.thoiGianTT ? inv.thoiGianTT : 'NULL';
      const pt = inv.pttt ? `N'${inv.pttt}'` : 'NULL';
      const gc = inv.ghiChu ? `N'${inv.ghiChu}'` : 'NULL';
      return `(${inv.maBan}, ${mkh}, ${inv.maNV}, '${inv.lapStr}', ${tgtt}, ${inv.giamGia}, ${pt}, N'${inv.trangThai}', ${gc})`;
    });
    sqlLines.push(valRows.join(',\n') + ';\n');
  }

  // Insert #TempCT
  for (let b = 0; b < invoiceDetails.length; b += 1000) {
    const chunk = invoiceDetails.slice(b, b + 1000);
    sqlLines.push(`INSERT INTO #TempCT (TempID, MaMon, SoLuong, DonGia) VALUES`);
    const valRows = chunk.map(ct => `(${ct.tempId}, ${ct.maMon}, ${ct.soLuong}, ${ct.donGia})`);
    sqlLines.push(valRows.join(',\n') + ';\n');
  }

  sqlLines.push(`GO

CREATE TABLE #MapHD (
    TempID INT,
    RealMaHD INT
);
GO

MERGE INTO dbo.HoaDon AS target
USING #TempHD AS src
ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT (MaBan, MaKH, MaNV, ThoiGianLap, ThoiGianThanhToan, GiamGia, PhuongThucTT, TrangThai, GhiChu)
    VALUES (src.MaBan, src.MaKH, src.MaNV, src.ThoiGianLap, src.ThoiGianThanhToan, src.GiamGia, src.PhuongThucTT, src.TrangThai, src.GhiChu)
OUTPUT src.TempID, inserted.MaHD INTO #MapHD (TempID, RealMaHD);
GO

DECLARE @TongDaChen INT;
SELECT @TongDaChen = COUNT(*) FROM #MapHD;
PRINT N'>> Đã nạp thành công ' + CAST(@TongDaChen AS NVARCHAR) + N' hóa đơn vào bảng HoaDon.';
GO

/* =====================================================================
   5. NẠP CHI TIẾT HÓA ĐƠN TỪ #TempCT
   ===================================================================== */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

INSERT INTO dbo.ChiTietHoaDon (MaHD, MaMon, SoLuong, DonGia)
SELECT m.RealMaHD, c.MaMon, c.SoLuong, c.DonGia
FROM #TempCT c
JOIN #MapHD m ON m.TempID = c.TempID;
GO

PRINT N'>> Đã nạp đầy đủ chi tiết hóa đơn.';
GO

/* =====================================================================
   6. CẬP NHẬT TỔNG TIỀN, THANH TOÁN & ĐIỂM TÍCH LŨY
   ===================================================================== */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

ALTER TABLE dbo.ChiTietHoaDon ENABLE TRIGGER trg_ChiTietHoaDon_KhoaHoaDonDaThanhToan;
ALTER TABLE dbo.ChiTietHoaDon ENABLE TRIGGER trg_ChiTietHoaDon_CapNhatTongTien;
GO

UPDATE h
   SET TongTien  = ISNULL(ct.Tong, 0),
       ThanhToan = CASE WHEN h.TrangThai = N'Đã thanh toán'
                        THEN ROUND(ISNULL(ct.Tong, 0) * (1 - h.GiamGia / 100.0), 0)
                        ELSE 0 END
FROM dbo.HoaDon h
JOIN (
    SELECT MaHD, SUM(ThanhTien) AS Tong
    FROM dbo.ChiTietHoaDon
    GROUP BY MaHD
) ct ON ct.MaHD = h.MaHD
WHERE YEAR(h.ThoiGianLap) BETWEEN 2020 AND 2025;
GO

UPDATE k
   SET DiemTichLuy = ISNULL(t.Diem, 0)
FROM dbo.KhachHang k
LEFT JOIN (
    SELECT MaKH, SUM(CAST(FLOOR(ThanhToan / 10000.0) AS INT)) AS Diem
    FROM dbo.HoaDon
    WHERE TrangThai = N'Đã thanh toán' AND MaKH IS NOT NULL
    GROUP BY MaKH
) t ON t.MaKH = k.MaKH;
GO

DROP TABLE #TempHD;
DROP TABLE #TempCT;
DROP TABLE #MapHD;
GO

/* =====================================================================
   7. BÁO CÁO THỐNG KÊ KẾT QUẢ DỮ LIỆU ĐÃ NẠP THEO TỪNG NĂM (2020 - 2025)
   ===================================================================== */
SELECT 
    YEAR(ThoiGianLap) AS [Năm],
    COUNT(*) AS [Tổng số HĐ],
    SUM(CASE WHEN TrangThai = N'Đã thanh toán' THEN 1 ELSE 0 END) AS [HĐ Thanh Toán],
    SUM(CASE WHEN TrangThai = N'Đã hủy' THEN 1 ELSE 0 END) AS [HĐ Hủy],
    CAST(FORMAT(SUM(ThanhToan), 'N0') + ' đ' AS VARCHAR(25)) AS [Tổng Doanh Thu],
    CAST(FORMAT(AVG(CASE WHEN TrangThai = N'Đã thanh toán' THEN ThanhToan END), 'N0') + ' đ' AS VARCHAR(20)) AS [TB / Hóa Đơn],
    COUNT(DISTINCT MaKH) AS [Số Khách Mua Hàng]
FROM dbo.HoaDon
WHERE YEAR(ThoiGianLap) BETWEEN 2020 AND 2025
GROUP BY YEAR(ThoiGianLap)
ORDER BY [Năm];

SELECT 
    N'Tổng Hóa Đơn hiện tại' AS ChiTieu,
    COUNT(*) AS SoLuong
FROM dbo.HoaDon
UNION ALL
SELECT N'Chi Tiết Hóa Đơn', COUNT(*) FROM dbo.ChiTietHoaDon
UNION ALL
SELECT N'Khách Hàng', COUNT(*) FROM dbo.KhachHang
UNION ALL
SELECT N'Đặt Bàn', COUNT(*) FROM dbo.DatBan;
GO

PRINT N'>> HOÀN TẤT NẠP 3,000 DỮ LIỆU MẪU (2020 - 2025)!';
GO
`);

  await pool.close();

  const fullSql = sqlLines.join('\n');
  const outPath = path.join(__dirname, '..', 'sql', '02_InsertData_3000_2020_2025.sql');
  fs.writeFileSync(outPath, fullSql, 'utf8');
  console.log(`Đã xuất file SQL thành công tại: ${outPath} (${(fullSql.length / 1024).toFixed(1)} KB)`);
}

run().catch(err => {
  console.error('Lỗi sinh dữ liệu:', err);
});
