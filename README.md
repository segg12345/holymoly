# Hệ thống Quản lý Nhà hàng — Bài tập lớn DBMS (SQL Server)

## 1. Cấu trúc thư mục

```
├── README.md                          ← hướng dẫn này
├── sql/
│   ├── QuanLyNhaHang_FULL.sql         ← CHẠY 1 FILE NÀY LÀ ĐỦ (gộp 01→06)
│   ├── 01_CreateDatabase_Tables.sql   ← tạo DB + 10 bảng + ràng buộc
│   ├── 02_InsertData.sql              ← dữ liệu mẫu cơ bản (200+ hóa đơn)
│   ├── 02_InsertData_3000_2020_2025.sql ← BỔ SUNG 3,000 HÓA ĐƠN MẪU (2020-2025, 100 khách, 450 đặt bàn)
│   ├── 03_Index_Function_View.sql     ← 8 index, 6 function, 8 view
│   ├── 04_StoredProcedures_Triggers.sql ← 7 stored procedure, 2 trigger
│   ├── 05_Queries.sql                 ← 16 truy vấn nghiệp vụ
│   └── 06_Test_Demo.sql               ← demo SP, vi phạm ràng buộc, transaction
├── web/                               ← giao diện web (Node.js + Express + mssql)
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── public/index.html
├── report/BaoCao_QuanLyNhaHang.docx / .pdf
├── slides/Slides_QuanLyNhaHang.pptx
└── erd/erd.png
```

## 2. Yêu cầu môi trường

| Thành phần | Phiên bản |
|---|---|
| SQL Server | 2019 / 2022 **Express** trở lên |
| SQL Server Management Studio (SSMS) | 19+ (hoặc Azure Data Studio) |
| Node.js (chỉ cho web) | 18 LTS trở lên |

## 3. Chạy script SQL

### Cách 1 — chạy một file duy nhất (khuyến nghị)
1. Mở SSMS → kết nối tới instance (ví dụ `localhost\SQLEXPRESS`).
2. **File → Open → File…** chọn `sql/QuanLyNhaHang_FULL.sql`.
3. Nhấn **Execute (F5)**. Script sẽ tự:
   - xóa DB cũ (nếu có) → tạo DB `QuanLyNhaHang` (collation `Vietnamese_CI_AS`)
   - tạo 10 bảng chính + 1 bảng log, đầy đủ PK / FK / UNIQUE / NOT NULL / DEFAULT / CHECK
   - chèn dữ liệu mẫu, sinh ngẫu nhiên ~200 hóa đơn + ~800 dòng chi tiết
   - tạo index, function, view, stored procedure, trigger
   - chạy 16 truy vấn và kịch bản kiểm thử (xem tab **Results** & **Messages**)
4. Thời gian chạy khoảng 5–15 giây.

### Cách 2 — chạy từng bước
Chạy lần lượt `01` → `02` → `03` → `04` → `05` → `06`. Thứ tự này bắt buộc vì:
`02` cần bảng từ `01`; view/proc trong `03`/`04` cần function; `05`/`06` cần dữ liệu.

### Cách 3 — dòng lệnh (sqlcmd)
```bat
sqlcmd -S localhost\SQLEXPRESS -E -i sql\QuanLyNhaHang_FULL.sql -f 65001
```
(`-f 65001` để đọc file UTF-8 có dấu tiếng Việt).

### Nạp bổ sung 3,000 dữ liệu mẫu (2020 — 2025)
Nếu cần báo cáo doanh thu nhiều năm, phân tích xu hướng hoặc kiểm thử tải lớn với 3,000 hóa đơn mẫu trải dài từ 2020 đến 2025:
```bat
sqlcmd -S localhost -U nhahang_app -P NhaHang@123 -d QuanLyNhaHang -C -f 65001 -i sql\02_InsertData_3000_2020_2025.sql
```
(Hoặc mở file `sql\02_InsertData_3000_2020_2025.sql` trong SSMS và nhấn **F5**).

> Lưu ý: dữ liệu hóa đơn được sinh ngẫu nhiên theo ngày hiện tại của máy, nên số liệu
> báo cáo mỗi lần chạy sẽ khác nhau một chút — đây là chủ ý để kiểm thử.

## 4. Thử nhanh các đối tượng chính

```sql
USE QuanLyNhaHang;

-- Mở hóa đơn cho bàn 1, nhân viên 4, khách 2
DECLARE @hd INT, @tien DECIMAL(14,0);
EXEC sp_MoHoaDon @MaBan=1, @MaNV=4, @MaKH=2, @MaHD=@hd OUTPUT;
EXEC sp_ThemMonVaoHoaDon @hd, 7, 1;        -- gọi Gà nướng mật ong
EXEC sp_ThemMonVaoHoaDon @hd, 35, 2;       -- 2 Bia Tiger
EXEC sp_ThanhToanHoaDon @hd, N'Thẻ', 10, @tien OUTPUT;   -- giảm 10%
SELECT @tien AS KhachPhaiTra;

-- Báo cáo
DECLARE @tong DECIMAL(16,0);
EXEC sp_BaoCaoDoanhThuTheoThang 2026, @tong OUTPUT;
SELECT * FROM vw_TinhTrangBan;
SELECT TOP 5 * FROM fn_MonBanChay('2026-01-01','2026-12-31') ORDER BY TongSoLuong DESC;
```

## 5. Chạy giao diện web

1. Bật **TCP/IP** cho SQL Server: *SQL Server Configuration Manager → SQL Server Network Configuration → Protocols for SQLEXPRESS → TCP/IP = Enabled* (port 1433 trong tab IP Addresses → IPAll). Khởi động lại dịch vụ SQL Server.
2. Bật chế độ xác thực **SQL Server and Windows Authentication**, tạo login (hoặc dùng `sa`):
   ```sql
   CREATE LOGIN nhahang_app WITH PASSWORD = 'NhaHang@123';
   USE QuanLyNhaHang;
   CREATE USER nhahang_app FOR LOGIN nhahang_app;
   ALTER ROLE db_owner ADD MEMBER nhahang_app;
   ```
3. Trong thư mục `web/`:
   ```bash
   copy .env.example .env      # rồi sửa DB_USER / DB_PASSWORD / DB_SERVER cho đúng
   npm install
   npm start
   ```
4. Mở trình duyệt: <http://localhost:3000>

Web gồm các màn hình: **Tổng quan** (KPI, doanh thu 14 ngày, món bán chạy, cảnh báo kho),
**Sơ đồ bàn** (mở hóa đơn, gọi món, thanh toán — gọi trực tiếp stored procedure),
**Thực đơn** (thêm/sửa/ngừng bán món), **Đặt bàn**, **Hóa đơn**, **Khách hàng**, **Kho**.

## 6. Khắc phục sự cố

| Lỗi | Nguyên nhân / cách xử lý |
|---|---|
| `Cannot drop database because it is currently in use` | Đóng các cửa sổ query khác đang dùng DB rồi chạy lại |
| Chữ tiếng Việt thành `?` | File đã lưu UTF-8 with BOM; trong SSMS: *File → Save As → Save with Encoding → UTF-8*; với sqlcmd dùng `-f 65001` |
| Web báo `ECONNREFUSED` / `ELOGIN` | Chưa bật TCP/IP hoặc sai user/password trong `.env` |
| Web báo `Failed to connect ... self signed certificate` | Giữ `DB_TRUST_CERT=true` trong `.env` |
