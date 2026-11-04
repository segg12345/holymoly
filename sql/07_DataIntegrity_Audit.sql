/* =====================================================================
   SCRIPT 07: KIỂM TOÁN TOÀN VẸN DỮ LIỆU (DATA INTEGRITY AUDIT)
   Hệ thống Quản lý Nhà hàng Sen Vàng
   Bao gồm 6 nhóm kiểm tra:
     1. Kiểm tra hóa đơn trùng bàn & đồng bộ trạng thái Bàn - Hóa đơn - Đặt bàn
     2. Kiểm tra tổng tiền hóa đơn & thành tiền chi tiết hóa đơn
     3. Kiểm tra đặt bàn trùng lịch (±120 phút) & vượt sức chứa bàn
     4. Kiểm tra tính nhất quán tồn kho & định lượng công thức
     5. Kiểm tra dữ liệu khách hàng & điểm tích lũy
     6. Kiểm tra các bản ghi không có liên kết hợp lệ (Orphan / Invalid Links)
   ===================================================================== */
USE QuanLyNhaHang;
GO
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT N'=====================================================================';
PRINT N'   BÁO CÁO KIỂM TOÁN TOÀN VẸN DỮ LIỆU - NHÀ HÀNG SEN VÀNG';
PRINT N'=====================================================================';

/* ---------------------------------------------------------------------
   1. KIỂM TRA HÓA ĐƠN TRÙNG BÀN & ĐỒNG BỘ TRẠNG THÁI BÀN
   --------------------------------------------------------------------- */
PRINT N'';
PRINT N'--- [1] KIỂM TRA HÓA ĐƠN TRÙNG BÀN & TRẠNG THÁI BÀN ---';

-- 1.1. Bàn có nhiều hơn 1 hóa đơn đang ở trạng thái "Đang phục vụ"
SELECT h.MaBan, b.TenBan, COUNT(*) AS SoHoaDonDangMo
FROM dbo.HoaDon h
LEFT JOIN dbo.BanAn b ON b.MaBan = h.MaBan
WHERE h.TrangThai = N'Đang phục vụ'
GROUP BY h.MaBan, b.TenBan
HAVING COUNT(*) > 1;

-- 1.2. Bàn có hóa đơn "Đang phục vụ" nhưng trạng thái bàn khác "Đang phục vụ",
--      hoặc bàn đang "Đang phục vụ" nhưng không có hóa đơn mở
SELECT b.MaBan, b.TenBan, b.TrangThai AS TrangThaiBanHienTai,
       CASE
           WHEN EXISTS (
               SELECT 1 FROM dbo.HoaDon h
               WHERE h.MaBan = b.MaBan AND h.TrangThai = N'Đang phục vụ'
           ) THEN N'Đang phục vụ'
           WHEN EXISTS (
               SELECT 1 FROM dbo.DatBan d
               WHERE d.MaBan = b.MaBan
                 AND d.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
                 AND d.ThoiGianDat >= CAST(GETDATE() AS DATE)
                 AND d.ThoiGianDat < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
           ) THEN N'Đã đặt'
           ELSE N'Trống'
       END AS TrangThaiKyVong
FROM dbo.BanAn b
WHERE b.TrangThai <> CASE
           WHEN EXISTS (
               SELECT 1 FROM dbo.HoaDon h
               WHERE h.MaBan = b.MaBan AND h.TrangThai = N'Đang phục vụ'
           ) THEN N'Đang phục vụ'
           WHEN EXISTS (
               SELECT 1 FROM dbo.DatBan d
               WHERE d.MaBan = b.MaBan
                 AND d.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
                 AND d.ThoiGianDat >= CAST(GETDATE() AS DATE)
                 AND d.ThoiGianDat < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
           ) THEN N'Đã đặt'
           ELSE N'Trống'
       END;

/* ---------------------------------------------------------------------
   2. KIỂM TRA TỔNG TIỀN HÓA ĐƠN & CHI TIẾT HÓA ĐƠN
   --------------------------------------------------------------------- */
PRINT N'';
PRINT N'--- [2] KIỂM TRA TỔNG TIỀN HÓA ĐƠN ---';

-- 2.1. Sai lệch giữa HoaDon.TongTien và SUM(ChiTietHoaDon.ThanhTien)
SELECT h.MaHD, h.TrangThai,
       h.TongTien AS TongTienHoaDon,
       ISNULL(SUM(ct.ThanhTien), 0) AS TongChiTiet,
       h.TongTien - ISNULL(SUM(ct.ThanhTien), 0) AS ChenhLech
FROM dbo.HoaDon h
LEFT JOIN dbo.ChiTietHoaDon ct ON ct.MaHD = h.MaHD
GROUP BY h.MaHD, h.TrangThai, h.TongTien
HAVING h.TongTien <> ISNULL(SUM(ct.ThanhTien), 0);

-- 2.2. Sai lệch ThanhToan sau giảm giá đối với hóa đơn Đã thanh toán
--       hoặc hóa đơn Đã thanh toán nhưng TongTien <= 0 / thiếu ThoiGianThanhToan / thiếu PhuongThucTT
SELECT h.MaHD, h.TrangThai, h.TongTien, h.GiamGia, h.ThanhToan,
       ROUND(h.TongTien * (1 - h.GiamGia / 100.0), 0) AS ThanhToanKyVong,
       h.ThoiGianThanhToan, h.PhuongThucTT
FROM dbo.HoaDon h
WHERE (h.TrangThai = N'Đã thanh toán'
       AND (h.ThanhToan <> ROUND(h.TongTien * (1 - h.GiamGia / 100.0), 0)
            OR h.TongTien <= 0
            OR h.ThoiGianThanhToan IS NULL
            OR h.PhuongThucTT IS NULL))
   OR (h.TrangThai IN (N'Đang phục vụ', N'Đã hủy')
       AND (h.ThanhToan <> 0 OR h.ThoiGianThanhToan IS NOT NULL));

-- 2.3. Chi tiết hóa đơn có SoLuong <= 0 hoặc DonGia < 0
SELECT MaHD, MaMon, SoLuong, DonGia, ThanhTien
FROM dbo.ChiTietHoaDon
WHERE SoLuong <= 0 OR DonGia < 0 OR ThanhTien <> SoLuong * DonGia;

/* ---------------------------------------------------------------------
   3. KIỂM TRA ĐẶT BÀN TRÙNG LỊCH & SỨC CHỨA BÀN
   --------------------------------------------------------------------- */
PRINT N'';
PRINT N'--- [3] KIỂM TRA ĐẶT BÀN TRÙNG LỊCH & SỨC CHỨA ---';

-- 3.1. Hai lịch đặt bàn hoạt động (Chờ xác nhận / Đã xác nhận) trùng bàn trong khung ±120 phút
SELECT d1.MaDatBan AS MaDatBan1, d2.MaDatBan AS MaDatBan2,
       d1.MaBan, b.TenBan,
       d1.ThoiGianDat AS ThoiGian1, d2.ThoiGianDat AS ThoiGian2,
       DATEDIFF(MINUTE, d1.ThoiGianDat, d2.ThoiGianDat) AS KhoangCachPhut
FROM dbo.DatBan d1
INNER JOIN dbo.DatBan d2
    ON d1.MaBan = d2.MaBan
   AND d1.MaDatBan < d2.MaDatBan
LEFT JOIN dbo.BanAn b ON b.MaBan = d1.MaBan
WHERE d1.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
  AND d2.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
  AND d2.ThoiGianDat > DATEADD(MINUTE, -120, d1.ThoiGianDat)
  AND d2.ThoiGianDat < DATEADD(MINUTE, 120, d1.ThoiGianDat);

-- 3.2. Đặt bàn có số người vượt quá số chỗ của bàn
SELECT d.MaDatBan, d.MaBan, b.TenBan, d.SoNguoi, b.SoCho, d.ThoiGianDat, d.TrangThai
FROM dbo.DatBan d
INNER JOIN dbo.BanAn b ON b.MaBan = d.MaBan
WHERE d.SoNguoi > b.SoCho OR d.SoNguoi <= 0;

/* ---------------------------------------------------------------------
   4. KIỂM TRA TÍNH NHẤT QUÁN TỒN KHO & CÔNG THỨC
   --------------------------------------------------------------------- */
PRINT N'';
PRINT N'--- [4] KIỂM TRA TÍNH NHẤT QUÁN TỒN KHO & ĐỊNH LƯỢNG ---';

-- 4.1. Nguyên liệu có số lượng tồn âm, mức tối thiểu âm hoặc đơn giá nhập âm
SELECT MaNL, TenNL, DonViTinh, SoLuongTon, MucToiThieu, DonGiaNhap
FROM dbo.NguyenLieu
WHERE SoLuongTon < 0 OR MucToiThieu < 0 OR DonGiaNhap < 0;

-- 4.2. Định lượng công thức <= 0
SELECT c.MaMon, m.TenMon, c.MaNL, nl.TenNL, c.DinhLuong
FROM dbo.CongThuc c
LEFT JOIN dbo.MonAn m ON m.MaMon = c.MaMon
LEFT JOIN dbo.NguyenLieu nl ON nl.MaNL = c.MaNL
WHERE c.DinhLuong <= 0;

/* ---------------------------------------------------------------------
   5. KIỂM TRA DỮ LIỆU KHÁCH HÀNG & ĐIỂM TÍCH LUỸ
   --------------------------------------------------------------------- */
PRINT N'';
PRINT N'--- [5] KIỂM TRA KHÁCH HÀNG & ĐIỂM TÍCH LUỸ ---';

-- 5.1. Đối chiếu DiemTichLuy với tổng điểm từ các hóa đơn Đã thanh toán
--      (Quy tắc: mỗi hóa đơn cộng FLOOR(ThanhToan / 10000.0) điểm)
SELECT k.MaKH, k.HoTen, k.SoDienThoai,
       k.DiemTichLuy AS DiemHienTai,
       ISNULL(SUM(CAST(FLOOR(h.ThanhToan / 10000.0) AS INT)), 0) AS DiemTinhTuHoaDon,
       k.DiemTichLuy - ISNULL(SUM(CAST(FLOOR(h.ThanhToan / 10000.0) AS INT)), 0) AS ChenhLech
FROM dbo.KhachHang k
LEFT JOIN dbo.HoaDon h
    ON h.MaKH = k.MaKH AND h.TrangThai = N'Đã thanh toán'
GROUP BY k.MaKH, k.HoTen, k.SoDienThoai, k.DiemTichLuy
HAVING k.DiemTichLuy <> ISNULL(SUM(CAST(FLOOR(h.ThanhToan / 10000.0) AS INT)), 0)
    OR k.DiemTichLuy < 0;

-- 5.2. Khách hàng hoặc nhân viên có SĐT trùng hoặc Email nhân viên trùng (khi khác NULL)
SELECT Email, COUNT(*) AS SoLuongTrung
FROM dbo.NhanVien
WHERE Email IS NOT NULL
GROUP BY Email
HAVING COUNT(*) > 1;

/* ---------------------------------------------------------------------
   6. KIỂM TRA CÁC BẢN GHI KHÔNG CÓ LIÊN KẾT HỢP LỆ (ORPHAN RECORDS)
   --------------------------------------------------------------------- */
PRINT N'';
PRINT N'--- [6] KIỂM TRA BẢN GHI MỒ CÔI / LIÊN KẾT KHÔNG HỢP LỆ ---';

SELECT LoaiLoi, MaBanGhi, ChiTiet
FROM (
    -- 6.1. MonAn tham chiếu DanhMucMon không tồn tại
    SELECT N'MonAn -> DanhMucMon' AS LoaiLoi,
           CAST(m.MaMon AS NVARCHAR(50)) AS MaBanGhi,
           N'MaDM=' + CAST(m.MaDM AS NVARCHAR(20)) AS ChiTiet
    FROM dbo.MonAn m
    LEFT JOIN dbo.DanhMucMon d ON d.MaDM = m.MaDM
    WHERE d.MaDM IS NULL

    UNION ALL

    -- 6.2. CongThuc tham chiếu MonAn hoặc NguyenLieu không tồn tại
    SELECT N'CongThuc -> MonAn/NguyenLieu',
           CAST(c.MaMon AS NVARCHAR(20)) + N'-' + CAST(c.MaNL AS NVARCHAR(20)),
           N'Thiếu MonAn hoặc NguyenLieu'
    FROM dbo.CongThuc c
    LEFT JOIN dbo.MonAn m ON m.MaMon = c.MaMon
    LEFT JOIN dbo.NguyenLieu nl ON nl.MaNL = c.MaNL
    WHERE m.MaMon IS NULL OR nl.MaNL IS NULL

    UNION ALL

    -- 6.3. DatBan tham chiếu KhachHang hoặc BanAn không tồn tại
    SELECT N'DatBan -> KhachHang/BanAn',
           CAST(db.MaDatBan AS NVARCHAR(50)),
           N'MaKH=' + CAST(db.MaKH AS NVARCHAR(20)) + N', MaBan=' + CAST(db.MaBan AS NVARCHAR(20))
    FROM dbo.DatBan db
    LEFT JOIN dbo.KhachHang k ON k.MaKH = db.MaKH
    LEFT JOIN dbo.BanAn b ON b.MaBan = db.MaBan
    WHERE k.MaKH IS NULL OR b.MaBan IS NULL

    UNION ALL

    -- 6.4. HoaDon tham chiếu BanAn, NhanVien hoặc KhachHang (khi khác NULL) không tồn tại
    SELECT N'HoaDon -> BanAn/NhanVien/KhachHang',
           CAST(h.MaHD AS NVARCHAR(50)),
           N'MaBan=' + CAST(h.MaBan AS NVARCHAR(20)) + N', MaNV=' + CAST(h.MaNV AS NVARCHAR(20))
           + N', MaKH=' + ISNULL(CAST(h.MaKH AS NVARCHAR(20)), N'NULL')
    FROM dbo.HoaDon h
    LEFT JOIN dbo.BanAn b ON b.MaBan = h.MaBan
    LEFT JOIN dbo.NhanVien nv ON nv.MaNV = h.MaNV
    LEFT JOIN dbo.KhachHang k ON k.MaKH = h.MaKH
    WHERE b.MaBan IS NULL
       OR nv.MaNV IS NULL
       OR (h.MaKH IS NOT NULL AND k.MaKH IS NULL)

    UNION ALL

    -- 6.5. ChiTietHoaDon tham chiếu HoaDon hoặc MonAn không tồn tại
    SELECT N'ChiTietHoaDon -> HoaDon/MonAn',
           CAST(ct.MaHD AS NVARCHAR(20)) + N'-' + CAST(ct.MaMon AS NVARCHAR(20)),
           N'Thiếu HoaDon hoặc MonAn'
    FROM dbo.ChiTietHoaDon ct
    LEFT JOIN dbo.HoaDon h ON h.MaHD = ct.MaHD
    LEFT JOIN dbo.MonAn m ON m.MaMon = ct.MaMon
    WHERE h.MaHD IS NULL OR m.MaMon IS NULL
) AS OrphanChecks;

-- 6.6. Kiểm tra riêng bảng log NhatKyHoaDon (bảng append-only log không gắn FK để giữ vết kiểm toán)
SELECT nk.MaNK, nk.MaHD, nk.HanhDong, nk.NoiDung, nk.NguoiThucHien, nk.ThoiGian
FROM dbo.NhatKyHoaDon nk
LEFT JOIN dbo.HoaDon h ON h.MaHD = nk.MaHD
WHERE nk.MaHD IS NULL OR h.MaHD IS NULL;

/* ---------------------------------------------------------------------
   TỔNG HỢP KẾT QUẢ KIỂM TOÁN (SUMMARY)
   --------------------------------------------------------------------- */
PRINT N'';
PRINT N'--- [TỔNG HỢP] SỐ LƯỢNG VI PHẠM THEO TỪNG HẠNG MỤC ---';

SELECT
    (SELECT COUNT(*) FROM (
        SELECT h.MaBan FROM dbo.HoaDon h WHERE h.TrangThai = N'Đang phục vụ' GROUP BY h.MaBan HAVING COUNT(*) > 1
    ) t1) AS Loi_HoaDonTrungBan,
    (SELECT COUNT(*) FROM dbo.BanAn b WHERE b.TrangThai <> CASE
        WHEN EXISTS (SELECT 1 FROM dbo.HoaDon h WHERE h.MaBan = b.MaBan AND h.TrangThai = N'Đang phục vụ') THEN N'Đang phục vụ'
        WHEN EXISTS (SELECT 1 FROM dbo.DatBan d WHERE d.MaBan = b.MaBan AND d.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
                     AND d.ThoiGianDat >= CAST(GETDATE() AS DATE) AND d.ThoiGianDat < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))) THEN N'Đã đặt'
        ELSE N'Trống' END) AS Loi_DongBoTrangThaiBan,
    (SELECT COUNT(*) FROM (
        SELECT h.MaHD FROM dbo.HoaDon h LEFT JOIN dbo.ChiTietHoaDon ct ON ct.MaHD = h.MaHD
        GROUP BY h.MaHD, h.TongTien HAVING h.TongTien <> ISNULL(SUM(ct.ThanhTien), 0)
    ) t2) AS Loi_TongTienHoaDon,
    (SELECT COUNT(*) FROM dbo.HoaDon h
     WHERE (h.TrangThai = N'Đã thanh toán' AND (h.ThanhToan <> ROUND(h.TongTien * (1 - h.GiamGia / 100.0), 0) OR h.TongTien <= 0))
        OR (h.TrangThai IN (N'Đang phục vụ', N'Đã hủy') AND h.ThanhToan <> 0)) AS Loi_ThanhToanSauGiam,
    (SELECT COUNT(*) FROM dbo.DatBan d1 INNER JOIN dbo.DatBan d2 ON d1.MaBan = d2.MaBan AND d1.MaDatBan < d2.MaDatBan
     WHERE d1.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận') AND d2.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
       AND d2.ThoiGianDat > DATEADD(MINUTE, -120, d1.ThoiGianDat) AND d2.ThoiGianDat < DATEADD(MINUTE, 120, d1.ThoiGianDat)) AS Loi_DatBanTrungLich,
    (SELECT COUNT(*) FROM dbo.DatBan d INNER JOIN dbo.BanAn b ON b.MaBan = d.MaBan WHERE d.SoNguoi > b.SoCho OR d.SoNguoi <= 0) AS Loi_DatBanVuotSoCho,
    (SELECT COUNT(*) FROM dbo.NguyenLieu WHERE SoLuongTon < 0 OR MucToiThieu < 0 OR DonGiaNhap < 0) AS Loi_TonKhoNguyenLieu,
    (SELECT COUNT(*) FROM (
        SELECT k.MaKH FROM dbo.KhachHang k LEFT JOIN dbo.HoaDon h ON h.MaKH = k.MaKH AND h.TrangThai = N'Đã thanh toán'
        GROUP BY k.MaKH, k.DiemTichLuy
        HAVING k.DiemTichLuy <> ISNULL(SUM(CAST(FLOOR(h.ThanhToan / 10000.0) AS INT)), 0) OR k.DiemTichLuy < 0
    ) t5) AS Loi_DiemTichLuyKhachHang,
    (SELECT COUNT(*) FROM (
        SELECT m.MaMon FROM dbo.MonAn m LEFT JOIN dbo.DanhMucMon d ON d.MaDM = m.MaDM WHERE d.MaDM IS NULL
        UNION ALL
        SELECT c.MaMon FROM dbo.CongThuc c LEFT JOIN dbo.MonAn m ON m.MaMon = c.MaMon LEFT JOIN dbo.NguyenLieu nl ON nl.MaNL = c.MaNL WHERE m.MaMon IS NULL OR nl.MaNL IS NULL
        UNION ALL
        SELECT db.MaDatBan FROM dbo.DatBan db LEFT JOIN dbo.KhachHang k ON k.MaKH = db.MaKH LEFT JOIN dbo.BanAn b ON b.MaBan = db.MaBan WHERE k.MaKH IS NULL OR b.MaBan IS NULL
        UNION ALL
        SELECT h.MaHD FROM dbo.HoaDon h LEFT JOIN dbo.BanAn b ON b.MaBan = h.MaBan LEFT JOIN dbo.NhanVien nv ON nv.MaNV = h.MaNV LEFT JOIN dbo.KhachHang k ON k.MaKH = h.MaKH WHERE b.MaBan IS NULL OR nv.MaNV IS NULL OR (h.MaKH IS NOT NULL AND k.MaKH IS NULL)
        UNION ALL
        SELECT ct.MaHD FROM dbo.ChiTietHoaDon ct LEFT JOIN dbo.HoaDon h ON h.MaHD = ct.MaHD LEFT JOIN dbo.MonAn m ON m.MaMon = ct.MaMon WHERE h.MaHD IS NULL OR m.MaMon IS NULL
    ) t6) AS Loi_BanGhiMoCoi,
    (SELECT COUNT(*) FROM dbo.NhatKyHoaDon nk LEFT JOIN dbo.HoaDon h ON h.MaHD = nk.MaHD WHERE nk.MaHD IS NULL OR h.MaHD IS NULL) AS CanhBao_LogHoaDonDaXoa;
GO
