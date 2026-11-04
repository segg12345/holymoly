const fs = require('fs');
const path = require('path');

const sqlDir = path.join(__dirname, '..', 'sql');

// 1. Đọc nội dung 02_InsertData.sql cũ
const old02 = fs.readFileSync(path.join(sqlDir, '02_InsertData.sql'), 'utf8');

// Lấy phần đầu của 02_InsertData.sql (từ dòng 1 đến hết Nhân Viên, trước Khách Hàng)
const splitIdx = old02.indexOf('/* ---------------- KHÁCH HÀNG (40) ---------------- */');
if (splitIdx === -1) {
  throw new Error('Không tìm thấy vị trí KHÁCH HÀNG trong 02_InsertData.sql');
}
const header02 = old02.substring(0, splitIdx);

// Đọc 02_InsertData_3000_2020_2025.sql đã sinh chuẩn
const insert3000 = fs.readFileSync(path.join(sqlDir, '02_InsertData_3000_2020_2025.sql'), 'utf8');

// 40 khách hàng ban đầu với ngày đăng ký đã điều chỉnh (2019 - 2021)
const khachHang40 = `/* ---------------- KHÁCH HÀNG (100 thành viên) ---------------- */
INSERT INTO dbo.KhachHang (HoTen, SoDienThoai, Email, GioiTinh, NgaySinh, DiemTichLuy, NgayDangKy) VALUES
(N'Nguyễn Thị Hương',  '0912000001', 'huong.nt@gmail.com',  N'Nữ',  '1990-02-14', 0, '2020-01-05'),
(N'Trần Văn Khoa',     '0912000002', 'khoa.tv@gmail.com',   N'Nam', '1988-06-20', 0, '2020-01-12'),
(N'Lê Minh Châu',      '0912000003', NULL,                  N'Nữ',  '1995-09-03', 0, '2020-02-01'),
(N'Phạm Quang Huy',    '0912000004', 'huy.pq@yahoo.com',    N'Nam', '1992-11-11', 0, '2020-02-15'),
(N'Hoàng Thu Trang',   '0912000005', 'trang.ht@gmail.com',  N'Nữ',  '1998-03-25', 0, '2020-03-01'),
(N'Vũ Hải Đăng',       '0912000006', NULL,                  N'Nam', '1985-07-07', 0, '2020-03-10'),
(N'Đỗ Ngọc Anh',       '0912000007', 'anh.dn@gmail.com',    N'Nữ',  '2000-01-01', 0, '2020-03-20'),
(N'Bùi Thanh Tùng',    '0912000008', 'tung.bt@gmail.com',   N'Nam', '1979-12-24', 0, '2020-04-02'),
(N'Ngô Phương Thảo',   '0912000009', NULL,                  N'Nữ',  '1993-05-05', 0, '2020-04-18'),
(N'Đặng Văn Long',     '0912000010', 'long.dv@gmail.com',   N'Nam', '1987-08-30', 0, '2020-05-01'),
(N'Lý Thị Kim',        '0912000011', 'kim.lt@gmail.com',    N'Nữ',  '1991-10-10', 0, '2020-05-15'),
(N'Trương Đình Phong', '0912000012', NULL,                  N'Nam', '1996-04-16', 0, '2020-06-01'),
(N'Phan Thị Yến',      '0912000013', 'yen.pt@gmail.com',    N'Nữ',  '1989-09-09', 0, '2020-06-12'),
(N'Mai Anh Tuấn',      '0912000014', 'tuan.ma@gmail.com',   N'Nam', '1994-02-28', 0, '2020-07-01'),
(N'Cao Thị Nga',       '0912000015', NULL,                  N'Nữ',  '1997-07-17', 0, '2020-07-20'),
(N'Đinh Công Thành',   '0912000016', 'thanh.dc@gmail.com',  N'Nam', '1983-03-03', 0, '2020-08-05'),
(N'Võ Thị Hoa',        '0912000017', 'hoa.vt@gmail.com',    N'Nữ',  '1999-11-30', 0, '2020-08-22'),
(N'Dương Minh Quân',   '0912000018', NULL,                  N'Nam', '1990-06-06', 0, '2020-09-01'),
(N'Tạ Thu Hà',         '0912000019', 'ha.tt@gmail.com',     N'Nữ',  '1986-01-20', 0, '2020-09-15'),
(N'Hồ Văn Tài',        '0912000020', 'tai.hv@gmail.com',    N'Nam', '1995-12-12', 0, '2020-10-01'),
(N'Lưu Thị Bình',      '0912000021', NULL,                  N'Nữ',  '1992-08-08', 0, '2020-10-20'),
(N'Chu Đức Hiếu',      '0912000022', 'hieu.cd@gmail.com',   N'Nam', '1984-04-04', 0, '2020-11-05'),
(N'Quách Thị Liên',    '0912000023', 'lien.qt@gmail.com',   N'Nữ',  '1998-05-15', 0, '2020-11-25'),
(N'Tô Hoàng Nam',      '0912000024', NULL,                  N'Nam', '1991-09-19', 0, '2020-12-10'),
(N'Kiều Thanh Vân',    '0912000025', 'van.kt@gmail.com',    N'Nữ',  '1996-02-02', 0, '2021-01-03'),
(N'Hà Văn Đức',        '0912000026', 'duc.hv@gmail.com',    N'Nam', '1982-10-22', 0, '2021-01-18'),
(N'Lâm Thị Thanh',     '0912000027', NULL,                  N'Nữ',  '1994-06-26', 0, '2021-02-02'),
(N'Thái Minh Nhật',    '0912000028', 'nhat.tm@gmail.com',   N'Nam', '1997-01-15', 0, '2021-02-20'),
(N'Ông Thị Mỹ',        '0912000029', 'my.ot@gmail.com',     N'Nữ',  '1988-03-18', 0, '2021-03-05'),
(N'Nghiêm Xuân Trường','0912000030', NULL,                  N'Nam', '1993-07-27', 0, '2021-03-22'),
(N'Từ Khánh Ly',       '0912000031', 'ly.tk@gmail.com',     N'Nữ',  '2001-08-14', 0, '2021-04-08'),
(N'Bạch Công Minh',    '0912000032', 'minh.bc@gmail.com',   N'Nam', '1990-12-01', 0, '2021-04-25'),
(N'Doãn Thị Phượng',   '0912000033', NULL,                  N'Nữ',  '1995-04-29', 0, '2021-05-10'),
(N'Khúc Văn Lợi',      '0912000034', 'loi.kv@gmail.com',    N'Nam', '1986-11-08', 0, '2021-05-28'),
(N'Ma Thị Hiền',       '0912000035', 'hien.mt@gmail.com',   N'Nữ',  '1999-09-21', 0, '2021-06-15'),
(N'Sử Đình Khang',     '0912000036', NULL,                  N'Nam', '1992-05-02', 0, '2021-07-01'),
(N'Ưng Thị Lệ',        '0912000037', 'le.ut@gmail.com',     N'Nữ',  '1989-02-11', 0, '2021-07-19'),
(N'Giang Bảo Long',    '0912000038', 'long.gb@gmail.com',   N'Nam', '1996-10-30', 0, '2021-08-06'),
(N'Hứa Thị Ngân',      '0912000039', NULL,                  N'Nữ',  '1993-01-09', 0, '2021-08-24'),
(N'Âu Dương Vũ',       '0912000040', 'vu.ad@gmail.com',     N'Nam', '1987-06-13', 0, '2021-09-12');
`;

// Cắt phần nội dung từ "IF NOT EXISTS (SELECT 1 FROM dbo.KhachHang WHERE SoDienThoai = '0912000041')" đến hết của 02_InsertData_3000_2020_2025.sql
const start60Khach = insert3000.indexOf("IF NOT EXISTS (SELECT 1 FROM dbo.KhachHang WHERE SoDienThoai = '0912000041')");
const body3000 = insert3000.substring(start60Khach);

// 6 hóa đơn đang phục vụ hôm nay để demo bàn có khách
const activeDemoInvoices = `
/* ---- 6 hóa đơn ĐANG PHỤC VỤ hôm nay (để demo bàn đang có khách) ---- */
INSERT INTO dbo.HoaDon (MaBan, MaKH, MaNV, ThoiGianLap, TrangThai) VALUES
(3,  1,    4, DATEADD(MINUTE, -40, GETDATE()), N'Đang phục vụ'),
(7,  NULL, 5, DATEADD(MINUTE, -25, GETDATE()), N'Đang phục vụ'),
(12, 8,    6, DATEADD(MINUTE, -55, GETDATE()), N'Đang phục vụ'),
(16, NULL, 7, DATEADD(MINUTE, -15, GETDATE()), N'Đang phục vụ'),
(21, 4,    4, DATEADD(MINUTE, -70, GETDATE()), N'Đang phục vụ'),
(24, 20,   14,DATEADD(MINUTE, -10, GETDATE()), N'Đang phục vụ');

INSERT INTO dbo.ChiTietHoaDon (MaHD, MaMon, SoLuong, DonGia)
SELECT h.MaHD, m.MaMon, x.SoLuong, m.DonGia
FROM dbo.HoaDon h
CROSS APPLY (VALUES (1,2),(7,1),(14,1),(17,4),(35,4)) x(MaMon, SoLuong)
JOIN dbo.MonAn m ON m.MaMon = x.MaMon
WHERE h.TrangThai = N'Đang phục vụ';

/* ---- Cập nhật trạng thái bàn ---- */
UPDATE dbo.BanAn SET TrangThai = N'Đang phục vụ'
 WHERE MaBan IN (SELECT MaBan FROM dbo.HoaDon WHERE TrangThai = N'Đang phục vụ');
`;

// Tạo nội dung hoàn chỉnh cho 02_InsertData.sql
let new02 = header02 + khachHang40 + body3000;

// Chèn 6 hóa đơn demo vào trước khi UPDATE trạng thái bàn / dọn dẹp
const insertDemoPos = new02.indexOf('DROP TABLE #TempHD;');
if (insertDemoPos !== -1) {
  new02 = new02.substring(0, insertDemoPos) + activeDemoInvoices + '\n' + new02.substring(insertDemoPos);
}

fs.writeFileSync(path.join(sqlDir, '02_InsertData.sql'), new02, 'utf8');
console.log(`Đã cập nhật sql/02_InsertData.sql (${(new02.length / 1024).toFixed(1)} KB)`);

// 2. Lắp ráp QuanLyNhaHang_FULL.sql
const f01 = fs.readFileSync(path.join(sqlDir, '01_CreateDatabase_Tables.sql'), 'utf8');
const f03 = fs.readFileSync(path.join(sqlDir, '03_Index_Function_View.sql'), 'utf8');
const f04 = fs.readFileSync(path.join(sqlDir, '04_StoredProcedures_Triggers.sql'), 'utf8');
const f05 = fs.readFileSync(path.join(sqlDir, '05_Queries.sql'), 'utf8');
const f06 = fs.readFileSync(path.join(sqlDir, '06_Test_Demo.sql'), 'utf8');

const fullSql = [
  '/* =====================================================================',
  '   HỆ THỐNG QUẢN LÝ NHÀ HÀNG — SCRIPT TỔNG HỢP DUY NHẤT (FULL)',
  '   Bao gồm: 01 Tạo bảng -> 02 Dữ liệu mẫu 3000 HĐ (2020-2025) -> 03 Index/View/Func -> 04 SP/Trigger -> 05 Queries -> 06 Demo',
  '   ===================================================================== */',
  f01,
  new02,
  f03,
  f04,
  f05,
  f06
].join('\n\n');

fs.writeFileSync(path.join(sqlDir, 'QuanLyNhaHang_FULL.sql'), fullSql, 'utf8');
console.log(`Đã cập nhật sql/QuanLyNhaHang_FULL.sql (${(fullSql.length / 1024).toFixed(1)} KB)`);
