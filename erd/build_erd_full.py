# -*- coding: utf-8 -*-
"""
Hệ thống Quản lý Nhà hàng - Script sinh sơ đồ ERD (SVG + PNG + Interactive Viewer + DOT)
"""
import os
import subprocess

tables = [
    {
        'id': 'KhachHang',
        'title': 'KhachHang',
        'sub': 'Khách hàng thành viên',
        'x': 60, 'y': 80, 'w': 330,
        'color': '#C93B2B', 'bg_sub': '#FDEDEC',
        'group': 'Khách hàng & Nhân sự',
        'cols': [
            ('PK', 'MaKH', 'INT', 'IDENTITY(1,1)'),
            ('', 'HoTen', 'NVARCHAR(100)', 'NOT NULL'),
            ('UQ', 'SoDienThoai', 'VARCHAR(15)', '9-11 số, NOT NULL'),
            ('', 'Email', 'VARCHAR(100)', 'NULL (regex email)'),
            ('', 'GioiTinh', 'NVARCHAR(5)', 'Nam | Nữ | Khác'),
            ('', 'NgaySinh', 'DATE', 'NULL'),
            ('', 'DiemTichLuy', 'INT', 'DF 0, >= 0'),
            ('', 'NgayDangKy', 'DATETIME', 'DF GETDATE()')
        ]
    },
    {
        'id': 'DatBan',
        'title': 'DatBan',
        'sub': 'Lịch đặt bàn trước',
        'x': 450, 'y': 140, 'w': 330,
        'color': '#2E7D32', 'bg_sub': '#E8F5E9',
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
        'title': 'BanAn',
        'sub': 'Quản lý bàn & khu vực',
        'x': 60, 'y': 410, 'w': 330,
        'color': '#2E7D32', 'bg_sub': '#E8F5E9',
        'group': 'Không gian & Đặt chỗ',
        'cols': [
            ('PK', 'MaBan', 'INT', 'IDENTITY(1,1)'),
            ('UQ', 'TenBan', 'NVARCHAR(20)', 'NOT NULL (Bàn 01...)'),
            ('', 'SoCho', 'TINYINT', '1 .. 20 chỗ'),
            ('', 'KhuVuc', 'NVARCHAR(30)', 'T1|T2|Sân vườn|VIP'),
            ('', 'TrangThai', 'NVARCHAR(20)', 'Trống|Đang PV|Đã đặt')
        ]
    },
    {
        'id': 'NhanVien',
        'title': 'NhanVien',
        'sub': 'Hồ sơ nhân viên',
        'x': 60, 'y': 660, 'w': 330,
        'color': '#C93B2B', 'bg_sub': '#FDEDEC',
        'group': 'Khách hàng & Nhân sự',
        'cols': [
            ('PK', 'MaNV', 'INT', 'IDENTITY(1,1)'),
            ('', 'HoTen', 'NVARCHAR(100)', 'NOT NULL'),
            ('', 'NgaySinh', 'DATE', 'Tuổi >= 18'),
            ('', 'GioiTinh', 'NVARCHAR(5)', 'Nam | Nữ | Khác'),
            ('', 'ChucVu', 'NVARCHAR(30)', 'Quản lý|Thu ngân|...'),
            ('UQ', 'SoDienThoai', 'VARCHAR(15)', 'NOT NULL'),
            ('UQ', 'Email', 'VARCHAR(100)', 'NULL'),
            ('', 'LuongCoBan', 'DECIMAL(12,0)', '>= 4.000.000'),
            ('', 'NgayVaoLam', 'DATE', 'DF GETDATE()'),
            ('', 'DangLamViec', 'BIT', 'DF 1 (Đang làm)')
        ]
    },
    {
        'id': 'NhatKyHoaDon',
        'title': 'NhatKyHoaDon',
        'sub': 'Nhật ký audit hóa đơn',
        'x': 860, 'y': 80, 'w': 340,
        'color': '#546E7A', 'bg_sub': '#ECEFF1',
        'group': 'Audit & Lịch sử',
        'cols': [
            ('PK', 'MaNK', 'INT', 'IDENTITY(1,1)'),
            ('FK', 'MaHD', 'INT', 'Logic -> HoaDon(MaHD)'),
            ('', 'HanhDong', 'NVARCHAR(50)', 'NOT NULL'),
            ('', 'NoiDung', 'NVARCHAR(500)', 'NULL'),
            ('', 'NguoiThucHien', 'NVARCHAR(100)', 'DF SUSER_SNAME()'),
            ('', 'ThoiGian', 'DATETIME', 'DF GETDATE()')
        ]
    },
    {
        'id': 'HoaDon',
        'title': 'HoaDon',
        'sub': 'Hóa đơn thanh toán',
        'x': 860, 'y': 360, 'w': 340,
        'color': '#1565C0', 'bg_sub': '#E3F2FD',
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
        'title': 'ChiTietHoaDon',
        'sub': 'Chi tiết món ăn trong đơn',
        'x': 860, 'y': 800, 'w': 340,
        'color': '#1565C0', 'bg_sub': '#E3F2FD',
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
        'title': 'DanhMucMon',
        'sub': 'Danh mục thực đơn',
        'x': 1280, 'y': 80, 'w': 330,
        'color': '#EF6C00', 'bg_sub': '#FFF3E0',
        'group': 'Thực đơn & Kho',
        'cols': [
            ('PK', 'MaDM', 'INT', 'IDENTITY(1,1)'),
            ('UQ', 'TenDM', 'NVARCHAR(50)', 'NOT NULL (Khai vị, Món chính...)'),
            ('', 'MoTa', 'NVARCHAR(255)', 'NULL')
        ]
    },
    {
        'id': 'MonAn',
        'title': 'MonAn',
        'sub': 'Danh sách món ăn & thức uống',
        'x': 1280, 'y': 270, 'w': 330,
        'color': '#EF6C00', 'bg_sub': '#FFF3E0',
        'group': 'Thực đơn & Kho',
        'cols': [
            ('PK', 'MaMon', 'INT', 'IDENTITY(1,1)'),
            ('UQ', 'TenMon', 'NVARCHAR(100)', 'NOT NULL'),
            ('FK', 'MaDM', 'INT', '-> DanhMucMon(MaDM)'),
            ('', 'DonGia', 'DECIMAL(12,0)', '> 0'),
            ('', 'DonViTinh', 'NVARCHAR(20)', 'DF N\'Phần\''),
            ('', 'MoTa', 'NVARCHAR(255)', 'NULL'),
            ('', 'ConKinhDoanh', 'BIT', 'DF 1 (Đang bán)')
        ]
    },
    {
        'id': 'CongThuc',
        'title': 'CongThuc',
        'sub': 'Định lượng nguyên liệu',
        'x': 1280, 'y': 565, 'w': 330,
        'color': '#5E35B1', 'bg_sub': '#EDE7F6',
        'group': 'Thực đơn & Kho',
        'cols': [
            ('PK,FK', 'MaMon', 'INT', '-> MonAn(MaMon) ON CASCADE'),
            ('PK,FK', 'MaNL', 'INT', '-> NguyenLieu(MaNL)'),
            ('', 'DinhLuong', 'DECIMAL(10,3)', '> 0')
        ]
    },
    {
        'id': 'NguyenLieu',
        'title': 'NguyenLieu',
        'sub': 'Kho nguyên liệu tồn kho',
        'x': 1280, 'y': 760, 'w': 330,
        'color': '#5E35B1', 'bg_sub': '#EDE7F6',
        'group': 'Thực đơn & Kho',
        'cols': [
            ('PK', 'MaNL', 'INT', 'IDENTITY(1,1)'),
            ('UQ', 'TenNL', 'NVARCHAR(100)', 'NOT NULL'),
            ('', 'DonViTinh', 'NVARCHAR(20)', 'Kg | Lít | Gói...'),
            ('', 'SoLuongTon', 'DECIMAL(10,2)', 'DF 0, >= 0'),
            ('', 'MucToiThieu', 'DECIMAL(10,2)', 'DF 10 (mức an toàn)'),
            ('', 'DonGiaNhap', 'DECIMAL(12,0)', '>= 0')
        ]
    }
]

row_h = 24
header_h = 42

for t in tables:
    t['h'] = header_h + len(t['cols']) * row_h
    t['row_y'] = {}
    for idx, col in enumerate(t['cols']):
        t['row_y'][col[1]] = t['y'] + header_h + idx * row_h + row_h / 2

relations = [
    {
        'id': 'rel_kh_datban',
        'name': 'KhachHang - DatBan',
        'type': '1-N',
        'card_from': '1', 'card_to': '0..N',
        'label': 'Đặt trước (1 - N)',
        'from_t': 'KhachHang', 'to_t': 'DatBan',
        'd': 'M 390 146 C 418 146, 420 193, 450 193',
        'style': 'solid',
        'label_pos': (420, 160)
    },
    {
        'id': 'rel_banan_datban',
        'name': 'BanAn - DatBan',
        'type': '1-N',
        'card_from': '1', 'card_to': '0..N',
        'label': 'Được đặt (1 - N)',
        'from_t': 'BanAn', 'to_t': 'DatBan',
        'd': 'M 390 464 C 420 464, 420 217, 450 217',
        'style': 'solid',
        'label_pos': (415, 330)
    },
    {
        'id': 'rel_banan_hoadon',
        'name': 'BanAn - HoaDon',
        'type': '1-N',
        'card_from': '1', 'card_to': '0..N',
        'label': 'Phát sinh đơn (1 - N)',
        'from_t': 'BanAn', 'to_t': 'HoaDon',
        'd': 'M 390 472 C 600 472, 650 438, 860 438',
        'style': 'solid',
        'label_pos': (610, 455)
    },
    {
        'id': 'rel_kh_hoadon',
        'name': 'KhachHang - HoaDon',
        'type': '0..1 - N',
        'card_from': '0..1', 'card_to': '0..N',
        'label': 'Tích điểm (NULL nếu vãng lai)',
        'from_t': 'KhachHang', 'to_t': 'HoaDon',
        'd': 'M 390 122 C 430 80, 800 240, 860 462',
        'style': 'dashed',
        'label_pos': (620, 240)
    },
    {
        'id': 'rel_nv_hoadon',
        'name': 'NhanVien - HoaDon',
        'type': '1-N',
        'card_from': '1', 'card_to': '0..N',
        'label': 'Lập hóa đơn (1 - N)',
        'from_t': 'NhanVien', 'to_t': 'HoaDon',
        'd': 'M 390 714 C 620 714, 660 486, 860 486',
        'style': 'solid',
        'label_pos': (620, 600)
    },
    {
        'id': 'rel_hoadon_nhatky',
        'name': 'HoaDon - NhatKyHoaDon',
        'type': '1-N',
        'card_from': '1', 'card_to': '0..N',
        'label': 'Ghi nhật ký log (Audit)',
        'from_t': 'HoaDon', 'to_t': 'NhatKyHoaDon',
        'd': 'M 1030 360 L 1030 266',
        'style': 'dashed',
        'label_pos': (1040, 315)
    },
    {
        'id': 'rel_hoadon_cthd',
        'name': 'HoaDon - ChiTietHoaDon',
        'type': '1-N',
        'card_from': '1', 'card_to': '1..N',
        'label': 'Bao gồm món (CASCADE)',
        'from_t': 'HoaDon', 'to_t': 'ChiTietHoaDon',
        'd': 'M 1030 690 L 1030 800',
        'style': 'solid',
        'label_pos': (1040, 745)
    },
    {
        'id': 'rel_danhmuc_mon',
        'name': 'DanhMucMon - MonAn',
        'type': '1-N',
        'card_from': '1', 'card_to': '0..N',
        'label': 'Phân loại danh mục',
        'from_t': 'DanhMucMon', 'to_t': 'MonAn',
        'd': 'M 1445 194 L 1445 270',
        'style': 'solid',
        'label_pos': (1455, 232)
    },
    {
        'id': 'rel_mon_cthd',
        'name': 'MonAn - ChiTietHoaDon',
        'type': '1-N',
        'card_from': '1', 'card_to': '0..N',
        'label': 'Được bán ra (1 - N)',
        'from_t': 'MonAn', 'to_t': 'ChiTietHoaDon',
        'd': 'M 1280 322 C 1210 322, 1250 864, 1200 864',
        'style': 'solid',
        'label_pos': (1210, 580)
    },
    {
        'id': 'rel_mon_congthuc',
        'name': 'MonAn - CongThuc',
        'type': '1-N',
        'card_from': '1', 'card_to': '0..N',
        'label': 'Định lượng thành phần',
        'from_t': 'MonAn', 'to_t': 'CongThuc',
        'd': 'M 1445 480 L 1445 565',
        'style': 'solid',
        'label_pos': (1455, 522)
    },
    {
        'id': 'rel_nguyenlieu_congthuc',
        'name': 'NguyenLieu - CongThuc',
        'type': '1-N',
        'card_from': '1', 'card_to': '0..N',
        'label': 'Tiêu hao nguyên liệu',
        'from_t': 'NguyenLieu', 'to_t': 'CongThuc',
        'd': 'M 1445 760 L 1445 680',
        'style': 'solid',
        'label_pos': (1455, 720)
    }
]

def build_svg_content(is_dark=True):
    width = 1680
    height = 1080
    
    bg_canvas = '#0F172A' if is_dark else '#F8FAFC'
    text_title = '#F8FAFC' if is_dark else '#0F172A'
    text_sub = '#94A3B8' if is_dark else '#64748B'
    grid_stroke = '#1E293B' if is_dark else '#E2E8F0'
    card_bg = '#1E293B' if is_dark else '#FFFFFF'
    card_stroke = '#334155' if is_dark else '#CBD5E1'
    row_alt = '#243044' if is_dark else '#F8FAFC'
    row_line = '#334155' if is_dark else '#F1F5F9'
    text_col = '#F8FAFC' if is_dark else '#1E293B'
    text_type = '#94A3B8' if is_dark else '#64748B'
    text_note = '#64748B' if is_dark else '#94A3B8'
    line_stroke = '#64748B' if is_dark else '#64748B'
    label_bg = '#0F172A' if is_dark else '#FFFFFF'
    label_border = '#334155' if is_dark else '#CBD5E1'
    
    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%" style="background: {bg_canvas}; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">')
    
    svg.append(f'''<defs>
    <filter id="card-shadow" x="-8%" y="-8%" width="125%" height="125%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="{'0.4' if is_dark else '0.1'}" />
    </filter>
    <marker id="arrow-crow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="{line_stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </marker>
    <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="{grid_stroke}" stroke-width="0.6" stroke-opacity="0.6" />
    </pattern>
  </defs>''')
    
    svg.append(f'<rect width="{width}" height="{height}" fill="url(#grid-pattern)" />')
    
    # Title Header
    svg.append(f'''
    <g transform="translate(60, 24)">
      <text x="0" y="20" fill="{text_title}" font-size="22" font-weight="700" letter-spacing="0.5">SƠ ĐỒ THỰC THỂ - QUAN HỆ (ERD) — CƠ SỞ DỮ LIỆU QUẢN LÝ NHÀ HÀNG</text>
      <text x="0" y="40" fill="{text_sub}" font-size="13">Hệ thống SQL Server 2019+ | Chuẩn hóa 3NF | 10 Bảng Nghiệp vụ Chính + 1 Bảng Nhật ký Audit</text>
    </g>
    ''')

    # Legend Panel
    legend_header_bg = '#334155' if is_dark else '#E2E8F0'
    legend_header_txt = '#F8FAFC' if is_dark else '#1E293B'
    legend_sec_title = '#E2E8F0' if is_dark else '#334155'
    legend_item_txt = '#CBD5E1' if is_dark else '#475569'

    svg.append(f'''
    <g transform="translate(450, 470)" filter="url(#card-shadow)">
      <rect width="330" height="295" rx="8" fill="{card_bg}" stroke="{card_stroke}" stroke-width="1.5" />
      <rect width="330" height="36" rx="8" fill="{legend_header_bg}" />
      <text x="16" y="23" fill="{legend_header_txt}" font-size="14" font-weight="700">CHÚ THÍCH & QUY ƯỚC ERD</text>
      
      <!-- Phân hệ -->
      <g transform="translate(16, 50)">
        <text x="0" y="0" fill="{legend_sec_title}" font-size="12" font-weight="600">Phân hệ dữ liệu:</text>
        <circle cx="10" cy="18" r="6" fill="#C93B2B" />
        <text x="24" y="22" fill="{legend_item_txt}" font-size="11">Khách hàng & Nhân sự</text>
        
        <circle cx="10" cy="40" r="6" fill="#2E7D32" />
        <text x="24" y="44" fill="{legend_item_txt}" font-size="11">Phòng bàn & Đặt chỗ trước</text>
        
        <circle cx="10" cy="62" r="6" fill="#EF6C00" />
        <text x="24" y="66" fill="{legend_item_txt}" font-size="11">Thực đơn & Danh mục món</text>
        
        <circle cx="10" cy="84" r="6" fill="#5E35B1" />
        <text x="24" y="88" fill="{legend_item_txt}" font-size="11">Kho nguyên liệu & Định lượng</text>
        
        <circle cx="10" cy="106" r="6" fill="#1565C0" />
        <text x="24" y="110" fill="{legend_item_txt}" font-size="11">Đơn hàng & Thanh toán (Hóa đơn)</text>
        
        <circle cx="10" cy="128" r="6" fill="#546E7A" />
        <text x="24" y="132" fill="{legend_item_txt}" font-size="11">Nhật ký hệ thống (Audit Log)</text>
      </g>
      
      <!-- Ký hiệu Khóa & Quan hệ -->
      <g transform="translate(16, 210)">
        <text x="0" y="0" fill="{legend_sec_title}" font-size="12" font-weight="600">Ký hiệu & Ràng buộc:</text>
        <rect x="0" y="10" width="28" height="16" rx="4" fill="#B45309" />
        <text x="5" y="22" fill="#FEF3C7" font-size="10" font-weight="700">PK</text>
        <text x="34" y="22" fill="{legend_item_txt}" font-size="11">Khóa chính</text>
        
        <rect x="110" y="10" width="28" height="16" rx="4" fill="#1D4ED8" />
        <text x="116" y="22" fill="#DBEAFE" font-size="10" font-weight="700">FK</text>
        <text x="144" y="22" fill="{legend_item_txt}" font-size="11">Khóa ngoại</text>
        
        <rect x="220" y="10" width="28" height="16" rx="4" fill="#7E22CE" />
        <text x="225" y="22" fill="#F3E8FF" font-size="10" font-weight="700">UQ</text>
        <text x="254" y="22" fill="{legend_item_txt}" font-size="11">Unique</text>
        
        <line x1="0" y1="44" x2="35" y2="44" stroke="{line_stroke}" stroke-width="2" />
        <text x="42" y="47" fill="{legend_item_txt}" font-size="11">Quan hệ 1 - N bắt buộc</text>
        
        <line x1="165" y1="44" x2="200" y2="44" stroke="{line_stroke}" stroke-width="2" stroke-dasharray="4,3" />
        <text x="207" y="47" fill="{legend_item_txt}" font-size="11">Quan hệ 0..1 - N (Tùy chọn)</text>
      </g>
    </g>
    ''')

    # Draw Relation Lines first
    svg.append('<g id="relations-group">')
    for rel in relations:
        dash = 'stroke-dasharray="5,4"' if rel['style'] == 'dashed' else ''
        svg.append(f'''
        <g class="relation-item" id="{rel['id']}" data-from="{rel['from_t']}" data-to="{rel['to_t']}">
          <path d="{rel['d']}" fill="none" stroke="{line_stroke}" stroke-width="2.2" {dash} marker-end="url(#arrow-crow)" />
          <rect x="{rel['label_pos'][0]-5}" y="{rel['label_pos'][1]-12}" width="{len(rel['label'])*6.8 + 12}" height="18" rx="4" fill="{label_bg}" fill-opacity="0.88" stroke="{label_border}" stroke-width="0.8" />
          <text x="{rel['label_pos'][0]}" y="{rel['label_pos'][1]+1}" fill="{text_sub}" font-size="9.5" font-weight="500">{rel['label']}</text>
        </g>
        ''')
    svg.append('</g>')

    # Draw Tables
    svg.append('<g id="tables-group">')
    for t in tables:
        x, y, w, h = t['x'], t['y'], t['w'], t['h']
        c = t['color']
        
        svg.append(f'''
        <g class="table-card" id="tbl_{t['id']}" transform="translate({x}, {y})" filter="url(#card-shadow)" data-table="{t['id']}" data-group="{t['group']}">
          <!-- Card Container -->
          <rect width="{w}" height="{h}" rx="8" fill="{card_bg}" stroke="{card_stroke}" stroke-width="1.5" />
          
          <!-- Header Bar -->
          <path d="M 0 8 Q 0 0 8 0 L {w-8} 0 Q {w} 0 {w} 8 L {w} {header_h} L 0 {header_h} Z" fill="{c}" />
          <text x="14" y="20" fill="#FFFFFF" font-size="14" font-weight="700">{t['title']}</text>
          <text x="14" y="34" fill="rgba(255,255,255,0.85)" font-size="11">{t['sub']}</text>
          <rect x="{w-85}" y="10" width="75" height="20" rx="4" fill="rgba(0,0,0,0.25)" />
          <text x="{w-48}" y="24" text-anchor="middle" fill="#FFFFFF" font-size="9.5" font-weight="600">{len(t['cols'])} cột</text>
          
          <!-- Columns -->
          <g transform="translate(0, {header_h})">
        ''')
        
        for idx, col in enumerate(t['cols']):
            tag, name, ctype, note = col
            cy = idx * row_h
            bg_row = card_bg if idx % 2 == 0 else row_alt
            
            svg.append(f'<rect x="0" y="{cy}" width="{w}" height="{row_h}" fill="{bg_row}" />')
            if idx > 0:
                svg.append(f'<line x1="0" y1="{cy}" x2="{w}" y2="{cy}" stroke="{row_line}" stroke-width="0.6" stroke-opacity="0.5" />')
            
            # Badge
            if tag == 'PK':
                svg.append(f'<rect x="10" y="{cy+4}" width="24" height="16" rx="3" fill="#B45309" />')
                svg.append(f'<text x="14" y="{cy+16}" fill="#FEF3C7" font-size="9" font-weight="700">PK</text>')
            elif tag == 'FK':
                svg.append(f'<rect x="10" y="{cy+4}" width="24" height="16" rx="3" fill="#1D4ED8" />')
                svg.append(f'<text x="15" y="{cy+16}" fill="#DBEAFE" font-size="9" font-weight="700">FK</text>')
            elif tag == 'PK,FK':
                svg.append(f'<rect x="8" y="{cy+4}" width="36" height="16" rx="3" fill="#C2410C" />')
                svg.append(f'<text x="10" y="{cy+16}" fill="#FFEDD5" font-size="8.5" font-weight="700">PK,FK</text>')
            elif tag == 'UQ':
                svg.append(f'<rect x="10" y="{cy+4}" width="24" height="16" rx="3" fill="#7E22CE" />')
                svg.append(f'<text x="14" y="{cy+16}" fill="#F3E8FF" font-size="9" font-weight="700">UQ</text>')
            
            # Col name
            svg.append(f'<text x="48" y="{cy+16}" fill="{text_col}" font-size="11.5" font-weight="600">{name}</text>')
            # Col type
            svg.append(f'<text x="145" y="{cy+16}" fill="{text_type}" font-size="10.5" font-family="monospace">{ctype}</text>')
            # Col note
            svg.append(f'<text x="{w-10}" y="{cy+16}" text-anchor="end" fill="{text_note}" font-size="9.5">{note}</text>')

        svg.append('</g></g>')
    svg.append('</g>')
    
    svg.append('</svg>')
    return "\n".join(svg)

# 1. Sinh SVG chuẩn (Dark & Light)
svg_dark = build_svg_content(is_dark=True)
with open("erd/erd.svg", "w", encoding="utf-8") as f:
    f.write(svg_dark)
print("Saved: erd/erd.svg")

svg_light = build_svg_content(is_dark=False)
with open("erd/erd_light.svg", "w", encoding="utf-8") as f:
    f.write(svg_light)
print("Saved: erd/erd_light.svg")

# 2. Sinh Interactive HTML Viewer
html_viewer = f'''<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sơ đồ ERD - Quản lý Nhà hàng (Interactive Viewer)</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: #0B1120;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }}
    header {{
      background: #0F172A;
      border-bottom: 1px solid #1E293B;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 10;
    }}
    .title-area h1 {{
      font-size: 17px;
      font-weight: 700;
      color: #38BDF8;
    }}
    .title-area p {{
      font-size: 12px;
      color: #94A3B8;
      margin-top: 2px;
    }}
    .toolbar {{
      display: flex;
      gap: 8px;
      align-items: center;
    }}
    .btn {{
      background: #1E293B;
      color: #F1F5F9;
      border: 1px solid #334155;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }}
    .btn:hover {{
      background: #334155;
      border-color: #475569;
    }}
    .btn-primary {{
      background: #0284C7;
      border-color: #0369A1;
    }}
    .btn-primary:hover {{
      background: #0369A1;
    }}
    .btn-group {{
      display: flex;
      background: #1E293B;
      border-radius: 6px;
      padding: 2px;
      border: 1px solid #334155;
    }}
    .btn-group .btn {{
      border: none;
      background: transparent;
      padding: 4px 10px;
    }}
    .btn-group .btn.active {{
      background: #0284C7;
      color: white;
    }}
    #canvas-container {{
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
      background: #0B1120;
    }}
    #canvas-container:active {{
      cursor: grabbing;
    }}
    #viewport {{
      transform-origin: 0 0;
      transition: transform 0.05s linear;
      position: absolute;
      top: 0;
      left: 0;
      width: 1680px;
      height: 1080px;
    }}
    .table-card {{
      cursor: pointer;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }}
    .table-card:hover {{
      transform: translateY(-2px);
    }}
    .table-card.dimmed, .relation-item.dimmed {{
      opacity: 0.15 !important;
    }}
    .table-card.highlighted {{
      opacity: 1 !important;
    }}
    .relation-item.highlighted path {{
      stroke: #38BDF8 !important;
      stroke-width: 3.5 !important;
      marker-end: url(#arrow-crow-active) !important;
    }}
    .relation-item {{
      transition: opacity 0.2s ease;
    }}
    #status-bar {{
      background: #0F172A;
      border-top: 1px solid #1E293B;
      padding: 6px 24px;
      font-size: 11px;
      color: #64748B;
      display: flex;
      justify-content: space-between;
    }}
  </style>
</head>
<body>
  <header>
    <div class="title-area">
      <h1>SƠ ĐỒ THỰC THỂ - QUAN HỆ (ERD) — QUẢN LÝ NHÀ HÀNG</h1>
      <p>Cơ sở dữ liệu SQL Server 2019+ | Chuẩn hóa 3NF | 10 bảng chính + 1 bảng log | Click vào từng bảng để xem quan hệ</p>
    </div>
    <div class="toolbar">
      <div class="btn-group">
        <button class="btn active" onclick="filterGroup('all')">Tất cả</button>
        <button class="btn" onclick="filterGroup('Khách hàng & Nhân sự')">Khách & NV</button>
        <button class="btn" onclick="filterGroup('Không gian & Đặt chỗ')">Bàn & Đặt bàn</button>
        <button class="btn" onclick="filterGroup('Thực đơn & Kho')">Thực đơn & Kho</button>
        <button class="btn" onclick="filterGroup('Đơn hàng & Thanh toán')">Hóa đơn</button>
      </div>
      <button class="btn" onclick="zoomIn()">➕ Zoom In</button>
      <button class="btn" onclick="zoomOut()">➖ Zoom Out</button>
      <button class="btn" onclick="resetZoom()">🔄 Reset</button>
      <a href="erd.svg" download="QuanLyNhaHang_ERD.svg" class="btn btn-primary">⬇ Tải SVG</a>
    </div>
  </header>
  
  <div id="canvas-container">
    <div id="viewport">
      {svg_dark}
    </div>
  </div>

  <div id="status-bar">
    <div>💡 Mẹo: Dùng chuột để kéo (Pan) hoặc cuộn chuột để phóng to/thu nhỏ (Zoom). Click vào bảng để làm nổi bật các mối quan hệ nối trực tiếp.</div>
    <div id="zoom-indicator">Tỉ lệ: 100%</div>
  </div>

  <script>
    let scale = 0.85;
    let panX = 40;
    let panY = 20;
    let isDragging = false;
    let startX, startY;
    
    const viewport = document.getElementById('viewport');
    const container = document.getElementById('canvas-container');
    const zoomText = document.getElementById('zoom-indicator');

    function updateTransform() {{
      viewport.style.transform = `translate(${{panX}}px, ${{panY}}px) scale(${{scale}})`;
      zoomText.textContent = `Tỉ lệ: ${{Math.round(scale * 100)}}%`;
    }}

    function zoomIn() {{
      scale = Math.min(2.5, scale + 0.15);
      updateTransform();
    }}

    function zoomOut() {{
      scale = Math.max(0.3, scale - 0.15);
      updateTransform();
    }}

    function resetZoom() {{
      scale = Math.min((container.clientWidth - 40) / 1680, (container.clientHeight - 40) / 1080);
      panX = 20;
      panY = 10;
      updateTransform();
      clearHighlight();
    }}

    container.addEventListener('wheel', (e) => {{
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.max(0.3, Math.min(2.5, scale * zoomFactor));
      updateTransform();
    }});

    container.addEventListener('mousedown', (e) => {{
      if (e.target.closest('.table-card')) return;
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
    }});

    window.addEventListener('mousemove', (e) => {{
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    }});

    window.addEventListener('mouseup', () => {{
      isDragging = false;
    }});

    // Table Click to Highlight
    let activeTable = null;
    const cards = document.querySelectorAll('.table-card');
    const rels = document.querySelectorAll('.relation-item');

    cards.forEach(card => {{
      card.addEventListener('click', (e) => {{
        e.stopPropagation();
        const tblId = card.getAttribute('data-table');
        if (activeTable === tblId) {{
          clearHighlight();
          activeTable = null;
        }} else {{
          highlightTable(tblId);
          activeTable = tblId;
        }}
      }});
    }});

    container.addEventListener('click', () => {{
      clearHighlight();
      activeTable = null;
    }});

    function highlightTable(tblId) {{
      const connectedTables = new Set([tblId]);
      
      rels.forEach(rel => {{
        const from = rel.getAttribute('data-from');
        const to = rel.getAttribute('data-to');
        if (from === tblId || to === tblId) {{
          rel.classList.remove('dimmed');
          rel.classList.add('highlighted');
          connectedTables.add(from);
          connectedTables.add(to);
        }} else {{
          rel.classList.add('dimmed');
          rel.classList.remove('highlighted');
        }}
      }});

      cards.forEach(c => {{
        const cId = c.getAttribute('data-table');
        if (connectedTables.has(cId)) {{
          c.classList.remove('dimmed');
          c.classList.add('highlighted');
        }} else {{
          c.classList.add('dimmed');
          c.classList.remove('highlighted');
        }}
      }});
    }}

    function clearHighlight() {{
      cards.forEach(c => c.classList.remove('dimmed', 'highlighted'));
      rels.forEach(r => r.classList.remove('dimmed', 'highlighted'));
    }}

    function filterGroup(groupName) {{
      document.querySelectorAll('.btn-group .btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      
      if (groupName === 'all') {{
        clearHighlight();
        return;
      }}
      
      cards.forEach(c => {{
        const g = c.getAttribute('data-group');
        if (g === groupName) {{
          c.classList.remove('dimmed');
          c.classList.add('highlighted');
        }} else {{
          c.classList.add('dimmed');
          c.classList.remove('highlighted');
        }}
      }});
      
      rels.forEach(r => r.classList.add('dimmed'));
    }}

    window.addEventListener('load', resetZoom);
  </script>
</body>
</html>'''

with open("erd/erd_viewer.html", "w", encoding="utf-8") as f:
    f.write(html_viewer)
print("Saved: erd/erd_viewer.html")

# 3. Cập nhật erd/erd.dot để đồng bộ chuẩn xác
dot_content = '''digraph ERD {
  graph [rankdir=LR, splines=polyline, nodesep=0.7, ranksep=1.2, bgcolor="white", fontname="Arial", pad=0.4];
  node  [shape=plaintext, fontname="Arial", fontsize=11];
  edge  [fontname="Arial", fontsize=9, color="#555555", arrowhead=crow, arrowtail=tee, dir=both, penwidth=1.3];

  /* 1. KHÁCH HÀNG & NHÂN VIÊN */
  KhachHang [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#C93B2B" COLSPAN="2"><FONT COLOR="white"><B>KhachHang</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK</B></TD><TD ALIGN="LEFT"><U>MaKH</U> INT IDENTITY</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">HoTen NVARCHAR(100)</TD></TR>
      <TR><TD ALIGN="LEFT"><B>UQ</B></TD><TD ALIGN="LEFT">SoDienThoai VARCHAR(15)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">Email VARCHAR(100)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">GioiTinh, NgaySinh</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">DiemTichLuy INT (DF 0)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">NgayDangKy DATETIME</TD></TR>
    </TABLE>>];

  NhanVien [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#C93B2B" COLSPAN="2"><FONT COLOR="white"><B>NhanVien</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK</B></TD><TD ALIGN="LEFT"><U>MaNV</U> INT IDENTITY</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">HoTen NVARCHAR(100)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">NgaySinh DATE, GioiTinh</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">ChucVu NVARCHAR(30)</TD></TR>
      <TR><TD ALIGN="LEFT"><B>UQ</B></TD><TD ALIGN="LEFT">SoDienThoai, Email</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">LuongCoBan DECIMAL(12,0)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">NgayVaoLam, DangLamViec</TD></TR>
    </TABLE>>];

  /* 2. BÀN ĂN & ĐẶT BÀN */
  BanAn [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#2E7D32" COLSPAN="2"><FONT COLOR="white"><B>BanAn</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK</B></TD><TD ALIGN="LEFT"><U>MaBan</U> INT IDENTITY</TD></TR>
      <TR><TD ALIGN="LEFT"><B>UQ</B></TD><TD ALIGN="LEFT">TenBan NVARCHAR(20)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">SoCho TINYINT (1..20)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">KhuVuc NVARCHAR(30)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">TrangThai NVARCHAR(20)</TD></TR>
    </TABLE>>];

  DatBan [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#2E7D32" COLSPAN="2"><FONT COLOR="white"><B>DatBan</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK</B></TD><TD ALIGN="LEFT"><U>MaDatBan</U> INT IDENTITY</TD></TR>
      <TR><TD ALIGN="LEFT"><B>FK</B></TD><TD ALIGN="LEFT">MaKH INT</TD></TR>
      <TR><TD ALIGN="LEFT"><B>FK</B></TD><TD ALIGN="LEFT">MaBan INT</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">ThoiGianDat DATETIME</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">SoNguoi TINYINT</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">TrangThai, GhiChu, NgayTao</TD></TR>
    </TABLE>>];

  /* 3. THỰC ĐƠN & KHO */
  DanhMucMon [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#EF6C00" COLSPAN="2"><FONT COLOR="white"><B>DanhMucMon</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK</B></TD><TD ALIGN="LEFT"><U>MaDM</U> INT IDENTITY</TD></TR>
      <TR><TD ALIGN="LEFT"><B>UQ</B></TD><TD ALIGN="LEFT">TenDM NVARCHAR(50)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">MoTa NVARCHAR(255)</TD></TR>
    </TABLE>>];

  MonAn [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#EF6C00" COLSPAN="2"><FONT COLOR="white"><B>MonAn</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK</B></TD><TD ALIGN="LEFT"><U>MaMon</U> INT IDENTITY</TD></TR>
      <TR><TD ALIGN="LEFT"><B>UQ</B></TD><TD ALIGN="LEFT">TenMon NVARCHAR(100)</TD></TR>
      <TR><TD ALIGN="LEFT"><B>FK</B></TD><TD ALIGN="LEFT">MaDM INT</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">DonGia DECIMAL(12,0)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">DonViTinh, MoTa</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">ConKinhDoanh BIT</TD></TR>
    </TABLE>>];

  NguyenLieu [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#5E35B1" COLSPAN="2"><FONT COLOR="white"><B>NguyenLieu</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK</B></TD><TD ALIGN="LEFT"><U>MaNL</U> INT IDENTITY</TD></TR>
      <TR><TD ALIGN="LEFT"><B>UQ</B></TD><TD ALIGN="LEFT">TenNL NVARCHAR(100)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">DonViTinh NVARCHAR(20)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">SoLuongTon DECIMAL(10,2)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">MucToiThieu DECIMAL(10,2)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">DonGiaNhap DECIMAL(12,0)</TD></TR>
    </TABLE>>];

  CongThuc [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#5E35B1" COLSPAN="2"><FONT COLOR="white"><B>CongThuc</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK,FK</B></TD><TD ALIGN="LEFT"><U>MaMon</U> INT</TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK,FK</B></TD><TD ALIGN="LEFT"><U>MaNL</U> INT</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">DinhLuong DECIMAL(10,3)</TD></TR>
    </TABLE>>];

  /* 4. HÓA ĐƠN & GỌI MÓN */
  HoaDon [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#1565C0" COLSPAN="2"><FONT COLOR="white"><B>HoaDon</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK</B></TD><TD ALIGN="LEFT"><U>MaHD</U> INT IDENTITY</TD></TR>
      <TR><TD ALIGN="LEFT"><B>FK</B></TD><TD ALIGN="LEFT">MaBan INT</TD></TR>
      <TR><TD ALIGN="LEFT"><B>FK</B></TD><TD ALIGN="LEFT">MaKH INT (NULL)</TD></TR>
      <TR><TD ALIGN="LEFT"><B>FK</B></TD><TD ALIGN="LEFT">MaNV INT</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">ThoiGianLap, ThoiGianThanhToan</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">TongTien, GiamGia, ThanhToan</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">PhuongThucTT, TrangThai</TD></TR>
    </TABLE>>];

  ChiTietHoaDon [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#1565C0" COLSPAN="2"><FONT COLOR="white"><B>ChiTietHoaDon</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK,FK</B></TD><TD ALIGN="LEFT"><U>MaHD</U> INT</TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK,FK</B></TD><TD ALIGN="LEFT"><U>MaMon</U> INT</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">SoLuong INT</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">DonGia DECIMAL(12,0)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">ThanhTien (Computed)</TD></TR>
    </TABLE>>];

  /* 5. NHẬT KÝ AUDIT */
  NhatKyHoaDon [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" BGCOLOR="white">
      <TR><TD BGCOLOR="#546E7A" COLSPAN="2"><FONT COLOR="white"><B>NhatKyHoaDon</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><B>PK</B></TD><TD ALIGN="LEFT"><U>MaNK</U> INT IDENTITY</TD></TR>
      <TR><TD ALIGN="LEFT"><B>FK</B></TD><TD ALIGN="LEFT">MaHD INT (Logic)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">HanhDong NVARCHAR(50)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">NoiDung NVARCHAR(500)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">NguoiThucHien NVARCHAR(100)</TD></TR>
      <TR><TD ALIGN="LEFT"></TD><TD ALIGN="LEFT">ThoiGian DATETIME</TD></TR>
    </TABLE>>];

  /* Ranks */
  { rank=same; KhachHang; NhanVien; DanhMucMon; }
  { rank=same; DatBan; HoaDon; MonAn; NhatKyHoaDon; }
  { rank=same; BanAn; ChiTietHoaDon; CongThuc; }
  { rank=same; NguyenLieu; }

  /* Mối quan hệ */
  KhachHang    -> DatBan         [label="1..N"];
  KhachHang    -> HoaDon         [style=dashed, label="0..1..N"];
  NhanVien     -> HoaDon         [label="1..N"];
  BanAn        -> DatBan         [label="1..N"];
  BanAn        -> HoaDon         [label="1..N"];
  HoaDon       -> ChiTietHoaDon  [label="1..N (CASCADE)"];
  MonAn        -> ChiTietHoaDon  [label="1..N"];
  DanhMucMon   -> MonAn          [label="1..N"];
  MonAn        -> CongThuc       [label="1..N (CASCADE)"];
  NguyenLieu   -> CongThuc       [label="1..N"];
  HoaDon       -> NhatKyHoaDon   [style=dashed, label="Audit log"];
}
'''
with open("erd/erd.dot", "w", encoding="utf-8") as f:
    f.write(dot_content)
print("Updated: erd/erd.dot")
