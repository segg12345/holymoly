/* =====================================================================
   SCRIPT 05: 15 TRUY VẤN NGHIỆP VỤ
   ===================================================================== */
USE QuanLyNhaHang;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Q1. SELECT * + WHERE + ORDER BY: Danh sách bàn khu Sân vườn, sắp xếp theo số chỗ giảm dần
SELECT * FROM dbo.BanAn WHERE KhuVuc = N'Sân vườn' ORDER BY SoCho DESC, TenBan;

-- Q2. INNER JOIN + BETWEEN: Thực đơn món chính có giá từ 50.000đ đến 150.000đ
SELECT m.MaMon, m.TenMon, d.TenDM, m.DonGia, m.DonViTinh
FROM dbo.MonAn m
INNER JOIN dbo.DanhMucMon d ON d.MaDM = m.MaDM
WHERE m.DonGia BETWEEN 50000 AND 150000 AND m.ConKinhDoanh = 1
ORDER BY d.TenDM, m.DonGia;

-- Q3. LEFT JOIN + IS NULL: Khách hàng đã đăng ký nhưng chưa có hóa đơn nào
SELECT k.MaKH, k.HoTen, k.SoDienThoai, k.NgayDangKy
FROM dbo.KhachHang k
LEFT JOIN dbo.HoaDon h ON h.MaKH = k.MaKH
WHERE h.MaHD IS NULL
ORDER BY k.NgayDangKy;

-- Q4. RIGHT JOIN: Món ăn chưa từng được bán lần nào
SELECT m.MaMon, m.TenMon, m.DonGia, m.ConKinhDoanh
FROM dbo.ChiTietHoaDon ct
RIGHT JOIN dbo.MonAn m ON m.MaMon = ct.MaMon
WHERE ct.MaHD IS NULL;

-- Q5. FULL OUTER JOIN: Đối chiếu bàn và lượt đặt bàn hôm nay (bàn nào có đặt, lượt đặt nào không khớp bàn)
SELECT b.TenBan, b.KhuVuc, b.TrangThai, d.MaDatBan, d.ThoiGianDat, d.SoNguoi
FROM dbo.BanAn b
FULL OUTER JOIN (
    SELECT * FROM dbo.DatBan
    WHERE ThoiGianDat >= CAST(GETDATE() AS DATE)
      AND ThoiGianDat < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
) d ON d.MaBan = b.MaBan
ORDER BY b.TenBan;

-- Q6. GROUP BY + HAVING: Nhân viên có doanh thu thanh toán > 10 triệu trong 30 ngày qua
SELECT n.MaNV, n.HoTen, n.ChucVu, COUNT(h.MaHD) AS SoHoaDon, SUM(h.ThanhToan) AS DoanhThu
FROM dbo.HoaDon h
JOIN dbo.NhanVien n ON n.MaNV = h.MaNV
WHERE h.TrangThai = N'Đã thanh toán' AND h.ThoiGianThanhToan >= DATEADD(DAY, -30, GETDATE())
GROUP BY n.MaNV, n.HoTen, n.ChucVu
HAVING SUM(h.ThanhToan) > 10000000
ORDER BY DoanhThu DESC;

-- Q7. Subquery vô hướng (scalar): Món có giá cao hơn giá trung bình của toàn thực đơn
SELECT TenMon, DonGia,
       (SELECT AVG(DonGia) FROM dbo.MonAn WHERE ConKinhDoanh = 1) AS GiaTrungBinh
FROM dbo.MonAn
WHERE DonGia > (SELECT AVG(DonGia) FROM dbo.MonAn WHERE ConKinhDoanh = 1)
ORDER BY DonGia DESC;

-- Q8. Subquery dạng bảng (IN / EXISTS): Khách hàng có từ 3 hóa đơn đã thanh toán trở lên
SELECT k.MaKH, k.HoTen, k.DiemTichLuy, dbo.fn_XepHangKhachHang(k.DiemTichLuy) AS Hang
FROM dbo.KhachHang k
WHERE k.MaKH IN (SELECT MaKH FROM dbo.HoaDon
                 WHERE TrangThai = N'Đã thanh toán' AND MaKH IS NOT NULL
                 GROUP BY MaKH HAVING COUNT(*) >= 3)
  AND EXISTS (SELECT 1 FROM dbo.DatBan d WHERE d.MaKH = k.MaKH)
ORDER BY k.DiemTichLuy DESC;

-- Q9. UNION: Danh bạ liên hệ gộp khách hàng và nhân viên
SELECT N'Khách hàng' AS Loai, HoTen, SoDienThoai, Email FROM dbo.KhachHang
UNION
SELECT N'Nhân viên', HoTen, SoDienThoai, Email FROM dbo.NhanVien WHERE DangLamViec = 1
ORDER BY Loai, HoTen;

-- Q10. INTERSECT: Khách vừa từng đặt bàn vừa từng có hóa đơn thanh toán
SELECT MaKH FROM dbo.DatBan
INTERSECT
SELECT MaKH FROM dbo.HoaDon WHERE TrangThai = N'Đã thanh toán';

-- Q11. EXCEPT: Món đang kinh doanh nhưng không bán được trong 30 ngày qua
SELECT MaMon, TenMon FROM dbo.MonAn WHERE ConKinhDoanh = 1
EXCEPT
SELECT m.MaMon, m.TenMon
FROM dbo.MonAn m
JOIN dbo.ChiTietHoaDon ct ON ct.MaMon = m.MaMon
JOIN dbo.HoaDon h ON h.MaHD = ct.MaHD
WHERE h.TrangThai = N'Đã thanh toán' AND h.ThoiGianThanhToan >= DATEADD(DAY, -30, GETDATE());

-- Q12. LIKE: Tìm món có chữ "gà" hoặc khách hàng họ Nguyễn
SELECT N'Món' AS Loai, TenMon AS Ten FROM dbo.MonAn WHERE TenMon LIKE N'%gà%'
UNION ALL
SELECT N'Khách', HoTen FROM dbo.KhachHang WHERE HoTen LIKE N'Nguyễn%';

-- Q13. TOP n + hàm bảng: 5 món bán chạy nhất 90 ngày qua
SELECT TOP 5 TenMon, TenDM, TongSoLuong, DoanhThu
FROM dbo.fn_MonBanChay(DATEADD(DAY, -90, CAST(GETDATE() AS DATE)), CAST(GETDATE() AS DATE))
ORDER BY TongSoLuong DESC;

-- Q14. TOP PERCENT: 10% hóa đơn có giá trị cao nhất, kèm thuế VAT 8% tính bằng function
SELECT TOP 10 PERCENT h.MaHD, h.ThoiGianThanhToan, b.TenBan, h.TongTien, h.GiamGia, h.ThanhToan,
       dbo.fn_TinhThueVAT(h.ThanhToan, DEFAULT) AS ThueVAT,
       h.ThanhToan + dbo.fn_TinhThueVAT(h.ThanhToan, DEFAULT) AS TongCongSauThue
FROM dbo.HoaDon h JOIN dbo.BanAn b ON b.MaBan = h.MaBan
WHERE h.TrangThai = N'Đã thanh toán'
ORDER BY h.ThanhToan DESC;

-- Q15. GROUP BY nhiều cấp + CASE + hàm cửa sổ: Doanh thu theo khu vực & khung giờ, xếp hạng khu vực
SELECT b.KhuVuc,
       CASE WHEN DATEPART(HOUR, h.ThoiGianLap) < 14 THEN N'Trưa (10h-14h)'
            WHEN DATEPART(HOUR, h.ThoiGianLap) < 17 THEN N'Chiều (14h-17h)'
            ELSE N'Tối (17h-22h)' END AS KhungGio,
       COUNT(*) AS SoHoaDon,
       SUM(h.ThanhToan) AS DoanhThu,
       RANK() OVER (PARTITION BY b.KhuVuc ORDER BY SUM(h.ThanhToan) DESC) AS XepHangTrongKhu
FROM dbo.HoaDon h JOIN dbo.BanAn b ON b.MaBan = h.MaBan
WHERE h.TrangThai = N'Đã thanh toán'
GROUP BY b.KhuVuc,
       CASE WHEN DATEPART(HOUR, h.ThoiGianLap) < 14 THEN N'Trưa (10h-14h)'
            WHEN DATEPART(HOUR, h.ThoiGianLap) < 17 THEN N'Chiều (14h-17h)'
            ELSE N'Tối (17h-22h)' END
ORDER BY b.KhuVuc, XepHangTrongKhu;

-- Q16. Dùng VIEW: Top khách hàng thân thiết + nguyên liệu sắp hết + doanh thu 7 ngày gần nhất
SELECT TOP 10 * FROM dbo.vw_KhachHangThanThiet ORDER BY TongChiTieu DESC;
SELECT * FROM dbo.vw_NguyenLieuSapHet;
SELECT TOP 7 * FROM dbo.vw_DoanhThuTheoNgay ORDER BY Ngay DESC;
GO
