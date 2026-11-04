# erd/generate_erd_assets.py
import os
import subprocess

# Danh sách bảng và cấu trúc chi tiết
tables = [
    {
        'id': 'KhachHang',
        'title': 'KhachHang (Khách hàng)',
        'x': 60, 'y': 80, 'w': 300,
        'color': '#C93B2B', 'bg': '#FDEDEC',
        'group': 'Khách hàng & Nhân sự',
        'cols': [
            ('PK', 'MaKH', 'INT', 'IDENTITY(1,1)'),
            ('', 'HoTen', 'NVARCHAR(100)', 'NOT NULL'),
            ('UQ', 'SoDienThoai', 'VARCHAR(15)', '9-11 số, NOT NULL'),
            ('', 'Email', 'VARCHAR(100)', 'NULL (format email)'),
            ('', 'GioiTinh', 'NVARCHAR(5)', 'Nam | Nữ | Khác'),
            ('', 'NgaySinh', 'DATE', 'NULL'),
            ('', 'DiemTichLuy', 'INT', 'DF 0, >= 0'),
            ('', 'NgayDangKy', 'DATETIME', 'DF GETDATE()')
        ]
    },
    {
        'id': 'DatBan',
        'title': 'DatBan (Đặt bàn trước)',
        'x': 440, 'y': 150, 'w': 310,
        'color': '#2E7D32', 'bg': '#E8F5E9',
        'group': 'Không gian & Đặt chỗ',
        'cols': [
            ('PK', 'MaDatBan', 'INT', 'IDENTITY(1,1)'),
            ('FK', 'MaKH', 'INT', '-> KhachHang(MaKH)'),
            ('FK', 'MaBan', 'INT', '-> BanAn(MaBan)'),
            ('', 'ThoiGianDat', 'DATETIME', 'NOT NULL'),
            ('', 'SoNguoi', 'TINYINT', '1 .. 20 khách'),
            ('', 'TrangThai', 'NVARCHAR(20)', 'Chờ XN|Đã XN|Đến|Hủy'),
            ('', 'GhiChu', 'NVARCHAR(255)', 'NULL'),
            ('', 'NgayTao', 'DATETIME', 'DF GETDATE()')
        ]
    },
    {
        'id': 'BanAn',
        'title': 'BanAn (Bàn ăn)',
        'x': 60, 'y': 380, 'w': 300,
        'color': '#2E7D32', 'bg': '#E8F5E9',
        'group': 'Không gian & Đặt chỗ',
        'cols': [
            ('PK', 'MaBan', 'INT', 'IDENTITY(1,1)'),
            ('UQ', 'TenBan', 'NVARCHAR(20)', 'NOT NULL'),
            ('', 'SoCho', 'TINYINT', '1 .. 20 chỗ'),
            ('', 'KhuVuc', 'NVARCHAR(30)', 'T1 | T2 | Sân vườn | VIP'),
            ('', 'TrangThai', 'NVARCHAR(20)', 'Trống | Đang PV | Đã đặt')
        ]
    },
    {
        'id': 'NhanVien',
        'title': 'NhanVien (Nhân viên)',
        'x': 60, 'y': 620, 'w': 300,
        'color': '#C93B2B', 'bg': '#FDEDEC',
        'group': 'Khách hàng & Nhân sự',
        'cols': [
            ('PK', 'MaNV', 'INT', 'IDENTITY(1,1)'),
            ('', 'HoTen', 'NVARCHAR(100)', 'NOT NULL'),
            ('', 'NgaySinh', 'DATE', 'Tuổi >= 18'),
            ('', 'GioiTinh', 'NVARCHAR(5)', 'Nam | Nữ | Khác'),
            ('', 'ChucVu', 'NVARCHAR(30)', 'QL | Thu ngân | Phục vụ...'),
            ('UQ', 'SoDienThoai', 'VARCHAR(15)', 'NOT NULL'),
            ('UQ', 'Email', 'VARCHAR(100)', 'NULL'),
            ('', 'LuongCoBan', 'DECIMAL(12,0)', '>= 4.000.000'),
            ('', 'NgayVaoLam', 'DATE', 'DF GETDATE()'),
            ('', 'DangLamViec', 'BIT', 'DF 1 (Đang làm)')
        ]
    },
    {
        'id': 'NhatKyHoaDon',
        'title': 'NhatKyHoaDon (Audit Log)',
        'x': 830, 'y': 80, 'w': 320,
        'color': '#546E7A', 'bg': '#ECEFF1',
        'group': 'Audit & Lịch sử',
        'cols': [
            ('PK', 'MaNK', 'INT', 'IDENTITY(1,1)'),
            ('FK', 'MaHD', 'INT', 'Logic -> HoaDon.MaHD'),
            ('', 'HanhDong', 'NVARCHAR(50)', 'NOT NULL'),
            ('', 'NoiDung', 'NVARCHAR(500)', 'NULL'),
            ('', 'NguoiThucHien', 'NVARCHAR(100)', 'DF SUSER_SNAME()'),
            ('', 'ThoiGian', 'DATETIME', 'DF GETDATE()')
        ]
    },
    {
        'id': 'HoaDon',
        'title': 'HoaDon (Hóa đơn)',
        'x': 830, 'y': 360, 'w': 320,
        'color': '#1565C0', 'bg': '#E3F2FD',
        'group': 'Đơn hàng & Thanh toán',
        'cols': [
            ('PK', 'MaHD', 'INT', 'IDENTITY(1,1)'),
            ('FK', 'MaBan', 'INT', '-> BanAn(MaBan)'),
            ('FK', 'MaKH', 'INT', 'NULL (Khách vãng lai)'),
            ('FK', 'MaNV', 'INT', '-> NhanVien(MaNV)'),
            ('', 'ThoiGianLap', 'DATETIME', 'DF GETDATE()'),
            ('', 'ThoiGianThanhToan', 'DATETIME', 'NULL'),
            ('', 'TongTien', 'DECIMAL(14,0)', 'DF 0, >= 0'),
            ('', 'GiamGia', 'DECIMAL(5,2)', '0 .. 100%'),
            ('', 'ThanhToan', 'DECIMAL(14,0)', 'DF 0, >= 0'),
            ('', 'PhuongThucTT', 'NVARCHAR(20)', 'Tiền mặt | CK | Thẻ'),
            ('', 'TrangThai', 'NVARCHAR(20)', 'Đang PV | Đã TT | Đã hủy'),
            ('', 'GhiChu', 'NVARCHAR(255)', 'NULL')
        ]
    },
    {
        'id': 'ChiTietHoaDon',
        'title': 'ChiTietHoaDon (Chi tiết gọi món)',
        'x': 830, 'y': 800, 'w': 320,
        'color': '#1565C0', 'bg': '#E3F2FD',
        'group': 'Đơn hàng & Thanh toán',
        'cols': [
            ('PK,FK', 'MaHD', 'INT', '-> HoaDon (CASCADE)'),
            ('PK,FK', 'MaMon', 'INT', '-> MonAn(MaMon)'),
            ('', 'SoLuong', 'INT', '> 0'),
            ('', 'DonGia', 'DECIMAL(12,0)', 'Giá lúc bán (>= 0)'),
            ('', 'ThanhTien', 'DECIMAL(14,0)', 'PERSISTED = SL * DonGia'),
            ('', 'GhiChu', 'NVARCHAR(255)', 'NULL')
        ]
    },
    {
        'id': 'DanhMucMon',
        'title': 'DanhMucMon (Danh mục thực đơn)',
        'x': 1250, 'y': 80, 'w': 300,
        'color': '#EF6C00', 'bg': '#FFF3E0',
        'group': 'Thực đơn & Kho',
        'cols': [
            ('PK', 'MaDM', 'INT', 'IDENTITY(1,1)'),
            ('UQ', 'TenDM', 'NVARCHAR(50)', 'NOT NULL'),
            ('', 'MoTa', 'NVARCHAR(255)', 'NULL')
        ]
    },
    {
        'id': 'MonAn',
        'title': 'MonAn (Món ăn / Đồ uống)',
        'x': 1250, 'y': 280, 'w': 300,
        'color': '#EF6C00', 'bg': '#FFF3E0',
        'group': 'Thực đơn & Kho',
        'cols': [
            ('PK', 'MaMon', 'INT', 'IDENTITY(1,1)'),
            ('UQ', 'TenMon', 'NVARCHAR(100)', 'NOT NULL'),
            ('FK', 'MaDM', 'INT', '-> DanhMucMon(MaDM)'),
            ('', 'DonGia', 'DECIMAL(12,0)', '> 0'),
            ('', 'DonViTinh', 'NVARCHAR(20)', 'DF N\'Phần\''),
            ('', 'MoTa', 'NVARCHAR(255)', 'NULL'),
            ('', 'ConKinhDoanh', 'BIT', 'DF 1 (Đang kinh doanh)')
        ]
    },
    {
        'id': 'CongThuc',
        'title': 'CongThuc (Định lượng món)',
        'x': 1250, 'y': 590, 'w': 300,
        'color': '#5E35B1', 'bg': '#EDE7F6',
        'group': 'Thực đơn & Kho',
        'cols': [
            ('PK,FK', 'MaMon', 'INT', '-> MonAn(MaMon) ON CASCADE'),
            ('PK,FK', 'MaNL', 'INT', '-> NguyenLieu(MaNL)'),
            ('', 'DinhLuong', 'DECIMAL(10,3)', '> 0')
        ]
    },
    {
        'id': 'NguyenLieu',
        'title': 'NguyenLieu (Nguyên liệu kho)',
        'x': 1250, 'y': 790, 'w': 300,
        'color': '#5E35B1', 'bg': '#EDE7F6',
        'group': 'Thực đơn & Kho',
        'cols': [
            ('PK', 'MaNL', 'INT', 'IDENTITY(1,1)'),
            ('UQ', 'TenNL', 'NVARCHAR(100)', 'NOT NULL'),
            ('', 'DonViTinh', 'NVARCHAR(20)', 'Kg | Lít | Gói...'),
            ('', 'SoLuongTon', 'DECIMAL(10,2)', 'DF 0, >= 0'),
            ('', 'MucToiThieu', 'DECIMAL(10,2)', 'DF 10 (cảnh báo)'),
            ('', 'DonGiaNhap', 'DECIMAL(12,0)', '>= 0')
        ]
    }
]

# Các quan hệ
relations = [
    # (FromTable, ToTable, CardFrom, CardTo, Label, Style)
    ('KhachHang', 'DatBan', '1', '0..N', 'Đặt bàn trước', 'solid', (360, 160), (440, 190)),
    ('BanAn', 'DatBan', '1', '0..N', 'Được đặt', 'solid', (360, 430), (440, 230)),
    ('KhachHang', 'HoaDon', '0..1', '0..N', 'Tích điểm (NULL nếu vãng lai)', 'dashed', (360, 240), (830, 440)),
    ('BanAn', 'HoaDon', '1', '0..N', 'Phát sinh đơn', 'solid', (360, 470), (830, 470)),
    ('NhanVien', 'HoaDon', '1', '0..N', 'Lập hóa đơn', 'solid', (360, 710), (830, 520)),
    ('HoaDon', 'ChiTietHoaDon', '1', '1..N', 'Chứa chi tiết (CASCADE)', 'solid', (990, 720), (990, 800)),
    ('HoaDon', 'NhatKyHoaDon', '1', '0..N', 'Ghi log biến động', 'dashed', (990, 360), (990, 290)),
    ('DanhMucMon', 'MonAn', '1', '0..N', 'Phân loại', 'solid', (1400, 200), (1400, 280)),
    ('MonAn', 'ChiTietHoaDon', '1', '0..N', 'Được gọi món', 'solid', (1250, 400), (1150, 850)),
    ('MonAn', 'CongThuc', '1', '0..N', 'Định lượng (CASCADE)', 'solid', (1400, 510), (1400, 590)),
    ('NguyenLieu', 'CongThuc', '1', '0..N', 'Cấu thành', 'solid', (1400, 790), (1400, 710))
]

print('Loaded table count:', len(tables), 'relations:', len(relations))
