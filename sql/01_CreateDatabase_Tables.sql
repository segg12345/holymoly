/* =====================================================================
   HỆ THỐNG QUẢN LÝ NHÀ HÀNG - SCRIPT 01: TẠO DATABASE & BẢNG
   Chạy trên SQL Server 2019+ (Express OK)
   ===================================================================== */
USE master;
GO
IF DB_ID(N'QuanLyNhaHang') IS NOT NULL
BEGIN
    ALTER DATABASE QuanLyNhaHang SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE QuanLyNhaHang;
END
GO
CREATE DATABASE QuanLyNhaHang COLLATE Vietnamese_CI_AS;
GO
USE QuanLyNhaHang;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/* ---------------------------------------------------------------
   1. KHÁCH HÀNG
   --------------------------------------------------------------- */
CREATE TABLE dbo.KhachHang (
    MaKH         INT IDENTITY(1,1) NOT NULL,
    HoTen        NVARCHAR(100)     NOT NULL,
    SoDienThoai  VARCHAR(15)       NOT NULL,
    Email        VARCHAR(100)      NULL,
    GioiTinh     NVARCHAR(5)       NULL,
    NgaySinh     DATE              NULL,
    DiemTichLuy  INT               NOT NULL CONSTRAINT DF_KhachHang_Diem DEFAULT 0,
    NgayDangKy   DATETIME          NOT NULL CONSTRAINT DF_KhachHang_NgayDangKy DEFAULT GETDATE(),
    CONSTRAINT PK_KhachHang            PRIMARY KEY (MaKH),
    CONSTRAINT UQ_KhachHang_SoDienThoai UNIQUE (SoDienThoai),
    CONSTRAINT CK_KhachHang_GioiTinh   CHECK (GioiTinh IN (N'Nam', N'Nữ', N'Khác')),
    CONSTRAINT CK_KhachHang_Diem       CHECK (DiemTichLuy >= 0),
    CONSTRAINT CK_KhachHang_SDT        CHECK (SoDienThoai NOT LIKE '%[^0-9]%' AND LEN(SoDienThoai) BETWEEN 9 AND 11),
    CONSTRAINT CK_KhachHang_Email      CHECK (Email IS NULL OR Email LIKE '%_@_%._%')
);

/* ---------------------------------------------------------------
   2. NHÂN VIÊN
   --------------------------------------------------------------- */
CREATE TABLE dbo.NhanVien (
    MaNV         INT IDENTITY(1,1) NOT NULL,
    HoTen        NVARCHAR(100)     NOT NULL,
    NgaySinh     DATE              NOT NULL,
    GioiTinh     NVARCHAR(5)       NOT NULL,
    ChucVu       NVARCHAR(30)      NOT NULL,
    SoDienThoai  VARCHAR(15)       NOT NULL,
    Email        VARCHAR(100)      NULL,
    LuongCoBan   DECIMAL(12,0)     NOT NULL,
    NgayVaoLam   DATE              NOT NULL CONSTRAINT DF_NhanVien_NgayVaoLam DEFAULT GETDATE(),
    DangLamViec  BIT               NOT NULL CONSTRAINT DF_NhanVien_DangLamViec DEFAULT 1,
    CONSTRAINT PK_NhanVien            PRIMARY KEY (MaNV),
    CONSTRAINT UQ_NhanVien_SoDienThoai UNIQUE (SoDienThoai),
    CONSTRAINT CK_NhanVien_GioiTinh   CHECK (GioiTinh IN (N'Nam', N'Nữ', N'Khác')),
    CONSTRAINT CK_NhanVien_ChucVu     CHECK (ChucVu IN (N'Quản lý', N'Thu ngân', N'Phục vụ', N'Đầu bếp', N'Phụ bếp', N'Bảo vệ')),
    CONSTRAINT CK_NhanVien_Luong      CHECK (LuongCoBan >= 4000000),
    CONSTRAINT CK_NhanVien_TuoiLaoDong CHECK (DATEDIFF(YEAR, NgaySinh, NgayVaoLam) >= 18),
    CONSTRAINT CK_NhanVien_Email      CHECK (Email IS NULL OR Email LIKE '%_@_%._%')
);

CREATE UNIQUE NONCLUSTERED INDEX UQ_NhanVien_Email
ON dbo.NhanVien (Email)
WHERE Email IS NOT NULL;

/* ---------------------------------------------------------------
   3. BÀN ĂN
   --------------------------------------------------------------- */
CREATE TABLE dbo.BanAn (
    MaBan        INT IDENTITY(1,1) NOT NULL,
    TenBan       NVARCHAR(20)      NOT NULL,
    SoCho        TINYINT           NOT NULL,
    KhuVuc       NVARCHAR(30)      NOT NULL,
    TrangThai    NVARCHAR(20)      NOT NULL CONSTRAINT DF_BanAn_TrangThai DEFAULT N'Trống',
    CONSTRAINT PK_BanAn           PRIMARY KEY (MaBan),
    CONSTRAINT UQ_BanAn_TenBan    UNIQUE (TenBan),
    CONSTRAINT CK_BanAn_SoCho     CHECK (SoCho BETWEEN 1 AND 20),
    CONSTRAINT CK_BanAn_KhuVuc    CHECK (KhuVuc IN (N'Tầng 1', N'Tầng 2', N'Sân vườn', N'Phòng VIP')),
    CONSTRAINT CK_BanAn_TrangThai CHECK (TrangThai IN (N'Trống', N'Đang phục vụ', N'Đã đặt'))
);

/* ---------------------------------------------------------------
   4. DANH MỤC MÓN
   --------------------------------------------------------------- */
CREATE TABLE dbo.DanhMucMon (
    MaDM         INT IDENTITY(1,1) NOT NULL,
    TenDM        NVARCHAR(50)      NOT NULL,
    MoTa         NVARCHAR(255)     NULL,
    CONSTRAINT PK_DanhMucMon       PRIMARY KEY (MaDM),
    CONSTRAINT UQ_DanhMucMon_TenDM UNIQUE (TenDM)
);

/* ---------------------------------------------------------------
   5. MÓN ĂN
   --------------------------------------------------------------- */
CREATE TABLE dbo.MonAn (
    MaMon        INT IDENTITY(1,1) NOT NULL,
    TenMon       NVARCHAR(100)     NOT NULL,
    MaDM         INT               NOT NULL,
    DonGia       DECIMAL(12,0)     NOT NULL,
    DonViTinh    NVARCHAR(20)      NOT NULL CONSTRAINT DF_MonAn_DonViTinh DEFAULT N'Phần',
    MoTa         NVARCHAR(255)     NULL,
    ConKinhDoanh BIT               NOT NULL CONSTRAINT DF_MonAn_ConKinhDoanh DEFAULT 1,
    CONSTRAINT PK_MonAn              PRIMARY KEY (MaMon),
    CONSTRAINT UQ_MonAn_TenMon       UNIQUE (TenMon),
    CONSTRAINT FK_MonAn_DanhMucMon   FOREIGN KEY (MaDM) REFERENCES dbo.DanhMucMon(MaDM),
    CONSTRAINT CK_MonAn_DonGia       CHECK (DonGia > 0)
);

/* ---------------------------------------------------------------
   6. NGUYÊN LIỆU (kho)
   --------------------------------------------------------------- */
CREATE TABLE dbo.NguyenLieu (
    MaNL         INT IDENTITY(1,1) NOT NULL,
    TenNL        NVARCHAR(100)     NOT NULL,
    DonViTinh    NVARCHAR(20)      NOT NULL,
    SoLuongTon   DECIMAL(10,2)     NOT NULL CONSTRAINT DF_NguyenLieu_SoLuongTon DEFAULT 0,
    MucToiThieu  DECIMAL(10,2)     NOT NULL CONSTRAINT DF_NguyenLieu_MucToiThieu DEFAULT 10,
    DonGiaNhap   DECIMAL(12,0)     NOT NULL,
    CONSTRAINT PK_NguyenLieu            PRIMARY KEY (MaNL),
    CONSTRAINT UQ_NguyenLieu_TenNL      UNIQUE (TenNL),
    CONSTRAINT CK_NguyenLieu_SoLuongTon CHECK (SoLuongTon >= 0),
    CONSTRAINT CK_NguyenLieu_MucToiThieu CHECK (MucToiThieu >= 0),
    CONSTRAINT CK_NguyenLieu_DonGiaNhap CHECK (DonGiaNhap >= 0)
);

/* ---------------------------------------------------------------
   7. CÔNG THỨC (món ăn cần nguyên liệu gì, định lượng bao nhiêu)
   --------------------------------------------------------------- */
CREATE TABLE dbo.CongThuc (
    MaMon        INT               NOT NULL,
    MaNL         INT               NOT NULL,
    DinhLuong    DECIMAL(10,3)     NOT NULL,
    CONSTRAINT PK_CongThuc           PRIMARY KEY (MaMon, MaNL),
    CONSTRAINT FK_CongThuc_MonAn     FOREIGN KEY (MaMon) REFERENCES dbo.MonAn(MaMon) ON DELETE CASCADE,
    CONSTRAINT FK_CongThuc_NguyenLieu FOREIGN KEY (MaNL) REFERENCES dbo.NguyenLieu(MaNL),
    CONSTRAINT CK_CongThuc_DinhLuong CHECK (DinhLuong > 0)
);

/* ---------------------------------------------------------------
   8. ĐẶT BÀN
   --------------------------------------------------------------- */
CREATE TABLE dbo.DatBan (
    MaDatBan     INT IDENTITY(1,1) NOT NULL,
    MaKH         INT               NOT NULL,
    MaBan        INT               NOT NULL,
    ThoiGianDat  DATETIME          NOT NULL,
    SoNguoi      TINYINT           NOT NULL,
    TrangThai    NVARCHAR(20)      NOT NULL CONSTRAINT DF_DatBan_TrangThai DEFAULT N'Chờ xác nhận',
    GhiChu       NVARCHAR(255)     NULL,
    NgayTao      DATETIME          NOT NULL CONSTRAINT DF_DatBan_NgayTao DEFAULT GETDATE(),
    CONSTRAINT PK_DatBan           PRIMARY KEY (MaDatBan),
    CONSTRAINT FK_DatBan_KhachHang FOREIGN KEY (MaKH) REFERENCES dbo.KhachHang(MaKH),
    CONSTRAINT FK_DatBan_BanAn     FOREIGN KEY (MaBan) REFERENCES dbo.BanAn(MaBan),
    CONSTRAINT CK_DatBan_SoNguoi   CHECK (SoNguoi BETWEEN 1 AND 20),
    CONSTRAINT CK_DatBan_TrangThai CHECK (TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đã đến', N'Đã hủy'))
);

/* ---------------------------------------------------------------
   9. HÓA ĐƠN
   --------------------------------------------------------------- */
CREATE TABLE dbo.HoaDon (
    MaHD               INT IDENTITY(1,1) NOT NULL,
    MaBan              INT               NOT NULL,
    MaKH               INT               NULL,       -- khách lẻ có thể không có tài khoản
    MaNV               INT               NOT NULL,
    ThoiGianLap        DATETIME          NOT NULL CONSTRAINT DF_HoaDon_ThoiGianLap DEFAULT GETDATE(),
    ThoiGianThanhToan  DATETIME          NULL,
    TongTien           DECIMAL(14,0)     NOT NULL CONSTRAINT DF_HoaDon_TongTien DEFAULT 0,   -- tổng trước giảm giá
    GiamGia            DECIMAL(5,2)      NOT NULL CONSTRAINT DF_HoaDon_GiamGia DEFAULT 0,   -- % giảm giá
    ThanhToan          DECIMAL(14,0)     NOT NULL CONSTRAINT DF_HoaDon_ThanhToan DEFAULT 0,   -- số tiền khách trả
    PhuongThucTT       NVARCHAR(20)      NULL,
    TrangThai          NVARCHAR(20)      NOT NULL CONSTRAINT DF_HoaDon_TrangThai DEFAULT N'Đang phục vụ',
    GhiChu             NVARCHAR(255)     NULL,
    CONSTRAINT PK_HoaDon               PRIMARY KEY (MaHD),
    CONSTRAINT FK_HoaDon_BanAn         FOREIGN KEY (MaBan) REFERENCES dbo.BanAn(MaBan),
    CONSTRAINT FK_HoaDon_KhachHang     FOREIGN KEY (MaKH) REFERENCES dbo.KhachHang(MaKH),
    CONSTRAINT FK_HoaDon_NhanVien      FOREIGN KEY (MaNV) REFERENCES dbo.NhanVien(MaNV),
    CONSTRAINT CK_HoaDon_TongTien      CHECK (TongTien >= 0),
    CONSTRAINT CK_HoaDon_GiamGia       CHECK (GiamGia BETWEEN 0 AND 100),
    CONSTRAINT CK_HoaDon_ThanhToan     CHECK (ThanhToan >= 0),
    CONSTRAINT CK_HoaDon_PhuongThucTT  CHECK (PhuongThucTT IS NULL OR PhuongThucTT IN (N'Tiền mặt', N'Chuyển khoản', N'Thẻ')),
    CONSTRAINT CK_HoaDon_TrangThai     CHECK (TrangThai IN (N'Đang phục vụ', N'Đã thanh toán', N'Đã hủy')),
    CONSTRAINT CK_HoaDon_ThoiGian      CHECK (ThoiGianThanhToan IS NULL OR ThoiGianThanhToan >= ThoiGianLap)
);

/* ---------------------------------------------------------------
   10. CHI TIẾT HÓA ĐƠN
   --------------------------------------------------------------- */
CREATE TABLE dbo.ChiTietHoaDon (
    MaHD         INT               NOT NULL,
    MaMon        INT               NOT NULL,
    SoLuong      INT               NOT NULL,
    DonGia       DECIMAL(12,0)     NOT NULL,   -- giá tại thời điểm bán
    ThanhTien    AS (SoLuong * DonGia) PERSISTED,
    GhiChu       NVARCHAR(255)     NULL,
    CONSTRAINT PK_ChiTietHoaDon        PRIMARY KEY (MaHD, MaMon),
    CONSTRAINT FK_ChiTietHoaDon_HoaDon FOREIGN KEY (MaHD) REFERENCES dbo.HoaDon(MaHD) ON DELETE CASCADE,
    CONSTRAINT FK_ChiTietHoaDon_MonAn  FOREIGN KEY (MaMon) REFERENCES dbo.MonAn(MaMon),
    CONSTRAINT CK_ChiTietHoaDon_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT CK_ChiTietHoaDon_DonGia  CHECK (DonGia >= 0)
);

/* ---------------------------------------------------------------
   (Bảng ghi log - không tính vào 6 bảng chính)
   --------------------------------------------------------------- */
CREATE TABLE dbo.NhatKyHoaDon (
    MaNK         INT IDENTITY(1,1) NOT NULL,
    MaHD         INT               NULL,
    HanhDong     NVARCHAR(50)      NOT NULL,
    NoiDung      NVARCHAR(500)     NULL,
    NguoiThucHien NVARCHAR(100)    NOT NULL CONSTRAINT DF_NhatKyHoaDon_Nguoi DEFAULT SUSER_SNAME(),
    ThoiGian     DATETIME          NOT NULL CONSTRAINT DF_NhatKyHoaDon_ThoiGian DEFAULT GETDATE(),
    CONSTRAINT PK_NhatKyHoaDon          PRIMARY KEY (MaNK)
);
GO
PRINT N'>> Đã tạo database QuanLyNhaHang và 10 bảng chính + 1 bảng log.';
GO
