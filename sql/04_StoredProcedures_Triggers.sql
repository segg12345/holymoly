/* =====================================================================
   SCRIPT 04: STORED PROCEDURES & TRIGGERS (NGHIỆP VỤ)
   ===================================================================== */
USE QuanLyNhaHang;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/* ======================= TRIGGERS ======================= */

-- Tự động cập nhật TongTien / ThanhToan của hóa đơn khi chi tiết thay đổi
CREATE TRIGGER dbo.trg_ChiTietHoaDon_CapNhatTongTien
ON dbo.ChiTietHoaDon
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ;WITH HD AS (SELECT MaHD FROM inserted UNION SELECT MaHD FROM deleted)
    UPDATE h
       SET TongTien  = ISNULL(ct.Tong, 0),
           ThanhToan = CASE WHEN h.TrangThai = N'Đã thanh toán'
                            THEN ROUND(ISNULL(ct.Tong, 0) * (1 - h.GiamGia / 100.0), 0) ELSE 0 END
    FROM dbo.HoaDon h
    JOIN HD ON HD.MaHD = h.MaHD
    LEFT JOIN (SELECT MaHD, SUM(ThanhTien) Tong FROM dbo.ChiTietHoaDon GROUP BY MaHD) ct ON ct.MaHD = h.MaHD;
END
GO

-- Không cho sửa/xóa chi tiết của hóa đơn đã thanh toán
CREATE TRIGGER dbo.trg_ChiTietHoaDon_KhoaHoaDonDaThanhToan
ON dbo.ChiTietHoaDon
FOR INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM dbo.HoaDon h
               WHERE h.TrangThai <> N'Đang phục vụ'
                 AND h.MaHD IN (SELECT MaHD FROM inserted UNION SELECT MaHD FROM deleted))
    BEGIN
        RAISERROR(N'Không thể thay đổi chi tiết của hóa đơn đã thanh toán hoặc đã hủy.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END
GO

-- Tự động đồng bộ trạng thái Bàn Ăn khi Lịch Đặt Bàn thay đổi
CREATE TRIGGER dbo.trg_DatBan_DongBoTrangThaiBan
ON dbo.DatBan
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ;WITH AffectedTables AS (
        SELECT MaBan FROM inserted
        UNION
        SELECT MaBan FROM deleted
    )
    UPDATE b
       SET TrangThai = CASE
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
       END
    FROM dbo.BanAn b
    JOIN AffectedTables a ON a.MaBan = b.MaBan;
END
GO

/* ======================= STORED PROCEDURES ======================= */

-- SP1. Mở hóa đơn mới cho một bàn (khách vào bàn)
CREATE PROCEDURE dbo.sp_MoHoaDon
    @MaBan INT,
    @MaNV  INT,
    @MaKH  INT = NULL,
    @MaHD  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
            DECLARE @TrangThaiBan NVARCHAR(20);
            SELECT @TrangThaiBan = TrangThai
            FROM dbo.BanAn WITH (UPDLOCK, HOLDLOCK)
            WHERE MaBan = @MaBan;

            IF @TrangThaiBan IS NULL
                THROW 50001, N'Bàn không tồn tại.', 1;
            IF @TrangThaiBan = N'Đang phục vụ'
                OR EXISTS (SELECT 1 FROM dbo.HoaDon WITH (UPDLOCK, HOLDLOCK) WHERE MaBan = @MaBan AND TrangThai = N'Đang phục vụ')
                THROW 50002, N'Bàn đang có khách, không thể mở hóa đơn mới.', 1;
            IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE MaNV = @MaNV AND DangLamViec = 1)
                THROW 50003, N'Nhân viên không hợp lệ hoặc đã nghỉ việc.', 1;
            IF @MaKH IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.KhachHang WHERE MaKH = @MaKH)
                THROW 50004, N'Khách hàng không tồn tại.', 1;

            INSERT INTO dbo.HoaDon (MaBan, MaKH, MaNV) VALUES (@MaBan, @MaKH, @MaNV);
            SET @MaHD = SCOPE_IDENTITY();

            -- Nếu bàn này có lượt đặt của khách trong ±2h thì đánh dấu "Đã đến"
            UPDATE dbo.DatBan SET TrangThai = N'Đã đến'
             WHERE MaBan = @MaBan AND TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
               AND ThoiGianDat > DATEADD(MINUTE, -120, GETDATE())
               AND ThoiGianDat < DATEADD(MINUTE, 120, GETDATE());

            UPDATE dbo.BanAn SET TrangThai = N'Đang phục vụ' WHERE MaBan = @MaBan;

            INSERT INTO dbo.NhatKyHoaDon (MaHD, HanhDong, NoiDung)
            VALUES (@MaHD, N'Mở hóa đơn', CONCAT(N'Bàn ', @MaBan, N', NV ', @MaNV));
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- SP2. Thêm món vào hóa đơn + kiểm tra & trừ tồn kho nguyên liệu
CREATE PROCEDURE dbo.sp_ThemMonVaoHoaDon
    @MaHD    INT,
    @MaMon   INT,
    @SoLuong INT,
    @GhiChu  NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF @SoLuong IS NULL OR @SoLuong <= 0
            THROW 50010, N'Số lượng phải lớn hơn 0.', 1;

        BEGIN TRANSACTION;
            IF NOT EXISTS (SELECT 1 FROM dbo.HoaDon WITH (UPDLOCK, HOLDLOCK) WHERE MaHD = @MaHD AND TrangThai = N'Đang phục vụ')
                THROW 50011, N'Hóa đơn không tồn tại hoặc không ở trạng thái Đang phục vụ.', 1;

            DECLARE @DonGia DECIMAL(12,0);
            SELECT @DonGia = DonGia FROM dbo.MonAn WITH (UPDLOCK) WHERE MaMon = @MaMon AND ConKinhDoanh = 1;
            IF @DonGia IS NULL
                THROW 50012, N'Món ăn không tồn tại hoặc đã ngừng kinh doanh.', 1;

            -- Kiểm tra tồn kho có khóa dòng nguyên liệu: nguyên liệu nào thiếu thì báo lỗi kèm tên
            DECLARE @NLThieu NVARCHAR(100);
            SELECT TOP 1 @NLThieu = nl.TenNL
            FROM dbo.CongThuc c
            JOIN dbo.NguyenLieu nl WITH (UPDLOCK, HOLDLOCK) ON nl.MaNL = c.MaNL
            WHERE c.MaMon = @MaMon AND nl.SoLuongTon < c.DinhLuong * @SoLuong;

            IF @NLThieu IS NOT NULL
            BEGIN
                DECLARE @Msg NVARCHAR(200) = CONCAT(N'Không đủ nguyên liệu: ', @NLThieu);
                THROW 50013, @Msg, 1;
            END

            -- Món đã có trong hóa đơn thì cộng dồn số lượng
            IF EXISTS (SELECT 1 FROM dbo.ChiTietHoaDon WITH (UPDLOCK, HOLDLOCK) WHERE MaHD = @MaHD AND MaMon = @MaMon)
                UPDATE dbo.ChiTietHoaDon
                   SET SoLuong = SoLuong + @SoLuong,
                       GhiChu  = COALESCE(@GhiChu, GhiChu)
                 WHERE MaHD = @MaHD AND MaMon = @MaMon;
            ELSE
                INSERT INTO dbo.ChiTietHoaDon (MaHD, MaMon, SoLuong, DonGia, GhiChu)
                VALUES (@MaHD, @MaMon, @SoLuong, @DonGia, @GhiChu);

            -- Trừ tồn kho nguyên liệu theo công thức
            UPDATE nl SET SoLuongTon = nl.SoLuongTon - c.DinhLuong * @SoLuong
            FROM dbo.NguyenLieu nl JOIN dbo.CongThuc c ON c.MaNL = nl.MaNL
            WHERE c.MaMon = @MaMon;

            INSERT INTO dbo.NhatKyHoaDon (MaHD, HanhDong, NoiDung)
            VALUES (@MaHD, N'Thêm món', CONCAT(N'Món ', @MaMon, N' x', @SoLuong));
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- SP3. Thanh toán hóa đơn: áp dụng giảm giá, cộng điểm, giải phóng bàn
CREATE PROCEDURE dbo.sp_ThanhToanHoaDon
    @MaHD          INT,
    @PhuongThucTT  NVARCHAR(20),
    @GiamGia       DECIMAL(5,2) = 0,
    @SoTienPhaiTra DECIMAL(14,0) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF @GiamGia < 0 OR @GiamGia > 100
            THROW 50022, N'Giảm giá phải trong khoảng 0-100%.', 1;
        IF @PhuongThucTT IS NULL OR @PhuongThucTT NOT IN (N'Tiền mặt', N'Chuyển khoản', N'Thẻ')
            THROW 50023, N'Phương thức thanh toán không hợp lệ.', 1;

        BEGIN TRANSACTION;
            DECLARE @MaBan INT, @MaKH INT, @TongTien DECIMAL(14,0), @TrangThai NVARCHAR(20);
            SELECT @MaBan = MaBan, @MaKH = MaKH, @TongTien = TongTien, @TrangThai = TrangThai
            FROM dbo.HoaDon WITH (UPDLOCK, HOLDLOCK)
            WHERE MaHD = @MaHD;

            IF @TrangThai IS NULL OR @TrangThai <> N'Đang phục vụ'
                THROW 50020, N'Hóa đơn không tồn tại hoặc đã được thanh toán/hủy.', 1;

            IF NOT EXISTS (SELECT 1 FROM dbo.ChiTietHoaDon WITH (HOLDLOCK) WHERE MaHD = @MaHD)
                THROW 50021, N'Hóa đơn chưa có món nào, không thể thanh toán.', 1;

            SET @SoTienPhaiTra = ROUND(@TongTien * (1 - @GiamGia / 100.0), 0);

            UPDATE dbo.HoaDon
               SET TrangThai = N'Đã thanh toán',
                   ThoiGianThanhToan = GETDATE(),
                   PhuongThucTT = @PhuongThucTT,
                   GiamGia = @GiamGia,
                   ThanhToan = @SoTienPhaiTra
             WHERE MaHD = @MaHD AND TrangThai = N'Đang phục vụ';

            IF @@ROWCOUNT = 0
                THROW 50020, N'Hóa đơn đã được xử lý bởi giao dịch khác.', 1;

            UPDATE dbo.BanAn
               SET TrangThai = CASE
                   WHEN EXISTS (
                       SELECT 1 FROM dbo.DatBan d
                       WHERE d.MaBan = @MaBan
                         AND d.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
                         AND d.ThoiGianDat >= CAST(GETDATE() AS DATE)
                         AND d.ThoiGianDat < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
                   ) THEN N'Đã đặt'
                   ELSE N'Trống'
               END
             WHERE MaBan = @MaBan;

            IF @MaKH IS NOT NULL
                UPDATE dbo.KhachHang
                   SET DiemTichLuy = DiemTichLuy + CAST(FLOOR(@SoTienPhaiTra / 10000.0) AS INT)
                 WHERE MaKH = @MaKH;

            INSERT INTO dbo.NhatKyHoaDon (MaHD, HanhDong, NoiDung)
            VALUES (@MaHD, N'Thanh toán', CONCAT(@PhuongThucTT, N' - ', FORMAT(@SoTienPhaiTra, 'N0'), N' đ'));
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- SP4. Hủy hóa đơn: hoàn lại nguyên liệu, giải phóng bàn
CREATE PROCEDURE dbo.sp_HuyHoaDon
    @MaHD  INT,
    @LyDo  NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
            DECLARE @MaBan INT, @TrangThai NVARCHAR(20);
            SELECT @MaBan = MaBan, @TrangThai = TrangThai
            FROM dbo.HoaDon WITH (UPDLOCK, HOLDLOCK)
            WHERE MaHD = @MaHD;

            IF @TrangThai IS NULL OR @TrangThai <> N'Đang phục vụ'
                THROW 50030, N'Chỉ có thể hủy hóa đơn đang phục vụ.', 1;

            UPDATE dbo.HoaDon
               SET TrangThai = N'Đã hủy',
                   ThanhToan = 0,
                   GhiChu = @LyDo
             WHERE MaHD = @MaHD AND TrangThai = N'Đang phục vụ';

            IF @@ROWCOUNT = 0
                THROW 50030, N'Chỉ có thể hủy hóa đơn đang phục vụ.', 1;

            -- hoàn kho (tổng hợp theo nguyên liệu để tránh cập nhật nhiều lần cùng 1 dòng)
            UPDATE nl
               SET SoLuongTon = nl.SoLuongTon + t.TongHoan
            FROM dbo.NguyenLieu nl
            JOIN (
                SELECT c.MaNL, SUM(c.DinhLuong * ct.SoLuong) AS TongHoan
                FROM dbo.CongThuc c
                JOIN dbo.ChiTietHoaDon ct ON ct.MaMon = c.MaMon
                WHERE ct.MaHD = @MaHD
                GROUP BY c.MaNL
            ) t ON t.MaNL = nl.MaNL;

            UPDATE dbo.BanAn
               SET TrangThai = CASE
                   WHEN EXISTS (
                       SELECT 1 FROM dbo.DatBan d
                       WHERE d.MaBan = @MaBan
                         AND d.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
                         AND d.ThoiGianDat >= CAST(GETDATE() AS DATE)
                         AND d.ThoiGianDat < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
                   ) THEN N'Đã đặt'
                   ELSE N'Trống'
               END
             WHERE MaBan = @MaBan;

            INSERT INTO dbo.NhatKyHoaDon (MaHD, HanhDong, NoiDung)
            VALUES (@MaHD, N'Hủy hóa đơn', @LyDo);
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- SP5. Đặt bàn: kiểm tra sức chứa và trùng lịch
CREATE PROCEDURE dbo.sp_DatBan
    @MaKH        INT,
    @MaBan       INT,
    @ThoiGianDat DATETIME,
    @SoNguoi     TINYINT,
    @GhiChu      NVARCHAR(255) = NULL,
    @MaDatBan    INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF @ThoiGianDat < GETDATE()
            THROW 50040, N'Thời gian đặt phải ở tương lai.', 1;
        IF @SoNguoi IS NULL OR @SoNguoi <= 0
            THROW 50041, N'Số người đặt bàn không hợp lệ.', 1;

        BEGIN TRANSACTION;
            IF NOT EXISTS (SELECT 1 FROM dbo.KhachHang WHERE MaKH = @MaKH)
                THROW 50043, N'Khách hàng không tồn tại.', 1;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.BanAn WITH (UPDLOCK, HOLDLOCK)
                WHERE MaBan = @MaBan AND SoCho >= @SoNguoi
            )
                THROW 50041, N'Bàn không tồn tại hoặc không đủ chỗ cho số người yêu cầu.', 1;

            IF EXISTS (
                SELECT 1 FROM dbo.DatBan WITH (UPDLOCK, HOLDLOCK)
                WHERE MaBan = @MaBan
                  AND TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận')
                  AND ThoiGianDat > DATEADD(MINUTE, -120, @ThoiGianDat)
                  AND ThoiGianDat < DATEADD(MINUTE, 120, @ThoiGianDat)
            )
                THROW 50042, N'Bàn đã có người đặt trong khung giờ này (±2 giờ).', 1;

            INSERT INTO dbo.DatBan (MaKH, MaBan, ThoiGianDat, SoNguoi, GhiChu)
            VALUES (@MaKH, @MaBan, @ThoiGianDat, @SoNguoi, @GhiChu);
            SET @MaDatBan = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- SP6. Báo cáo doanh thu theo tháng của một năm (có tham số OUTPUT)
CREATE PROCEDURE dbo.sp_BaoCaoDoanhThuTheoThang
    @Nam          INT,
    @TongDoanhThu DECIMAL(16,0) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @TuNgay DATETIME = DATEFROMPARTS(@Nam, 1, 1);
    DECLARE @DenNgay DATETIME = DATEFROMPARTS(@Nam + 1, 1, 1);

    SELECT MONTH(h.ThoiGianThanhToan)        AS Thang,
           COUNT(*)                          AS SoHoaDon,
           SUM(h.TongTien)                   AS TongTienHang,
           SUM(h.TongTien - h.ThanhToan)     AS TienGiamGia,
           SUM(h.ThanhToan)                  AS DoanhThu,
           AVG(h.ThanhToan)                  AS TrungBinhHoaDon,
           COUNT(DISTINCT h.MaKH)            AS SoKhachThanhVien
    FROM dbo.HoaDon h
    WHERE h.TrangThai = N'Đã thanh toán'
      AND h.ThoiGianThanhToan >= @TuNgay AND h.ThoiGianThanhToan < @DenNgay
    GROUP BY MONTH(h.ThoiGianThanhToan)
    ORDER BY Thang;

    SELECT @TongDoanhThu = ISNULL(SUM(ThanhToan), 0)
    FROM dbo.HoaDon
    WHERE TrangThai = N'Đã thanh toán'
      AND ThoiGianThanhToan >= @TuNgay AND ThoiGianThanhToan < @DenNgay;
END
GO

-- SP7. Nhập kho nguyên liệu
CREATE PROCEDURE dbo.sp_NhapKhoNguyenLieu
    @MaNL      INT,
    @SoLuong   DECIMAL(10,2),
    @DonGiaNhap DECIMAL(12,0) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF @SoLuong IS NULL OR @SoLuong <= 0
            THROW 50050, N'Số lượng nhập phải lớn hơn 0.', 1;
        IF @DonGiaNhap IS NOT NULL AND @DonGiaNhap < 0
            THROW 50052, N'Đơn giá nhập không được âm.', 1;

        BEGIN TRANSACTION;
            IF NOT EXISTS (SELECT 1 FROM dbo.NguyenLieu WITH (UPDLOCK, HOLDLOCK) WHERE MaNL = @MaNL)
                THROW 50051, N'Nguyên liệu không tồn tại.', 1;

            UPDATE dbo.NguyenLieu
               SET SoLuongTon = SoLuongTon + @SoLuong,
                   DonGiaNhap = ISNULL(@DonGiaNhap, DonGiaNhap)
             WHERE MaNL = @MaNL;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
PRINT N'>> Đã tạo 3 trigger và 7 stored procedure.';
GO
