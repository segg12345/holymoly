/* =====================================================================
   AUTOMATED TEST SUITE — NHÀ HÀNG SEN VÀNG
   Bao gồm:
     1. Backend & Frontend Unit Tests (Timezone, Error Mapping, Validation, XSS)
     2. API Integration Tests (REST Endpoints, Validation, Error Masking)
     3. Transaction & Business Logic Tests (Filtered Index, Triggers, Inventory, Sync)
     4. SQL Server Concurrency Tests (sp_MoHoaDon, sp_ThanhToanHoaDon, sp_HuyHoaDon, sp_DatBan)
   ===================================================================== */
process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');

const {
  app,
  poolPromise,
  ApiError,
  parseVietnamDateTime,
  validatePositiveInt,
  mapDatabaseError,
} = require('../server');

let server;
let baseUrl;
let pool;

// Theo dõi các bản ghi sinh ra trong quá trình test để dọn dẹp sạch sẽ
const createdInvoiceIds = new Set();
const createdBookingIds = new Set();

async function api(method, route, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${route}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

before(async () => {
  pool = await poolPromise;
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  // Dọn dẹp mọi dữ liệu test phát sinh (nếu còn) để giữ nguyên trạng thái DB
  if (pool) {
    try {
      for (const maHD of createdInvoiceIds) {
        await pool.request().input('id', sql.Int, maHD).query(`
          ALTER TABLE dbo.ChiTietHoaDon DISABLE TRIGGER trg_ChiTietHoaDon_KhoaHoaDonDaThanhToan;
          DELETE FROM dbo.ChiTietHoaDon WHERE MaHD = @id;
          ALTER TABLE dbo.ChiTietHoaDon ENABLE TRIGGER trg_ChiTietHoaDon_KhoaHoaDonDaThanhToan;
          DELETE FROM dbo.NhatKyHoaDon WHERE MaHD = @id;
          DELETE FROM dbo.HoaDon WHERE MaHD = @id;
        `);
      }
      for (const maDB of createdBookingIds) {
        await pool.request().input('id', sql.Int, maDB).query(`
          DELETE FROM dbo.DatBan WHERE MaDatBan = @id;
        `);
      }
      // Đồng bộ lại điểm tích lũy khách hàng và trạng thái bàn
      await pool.request().query(`
        UPDATE k
        SET k.DiemTichLuy = ISNULL(t.TongDiem, 0)
        FROM dbo.KhachHang k
        LEFT JOIN (
            SELECT MaKH, SUM(CAST(FLOOR(ThanhToan / 10000.0) AS INT)) AS TongDiem
            FROM dbo.HoaDon
            WHERE TrangThai = N'Đã thanh toán' AND MaKH IS NOT NULL
            GROUP BY MaKH
        ) t ON t.MaKH = k.MaKH;

        UPDATE b
        SET b.TrangThai = CASE
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
        FROM dbo.BanAn b;
      `);
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (pool) {
    await pool.close();
  }
});

/* =====================================================================
   1. BACKEND & FRONTEND UNIT TESTS
   ===================================================================== */
describe('1. Unit Tests — Timezone, Error Mapping, Validation & XSS Security', () => {
  it('1.1. parseVietnamDateTime() chuẩn hóa đúng múi giờ Việt Nam (UTC+7)', () => {
    const d1 = parseVietnamDateTime('2026-11-15T18:30');
    assert.ok(d1 instanceof Date);
    // 18:30 UTC+7 tương ứng 11:30 UTC
    assert.equal(d1.toISOString(), '2026-11-15T11:30:00.000Z');

    const d2 = parseVietnamDateTime('2026-05-01 09:15:30');
    assert.ok(d2 instanceof Date);
    assert.equal(d2.toISOString(), '2026-05-01T02:15:30.000Z');

    const d3 = parseVietnamDateTime('2026-01-01');
    assert.ok(d3 instanceof Date);
    assert.equal(d3.toISOString(), '2025-12-31T17:00:00.000Z');

    assert.equal(parseVietnamDateTime(''), null);
    assert.equal(parseVietnamDateTime(null), null);
    assert.equal(parseVietnamDateTime('not-a-date'), null);
  });

  it('1.2. validatePositiveInt() kiểm tra chặt số nguyên dương', () => {
    assert.equal(validatePositiveInt(5, 'MaBan'), 5);
    assert.equal(validatePositiveInt('12', 'MaBan'), 12);

    assert.throws(() => validatePositiveInt(0, 'MaBan'), (err) => err instanceof ApiError && err.status === 400);
    assert.throws(() => validatePositiveInt(-3, 'MaBan'), (err) => err instanceof ApiError && err.status === 400);
    assert.throws(() => validatePositiveInt(2.5, 'MaBan'), (err) => err instanceof ApiError && err.status === 400);
    assert.throws(() => validatePositiveInt('abc', 'MaBan'), (err) => err instanceof ApiError && err.status === 400);
  });

  it('1.3. mapDatabaseError() phân loại đúng mã lỗi nghiệp vụ và ẩn lỗi SQL nội bộ', () => {
    // Lỗi nghiệp vụ từ Stored Procedure (50001..50099)
    const bizErr = mapDatabaseError({ number: 50002, message: 'Bàn đang có khách phục vụ, không thể mở hóa đơn mới.' });
    assert.equal(bizErr.status, 400);
    assert.equal(bizErr.code, 'BIZ_50002');
    assert.match(bizErr.message, /Bàn đang có khách phục vụ/);

    // Lỗi trùng khóa UNIQUE (2627 / 2601)
    const dupPhone = mapDatabaseError({ number: 2627, message: "Violation of UNIQUE KEY constraint 'UQ_KhachHang_SoDienThoai'." });
    assert.equal(dupPhone.status, 409);
    assert.equal(dupPhone.code, 'DUPLICATE_PHONE');

    const dupTableOpen = mapDatabaseError({ number: 2601, message: "Cannot insert duplicate key row in object 'dbo.HoaDon' with unique index 'UQ_HoaDon_BanDangPhucVu'." });
    assert.equal(dupTableOpen.status, 409);
    assert.equal(dupTableOpen.code, 'TABLE_BUSY');

    // Lỗi Deadlock (1205)
    const deadlock = mapDatabaseError({ number: 1205, message: 'Transaction (Process ID 55) was deadlocked on lock resources.' });
    assert.equal(deadlock.status, 409);
    assert.equal(deadlock.code, 'CONCURRENCY_CONFLICT');

    // Lỗi SQL nội bộ (ví dụ: sai cú pháp 102, bảng không tồn tại 208) -> Phải trả về 500 và KHÔNG lộ thông tin SQL
    const internalSql = mapDatabaseError({ number: 208, message: "Invalid object name 'dbo.BangBiMatNoiBo'." });
    assert.equal(internalSql.status, 500);
    assert.equal(internalSql.code, 'INTERNAL_SERVER_ERROR');
    assert.ok(!internalSql.message.includes('BangBiMatNoiBo'));
    assert.equal(internalSql.message, 'Lỗi xử lý hệ thống nội bộ. Vui lòng thử lại sau.');
  });

  it('1.4. Frontend ES modules đã loại bỏ hoàn toàn inline onclick chứa dữ liệu DB và bọc XSS escaping', () => {
    const jsDir = path.join(__dirname, '..', 'public', 'js');
    const jsFiles = [
      path.join(jsDir, 'app.js'),
      ...fs.readdirSync(path.join(jsDir, 'modules')).map((f) => path.join(jsDir, 'modules', f)),
    ];

    for (const file of jsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(!/onclick\s*=/i.test(content), `Phát hiện inline onclick trong file ${path.basename(file)}`);
    }

    const coreContent = fs.readFileSync(path.join(jsDir, 'modules', 'core.js'), 'utf8');
    assert.match(coreContent, /export const esc\s*=/);
  });
});

/* =====================================================================
   2. API INTEGRATION TESTS
   ===================================================================== */
describe('2. API Integration Tests — Endpoints, Validation & Data Consistency', () => {
  it('2.1. GET /api/dashboard trả về đầy đủ KPI, doanh thu 14 ngày và cảnh báo nguyên liệu', async () => {
    const { status, data } = await api('GET', '/api/dashboard');
    assert.equal(status, 200);
    assert.ok(data.kpi);
    assert.ok(Array.isArray(data.doanhThu14Ngay));
    assert.ok(Array.isArray(data.monBanChay));
    assert.ok(Array.isArray(data.nguyenLieuSapHet));
    assert.ok(Array.isArray(data.datBanSapToi));
  });

  it('2.2. GET /api/khachhang đồng bộ đầy đủ trường GioiTinh và HangThanhVien giữa DB và Frontend', async () => {
    const { status, data } = await api('GET', '/api/khachhang');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data) && data.length > 0);
    const sample = data[0];
    assert.ok('GioiTinh' in sample, 'vw_KhachHangThanThiet phải trả về cột GioiTinh cho frontend');
    assert.ok('HangThanhVien' in sample);
    assert.ok('DiemTichLuy' in sample);
  });

  it('2.3. Chuẩn hóa lỗi khi gửi JSON sai cú pháp hoặc dữ liệu đầu vào không hợp lệ', async () => {
    const badJson = await api('POST', '/api/hoadon', '{malformed_json:');
    assert.equal(badJson.status, 400);
    assert.equal(badJson.data.code, 'INVALID_JSON');

    const badMaBan = await api('POST', '/api/hoadon', { maBan: -5, maNV: 4 });
    assert.equal(badMaBan.status, 400);
    assert.equal(badMaBan.data.code, 'VALIDATION_ERROR');

    const badDiscount = await api('POST', '/api/hoadon/1/thanhtoan', { phuongThuc: 'Tiền mặt', giamGia: 120 });
    assert.equal(badDiscount.status, 400);
    assert.equal(badDiscount.data.code, 'VALIDATION_ERROR');

    const badPhone = await api('POST', '/api/khachhang', { hoTen: 'Test User', soDienThoai: '123ABC' });
    assert.equal(badPhone.status, 400);
    assert.equal(badPhone.data.code, 'VALIDATION_ERROR');

    const dupPhone = await api('POST', '/api/khachhang', { hoTen: 'Trùng SĐT', soDienThoai: '0912000001' });
    assert.equal(dupPhone.status, 409);
    assert.equal(dupPhone.data.code, 'DUPLICATE_PHONE');
  });
});

/* =====================================================================
   3. TRANSACTION & DATABASE BUSINESS LOGIC TESTS
   ===================================================================== */
describe('3. Transaction & Business Logic Tests — Schema, Triggers & State Sync', () => {
  it('3.1. Filtered Unique Index UQ_NhanVien_Email cho phép nhiều NULL nhưng chặn trùng Email khác NULL', async () => {
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      // Chèn 2 nhân viên đều có Email = NULL -> Thành công
      await new sql.Request(tx).query(`
        INSERT INTO dbo.NhanVien (HoTen, GioiTinh, NgaySinh, SoDienThoai, Email, ChucVu, LuongCoBan)
        VALUES (N'NV Test Null 1', N'Nam', '1995-01-01', '0909990001', NULL, N'Phục vụ', 7000000),
               (N'NV Test Null 2', N'Nữ',  '1996-01-01', '0909990002', NULL, N'Phục vụ', 7000000);
      `);

      // Chèn nhân viên trùng Email đã có (hung.nv@nhahang.vn) -> Phải bị chặn bởi UQ_NhanVien_Email
      await assert.rejects(
        async () => {
          await new sql.Request(tx).query(`
            INSERT INTO dbo.NhanVien (HoTen, GioiTinh, NgaySinh, SoDienThoai, Email, ChucVu, LuongCoBan)
            VALUES (N'NV Trùng Email', N'Nam', '1995-01-01', '0909990003', 'hung.nv@nhahang.vn', N'Phục vụ', 7000000);
          `);
        },
        (err) => {
          const mapped = mapDatabaseError(err);
          return mapped.status === 409 && mapped.code === 'DUPLICATE_EMPLOYEE';
        }
      );
    } finally {
      await tx.rollback();
    }
  });

  it('3.2. Đồng bộ trạng thái Bàn — Đặt bàn — Hóa đơn và kiểm soát tồn kho chính xác', async () => {
    // Tìm 1 bàn đang Trống
    const emptyTableRes = await pool.request().query(`
      SELECT TOP 1 MaBan, SoCho FROM dbo.BanAn WHERE TrangThai = N'Trống' ORDER BY MaBan DESC
    `);
    assert.ok(emptyTableRes.recordset.length > 0, 'Cần ít nhất 1 bàn trống để kiểm thử');
    const maBan = emptyTableRes.recordset[0].MaBan;

    // Lấy mốc thời gian tương lai +10 phút từ SQL Server để luôn hợp lệ với GETDATE()
    const timeRes = await pool.request().query(`
      SELECT CONVERT(VARCHAR(19), DATEADD(MINUTE, 10, GETDATE()), 126) AS FutureIso
    `);
    const futureIso = timeRes.recordset[0].FutureIso;

    const bookingRes = await api('POST', '/api/datban', {
      maKH: 1,
      maBan,
      thoiGianDat: futureIso,
      soNguoi: 2,
      ghiChu: 'Test đồng bộ trạng thái bàn hôm nay',
    });
    assert.equal(bookingRes.status, 200);
    const maDatBan = bookingRes.data.maDatBan;
    createdBookingIds.add(maDatBan);

    // Kiểm tra trạng thái bàn đã tự động chuyển sang "Đã đặt" nhờ trigger trg_DatBan_DongBoTrangThaiBan
    let banState = await pool.request().input('maBan', sql.Int, maBan)
      .query(`SELECT TrangThai FROM dbo.BanAn WHERE MaBan = @maBan`);
    assert.equal(banState.recordset[0].TrangThai, 'Đã đặt');

    // Mở hóa đơn trên bàn "Đã đặt" này -> Bàn chuyển sang "Đang phục vụ", lịch đặt chuyển sang "Đã đến"
    const openRes = await api('POST', '/api/hoadon', { maBan, maNV: 4, maKH: 1 });
    assert.equal(openRes.status, 200);
    const maHD = openRes.data.maHD;
    createdInvoiceIds.add(maHD);

    banState = await pool.request().input('maBan', sql.Int, maBan)
      .query(`SELECT TrangThai FROM dbo.BanAn WHERE MaBan = @maBan`);
    assert.equal(banState.recordset[0].TrangThai, 'Đang phục vụ');

    const dbState = await pool.request().input('maDB', sql.Int, maDatBan)
      .query(`SELECT TrangThai FROM dbo.DatBan WHERE MaDatBan = @maDB`);
    assert.equal(dbState.recordset[0].TrangThai, 'Đã đến');

    // Kiểm tra tồn kho nguyên liệu của món Gỏi cuốn tôm thịt (MaMon = 1 -> MaNL = 12 Bánh tráng, DinhLuong = 1.000)
    const stockBefore = await pool.request().query(`SELECT SoLuongTon FROM dbo.NguyenLieu WHERE MaNL = 12`);
    const tonTruoc = Number(stockBefore.recordset[0].SoLuongTon);

    // Gọi 2 phần Gỏi cuốn tôm thịt
    const addDishRes = await api('POST', `/api/hoadon/${maHD}/mon`, { maMon: 1, soLuong: 2 });
    assert.equal(addDishRes.status, 200);

    const stockAfterAdd = await pool.request().query(`SELECT SoLuongTon FROM dbo.NguyenLieu WHERE MaNL = 12`);
    assert.equal(Number(stockAfterAdd.recordset[0].SoLuongTon), tonTruoc - 2);

    // Gọi số lượng vượt quá tồn kho (500 phần > 100 Bánh tráng trong kho) -> Phải báo lỗi 400 BIZ_50013 và giữ nguyên tồn kho
    const overOrderRes = await api('POST', `/api/hoadon/${maHD}/mon`, { maMon: 1, soLuong: 500 });
    assert.equal(overOrderRes.status, 400);
    assert.equal(overOrderRes.data.code, 'BIZ_50013');

    const stockAfterFailed = await pool.request().query(`SELECT SoLuongTon FROM dbo.NguyenLieu WHERE MaNL = 12`);
    assert.equal(Number(stockAfterFailed.recordset[0].SoLuongTon), tonTruoc - 2);

    // Hủy hóa đơn -> Hoàn kho toàn bộ nguyên liệu của 2 phần Gỏi cuốn và trả bàn về trạng thái "Trống"
    const cancelRes = await api('POST', `/api/hoadon/${maHD}/huy`, { lyDo: 'Test hoàn kho' });
    assert.equal(cancelRes.status, 200);

    const stockAfterCancel = await pool.request().query(`SELECT SoLuongTon FROM dbo.NguyenLieu WHERE MaNL = 12`);
    assert.equal(Number(stockAfterCancel.recordset[0].SoLuongTon), tonTruoc);

    banState = await pool.request().input('maBan', sql.Int, maBan)
      .query(`SELECT TrangThai FROM dbo.BanAn WHERE MaBan = @maBan`);
    assert.equal(banState.recordset[0].TrangThai, 'Trống');
  });
});

/* =====================================================================
   4. REAL SQL SERVER CONCURRENCY TESTS (P0 RACE CONDITIONS)
   ===================================================================== */
describe('4. Concurrency Tests trên SQL Server thực tế — Chống Race Condition', () => {
  it('4.1. [P0-1] 10 request đồng thời gọi sp_MoHoaDon trên cùng 1 bàn: chỉ 1 thành công, 9 bị chặn', async () => {
    const emptyTableRes = await pool.request().query(`
      SELECT TOP 1 MaBan FROM dbo.BanAn WHERE TrangThai = N'Trống' ORDER BY MaBan DESC
    `);
    const maBan = emptyTableRes.recordset[0].MaBan;

    // Bắn 10 request mở hóa đơn song song cùng lúc
    const results = await Promise.all(
      Array.from({ length: 10 }, () => api('POST', '/api/hoadon', { maBan, maNV: 4, maKH: null }))
    );

    const succeeded = results.filter((r) => r.status === 200);
    const failed = results.filter((r) => r.status !== 200);

    for (const s of succeeded) {
      if (s.data.maHD) createdInvoiceIds.add(s.data.maHD);
    }

    assert.equal(succeeded.length, 1, `Phải có đúng 1 request mở hóa đơn thành công, thực tế: ${succeeded.length}`);
    assert.equal(failed.length, 9, `Phải có đúng 9 request bị từ chối, thực tế: ${failed.length}`);

    // Kiểm tra trong DB chỉ có duy nhất 1 hóa đơn Đang phục vụ tại bàn này
    const activeInDb = await pool.request().input('maBan', sql.Int, maBan).query(`
      SELECT COUNT(*) AS Cnt FROM dbo.HoaDon WHERE MaBan = @maBan AND TrangThai = N'Đang phục vụ'
    `);
    assert.equal(activeInDb.recordset[0].Cnt, 1);

    // Dọn hóa đơn vừa mở
    await api('POST', `/api/hoadon/${succeeded[0].data.maHD}/huy`, { lyDo: 'Cleanup concurrency test 4.1' });
  });

  it('4.2. [P0-2 & P0-3] 10 request đồng thời gọi sp_ThanhToanHoaDon: chỉ thanh toán 1 lần, KHÔNG cộng điểm 2 lần', async () => {
    const emptyTableRes = await pool.request().query(`
      SELECT TOP 1 MaBan FROM dbo.BanAn WHERE TrangThai = N'Trống' ORDER BY MaBan DESC
    `);
    const maBan = emptyTableRes.recordset[0].MaBan;
    const maKH = 2;

    // Lấy điểm tích lũy trước khi mở HĐ
    const khBefore = await pool.request().input('maKH', sql.Int, maKH)
      .query(`SELECT DiemTichLuy FROM dbo.KhachHang WHERE MaKH = @maKH`);
    const diemTruoc = Number(khBefore.recordset[0].DiemTichLuy);

    // Mở hóa đơn và thêm 4 lon Bia Tiger (MaMon = 35, 4 * 25,000 = 100,000đ -> 10 điểm)
    const openRes = await api('POST', '/api/hoadon', { maBan, maNV: 4, maKH });
    assert.equal(openRes.status, 200);
    const maHD = openRes.data.maHD;
    createdInvoiceIds.add(maHD);

    const addRes = await api('POST', `/api/hoadon/${maHD}/mon`, { maMon: 35, soLuong: 4 });
    assert.equal(addRes.status, 200);

    // Bắn 10 request thanh toán đồng thời
    const payResults = await Promise.all(
      Array.from({ length: 10 }, () =>
        api('POST', `/api/hoadon/${maHD}/thanhtoan`, { phuongThuc: 'Tiền mặt', giamGia: 0 })
      )
    );

    const succeeded = payResults.filter((r) => r.status === 200);
    const failed = payResults.filter((r) => r.status !== 200);

    assert.equal(succeeded.length, 1, `Chỉ đúng 1 giao dịch thanh toán được phép thành công, thực tế: ${succeeded.length}`);
    assert.equal(failed.length, 9);

    const expectedPointsAdded = Math.floor(Number(succeeded[0].data.soTienPhaiTra) / 10000);
    const khAfter = await pool.request().input('maKH', sql.Int, maKH)
      .query(`SELECT DiemTichLuy FROM dbo.KhachHang WHERE MaKH = @maKH`);
    const diemSau = Number(khAfter.recordset[0].DiemTichLuy);

    assert.equal(
      diemSau,
      diemTruoc + expectedPointsAdded,
      `Điểm tích lũy chỉ được cộng đúng 1 lần (${expectedPointsAdded} điểm), không được cộng lặp!`
    );
  });

  it('4.3. [P0-4] 10 request đồng thời gọi sp_HuyHoaDon: chỉ hủy 1 lần, KHÔNG hoàn kho 2 lần', async () => {
    const emptyTableRes = await pool.request().query(`
      SELECT TOP 1 MaBan FROM dbo.BanAn WHERE TrangThai = N'Trống' ORDER BY MaBan DESC
    `);
    const maBan = emptyTableRes.recordset[0].MaBan;

    // Kiểm tra nguyên liệu MaNL = 12 (Bánh tráng, DinhLuong = 1.000 cho MaMon = 1)
    const stockBefore = await pool.request().query(`SELECT SoLuongTon FROM dbo.NguyenLieu WHERE MaNL = 12`);
    const tonBanDau = Number(stockBefore.recordset[0].SoLuongTon);

    // Mở hóa đơn và thêm 3 phần Gỏi cuốn tôm thịt (MaMon = 1 -> trừ 3 đơn vị MaNL = 12)
    const openRes = await api('POST', '/api/hoadon', { maBan, maNV: 4, maKH: null });
    assert.equal(openRes.status, 200);
    const maHD = openRes.data.maHD;
    createdInvoiceIds.add(maHD);

    const addRes = await api('POST', `/api/hoadon/${maHD}/mon`, { maMon: 1, soLuong: 3 });
    assert.equal(addRes.status, 200);

    const stockDuring = await pool.request().query(`SELECT SoLuongTon FROM dbo.NguyenLieu WHERE MaNL = 12`);
    assert.equal(Number(stockDuring.recordset[0].SoLuongTon), tonBanDau - 3);

    // Bắn 10 request hủy hóa đơn song song
    const cancelResults = await Promise.all(
      Array.from({ length: 10 }, () =>
        api('POST', `/api/hoadon/${maHD}/huy`, { lyDo: 'Test concurrency hủy hóa đơn' })
      )
    );

    const succeeded = cancelResults.filter((r) => r.status === 200);
    const failed = cancelResults.filter((r) => r.status !== 200);

    assert.equal(succeeded.length, 1, `Chỉ đúng 1 request hủy hóa đơn được thành công, thực tế: ${succeeded.length}`);
    assert.equal(failed.length, 9);

    // Kiểm tra tồn kho chỉ được hoàn lại đúng 3 đơn vị (về đúng tonBanDau, không bị cộng dồn thành tonBanDau + 27)
    const stockAfter = await pool.request().query(`SELECT SoLuongTon FROM dbo.NguyenLieu WHERE MaNL = 12`);
    assert.equal(
      Number(stockAfter.recordset[0].SoLuongTon),
      tonBanDau,
      'Tồn kho nguyên liệu phải trở về đúng mức ban đầu, tuyệt đối không hoàn kho 2 lần!'
    );
  });

  it('4.4. [P0-5] 10 request đồng thời gọi sp_DatBan cùng bàn trong khung giờ ±2h: chỉ 1 thành công', async () => {
    const emptyTableRes = await pool.request().query(`
      SELECT TOP 1 MaBan FROM dbo.BanAn WHERE TrangThai = N'Trống' ORDER BY MaBan DESC
    `);
    const maBan = emptyTableRes.recordset[0].MaBan;

    // Đặt 10 lịch xung đột trong khung 18:00..19:30 ngày 2027-06-15
    const times = [
      '2027-06-15T18:00',
      '2027-06-15T18:10',
      '2027-06-15T18:20',
      '2027-06-15T18:30',
      '2027-06-15T18:40',
      '2027-06-15T18:50',
      '2027-06-15T19:00',
      '2027-06-15T19:10',
      '2027-06-15T19:20',
      '2027-06-15T19:30',
    ];

    const bookingResults = await Promise.all(
      times.map((thoiGianDat, idx) =>
        api('POST', '/api/datban', {
          maKH: (idx % 10) + 1,
          maBan,
          thoiGianDat,
          soNguoi: 2,
          ghiChu: `Concurrency booking ${idx}`,
        })
      )
    );

    const succeeded = bookingResults.filter((r) => r.status === 200);
    const failed = bookingResults.filter((r) => r.status !== 200);

    for (const s of succeeded) {
      if (s.data.maDatBan) createdBookingIds.add(s.data.maDatBan);
    }

    assert.equal(succeeded.length, 1, `Chỉ đúng 1 lịch đặt bàn trong khung giờ ±2h được phép thành công, thực tế: ${succeeded.length}`);
    assert.equal(failed.length, 9);
  });
});
