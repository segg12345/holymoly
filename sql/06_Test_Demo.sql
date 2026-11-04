/* =====================================================================
   SCRIPT 06: KIỂM THỬ - DEMO STORED PROCEDURE, RÀNG BUỘC, TRANSACTION
   ===================================================================== */
USE QuanLyNhaHang;
GO
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT N'===== A. DEMO QUY TRÌNH BÁN HÀNG: MỞ HÓA ĐƠN → GỌI MÓN → THANH TOÁN =====';
DECLARE @MaHD INT, @PhaiTra DECIMAL(14,0);

-- A1. Mở hóa đơn cho bàn T1-01 (MaBan=1) bởi NV Phạm Minh Tuấn (MaNV=4), khách MaKH=2
EXEC dbo.sp_MoHoaDon @MaBan = 1, @MaNV = 4, @MaKH = 2, @MaHD = @MaHD OUTPUT;
PRINT N'Đã mở hóa đơn số: ' + CAST(@MaHD AS NVARCHAR);

-- A2. Gọi món (kiểm tra & trừ kho)
EXEC dbo.sp_ThemMonVaoHoaDon @MaHD, 7,  1, N'Nướng kỹ';   -- Gà nướng mật ong
EXEC dbo.sp_ThemMonVaoHoaDon @MaHD, 14, 1;                -- Rau muống xào tỏi
EXEC dbo.sp_ThemMonVaoHoaDon @MaHD, 17, 2;                -- Cơm trắng
EXEC dbo.sp_ThemMonVaoHoaDon @MaHD, 35, 2;                -- Bia Tiger
EXEC dbo.sp_ThemMonVaoHoaDon @MaHD, 35, 1;                -- gọi thêm 1 bia -> cộng dồn thành 3

SELECT * FROM dbo.vw_ChiTietHoaDonDayDu WHERE MaHD = @MaHD;
SELECT MaBan, TenBan, TrangThai FROM dbo.BanAn WHERE MaBan = 1;   -- Đang phục vụ
SELECT dbo.fn_TinhTienPhaiTra(@MaHD) AS TienPhaiTra_TruocGiam;

-- A3. Thanh toán bằng thẻ, giảm 10%
EXEC dbo.sp_ThanhToanHoaDon @MaHD, N'Thẻ', 10, @PhaiTra OUTPUT;
PRINT N'Khách phải trả: ' + FORMAT(@PhaiTra, 'N0') + N' đ';
SELECT MaHD, TrangThai, TongTien, GiamGia, ThanhToan, PhuongThucTT FROM dbo.HoaDon WHERE MaHD = @MaHD;
SELECT MaBan, TenBan, TrangThai FROM dbo.BanAn WHERE MaBan = 1;   -- Trống trở lại
SELECT MaKH, HoTen, DiemTichLuy FROM dbo.KhachHang WHERE MaKH = 2; -- điểm đã cộng
SELECT * FROM dbo.NhatKyHoaDon WHERE MaHD = @MaHD;

PRINT N'';
PRINT N'===== B. DEMO ĐẶT BÀN & BÁO CÁO =====';
DECLARE @MaDB INT, @Tong DECIMAL(16,0);
DECLARE @NgayDatTuongLai DATETIME = DATEADD(DAY, 7, GETDATE());
EXEC dbo.sp_DatBan @MaKH = 5, @MaBan = 17, @ThoiGianDat = @NgayDatTuongLai, @SoNguoi = 6,
                   @GhiChu = N'Sinh nhật', @MaDatBan = @MaDB OUTPUT;
PRINT N'Đã đặt bàn, mã: ' + CAST(@MaDB AS NVARCHAR);

EXEC dbo.sp_BaoCaoDoanhThuTheoThang @Nam = 2026, @TongDoanhThu = @Tong OUTPUT;
PRINT N'Tổng doanh thu năm 2026: ' + FORMAT(@Tong, 'N0') + N' đ';

EXEC dbo.sp_NhapKhoNguyenLieu @MaNL = 9, @SoLuong = 10, @DonGiaNhap = 460000;

-- Dọn lượt đặt bàn demo để kịch bản có thể chạy lại nhiều lần (idempotent)
DELETE FROM dbo.DatBan WHERE MaDatBan = @MaDB;

PRINT N'';
PRINT N'===== C. KIỂM TRA VI PHẠM RÀNG BUỘC (mỗi lệnh dự kiến LỖI, được bắt bằng TRY/CATCH) =====';

BEGIN TRY  -- C1. CHECK: số chỗ = 0
    INSERT INTO dbo.BanAn (TenBan, SoCho, KhuVuc) VALUES (N'TEST-01', 0, N'Tầng 1');
END TRY BEGIN CATCH PRINT N'[C1 CHECK] ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY  -- C2. UNIQUE: trùng số điện thoại khách hàng
    INSERT INTO dbo.KhachHang (HoTen, SoDienThoai) VALUES (N'Khách trùng SĐT', '0912000001');
END TRY BEGIN CATCH PRINT N'[C2 UNIQUE] ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY  -- C3. FOREIGN KEY: danh mục không tồn tại
    INSERT INTO dbo.MonAn (TenMon, MaDM, DonGia) VALUES (N'Món lạ', 999, 50000);
END TRY BEGIN CATCH PRINT N'[C3 FK] ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY  -- C4. NOT NULL: thiếu họ tên
    INSERT INTO dbo.KhachHang (HoTen, SoDienThoai) VALUES (NULL, '0999999999');
END TRY BEGIN CATCH PRINT N'[C4 NOT NULL] ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY  -- C5. CHECK: giảm giá 150%
    UPDATE dbo.HoaDon SET GiamGia = 150 WHERE MaHD = 1;
END TRY BEGIN CATCH PRINT N'[C5 CHECK] ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY  -- C6. FK: xóa danh mục đang được tham chiếu
    DELETE FROM dbo.DanhMucMon WHERE MaDM = 1;
END TRY BEGIN CATCH PRINT N'[C6 FK DELETE] ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY  -- C7. WITH CHECK OPTION: chèn món ngừng kinh doanh qua view
    INSERT INTO dbo.vw_MonDangKinhDoanh (TenMon, MaDM, DonGia, DonViTinh, ConKinhDoanh)
    VALUES (N'Món ngừng bán', 1, 30000, N'Phần', 0);
END TRY BEGIN CATCH PRINT N'[C7 CHECK OPTION] ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY  -- C8. Nghiệp vụ: thanh toán hóa đơn đã thanh toán
    DECLARE @x DECIMAL(14,0);
    EXEC dbo.sp_ThanhToanHoaDon 1, N'Tiền mặt', 0, @x OUTPUT;
END TRY BEGIN CATCH PRINT N'[C8 SP] ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY  -- C9. Nghiệp vụ: gọi món vượt tồn kho (Cua rang me cần 0.65kg cua/phần, kho tồn 15kg Cua thịt)
    DECLARE @HD2 INT;
    EXEC dbo.sp_MoHoaDon 2, 5, NULL, @HD2 OUTPUT;
    EXEC dbo.sp_ThemMonVaoHoaDon @HD2, 26, 100;
END TRY BEGIN CATCH PRINT N'[C9 SP TỒN KHO] ' + ERROR_MESSAGE(); END CATCH

BEGIN TRY  -- C10. Trigger: sửa chi tiết của hóa đơn đã thanh toán
    UPDATE dbo.ChiTietHoaDon SET SoLuong = 99 WHERE MaHD = 1;
END TRY BEGIN CATCH PRINT N'[C10 TRIGGER] ' + ERROR_MESSAGE(); END CATCH

-- dọn hóa đơn test C9
EXEC dbo.sp_HuyHoaDon @MaHD = @HD2, @LyDo = N'Test tồn kho';

PRINT N'';
PRINT N'===== D. TRANSACTION: BEGIN TRAN / ROLLBACK / COMMIT =====';
SELECT TenNL, SoLuongTon AS TruocKhiSua FROM dbo.NguyenLieu WHERE MaNL = 1;

BEGIN TRANSACTION;
    UPDATE dbo.NguyenLieu SET SoLuongTon = 0 WHERE MaNL = 1;
    SELECT TenNL, SoLuongTon AS TrongTransaction FROM dbo.NguyenLieu WHERE MaNL = 1;
ROLLBACK TRANSACTION;
SELECT TenNL, SoLuongTon AS SauRollback FROM dbo.NguyenLieu WHERE MaNL = 1;   -- về giá trị cũ

-- Demo tăng giá đồ uống 5% trong Transaction và ROLLBACK để bảo đảm tính idempotent cho kịch bản
BEGIN TRANSACTION;
    UPDATE dbo.MonAn SET DonGia = DonGia * 1.05 WHERE MaDM = 6;  -- tăng giá đồ uống 5%
    SELECT TenMon, DonGia AS DonGiaMoi FROM dbo.MonAn WHERE MaDM = 6;
ROLLBACK TRANSACTION;
SELECT TenMon, DonGia AS DonGiaHienTai FROM dbo.MonAn WHERE MaDM = 6;

PRINT N'';
PRINT N'===== E. KIỂM TRA HIỆU SUẤT INDEX =====';
-- Bật thống kê để so sánh (xem tab Messages)
SET STATISTICS IO ON;
SELECT COUNT(*) FROM dbo.HoaDon WHERE ThoiGianLap >= DATEADD(DAY, -7, GETDATE()) AND TrangThai = N'Đã thanh toán';
SET STATISTICS IO OFF;
GO
PRINT N'>> Hoàn tất kiểm thử.';
GO
