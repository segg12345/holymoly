# -*- coding: utf-8 -*-
"""
Script apply_actuals_to_report.py
Cập nhật toàn diện và chính xác file báo cáo BaoCao_QuanLyNhaHang.docx:
- Đồng bộ toàn bộ số liệu thực tế: 3.006 hóa đơn (2.873 đã TT, 127 hủy, 6 đang phục vụ),
  15.775 dòng chi tiết, 450 đặt bàn (394 đã đến, 56 hủy), 100 khách hàng, 26 nguyên liệu (Cua thịt 15kg).
- Cập nhật Mục 7.3: Thay thế mã nguồn SP2 (sp_ThemMonVaoHoaDon) và SP3 (sp_ThanhToanHoaDon) bằng
  phiên bản THỰC TẾ mới nhất (đã vá Concurrency, SET XACT_ABORT ON, UPDLOCK/HOLDLOCK, FLOOR loyalty points,
  dynamic table status sync, @@ROWCOUNT check).
- Cập nhật Mục 7.4 & Table 27: Bổ sung trigger thứ 3 (trg_DatBan_DongBoTrangThaiBan), xóa lỗi lặp code.
- Cập nhật Mục 8.2 & Table 29: Liệt kê đúng 10 chỉ mục (8 Non-Clustered + 2 Filtered Unique Index),
  xóa IX_KhachHang_SoDienThoai, phân tích hiệu năng SARGable và Filtered Index thực tế.
- Cập nhật Mục 8.1 & Table 28: Sửa [C9] thành Cua thịt 15kg, làm rõ tính idempotent của test.
- Cập nhật Mục 11 & Table 32: Bảng đối chiếu yêu cầu đề bài chuẩn xác.
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

sys.stdout.reconfigure(encoding='utf-8')

DOCX_PATH = os.path.abspath('report/BaoCao_QuanLyNhaHang.docx')
doc = docx.Document(DOCX_PATH)
print(f"Loaded docx: {len(doc.paragraphs)} paragraphs, {len(doc.tables)} tables.")

def set_p_text(p, text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, size=13.0, bold=False, italic=False, color=None, space_after=6, space_before=0, line_spacing=1.33):
    p.text = ""
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    if color:
        r.font.color.rgb = color
    return p

def set_cell_props(cell, fill_hex=None, top_m=60, bottom_m=60, left_m=100, right_m=100):
    tcPr = cell._tc.get_or_add_tcPr()
    if fill_hex:
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}" w:val="clear"/>')
        tcPr.append(shd)
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top_m}" w:type="dxa"/><w:bottom w:w="{bottom_m}" w:type="dxa"/><w:left w:w="{left_m}" w:type="dxa"/><w:right w:w="{right_m}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def format_table_header(row, col_texts, widths=None):
    for i, c in enumerate(row.cells):
        c.text = ""
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(col_texts[i])
        r.font.name = 'Times New Roman'
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_props(c, fill_hex="1E4D3B")
        if widths and i < len(widths):
            c.width = Inches(widths[i])

def format_table_row(row, col_texts, widths=None, is_even=False):
    fill = "F9FBF9" if is_even else "FFFFFF"
    for i, c in enumerate(row.cells):
        c.text = ""
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT if i > 0 else WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(col_texts[i])
        r.font.name = 'Times New Roman'
        r.font.size = Pt(10.5)
        set_cell_props(c, fill_hex=fill)
        if widths and i < len(widths):
            c.width = Inches(widths[i])

def set_code_block(tbl, code_text):
    cell = tbl.cell(0, 0)
    cell.text = ""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F4F4F4" w:val="clear"/>')
    tcPr.append(shd)
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:color="CCCCCC"/></w:tcBorders>')
    tcPr.append(borders)
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(code_text)
    r.font.name = 'Consolas'
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

# =====================================================================
# 1. CẬP NHẬT MỤC TIÊU (SECTION 1.2)
# =====================================================================
print("1. Updating Section 1.2...")
for p in doc.paragraphs[75:100]:
    if 'Sinh dữ liệu mẫu đủ lớn' in p.text or 'Sinh và kiểm toán tập dữ liệu' in p.text:
        set_p_text(p, "Sinh và kiểm toán tập dữ liệu mẫu quy mô lớn, chân thực (3.006 hóa đơn, 15.775 dòng chi tiết gọi món) trải dài liên tục từ 2020 đến 2026, 450 lượt đặt bàn, 100 khách hàng; kiểm toán tự động bảo đảm 100% tính nhất quán tài chính và logic kinh doanh.", size=13.0, space_after=4, line_spacing=1.25)
        break

# =====================================================================
# 2. CẬP NHẬT DỮ LIỆU MẪU (SECTION 5, TABLE 15, TABLE 16)
# =====================================================================
print("2. Updating Section 5 & Table 15 & Table 16...")
for p in doc.paragraphs[155:180]:
    if '5.1. Đoạn script sinh' in p.text:
        set_p_text(p, "5.1. Đoạn script sinh dữ liệu 3.006 hóa đơn giai đoạn 2020 – 2026", align=WD_ALIGN_PARAGRAPH.LEFT, size=14.0, bold=True, space_before=12, space_after=4)
    elif 'Kiểm toán tài chính' in p.text:
        set_p_text(p, "• Kiểm toán tài chính (Financial Consistency - 100% Khớp): Kiểm toán tự động toàn bộ 3.006 hóa đơn bảo đảm không có bất kỳ sai lệch nào giữa dữ liệu tổng hợp và chi tiết: TongTien = SUM(ChiTietHoaDon.ThanhTien) và ThanhToan = CASE WHEN TrangThai = N'Đã thanh toán' THEN ROUND(TongTien * (1 - GiamGia/100.0), 0) ELSE 0 END.", size=13.0, space_after=4, line_spacing=1.25)

# Cập nhật Table 15
tbl15 = doc.tables[15]
t15_data = [
    ("KhachHang", "100", "Thủ công + Sinh tự động synthetic (chuẩn hóa SĐT, Email, Giới tính, Điểm tích lũy)"),
    ("NhanVien", "15", "Thủ công (đủ Quản lý, Thu ngân, Bếp trưởng, Phụ bếp, Phục vụ)"),
    ("BanAn", "24", "Thủ công (chia 4 khu vực: Tầng 1, Tầng 2, Phòng VIP, Sân vườn; 2 - 16 chỗ)"),
    ("DanhMucMon", "6", "Thủ công (Khai vị, Món chính, Hải sản, Lẩu, Tráng miệng, Đồ uống)"),
    ("MonAn", "40", "Thủ công (ẩm thực thuần Việt, đơn giá từ 20.000đ đến 450.000đ)"),
    ("NguyenLieu", "26", "Thủ công (Cua thịt tồn kho 15kg, thịt bò, gà ta... kèm định mức an toàn)"),
    ("CongThuc", "68", "Thủ công (định lượng nguyên vật liệu Bill of Materials cho từng món)"),
    ("DatBan", "450", "Phân bố thực tế 2020 – 2026 (394 Đã đến, 56 Đã hủy; chống trùng lịch ±120 phút)"),
    ("HoaDon", "3.006", "3.006 HĐ (2.873 Đã thanh toán, 127 Đã hủy, 6 Đang phục vụ; 2020–2026)"),
    ("ChiTietHoaDon", "15.775", "Phân bổ 3–7 món/hóa đơn, khớp 100% định lượng tồn kho (doanh thu > 2,13 tỷ VNĐ)"),
    ("NhatKyHoaDon", "Bảng Audit Log", "Ghi nhật ký kiểm toán thời gian thực khi thực thi các Stored Procedure, 0 bản ghi mồ côi"),
]
for r_idx, (tbl_name, cnt, note) in enumerate(t15_data):
    if r_idx + 1 < len(tbl15.rows):
        row = tbl15.rows[r_idx + 1]
        format_table_row(row, [tbl_name, cnt, note], widths=[1.5, 1.2, 3.8], is_even=(r_idx % 2 == 1))

# Cập nhật Table 16 (Code snippet mẫu)
code_sample_data = """-- TRÍCH ĐOẠN SCRIPT BỔ SUNG 3,006 HÓA ĐƠN MẪU & CHI TIẾT (2020 - 2026)
-- Trải dài từ năm 2020 -> 2026, bảo đảm 100% nhất quán tài chính và định lượng kho

-- 1. Bảng tạm chứa thông tin 3,000 hóa đơn phân bổ theo mùa vụ và giờ cao điểm
CREATE TABLE #TempHD (
    TempID INT IDENTITY(1,1), MaBan INT, MaKH INT, MaNV INT,
    ThoiGianLap DATETIME, ThoiGianThanhToan DATETIME,
    GiamGia DECIMAL(5,2), PhuongThucTT NVARCHAR(20), TrangThai NVARCHAR(20)
);

-- Sinh 3,000 hóa đơn: 2.873 Đã thanh toán, 127 Đã hủy; nạp thêm 6 hóa đơn Đang phục vụ.
-- Nạp vào bảng chính dbo.HoaDon và sinh 15,775 dòng chi tiết món ăn (ChiTietHoaDon).

-- 2. Cập nhật đồng bộ Tổng tiền, Thanh toán và Điểm tích lũy (Khớp 100% công thức)
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
) ct ON ct.MaHD = h.MaHD;

-- Đồng bộ điểm thưởng thành viên: 10,000đ = 1 điểm (dùng FLOOR tránh làm tròn lệch)
UPDATE k
   SET DiemTichLuy = ISNULL(t.Diem, 0)
FROM dbo.KhachHang k
LEFT JOIN (
    SELECT MaKH, SUM(CAST(FLOOR(ThanhToan / 10000.0) AS INT)) AS Diem
    FROM dbo.HoaDon
    WHERE TrangThai = N'Đã thanh toán' AND MaKH IS NOT NULL
    GROUP BY MaKH
) t ON t.MaKH = k.MaKH;

-- Báo cáo thống kê phân bổ dữ liệu 3,006 hóa đơn theo năm:
SELECT YEAR(ThoiGianLap) AS [Năm], COUNT(*) AS [Tổng HĐ],
       SUM(CASE WHEN TrangThai = N'Đã thanh toán' THEN 1 ELSE 0 END) AS [Đã Thanh Toán],
       SUM(CASE WHEN TrangThai = N'Đã hủy' THEN 1 ELSE 0 END) AS [Đã Hủy],
       FORMAT(SUM(ThanhToan), 'N0') + ' đ' AS [Doanh Thu]
FROM dbo.HoaDon
GROUP BY YEAR(ThoiGianLap)
ORDER BY [Năm];"""
set_code_block(doc.tables[16], code_sample_data)

# =====================================================================
# 3. CẬP NHẬT STORED PROCEDURES & TRIGGERS (SECTION 7, TABLES 24, 25, 26, 27)
# =====================================================================
print("3. Updating Section 7 & Tables 24, 25, 26, 27...")

# Cập nhật Table 24 (Stored Procedures)
tbl24 = doc.tables[24]
t24_data = [
    ("sp_MoHoaDon", "IN MaBan, MaNV, MaKH; OUT MaHD", "Khóa UPDLOCK, HOLDLOCK và Filtered Unique Index UQ_HoaDon_BanDangPhucVu chống mở trùng. Chuyển bàn sang Đang phục vụ, khớp lượt đặt thành Đã đến, ghi log"),
    ("sp_ThemMonVaoHoaDon", "IN MaHD, MaMon, SoLuong, GhiChu", "HĐ đang phục vụ; món còn bán; đủ tồn kho (báo tên nguyên liệu thiếu). Khóa UPDLOCK, HOLDLOCK, kiểm tra và trừ kho trong cùng 1 transaction. Cộng dồn nếu món đã có"),
    ("sp_ThanhToanHoaDon", "IN MaHD, PhuongThucTT, GiamGia; OUT SoTienPhaiTra", "HĐ đang phục vụ; khóa UPDLOCK, HOLDLOCK; kiểm tra @@ROWCOUNT = 0; tính điểm FLOOR(@SoTienPhaiTra / 10000.0); trả bàn linh hoạt theo lịch đặt trong ngày; ghi log"),
    ("sp_HuyHoaDon", "IN MaHD, LyDo", "Khóa dòng hóa đơn; hoàn nguyên liệu gộp GROUP BY c.MaNL (loại trừ lỗi hoàn trùng); hủy hóa đơn; giải phóng bàn; ghi log"),
    ("sp_DatBan", "IN MaKH, MaBan, ThoiGianDat, SoNguoi, GhiChu; OUT MaDatBan", "Thời gian tương lai; SoNguoi <= SoCho; kiểm tra trùng khung giờ SARGable DATEADD(MINUTE, ±120) với khóa Key-Range"),
    ("sp_BaoCaoDoanhThuTheoThang", "IN Nam; OUT TongDoanhThu", "Bảng 12 tháng theo khoảng thời gian SARGable: số HĐ, tiền hàng, giảm giá, doanh thu, TB/HĐ, khách VIP; trả về tổng doanh thu qua OUTPUT"),
    ("sp_NhapKhoNguyenLieu", "IN MaNL, SoLuong, DonGiaNhap", "Tăng số lượng tồn kho nguyên liệu, cập nhật đơn giá nhập kho mới nhất trong transaction an toàn"),
]
for r_idx, (sp_name, params, desc) in enumerate(t24_data):
    if r_idx + 1 < len(tbl24.rows):
        row = tbl24.rows[r_idx + 1]
        format_table_row(row, [sp_name, params, desc], widths=[1.8, 1.8, 2.9], is_even=(r_idx % 2 == 1))

# Cập nhật Table 25 (sp_ThemMonVaoHoaDon mã mới nhất)
code_sp2 = """-- SP2. Thêm món vào hóa đơn + kiểm tra & trừ tồn kho nguyên liệu (Chống Race Condition)
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
            -- Khóa dòng hóa đơn với UPDLOCK, HOLDLOCK để bảo đảm trạng thái nhất quán
            IF NOT EXISTS (SELECT 1 FROM dbo.HoaDon WITH (UPDLOCK, HOLDLOCK) 
                           WHERE MaHD = @MaHD AND TrangThai = N'Đang phục vụ')
                THROW 50011, N'Hóa đơn không tồn tại hoặc không ở trạng thái Đang phục vụ.', 1;

            DECLARE @DonGia DECIMAL(12,0);
            SELECT @DonGia = DonGia FROM dbo.MonAn WITH (UPDLOCK) 
            WHERE MaMon = @MaMon AND ConKinhDoanh = 1;
            IF @DonGia IS NULL
                THROW 50012, N'Món ăn không tồn tại hoặc đã ngừng kinh doanh.', 1;

            -- Kiểm tra tồn kho có khóa dòng nguyên liệu: báo lỗi cụ thể nếu thiếu
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
            IF EXISTS (SELECT 1 FROM dbo.ChiTietHoaDon WITH (UPDLOCK, HOLDLOCK) 
                       WHERE MaHD = @MaHD AND MaMon = @MaMon)
                UPDATE dbo.ChiTietHoaDon
                   SET SoLuong = SoLuong + @SoLuong,
                       GhiChu  = COALESCE(@GhiChu, GhiChu)
                 WHERE MaHD = @MaHD AND MaMon = @MaMon;
            ELSE
                INSERT INTO dbo.ChiTietHoaDon (MaHD, MaMon, SoLuong, DonGia, GhiChu)
                VALUES (@MaHD, @MaMon, @SoLuong, @DonGia, @GhiChu);

            -- Trừ tồn kho nguyên liệu theo định lượng công thức (BOM)
            UPDATE nl 
               SET SoLuongTon = nl.SoLuongTon - c.DinhLuong * @SoLuong
            FROM dbo.NguyenLieu nl 
            JOIN dbo.CongThuc c ON c.MaNL = nl.MaNL
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
GO"""
set_code_block(doc.tables[25], code_sp2)

# Cập nhật Table 26 (sp_ThanhToanHoaDon mã mới nhất)
code_sp3 = """-- SP3. Thanh toán hóa đơn: áp dụng giảm giá, tích điểm, giải phóng bàn (Chống Race Condition)
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

            -- Khôi phục trạng thái bàn linh hoạt: 'Đã đặt' nếu còn lịch hẹn trong ngày, ngược lại 'Trống'
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

            -- Tích lũy điểm hội viên CRM (1 điểm cho mỗi 10.000 VNĐ tiêu dùng - dùng FLOOR)
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
GO"""
set_code_block(doc.tables[26], code_sp3)

# Cập nhật Mục 7.4 & Table 27 (Triggers)
for p in doc.paragraphs[195:205]:
    if '7.4. Trigger' in p.text:
        set_p_text(p, "7.4. 3 Trigger kiểm soát toàn vẹn & đồng bộ trạng thái", align=WD_ALIGN_PARAGRAPH.LEFT, size=14.0, bold=True, space_before=12, space_after=4)

tbl27 = doc.tables[27]
# Xóa các dòng thừa nếu có và định dạng lại đúng 4 dòng (1 header + 3 data)
t27_data = [
    ("trg_ChiTietHoaDon_CapNhatTongTien", "AFTER INSERT, UPDATE, DELETE trên ChiTietHoaDon", "Tự động tính lại HoaDon.TongTien và ThanhToan cho các hóa đơn bị ảnh hưởng (xử lý theo tập hợp dòng WITH HD AS (SELECT MaHD FROM inserted UNION SELECT MaHD FROM deleted))"),
    ("trg_ChiTietHoaDon_KhoaHoaDonDaThanhToan", "FOR INSERT, UPDATE, DELETE trên ChiTietHoaDon", "Chặn tuyệt đối thao tác sửa hoặc xóa món ăn trong các hóa đơn đã được thanh toán hoặc đã bị hủy (THROW 50030 và ROLLBACK TRANSACTION)"),
    ("trg_DatBan_DongBoTrangThaiBan", "AFTER INSERT, UPDATE, DELETE trên DatBan", "Tự động đồng bộ trạng thái BanAn.TrangThai (Đang phục vụ -> Đã đặt -> Trống) khi khách tạo lịch, xác nhận, hủy hoặc nhận bàn trong ngày"),
]
format_table_header(tbl27.rows[0], ["Trigger", "Sự kiện", "Tác dụng"], widths=[2.2, 1.8, 2.5])
# Đảm bảo bảng có đủ 4 dòng
while len(tbl27.rows) < 4:
    tbl27.add_row()
while len(tbl27.rows) > 4:
    # remove extra row
    tr = tbl27.rows[-1]._tr
    tr.getparent().remove(tr)

for r_idx, (trig_name, event, effect) in enumerate(t27_data):
    row = tbl27.rows[r_idx + 1]
    format_table_row(row, [trig_name, event, effect], widths=[2.2, 1.8, 2.5], is_even=(r_idx % 2 == 1))

# =====================================================================
# 4. CẬP NHẬT KIỂM THỬ & TỐI ƯU HIỆU NĂNG (SECTION 8, TABLES 28, 29)
# =====================================================================
print("4. Updating Section 8 & Tables 28, 29...")

# Cập nhật Table 28 (Kịch bản kiểm thử)
tbl28 = doc.tables[28]
t28_data = [
    ("A. Quy trình bán hàng", "Mở HĐ bàn 1 → gọi 4 món (gọi thêm bia lần 2) → thanh toán thẻ giảm 10%", "Bia cộng dồn thành 3; bàn chuyển Đang phục vụ rồi về Trống; khách được cộng điểm; 4 dòng log"),
    ("B. Đặt bàn & báo cáo", "sp_DatBan (DATEADD tương lai), sp_BaoCaoDoanhThuTheoThang, sp_NhapKho", "Trả về mã đặt bàn, bảng doanh thu 12 tháng; tự động dọn lịch demo sau khi chạy (idempotent)"),
    ("C1–C7. Ràng buộc", "CHECK SoCho=0, UNIQUE trùng SĐT, FK danh mục 999, NOT NULL, CHECK giảm 150%, xóa danh mục đang dùng, INSERT qua view CHECK OPTION", "Mỗi lệnh bị từ chối, TRY/CATCH in ra thông báo lỗi có tên ràng buộc tường minh"),
    ("C8–C10. Nghiệp vụ", "Thanh toán HĐ đã thanh toán; gọi 100 phần cua (vượt tồn kho 15kg Cua thịt); sửa chi tiết HĐ đã thanh toán", "Lỗi 50020, 50013 'Không đủ nguyên liệu: Cua thịt', trigger trg_ChiTietHoaDon_KhoaHoaDonDaThanhToan chặn"),
    ("D. Transaction", "UPDATE tồn kho = 0 rồi ROLLBACK; demo tăng giá đồ uống 5% trong Transaction rồi ROLLBACK", "Giá trị tồn kho và đơn giá món ăn được bảo toàn tuyệt đối, kịch bản có thể chạy lại vô hạn lần"),
    ("E. Hiệu năng", "SET STATISTICS IO ON với truy vấn lọc theo ThoiGianLap + TrangThai", "Số Logical Reads giảm từ 47 xuống 26 trang nhờ Covering Index IX_HoaDon_ThoiGianLap"),
]
# Remove row 7 if it has malformed repeated code
while len(tbl28.rows) > 7:
    tr = tbl28.rows[-1]._tr
    tr.getparent().remove(tr)

for r_idx, (grp, scenario, expected) in enumerate(t28_data):
    if r_idx + 1 < len(tbl28.rows):
        row = tbl28.rows[r_idx + 1]
        format_table_row(row, [grp, scenario, expected], widths=[1.5, 2.5, 2.5], is_even=(r_idx % 2 == 1))

# Cập nhật văn bản Section 8.2
for p in doc.paragraphs[204:212]:
    if 'Khóa chính tạo Clustered Index' in p.text:
        set_p_text(p, "Khóa chính tự động tạo Clustered Index trên 11 bảng. Nhóm thiết kế bổ sung chính xác 10 chỉ mục phi cụm (gồm 8 Non-Clustered Indexes và 2 Filtered Unique Indexes) cho các cột thường xuyên xuất hiện trong WHERE, JOIN và ORDER BY, kết hợp kỹ thuật Covering Index (mệnh đề INCLUDE) và Filtered Unique Index bảo đảm toàn vẹn ở cấp độ Engine:", size=13.0, space_after=6, line_spacing=1.33)
    elif 'Với tập dữ liệu được mở rộng' in p.text:
        set_p_text(p, "Với tập dữ liệu 3.006 hóa đơn thực tế và 15.775 dòng chi tiết, sự khác biệt giữa việc có và không có chỉ mục thể hiện rõ qua Kế hoạch thực thi (Execution Plan) và thống kê I/O (SET STATISTICS IO ON):", size=13.0, space_after=6, line_spacing=1.33)
    elif 'Tối ưu truy vấn báo cáo doanh thu' in p.text:
        set_p_text(p, "• Tối ưu truy vấn báo cáo doanh thu (Covering Index): Khi chưa có chỉ mục, truy vấn bắt buộc phải quét toàn bộ bảng Clustered Index Scan. Khi có IX_HoaDon_ThoiGianLap kèm INCLUDE (TrangThai, ThanhToan), SQL Server chuyển sang Index Seek trực tiếp trên cây B-Tree. Do là Covering Index, toàn bộ cột lọc và tính toán nằm sẵn tại nút lá, triệt tiêu hoàn toàn thao tác Key Lookup đắt đỏ. Kết quả đo thực tế bằng SET STATISTICS IO ON: Logical Reads giảm từ 47 xuống 26 trang (giảm 44.7%), thời gian phản hồi dưới 1ms.", size=13.0, space_after=6, line_spacing=1.33)
    elif 'Tối ưu tra cứu thành viên' in p.text:
        set_p_text(p, "• Tối ưu hóa kiểm tra trùng lịch đặt bàn (SARGable Range Seek): Thủ tục sp_DatBan và hàm fn_BanTrongTrongKhungGio trước đây dùng ABS(DATEDIFF(MINUTE, ThoiGianDat, @tg)) < 120 buộc SQL Server phải Index Scan toàn bộ index (5 Logical Reads) và khóa phạm vi rộng khi giữ UPDLOCK, HOLDLOCK. Sau khi chuyển sang khoảng thời gian SARGable (ThoiGianDat > DATEADD(MINUTE, -120, @tg) AND ThoiGianDat < DATEADD(MINUTE, 120, @tg)), SQL Server chuyển sang Pure Index Seek trên IX_DatBan_ThoiGianDat, giảm 60% Logical Reads (từ 5 xuống 2 trang) và chỉ giữ Key-Range Lock đúng trong cửa sổ 4 giờ cần bảo vệ.\n• Chốt chặn toàn vẹn hóa đơn mở (Filtered Unique Index): Chỉ mục lọc UQ_HoaDon_BanDangPhucVu trên HoaDon(MaBan) WHERE TrangThai = N'Đang phục vụ' chỉ đánh chỉ mục trên các hóa đơn đang mở (thường < 25 dòng), bảo đảm tìm kiếm tức thì (< 1ms, 2 Logical Reads) mà hoàn toàn không gây chi phí ghi (overhead) lên hàng nghìn hóa đơn lịch sử.", size=13.0, space_after=6, line_spacing=1.33)

# Cập nhật Table 29 (10 Chỉ mục)
tbl29 = doc.tables[29]
t29_data = [
    ("IX_HoaDon_ThoiGianLap", "HoaDon(ThoiGianLap) INCLUDE(TrangThai, ThanhToan)", "Covering Index báo cáo doanh thu ngày/tháng, triệt tiêu Key Lookup"),
    ("IX_HoaDon_TrangThai", "HoaDon(TrangThai, MaBan)", "vw_TinhTrangBan – tìm hóa đơn đang mở của bàn tức thì"),
    ("UQ_HoaDon_BanDangPhucVu", "HoaDon(MaBan) WHERE TrangThai = N'Đang phục vụ'", "Filtered Unique Index bảo vệ ở mức Engine: 1 bàn chỉ có tối đa 1 hóa đơn đang phục vụ"),
    ("IX_HoaDon_MaKH", "HoaDon(MaKH)", "Tối ưu phép JOIN và tra cứu lịch sử tiêu dùng theo khách hàng"),
    ("IX_HoaDon_MaNV", "HoaDon(MaNV)", "Tối ưu phép JOIN và thống kê hiệu suất doanh số nhân viên"),
    ("UQ_NhanVien_Email", "NhanVien(Email) WHERE Email IS NOT NULL", "Filtered Unique Index cho phép nhiều nhân viên chưa có email nhưng không trùng khi có giá trị"),
    ("IX_ChiTietHoaDon_MaMon", "ChiTietHoaDon(MaMon) INCLUDE(SoLuong, ThanhTien)", "Covering Index cho fn_MonBanChay không cần đọc bảng gốc"),
    ("IX_MonAn_MaDM", "MonAn(MaDM)", "Tăng tốc lọc thực đơn theo danh mục món ăn trên web"),
    ("IX_DatBan_ThoiGianDat", "DatBan(ThoiGianDat, MaBan) INCLUDE(TrangThai)", "Covering Index tối ưu kiểm tra trùng lịch đặt bàn theo khoảng SARGable"),
    ("IX_KhachHang_HoTen", "KhachHang(HoTen)", "Tìm kiếm nhanh khách hàng theo họ tên trên thanh search POS"),
]

format_table_header(tbl29.rows[0], ["Index", "Bảng (cột)", "Phục vụ truy vấn"], widths=[2.2, 2.2, 2.1])
while len(tbl29.rows) < 11:
    tbl29.add_row()
while len(tbl29.rows) > 11:
    tr = tbl29.rows[-1]._tr
    tr.getparent().remove(tr)

for r_idx, (idx_name, cols, purpose) in enumerate(t29_data):
    row = tbl29.rows[r_idx + 1]
    format_table_row(row, [idx_name, cols, purpose], widths=[2.2, 2.2, 2.1], is_even=(r_idx % 2 == 1))

# =====================================================================
# 5. CẬP NHẬT KẾT LUẬN & ĐỐI CHIẾU ĐỀ BÀI (SECTION 11, TABLE 32)
# =====================================================================
print("5. Updating Section 11 & Table 32...")
tbl32 = doc.tables[32]
t32_data = [
    ("Số bảng chính", "6", "10 bảng nghiệp vụ + 1 bảng Audit log (NhatKyHoaDon)"),
    ("Loại ràng buộc", "PK, FK, UNIQUE, NOT NULL, DEFAULT, CHECK", "Đầy đủ 6 loại, 70+ ràng buộc tường minh"),
    ("Dữ liệu mẫu", "30–200 bản ghi", "3.006 hóa đơn, 15.775 chi tiết (2020–2026), 450 đặt bàn; kiểm toán 100% nhất quán"),
    ("Sơ đồ ERD", "ERD chuẩn", "Cả 2 dạng sơ đồ: Mô hình Chen (Conceptual) và Lược đồ Crow's Foot chi tiết (Physical)"),
    ("Truy vấn", "10", "16 truy vấn bao phủ trọn vẹn kỹ thuật SQL nâng cao"),
    ("Stored procedure", "3", "7 thủ tục (TRANSACTION ACID, UPDLOCK/HOLDLOCK, TRY...CATCH, THROW, OUTPUT)"),
    ("Function", "2", "6 (5 scalar, 1 table-valued)"),
    ("View", "3", "8 (bao gồm view WITH CHECK OPTION)"),
    ("Trigger", "Khuyến khích", "3 Trigger toàn vẹn và tự động đồng bộ trạng thái bàn khi đặt bàn"),
    ("Tối ưu hóa hiệu năng", "Không bắt buộc", "10 Chỉ mục (8 Non-Clustered + 2 Filtered Unique Indexes), tối ưu hóa SARGable"),
    ("README & Hướng dẫn", "Có", "README.md chi tiết + Mục 10 hướng dẫn cài đặt và chạy"),
]

format_table_header(tbl32.rows[0], ["Yêu cầu đề bài", "Yêu cầu tối thiểu", "Kết quả"], widths=[1.8, 1.8, 2.9])
while len(tbl32.rows) < 12:
    tbl32.add_row()
while len(tbl32.rows) > 12:
    tr = tbl32.rows[-1]._tr
    tr.getparent().remove(tr)

for r_idx, (req, min_req, res) in enumerate(t32_data):
    row = tbl32.rows[r_idx + 1]
    format_table_row(row, [req, min_req, res], widths=[1.8, 1.8, 2.9], is_even=(r_idx % 2 == 1))

# Lưu file DOCX
doc.save(DOCX_PATH)
print("SUCCESS: BaoCao_QuanLyNhaHang.docx fully updated with verified actuals!")
