/* =====================================================================
   SCRIPT 03: CHỈ MỤC, HÀM (FUNCTION) VÀ KHUNG NHÌN (VIEW)
   ===================================================================== */
USE QuanLyNhaHang;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/* ======================= 1. INDEX ======================= */
-- Các cột được dùng thường xuyên trong WHERE / JOIN / ORDER BY
CREATE NONCLUSTERED INDEX IX_HoaDon_ThoiGianLap   ON dbo.HoaDon (ThoiGianLap) INCLUDE (TrangThai, ThanhToan);
CREATE NONCLUSTERED INDEX IX_HoaDon_TrangThai     ON dbo.HoaDon (TrangThai, MaBan);
CREATE UNIQUE NONCLUSTERED INDEX UQ_HoaDon_BanDangPhucVu ON dbo.HoaDon (MaBan) WHERE TrangThai = N'Đang phục vụ';
CREATE NONCLUSTERED INDEX IX_HoaDon_MaKH          ON dbo.HoaDon (MaKH);
CREATE NONCLUSTERED INDEX IX_HoaDon_MaNV          ON dbo.HoaDon (MaNV);
CREATE NONCLUSTERED INDEX IX_ChiTietHoaDon_MaMon  ON dbo.ChiTietHoaDon (MaMon) INCLUDE (SoLuong, ThanhTien);
CREATE NONCLUSTERED INDEX IX_MonAn_MaDM           ON dbo.MonAn (MaDM);
CREATE NONCLUSTERED INDEX IX_DatBan_ThoiGianDat   ON dbo.DatBan (ThoiGianDat, MaBan) INCLUDE (TrangThai);
CREATE NONCLUSTERED INDEX IX_KhachHang_HoTen      ON dbo.KhachHang (HoTen);
GO

/* ======================= 2. FUNCTIONS ======================= */

-- 2.1 Tính tuổi từ ngày sinh (scalar)
CREATE FUNCTION dbo.fn_TinhTuoi (@NgaySinh DATE)
RETURNS INT
AS
BEGIN
    IF @NgaySinh IS NULL RETURN NULL;
    RETURN DATEDIFF(YEAR, @NgaySinh, GETDATE())
         - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, @NgaySinh, GETDATE()), @NgaySinh) > GETDATE() THEN 1 ELSE 0 END;
END
GO

-- 2.2 Tính số tiền phải trả của một hóa đơn sau giảm giá (scalar)
CREATE FUNCTION dbo.fn_TinhTienPhaiTra (@MaHD INT)
RETURNS DECIMAL(14,0)
AS
BEGIN
    DECLARE @Tong DECIMAL(14,0), @GiamGia DECIMAL(5,2);
    SELECT @Tong = ISNULL(SUM(ThanhTien), 0) FROM dbo.ChiTietHoaDon WHERE MaHD = @MaHD;
    SELECT @GiamGia = ISNULL(GiamGia, 0) FROM dbo.HoaDon WHERE MaHD = @MaHD;
    RETURN ROUND(@Tong * (1 - @GiamGia / 100.0), 0);
END
GO

-- 2.3 Tính tổng phụ thuế VAT (scalar) - mặc định 8%
CREATE FUNCTION dbo.fn_TinhThueVAT (@SoTien DECIMAL(14,0), @TyLe DECIMAL(5,2) = 8)
RETURNS DECIMAL(14,0)
AS
BEGIN
    RETURN ROUND(@SoTien * ISNULL(@TyLe, 8) / 100.0, 0);
END
GO

-- 2.4 Xếp hạng khách hàng theo điểm tích lũy (scalar)
CREATE FUNCTION dbo.fn_XepHangKhachHang (@Diem INT)
RETURNS NVARCHAR(20)
AS
BEGIN
    RETURN CASE WHEN @Diem >= 1000 THEN N'Kim cương'
                WHEN @Diem >= 500  THEN N'Vàng'
                WHEN @Diem >= 200  THEN N'Bạc'
                ELSE N'Đồng' END;
END
GO

-- 2.5 Danh sách món bán chạy trong khoảng thời gian (inline table-valued)
CREATE FUNCTION dbo.fn_MonBanChay (@TuNgay DATE, @DenNgay DATE)
RETURNS TABLE
AS
RETURN (
    SELECT m.MaMon, m.TenMon, d.TenDM,
           SUM(ct.SoLuong)   AS TongSoLuong,
           SUM(ct.ThanhTien) AS DoanhThu
    FROM dbo.ChiTietHoaDon ct
    JOIN dbo.HoaDon h ON h.MaHD = ct.MaHD
    JOIN dbo.MonAn  m ON m.MaMon = ct.MaMon
    JOIN dbo.DanhMucMon d ON d.MaDM = m.MaDM
    WHERE h.TrangThai = N'Đã thanh toán'
      AND h.ThoiGianThanhToan >= @TuNgay
      AND h.ThoiGianThanhToan < DATEADD(DAY, 1, @DenNgay)
    GROUP BY m.MaMon, m.TenMon, d.TenDM
);
GO

-- 2.6 Kiểm tra bàn có trống trong khung giờ (scalar, dùng cho đặt bàn)
CREATE FUNCTION dbo.fn_BanTrongTrongKhungGio (@MaBan INT, @ThoiGian DATETIME)
RETURNS BIT
AS
BEGIN
    -- Bàn coi là bận nếu có lượt đặt đã xác nhận/chờ xác nhận trong vòng ±2 giờ
    IF EXISTS (SELECT 1 FROM dbo.DatBan
               WHERE MaBan = @MaBan
                 AND TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
                 AND ThoiGianDat > DATEADD(MINUTE, -120, @ThoiGian)
                 AND ThoiGianDat < DATEADD(MINUTE, 120, @ThoiGian))
        RETURN 0;
    RETURN 1;
END
GO

/* ======================= 3. VIEWS ======================= */

-- 3.1 Thực đơn đang kinh doanh (giao diện gọi món)
CREATE VIEW dbo.vw_ThucDon
AS
SELECT m.MaMon, m.TenMon, d.MaDM, d.TenDM, m.DonGia, m.DonViTinh, m.MoTa
FROM dbo.MonAn m
JOIN dbo.DanhMucMon d ON d.MaDM = m.MaDM
WHERE m.ConKinhDoanh = 1;
GO

-- 3.2 View cập nhật được: chỉ cho phép thao tác trên món đang kinh doanh
CREATE VIEW dbo.vw_MonDangKinhDoanh
AS
SELECT MaMon, TenMon, MaDM, DonGia, DonViTinh, MoTa, ConKinhDoanh
FROM dbo.MonAn
WHERE ConKinhDoanh = 1
WITH CHECK OPTION;
GO

-- 3.3 Tình trạng bàn hiện tại kèm hóa đơn đang mở (sơ đồ bàn)
CREATE VIEW dbo.vw_TinhTrangBan
AS
SELECT b.MaBan, b.TenBan, b.KhuVuc, b.SoCho, b.TrangThai,
       h.MaHD, h.ThoiGianLap, h.TongTien,
       DATEDIFF(MINUTE, h.ThoiGianLap, GETDATE()) AS SoPhutDaNgoi,
       k.HoTen AS TenKhach, n.HoTen AS NhanVienPhucVu
FROM dbo.BanAn b
LEFT JOIN dbo.HoaDon h ON h.MaBan = b.MaBan AND h.TrangThai = N'Đang phục vụ'
LEFT JOIN dbo.KhachHang k ON k.MaKH = h.MaKH
LEFT JOIN dbo.NhanVien  n ON n.MaNV = h.MaNV;
GO

-- 3.4 Chi tiết hóa đơn đầy đủ (in hóa đơn)
CREATE VIEW dbo.vw_ChiTietHoaDonDayDu
AS
SELECT h.MaHD, h.ThoiGianLap, h.ThoiGianThanhToan, h.TrangThai, h.PhuongThucTT,
       b.TenBan, b.KhuVuc,
       ISNULL(k.HoTen, N'Khách lẻ') AS TenKhach, n.HoTen AS NhanVien,
       m.MaMon, m.TenMon, ct.SoLuong, ct.DonGia, ct.ThanhTien, ct.GhiChu,
       h.TongTien, h.GiamGia, h.ThanhToan
FROM dbo.HoaDon h
JOIN dbo.ChiTietHoaDon ct ON ct.MaHD = h.MaHD
JOIN dbo.MonAn m  ON m.MaMon = ct.MaMon
JOIN dbo.BanAn b  ON b.MaBan = h.MaBan
JOIN dbo.NhanVien n ON n.MaNV = h.MaNV
LEFT JOIN dbo.KhachHang k ON k.MaKH = h.MaKH;
GO

-- 3.5 Doanh thu theo ngày (báo cáo)
CREATE VIEW dbo.vw_DoanhThuTheoNgay
AS
SELECT CAST(ThoiGianThanhToan AS DATE) AS Ngay,
       COUNT(*)        AS SoHoaDon,
       SUM(TongTien)   AS TongTienHang,
       SUM(TongTien - ThanhToan) AS TienGiamGia,
       SUM(ThanhToan)  AS DoanhThu,
       AVG(ThanhToan)  AS TrungBinhHoaDon
FROM dbo.HoaDon
WHERE TrangThai = N'Đã thanh toán'
GROUP BY CAST(ThoiGianThanhToan AS DATE);
GO

-- 3.6 Nguyên liệu sắp hết (cảnh báo nhập hàng)
CREATE VIEW dbo.vw_NguyenLieuSapHet
AS
SELECT MaNL, TenNL, DonViTinh, SoLuongTon, MucToiThieu,
       MucToiThieu - SoLuongTon AS SoLuongCanNhap,
       (MucToiThieu * 2 - SoLuongTon) * DonGiaNhap AS ChiPhiNhapDuKien
FROM dbo.NguyenLieu
WHERE SoLuongTon <= MucToiThieu;
GO

-- 3.7 Khách hàng thân thiết (CRM)
CREATE VIEW dbo.vw_KhachHangThanThiet
AS
SELECT k.MaKH, k.HoTen, k.SoDienThoai, k.Email, k.GioiTinh, k.NgaySinh,
       dbo.fn_TinhTuoi(k.NgaySinh) AS Tuoi,
       k.DiemTichLuy,
       dbo.fn_XepHangKhachHang(k.DiemTichLuy) AS HangThanhVien,
       COUNT(h.MaHD)       AS SoLanDung,
       ISNULL(SUM(h.ThanhToan), 0) AS TongChiTieu,
       MAX(h.ThoiGianThanhToan)    AS LanGanNhat
FROM dbo.KhachHang k
LEFT JOIN dbo.HoaDon h ON h.MaKH = k.MaKH AND h.TrangThai = N'Đã thanh toán'
GROUP BY k.MaKH, k.HoTen, k.SoDienThoai, k.Email, k.GioiTinh, k.NgaySinh, k.DiemTichLuy;
GO

-- 3.8 Lịch đặt bàn sắp tới
CREATE VIEW dbo.vw_DatBanSapToi
AS
SELECT d.MaDatBan, d.ThoiGianDat, d.SoNguoi, d.TrangThai, d.GhiChu,
       b.TenBan, b.KhuVuc, b.SoCho,
       k.HoTen AS TenKhach, k.SoDienThoai
FROM dbo.DatBan d
JOIN dbo.BanAn b ON b.MaBan = d.MaBan
JOIN dbo.KhachHang k ON k.MaKH = d.MaKH
WHERE d.ThoiGianDat >= CAST(GETDATE() AS DATE)
  AND d.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận');
GO
PRINT N'>> Đã tạo 8 index, 6 function, 8 view.';
GO
