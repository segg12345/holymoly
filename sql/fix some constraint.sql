	USE QuanLyNhaHang;
GO


-- 1. Xóa ràng buộc cũ (dùng DATEDIFF bị kẽ hở năm)
ALTER TABLE dbo.NhanVien 
DROP CONSTRAINT CK_NhanVien_TuoiLaoDong;
GO

-- 2. Thêm ràng buộc mới (chuẩn hóa bằng DATEADD)
ALTER TABLE dbo.NhanVien 
ADD CONSTRAINT CK_NhanVien_TuoiLaoDong 
CHECK (NgayVaoLam >= DATEADD(YEAR, 18, NgaySinh));
GO

-- 1. Xóa ràng buộc cũ của bảng KhachHang
ALTER TABLE dbo.KhachHang 
DROP CONSTRAINT CK_KhachHang_SDT;
GO

-- 2. Thêm ràng buộc mới (bắt buộc đầu số 0, toàn ký tự số, 10-11 số)
ALTER TABLE dbo.KhachHang 
ADD CONSTRAINT CK_KhachHang_SDT 
CHECK (SoDienThoai LIKE '0[0-9]%' 
   AND SoDienThoai NOT LIKE '%[^0-9]%' 
   AND LEN(SoDienThoai) BETWEEN 10 AND 11);
GO

-- 3. (Khuyến nghị) Bổ sung luôn kiểm tra SĐT cho bảng NhanVien cho đồng bộ
ALTER TABLE dbo.NhanVien 
ADD CONSTRAINT CK_NhanVien_SDT 
CHECK (SoDienThoai LIKE '0[0-9]%' 
   AND SoDienThoai NOT LIKE '%[^0-9]%' 
   AND LEN(SoDienThoai) BETWEEN 10 AND 11);
GO
