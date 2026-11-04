# BÁO CÁO KHẮC PHỤC KỸ THUẬT (REMEDIATION REPORT)
**Dự án**: Hệ thống Quản lý Nhà hàng Sen Vàng (`QuanLyNhaHang`)  
**Vai trò thực hiện**: Senior SQL Server DBA, Backend Engineer & QA Engineer  
**Ngày hoàn thành**: 04/11/2026  

---

## 1. DANH SÁCH LỖI & NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

### Nhóm P0 — Database Business Logic & Concurrency

| Mã lỗi | Hạng mục lỗi | Nguyên nhân gốc rễ (Root Cause) |
|:---:|---|---|
| **P0-1** | Race condition trong `sp_MoHoaDon` | Kiểm tra trạng thái bàn (`SELECT ... FROM dbo.BanAn`) nằm **ngoài** `BEGIN TRANSACTION` và không sử dụng khóa cập nhật (`UPDLOCK, HOLDLOCK`), đồng thời thiếu ràng buộc duy nhất ở mức Engine cho hóa đơn đang mở trên cùng một bàn. Khi nhiều request chạy đồng thời, tất cả đều đọc thấy `TrangThai <> N'Đang phục vụ'` và cùng `INSERT` nhiều hóa đơn mở cho 1 bàn. |
| **P0-2** | Race condition trong `sp_ThanhToanHoaDon` | Các bước kiểm tra trạng thái hóa đơn, kiểm tra món ăn và tính tiền nằm ngoài `BEGIN TRANSACTION`, không có khóa `UPDLOCK, HOLDLOCK` trên dòng `dbo.HoaDon` và không kiểm tra `@@ROWCOUNT` sau `UPDATE`. Nhiều giao dịch đồng thời có thể thanh toán lặp cùng 1 hóa đơn. |
| **P0-3** | Cộng điểm tích lũy khách hàng 2 lần & sai lệch làm tròn | (1) Do `sp_ThanhToanHoaDon` không khóa dòng `HoaDon`, các request song song cùng chạy lệnh `UPDATE dbo.KhachHang SET DiemTichLuy = DiemTichLuy + ...` cho cùng một hóa đơn.<br>(2) Phép chia `@SoTienPhaiTra / 10000` (kiểu `DECIMAL(14,0) / INT` $\rightarrow$ `DECIMAL(20,6)`) khi cộng vào cột `DiemTichLuy` (`INT`) bị SQL Server tự động làm tròn (round) thay vì lấy phần nguyên (`FLOOR`), và script seed dữ liệu tính `SUM(ThanhToan) / 10000` thay vì tổng điểm từng hóa đơn, gây lệch 100/100 khách hàng. |
| **P0-4** | Race condition trong `sp_HuyHoaDon` gây hoàn kho 2 lần | Kiểm tra `TrangThai <> N'Đang phục vụ'` nằm ngoài Transaction và không có `UPDLOCK, HOLDLOCK`. Hai request hủy đồng thời đều vượt qua bước kiểm tra và chạy `UPDATE nl SET SoLuongTon = nl.SoLuongTon + ...` hai lần. Ngoài ra, câu `UPDATE ... FROM NguyenLieu JOIN CongThuc JOIN ChiTietHoaDon` chưa `GROUP BY c.MaNL`, có nguy cơ cập nhật không xác định nếu nhiều món trong cùng hóa đơn dùng chung một nguyên liệu. |
| **P0-5** | Race condition trong `sp_DatBan` gây đặt trùng bàn cùng khung giờ | Kiểm tra sức chứa bàn và gọi hàm `dbo.fn_BanTrongTrongKhungGio` nằm ngoài `BEGIN TRANSACTION`, không có khóa `UPDLOCK, HOLDLOCK` trên `BanAn` và `DatBan`. Hai giao dịch đặt bàn đồng thời trong khung $\pm 120$ phút cùng vượt qua kiểm tra và tạo lịch đặt trùng. |
| **P0-6** | Kiểm tra và cập nhật trạng thái nằm ngoài Transaction | Trong `sp_MoHoaDon`, `sp_ThemMonVaoHoaDon`, `sp_ThanhToanHoaDon`, `sp_HuyHoaDon`, `sp_DatBan`, `sp_NhapKhoNguyenLieu`, các câu lệnh `IF EXISTS / SELECT` kiểm tra điều kiện tiên quyết đều đặt trước `BEGIN TRANSACTION` và thiếu `SET XACT_ABORT ON`. |
| **P0-7** | Cập nhật trùng nghiệp vụ giữa Trigger và Stored Procedure | Trigger `trg_ChiTietHoaDon_CapNhatTongTien` đã tự động tính và duy trì `HoaDon.TongTien` sau mỗi thao tác trên `ChiTietHoaDon`, nhưng `sp_ThanhToanHoaDon` lại quét lại `ChiTietHoaDon` để tính `@TongTien` lần nữa và cập nhật lại `TongTien`. |
| **P0-8** | Mất đồng bộ trạng thái giữa `BanAn`, `HoaDon` và `DatBan` | (1) Khi tạo/xác nhận/hủy lịch đặt bàn trong ngày (`DatBan`), trạng thái `BanAn.TrangThai` không tự động đồng bộ.<br>(2) Khi thanh toán (`sp_ThanhToanHoaDon`) hoặc hủy hóa đơn (`sp_HuyHoaDon`), thủ tục luôn gán cứng `BanAn.TrangThai = N'Trống'` ngay cả khi bàn đó vẫn còn lịch đặt hợp lệ (`Chờ xác nhận` / `Đã xác nhận`) trong ngày.<br>(3) Trong `sp_MoHoaDon`, điều kiện khớp lịch đặt dùng `ABS(DATEDIFF(...)) <= 120` không đồng nhất với quy tắc `< 120` phút của `fn_BanTrongTrongKhungGio`. |
| **P0-9** | Ràng buộc `UNIQUE (Email)` trên `dbo.NhanVien` chặn nhiều `NULL` | Trong SQL Server, `UNIQUE CONSTRAINT` truyền thống coi `NULL` là một giá trị duy nhất, khiến bảng `dbo.NhanVien` chỉ cho phép tối đa 1 nhân viên có `Email IS NULL`. |

---

### Nhóm P1 — Frontend, Backend & SQL Performance

| Mã lỗi | Hạng mục lỗi | Nguyên nhân gốc rễ (Root Cause) |
|:---:|---|---|
| **P1-1** | Stored XSS trong `web/public/js/app.js` | Nhiều trường dữ liệu lấy từ DB (`SoDienThoai`, `KhuVuc`, `DonViTinh`, `HangThanhVien`, `TrangThai`, `MaMon`) được nội suy trực tiếp vào chuỗi `innerHTML` mà không qua hàm escape HTML (`esc()`). |
| **P1-2** | Inline event handler chứa dữ liệu database | Giao diện sử dụng hàng loạt thuộc tính `onclick="openBan(${b.MaBan})"`, `onclick="quickAddMon(${m.MaMon})"`, `onclick="editMon(${m.MaMon})"`, `onclick="setDB(${d.MaDatBan}, ...)"` nội suy trực tiếp dữ liệu từ DB vào chuỗi mã JS trong HTML. |
| **P1-3** | Xử lý lỗi API chưa chuẩn hóa & lộ lỗi SQL nội bộ | Middleware `wrap()` trong `web/server.js` trả thẳng `res.status(400).json({ error: e.message })` cho mọi ngoại lệ, làm lộ thông báo lỗi SQL nội bộ (tên bảng, tên cột, cú pháp) và dùng sai HTTP status code (`400` cho cả lỗi hệ thống `500` và lỗi trùng lặp `409`). |
| **P1-4** | Thiếu validation đầu vào tại Backend | Các API `POST`/`PUT`/`DELETE` trong `web/server.js` truyền trực tiếp `req.body` và `req.params` vào câu truy vấn/Stored Procedure mà không kiểm tra kiểu dữ liệu, miền giá trị (số nguyên dương, SĐT 9–11 số, định dạng email, giới tính, phương thức thanh toán, phần trăm giảm giá). |
| **P1-5** | Lệch múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7) | Driver `mssql` mặc định cấu hình `useUTC: true`, khiến các giá trị `DATETIME` lưu theo giờ địa phương của SQL Server (`GETDATE()`) bị hiểu nhầm là giờ UTC và cộng thêm +7 giờ khi hiển thị ở trình duyệt. Đồng thời chuỗi `datetime-local` gửi từ client chưa được gắn hậu tố `+07:00` khi parse tại server. |
| **P1-6** | Bất nhất dữ liệu giữa Frontend, Database và Seed Data | (1) Frontend trang Khách hàng đọc `k.GioiTinh` nhưng view `dbo.vw_KhachHangThanThiet` không chọn cột `GioiTinh`, khiến toàn bộ khách hàng bị hiển thị `—`.<br>(2) Dữ liệu mẫu trong `02_InsertData.sql` có 102 dòng `DatBan` vi phạm `SoNguoi > BanAn.SoCho` và tham chiếu `MaKH` lệch ID.<br>(3) Xóa món cuối cùng trên hóa đơn (`DELETE /api/hoadon/:id/mon/:maMon`) không ghi nhận vào `NhatKyHoaDon`. |
| **P1-7** | Truy vấn không SARGable (`ABS(DATEDIFF)`, `CAST AS DATE`, `YEAR()`) | (1) `fn_BanTrongTrongKhungGio` và `sp_DatBan` dùng `ABS(DATEDIFF(MINUTE, ThoiGianDat, @ThoiGian)) < 120` buộc SQL Server phải thực hiện **Index Scan** toàn bộ `IX_DatBan_ThoiGianDat` thay vì **Index Seek**.<br>(2) `fn_MonBanChay`, `Q5` (`05_Queries.sql`), và `sp_BaoCaoDoanhThuTheoThang` bọc cột thời gian trong hàm `CAST(... AS DATE)` hoặc `YEAR(...)`, làm mất khả năng dùng range seek trực tiếp. |

---

### Nhóm P2 — Data Integrity, Testing & Code Quality

| Mã lỗi | Hạng mục lỗi | Nguyên nhân gốc rễ (Root Cause) |
|:---:|---|---|
| **P2-1** | Thiếu kịch bản kiểm toán toàn vẹn dữ liệu định kỳ | Chưa có script độc lập kiểm tra toàn diện các bất biến nghiệp vụ (hóa đơn trùng bàn, tổng tiền, trùng lịch đặt bàn, tồn kho, điểm tích lũy, bản ghi mồ côi). |
| **P2-2** | Thiếu bộ kiểm thử tự động (Unit, API, Transaction, Concurrency) | Chỉ có script demo thủ công `06_Test_Demo.sql`, chưa có automated test suite chạy kiểm증 đồng thời (concurrency) trên SQL Server thực tế. |
| **P2-3** | File `web/public/js/app.js` nguyên khối (Monolithic) | Toàn bộ tiện ích, hiệu ứng UI, biểu đồ, POS, thực đơn và vận hành đặt trong 1 file duy nhất (~660 dòng) khó bảo trì. |
| **P2-4** | File cache và file tạm bị theo dõi trong Git index | Các thư mục `.chrome_temp*`, `erd/__pycache__`, `web/node_modules`, `report/*.bak.*`, và `web/public/index.original.html` đã bị đưa vào Git index trước khi cấu hình `.gitignore`. |

---

## 2. DANH SÁCH FILE THAY ĐỔI & GIẢI PHÁP TRIỂN KHAI

### 2.1. Tầng Cơ sở dữ liệu (`sql/` & `scripts/`)
1. **[sql/01_CreateDatabase_Tables.sql](file:///d:/Quan-ly-nha-hang-master/sql/01_CreateDatabase_Tables.sql)**:
   - Bổ sung `SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON;`.
   - Thay thế `CONSTRAINT UQ_NhanVien_Email UNIQUE (Email)` bằng ràng buộc kiểm tra định dạng `CK_NhanVien_Email` và **Filtered Unique Index** `CREATE UNIQUE NONCLUSTERED INDEX UQ_NhanVien_Email ON dbo.NhanVien (Email) WHERE Email IS NOT NULL;`.
2. **[sql/03_Index_Function_View.sql](file:///d:/Quan-ly-nha-hang-master/sql/03_Index_Function_View.sql)**:
   - Bổ sung **Filtered Unique Index** `UQ_HoaDon_BanDangPhucVu` trên `dbo.HoaDon (MaBan) WHERE TrangThai = N'Đang phục vụ'` để bảo vệ tuyệt đối quy tắc 1 bàn chỉ có tối đa 1 hóa đơn đang mở.
   - Tối ưu hóa hàm `dbo.fn_BanTrongTrongKhungGio` sang biểu thức SARGable: `ThoiGianDat > DATEADD(MINUTE, -120, @ThoiGian) AND ThoiGianDat < DATEADD(MINUTE, 120, @ThoiGian)`.
   - Tối ưu hóa hàm `dbo.fn_MonBanChay` sang biểu thức SARGable: `h.ThoiGianThanhToan >= @TuNgay AND h.ThoiGianThanhToan < DATEADD(DAY, 1, @DenNgay)`.
   - Cập nhật `dbo.vw_KhachHangThanThiet` bổ sung cột `k.GioiTinh` và `k.NgaySinh`.
3. **[sql/04_StoredProcedures_Triggers.sql](file:///d:/Quan-ly-nha-hang-master/sql/04_StoredProcedures_Triggers.sql)**:
   - Bổ sung Trigger `dbo.trg_DatBan_DongBoTrangThaiBan` trên `dbo.DatBan` (`AFTER INSERT, UPDATE, DELETE`) tự động đồng bộ `dbo.BanAn.TrangThai` (`Đang phục vụ` $\rightarrow$ `Đã đặt` $\rightarrow$ `Trống`).
   - Bọc toàn bộ logic kiểm tra và cập nhật của `sp_MoHoaDon`, `sp_ThemMonVaoHoaDon`, `sp_ThanhToanHoaDon`, `sp_HuyHoaDon`, `sp_DatBan`, `sp_NhapKhoNguyenLieu` vào trong `BEGIN TRANSACTION ... COMMIT` với `SET XACT_ABORT ON` và khóa `WITH (UPDLOCK, HOLDLOCK)`.
   - Trong `sp_ThanhToanHoaDon`: sử dụng `TongTien` đã được Trigger `trg_ChiTietHoaDon_CapNhatTongTien` duy trì; kiểm tra `@@ROWCOUNT = 0`; tính điểm tích lũy bằng `CAST(FLOOR(@SoTienPhaiTra / 10000.0) AS INT)`; đồng bộ lại trạng thái bàn theo lịch đặt còn lại trong ngày.
   - Trong `sp_HuyHoaDon`: khóa dòng hóa đơn với `UPDLOCK, HOLDLOCK`, gộp nhóm nguyên liệu hoàn trả theo `GROUP BY c.MaNL` để hoàn kho chính xác 1 lần, và đồng bộ lại trạng thái bàn.
   - Trong `sp_DatBan`: khóa dòng `BanAn` (`UPDLOCK, HOLDLOCK`) và kiểm tra phạm vi `DatBan` (`UPDLOCK, HOLDLOCK`) bằng biểu thức SARGable `DATEADD(MINUTE, ±120, @ThoiGianDat)`.
   - Trong `sp_BaoCaoDoanhThuTheoThang`: thay `YEAR(ThoiGianThanhToan) = @Nam` bằng khoảng thời gian SARGable `DATEFROMPARTS(@Nam, 1, 1)` đến `DATEFROMPARTS(@Nam + 1, 1, 1)`.
4. **[sql/05_Queries.sql](file:///d:/Quan-ly-nha-hang-master/sql/05_Queries.sql)**:
   - Tối ưu hóa truy vấn Q5 thay `CAST(ThoiGianDat AS DATE) = CAST(GETDATE() AS DATE)` bằng biểu thức khoảng SARGable.
5. **[sql/02_InsertData.sql](file:///d:/Quan-ly-nha-hang-master/sql/02_InsertData.sql)**, **[sql/02_InsertData_3000_2020_2025.sql](file:///d:/Quan-ly-nha-hang-master/sql/02_InsertData_3000_2020_2025.sql)**, **[sql/QuanLyNhaHang_FULL.sql](file:///d:/Quan-ly-nha-hang-master/sql/QuanLyNhaHang_FULL.sql)**, **[scripts/generate_sample_data.js](file:///d:/Quan-ly-nha-hang-master/scripts/generate_sample_data.js)**, **[scripts/update_all_sql_files.js](file:///d:/Quan-ly-nha-hang-master/scripts/update_all_sql_files.js)**:
   - Chuẩn hóa dữ liệu mẫu: đảm bảo `DatBan.SoNguoi <= BanAn.SoCho`, đồng bộ công thức tính `DiemTichLuy = SUM(CAST(FLOOR(ThanhToan / 10000.0) AS INT))`, và cập nhật bản tổng hợp `QuanLyNhaHang_FULL.sql`.
6. **[sql/07_DataIntegrity_Audit.sql](file:///d:/Quan-ly-nha-hang-master/sql/07_DataIntegrity_Audit.sql)**:
   - Tạo mới kịch bản kiểm toán toàn vẹn dữ liệu gồm 6 phần chi tiết và bảng tổng hợp vi phạm.

### 2.2. Tầng Backend & Frontend (`web/`)
1. **[web/server.js](file:///d:/Quan-ly-nha-hang-master/web/server.js)**:
   - Cấu hình `useUTC: false` cho connection pool `mssql` và xây dựng hàm `parseVietnamDateTime()` xử lý chuẩn múi giờ `Asia/Ho_Chi_Minh` (`+07:00`).
   - Xây dựng lớp `ApiError` và hàm `mapDatabaseError()` ánh xạ mã lỗi nghiệp vụ (`50001..50099` $\rightarrow$ `400`), lỗi trùng lặp (`2601/2627` $\rightarrow$ `409`), lỗi khóa ngoại/ràng buộc (`547` $\rightarrow$ `400`), deadlock (`1205` $\rightarrow$ `409`) và ẩn toàn bộ chi tiết lỗi SQL nội bộ (`500 INTERNAL_SERVER_ERROR`).
   - Bổ sung kiểm tra dữ liệu đầu vào (`validatePositiveInt`, kiểm tra định dạng SĐT, Email, Giới tính, Giảm giá, Phương thức thanh toán, Số người đặt bàn) cho toàn bộ API.
   - Bổ sung khóa `UPDLOCK, HOLDLOCK` và ghi log `NhatKyHoaDon` khi xóa món khỏi hóa đơn (`DELETE /api/hoadon/:id/mon/:maMon`) và kiểm tra xung đột lịch đặt khi cập nhật trạng thái đặt bàn (`PUT /api/datban/:id/trangthai`).
2. **[web/public/index.html](file:///d:/Quan-ly-nha-hang-master/web/public/index.html)**, **[web/public/js/app.js](file:///d:/Quan-ly-nha-hang-master/web/public/js/app.js)** & **[web/public/js/modules/](file:///d:/Quan-ly-nha-hang-master/web/public/js/modules/)**:
   - Tách `app.js` thành 6 module chuyên biệt theo chức năng:
     - [core.js](file:///d:/Quan-ly-nha-hang-master/web/public/js/modules/core.js): Hàm tiện ích, định dạng tiền tệ/thời gian theo múi giờ `Asia/Ho_Chi_Minh`, hàm chống XSS `esc()`, gọi API, quản lý `STATE` và Modal/Drawer.
     - [effects.js](file:///d:/Quan-ly-nha-hang-master/web/public/js/modules/effects.js): Hiệu ứng 3D Card Tilt, Magnetic Button, Animated Counter (`anime.js`).
     - [dashboard.js](file:///d:/Quan-ly-nha-hang-master/web/public/js/modules/dashboard.js): Trang Tổng quan điều hành & Báo cáo doanh thu.
     - [pos.js](file:///d:/Quan-ly-nha-hang-master/web/public/js/modules/pos.js): Sơ đồ bàn, mở bàn, ngăn kéo gọi món, thanh toán, hủy hóa đơn.
     - [menu.js](file:///d:/Quan-ly-nha-hang-master/web/public/js/modules/menu.js): Quản lý thực đơn món ăn và công thức nguyên liệu.
     - [operations.js](file:///d:/Quan-ly-nha-hang-master/web/public/js/modules/operations.js): Quản lý Đặt bàn, Hóa đơn, Khách hàng CRM, Tồn kho, Nhân viên.
   - Bọc `esc()` cho toàn bộ dữ liệu xuất ra HTML và thay thế 100% inline `onclick` chứa dữ liệu DB bằng cơ chế **Event Delegation** qua `data-action` và `data-*` trong [app.js](file:///d:/Quan-ly-nha-hang-master/web/public/js/app.js).
3. **[web/test/remediation.test.js](file:///d:/Quan-ly-nha-hang-master/web/test/remediation.test.js)** & **[web/package.json](file:///d:/Quan-ly-nha-hang-master/web/package.json)**:
   - Bổ sung bộ kiểm thử tự động tích hợp sẵn vào lệnh `npm test`.
4. **[.gitignore](file:///d:/Quan-ly-nha-hang-master/.gitignore)** & **[README.md](file:///d:/Quan-ly-nha-hang-master/README.md)**:
   - Loại bỏ các file cache/tạm (`.chrome_temp*`, `erd/__pycache__`, `web/node_modules`, `*.bak.*`, `index.original.html`) khỏi Git index và cập nhật đầy đủ tài liệu kỹ thuật.

---

## 3. PHÂN TÍCH HIỆU NĂNG SQL (EXECUTION PLAN & LOGICAL READS)

Kết quả đo thực tế trên SQL Server (`SET SHOWPLAN_TEXT ON` và `SET STATISTICS IO, TIME ON`):

| Truy vấn / Thủ tục | Trước tối ưu (Execution Plan & IO) | Sau tối ưu SARGable (Execution Plan & IO) | Đánh giá tác động |
|---|---|---|---|
| **Kiểm tra trùng lịch đặt bàn $\pm 120$ phút**<br>(`fn_BanTrongTrongKhungGio`, `sp_DatBan`) | `ABS(DATEDIFF(MINUTE, ThoiGianDat, @tg)) < 120`<br>• Plan: **`Index Scan`** trên `IX_DatBan_ThoiGianDat`<br>• Logical Reads: **5 pages**<br>• Khi giữ khóa `UPDLOCK, HOLDLOCK` sẽ khóa toàn bộ index `DatBan`. | `ThoiGianDat > DATEADD(MINUTE, -120, @tg) AND ThoiGianDat < DATEADD(MINUTE, 120, @tg)`<br>• Plan: **`Index Seek`** trên `IX_DatBan_ThoiGianDat`<br>• Logical Reads: **2 pages** (**giảm 60%**)<br>• Chỉ giữ khóa Key-Range đúng trong cửa sổ 4 giờ. | Tăng thông lượng giao dịch đồng thời, giảm 60% IO và tránh khóa toàn bảng khi đặt bàn. |
| **Lọc lịch đặt bàn trong ngày**<br>(`05_Queries.sql` Q5, `trg_DatBan_DongBoTrangThaiBan`) | `CAST(ThoiGianDat AS DATE) = CAST(GETDATE() AS DATE)`<br>• Plan: `Index Seek` kèm Residual Predicate `WHERE CONVERT(date, ThoiGianDat) = ...` trên từng dòng. | `ThoiGianDat >= CAST(GETDATE() AS DATE) AND ThoiGianDat < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))`<br>• Plan: Pure **`Index Seek`** trên `IX_DatBan_ThoiGianDat`, loại bỏ hoàn toàn bước ép kiểu từng dòng. | Loại bỏ CPU overhead của `CONVERT` trên từng bản ghi,Logical Reads = **2 pages**. |
| **Thống kê món bán chạy & Doanh thu năm**<br>(`fn_MonBanChay`, `sp_BaoCaoDoanhThuTheoThang`) | `CAST(h.ThoiGianThanhToan AS DATE) BETWEEN ...` / `YEAR(ThoiGianThanhToan) = @Nam`<br>• Ép kiểu từng dòng trên 3.007 hóa đơn, Elapsed time = **18 ms**. | `h.ThoiGianThanhToan >= @TuNgay AND h.ThoiGianThanhToan < DATEADD(DAY, 1, @DenNgay)`<br>• So sánh trực tiếp kiểu `DATETIME`, Elapsed time = **9 ms** (**nhanh hơn 50%**). | Giảm 50% thời gian thực thi, sẵn sàng tận dụng Index trên `ThoiGianThanhToan` khi dữ liệu tăng trưởng. |
| **Kiểm tra hóa đơn đang mở theo bàn**<br>(`sp_MoHoaDon`, `UQ_HoaDon_BanDangPhucVu`) | Chỉ có index thường, không chặn được trùng lặp ở mức Engine. | `Index Seek` trên `IX_HoaDon_TrangThai` / `UQ_HoaDon_BanDangPhucVu` (`WHERE TrangThai = N'Đang phục vụ'`)<br>• Logical Reads = **2–3 pages**, Elapsed time < **1 ms**. | Filtered Index chỉ đánh chỉ mục trên các hóa đơn đang mở (thường < 25 dòng), **không gây overhead** cho hàng nghìn hóa đơn lịch sử khi `INSERT/UPDATE/DELETE`. |

---

## 4. KẾT QUẢ KIỂM THỬ (TEST EVIDENCE)

### 4.1. Kết quả chạy `sql/07_DataIntegrity_Audit.sql` trên SQL Server thực tế
Thực thi trực tiếp kịch bản kiểm toán trên database `QuanLyNhaHang`:

| Chỉ số kiểm toán | Số lượng lỗi phát hiện | Trạng thái |
|---|:---:|:---:|
| `Loi_HoaDonTrungBan` (Bàn có $>1$ hóa đơn đang phục vụ) | **0** | ✅ ĐẠT |
| `Loi_DongBoTrangThaiBan` (Lệch trạng thái giữa `BanAn`, `HoaDon`, `DatBan`) | **0** | ✅ ĐẠT |
| `Loi_TongTienHoaDon` (`HoaDon.TongTien <> SUM(ChiTietHoaDon.ThanhTien)`) | **0** | ✅ ĐẠT |
| `Loi_ThanhToanSauGiam` (Sai lệch tiền thanh toán sau chiết khấu) | **0** | ✅ ĐẠT |
| `Loi_DatBanTrungLich` (Đặt bàn trùng khung giờ $\pm 120$ phút) | **0** | ✅ ĐẠT |
| `Loi_DatBanVuotSoCho` (`DatBan.SoNguoi > BanAn.SoCho`) | **0** | ✅ ĐẠT |
| `Loi_TonKhoNguyenLieu` (Tồn kho âm, mức tối thiểu âm, định lượng $\le 0$) | **0** | ✅ ĐẠT |
| `Loi_DiemTichLuyKhachHang` (Lệch điểm tích lũy khách hàng so với hóa đơn) | **0** | ✅ ĐẠT |
| `Loi_BanGhiMoCoi` (Bản ghi không có liên kết hợp lệ trên 10 bảng chính) | **0** | ✅ ĐẠT |

*(Ghi chú: Bảng `NhatKyHoaDon` có 18 dòng log lịch sử của 4 hóa đơn demo đã bị xóa từ các phiên chạy thử trước đó; theo đúng quy tắc "Không xóa dữ liệu" và thiết kế bảng append-only audit log, 18 bản ghi vết này được giữ nguyên và phân loại riêng tại cột `CanhBao_LogHoaDonDaXoa`).*

### 4.2. Kết quả chạy Automated Test Suite (`npm test`)
Thực thi `cd web && npm test` (`web/test/remediation.test.js`) trực tiếp với SQL Server:

```text
▶ 1. Unit Tests — Timezone, Error Mapping, Validation & XSS Security
  ✔ 1.1. parseVietnamDateTime() chuẩn hóa đúng múi giờ Việt Nam (UTC+7)
  ✔ 1.2. validatePositiveInt() kiểm tra chặt số nguyên dương
  ✔ 1.3. mapDatabaseError() phân loại đúng mã lỗi nghiệp vụ và ẩn lỗi SQL nội bộ
  ✔ 1.4. Frontend ES modules đã loại bỏ hoàn toàn inline onclick chứa dữ liệu DB và bọc XSS escaping
✔ 1. Unit Tests — Timezone, Error Mapping, Validation & XSS Security

▶ 2. API Integration Tests — Endpoints, Validation & Data Consistency
  ✔ 2.1. GET /api/dashboard trả về đầy đủ KPI, doanh thu 14 ngày và cảnh báo nguyên liệu
  ✔ 2.2. GET /api/khachhang đồng bộ đầy đủ trường GioiTinh và HangThanhVien giữa DB và Frontend
  ✔ 2.3. Chuẩn hóa lỗi khi gửi JSON sai cú pháp hoặc dữ liệu đầu vào không hợp lệ
✔ 2. API Integration Tests — Endpoints, Validation & Data Consistency

▶ 3. Transaction & Business Logic Tests — Schema, Triggers & State Sync
  ✔ 3.1. Filtered Unique Index UQ_NhanVien_Email cho phép nhiều NULL nhưng chặn trùng Email khác NULL
  ✔ 3.2. Đồng bộ trạng thái Bàn — Đặt bàn — Hóa đơn và kiểm soát tồn kho chính xác
✔ 3. Transaction & Business Logic Tests — Schema, Triggers & State Sync

▶ 4. Concurrency Tests trên SQL Server thực tế — Chống Race Condition
  ✔ 4.1. [P0-1] 10 request đồng thời gọi sp_MoHoaDon trên cùng 1 bàn: chỉ 1 thành công, 9 bị chặn
  ✔ 4.2. [P0-2 & P0-3] 10 request đồng thời gọi sp_ThanhToanHoaDon: chỉ thanh toán 1 lần, KHÔNG cộng điểm 2 lần
  ✔ 4.3. [P0-4] 10 request đồng thời gọi sp_HuyHoaDon: chỉ hủy 1 lần, KHÔNG hoàn kho 2 lần
  ✔ 4.4. [P0-5] 10 request đồng thời gọi sp_DatBan cùng bàn trong khung giờ ±2h: chỉ 1 thành công
✔ 4. Concurrency Tests trên SQL Server thực tế — Chống Race Condition

ℹ tests 13 | suites 4 | pass 13 | fail 0
```

---

## 5. NHỮNG HẠNG MỤC CÒN TỒN TẠI (OUT OF SCOPE THEO YÊU CẦU)

Theo đúng giới hạn phạm vi tại mục **PHẠM VI KHÔNG ƯU TIÊN** của yêu cầu:
1. **Authentication / Authorization**: Hệ thống hiện tại phục vụ môi trường nội bộ/demo POS chưa tích hợp cơ chế đăng nhập phân quyền người dùng (JWT/Session/RBAC) trên tầng Web API.
2. **Quy trình khởi tạo & DROP/RESET Database**: Giữ nguyên cơ chế khởi tạo trong `01_CreateDatabase_Tables.sql` và `QuanLyNhaHang_FULL.sql` theo thiết kế gốc của đồ án, không thiết kế lại quy trình migration/reset database.
3. **18 bản ghi lịch sử trong `NhatKyHoaDon` (`MaNK 1..18`)**: Trỏ tới 4 mã hóa đơn thử nghiệm cũ đã bị xóa trước đợt remediation (`MaHD = 207, 208, 12711, 12712`). Được giữ nguyên 100% để tuân thủ tuyệt đối quy tắc *"Không xóa dữ liệu"* và bảo toàn lịch sử kiểm toán.

---

## 6. ĐÁNH GIÁ SAU REMEDIATION

1. **Tính toàn vẹn giao dịch & Chống Race Condition (ACID & Concurrency)**:
   - Toàn bộ các thủ tục trọng yếu (`sp_MoHoaDon`, `sp_ThemMonVaoHoaDon`, `sp_ThanhToanHoaDon`, `sp_HuyHoaDon`, `sp_DatBan`, `sp_NhapKhoNguyenLieu`) đã được bảo vệ bởi `SET XACT_ABORT ON`, Transaction bao trùm toàn bộ pha đọc-kiểm-tra và ghi (`UPDLOCK, HOLDLOCK`), kết hợp chốt chặn vật lý `UQ_HoaDon_BanDangPhucVu` ở cấp Storage Engine.
   - Đã triệt tiêu hoàn toàn nguy cơ mở 2 hóa đơn cho 1 bàn, thanh toán/cộng điểm 2 lần, hoàn kho 2 lần khi hủy đơn, hoặc đặt trùng bàn trong khung giờ $\pm 2\text{h}$.
2. **An toàn bảo mật & Chất lượng mã nguồn (Security & Code Quality)**:
   - Khắc phục triệt để lỗ hổng Stored XSS và loại bỏ toàn bộ inline event handlers chứa dữ liệu DB trong các module JS.
   - Chuẩn hóa kiến trúc Frontend theo ES Modules (`core`, `effects`, `dashboard`, `pos`, `menu`, `operations`) giữ nguyên 100% UI/UX hiện có.
   - Backend kiểm soát chặt dữ liệu đầu vào, xử lý thống nhất múi giờ Việt Nam (`UTC+7`) và che chắn hoàn toàn lỗi SQL nội bộ khỏi phía client.
3. **Hiệu năng & Khả năng kiểm chứng (Performance & Verifiability)**:
   - Các truy vấn và hàm lọc theo thời gian đã được chuyển sang dạng SARGable giúp SQL Server chuyển từ `Index Scan` sang `Index Seek`, giảm 60% Logical Reads và thu hẹp phạm vi khóa dòng.
   - Có đầy đủ công cụ kiểm toán dữ liệu (`sql/07_DataIntegrity_Audit.sql`) và bộ test tự động (`npm test`) để kiểm chứng bất kỳ thay đổi nào trong tương lai.
