# -*- coding: utf-8 -*-
"""
Sinh sơ đồ ERD theo phong cách Chen + Crow's Foot (Entity - Action Diamond - Attribute Oval)
Hỗ trợ xuất đồng thời:
1. erd/erd_chen.svg (Vector SVG chuẩn)
2. erd/erd_chen.png (Ảnh PNG độ phân giải cao 2x Supersampling qua Pillow)
3. erd/erd_chen_viewer.html (Trình xem tương tác Zoom/Pan/Highlight + Xuất PNG)
"""
import math
from PIL import Image, ImageDraw, ImageFont

WIDTH = 2300
HEIGHT = 1380

# 1. Định nghĩa 11 Thực thể (Entities) với bố cục quạt tròn (radial fan) không chồng lấn
entities = {
    'KhachHang': {
        'label': 'KhachHang',
        'sub': '(Khách hàng)',
        'x': 520, 'y': 390, 'w': 152, 'h': 64,
        'attrs': [
            ('MaKH', True,  300, 395),
            ('NgaySinh', False, 310, 330),
            ('HoTen', False, 350, 265),
            ('SoDienThoai', False, 445, 205),
            ('Email', False, 585, 205),
            ('GioiTinh', False, 685, 255),
            ('DiemTichLuy', False, 730, 320),
            ('NgayDangKy', False, 745, 390),
        ]
    },
    'DatBan': {
        'label': 'DatBan',
        'sub': '(Đặt bàn)',
        'x': 200, 'y': 580, 'w': 144, 'h': 62,
        'attrs': [
            ('MaDatBan', True, 185, 435),
            ('ThoiGianDat', False, 68, 495),
            ('SoNguoi', False, 60, 565),
            ('TrangThai', False, 65, 635),
            ('GhiChu', False, 115, 710),
            ('NgayTao', False, 235, 730),
        ]
    },
    'BanAn': {
        'label': 'BanAn',
        'sub': '(Bàn ăn)',
        'x': 520, 'y': 730, 'w': 144, 'h': 62,
        'attrs': [
            ('MaBan', True, 355, 845),
            ('TenBan', False, 455, 895),
            ('SoCho', False, 575, 895),
            ('KhuVuc', False, 675, 845),
            ('TrangThai', False, 520, 595),
        ]
    },
    'NhanVien': {
        'label': 'NhanVien',
        'sub': '(Nhân viên)',
        'x': 520, 'y': 1090, 'w': 152, 'h': 64,
        'attrs': [
            ('DangLamViec', False, 365, 975),
            ('MaNV', True, 315, 1035),
            ('HoTen', False, 305, 1105),
            ('NgaySinh', False, 330, 1175),
            ('GioiTinh', False, 405, 1235),
            ('ChucVu', False, 520, 1250),
            ('SoDienThoai', False, 645, 1230),
            ('LuongCoBan', False, 725, 1160),
        ]
    },
    'HoaDon': {
        'label': 'HoaDon',
        'sub': '(Hóa đơn)',
        'x': 1040, 'y': 730, 'w': 152, 'h': 64,
        'attrs': [
            ('MaHD', True, 915, 575),
            ('ThoiGianLap', False, 975, 505),
            ('ThoiGianTT', False, 1105, 505),
            ('TongTien', False, 1210, 555),
            ('GiamGia', False, 1250, 625),
            ('ThanhToan', False, 1250, 795),
            ('PhuongThucTT', False, 1215, 860),
            ('TrangThai', False, 1165, 920),
        ]
    },
    'NhatKyHoaDon': {
        'label': 'NhatKyHoaDon',
        'sub': '(Nhật ký HĐ)',
        'x': 1020, 'y': 1125, 'w': 158, 'h': 64,
        'attrs': [
            ('MaNK', True, 820, 1085),
            ('HanhDong', False, 840, 1175),
            ('NoiDung', False, 950, 1250),
            ('NguoiThucHien', False, 1095, 1250),
            ('ThoiGian', False, 1210, 1170),
        ]
    },
    'ChiTietHoaDon': {
        'label': 'ChiTietHoaDon',
        'sub': '(Chi tiết HĐ)',
        'x': 1520, 'y': 730, 'w': 158, 'h': 64,
        'attrs': [
            ('MaHD, MaMon', True, 1355, 845),
            ('SoLuong', False, 1465, 895),
            ('DonGia', False, 1585, 895),
            ('ThanhTien', False, 1690, 845),
            ('GhiChu', False, 1715, 730),
        ]
    },
    'DanhMucMon': {
        'label': 'DanhMucMon',
        'sub': '(Danh mục món)',
        'x': 1520, 'y': 160, 'w': 158, 'h': 62,
        'attrs': [
            ('MaDM', True, 1320, 160),
            ('TenDM', False, 1685, 75),
            ('MoTa', False, 1720, 160),
        ]
    },
    'MonAn': {
        'label': 'MonAn',
        'sub': '(Món ăn)',
        'x': 1520, 'y': 430, 'w': 152, 'h': 64,
        'attrs': [
            ('DonViTinh', False, 1355, 315),
            ('MaMon', True, 1310, 385),
            ('TenMon', False, 1310, 455),
            ('DonGia', False, 1355, 525),
            ('MoTa', False, 1665, 310),
            ('ConKinhDoanh', False, 1675, 520),
        ]
    },
    'CongThuc': {
        'label': 'CongThuc',
        'sub': '(Công thức)',
        'x': 1980, 'y': 430, 'w': 152, 'h': 64,
        'attrs': [
            ('MaMon, MaNL', True, 1980, 290),
            ('DinhLuong', False, 2170, 430),
        ]
    },
    'NguyenLieu': {
        'label': 'NguyenLieu',
        'sub': '(Nguyên liệu)',
        'x': 1980, 'y': 850, 'w': 154, 'h': 64,
        'attrs': [
            ('MaNL', True, 1795, 815),
            ('TenNL', False, 1800, 895),
            ('DonViTinh', False, 1875, 975),
            ('SoLuongTon', False, 2000, 990),
            ('MucToiThieu', False, 2135, 960),
            ('DonGiaNhap', False, 2175, 850),
        ]
    }
}

# 2. Định nghĩa 11 Quan hệ Hình thoi (Actions / Relationships)
actions = [
    {
        'id': 'act_dat_truoc',
        'label': 'Đặt trước',
        'x': 350, 'y': 475, 'dw': 134, 'dh': 72,
        'e1': 'KhachHang', 'c1': 'one',
        'e2': 'DatBan', 'c2': 'opt_many'
    },
    {
        'id': 'act_xep_ban',
        'label': 'Xếp bàn',
        'x': 355, 'y': 665, 'dw': 134, 'dh': 72,
        'e1': 'BanAn', 'c1': 'one',
        'e2': 'DatBan', 'c2': 'opt_many'
    },
    {
        'id': 'act_thanh_toan',
        'label': 'Khách TT',
        'x': 770, 'y': 545, 'dw': 138, 'dh': 74,
        'e1': 'KhachHang', 'c1': 'opt_one',
        'e2': 'HoaDon', 'c2': 'opt_many'
    },
    {
        'id': 'act_phuc_vu',
        'label': 'Phục vụ tại',
        'x': 770, 'y': 730, 'dw': 140, 'dh': 74,
        'e1': 'BanAn', 'c1': 'one',
        'e2': 'HoaDon', 'c2': 'opt_many'
    },
    {
        'id': 'act_lap_don',
        'label': 'Lập hóa đơn',
        'x': 770, 'y': 915, 'dw': 142, 'dh': 74,
        'e1': 'NhanVien', 'c1': 'one',
        'e2': 'HoaDon', 'c2': 'opt_many'
    },
    {
        'id': 'act_ghi_vet',
        'label': 'Ghi nhật ký',
        'x': 1020, 'y': 930, 'dw': 142, 'dh': 74,
        'e1': 'HoaDon', 'c1': 'one',
        'e2': 'NhatKyHoaDon', 'c2': 'opt_many'
    },
    {
        'id': 'act_chua_mon',
        'label': 'Bao gồm',
        'x': 1280, 'y': 730, 'dw': 136, 'dh': 74,
        'e1': 'HoaDon', 'c1': 'one',
        'e2': 'ChiTietHoaDon', 'c2': 'many'
    },
    {
        'id': 'act_duoc_goi',
        'label': 'Được gọi',
        'x': 1520, 'y': 580, 'dw': 136, 'dh': 74,
        'e1': 'MonAn', 'c1': 'one',
        'e2': 'ChiTietHoaDon', 'c2': 'opt_many'
    },
    {
        'id': 'act_phan_loai',
        'label': 'Phân loại',
        'x': 1520, 'y': 295, 'dw': 136, 'dh': 74,
        'e1': 'DanhMucMon', 'c1': 'one',
        'e2': 'MonAn', 'c2': 'many'
    },
    {
        'id': 'act_dinh_luong',
        'label': 'Định lượng',
        'x': 1750, 'y': 430, 'dw': 140, 'dh': 74,
        'e1': 'MonAn', 'c1': 'one',
        'e2': 'CongThuc', 'c2': 'many'
    },
    {
        'id': 'act_cau_thanh',
        'label': 'Tiêu hao',
        'x': 1980, 'y': 640, 'dw': 136, 'dh': 74,
        'e1': 'NguyenLieu', 'c1': 'one',
        'e2': 'CongThuc', 'c2': 'opt_many'
    }
]

def get_oval_rx(text):
    return max(50, len(text) * 4.3 + 16)

def intersect_rect(cx, cy, w, h, tx, ty):
    dx = tx - cx
    dy = ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    t_x = (w / 2.0) / abs(dx) if dx != 0 else float('inf')
    t_y = (h / 2.0) / abs(dy) if dy != 0 else float('inf')
    t = min(t_x, t_y)
    return cx + t * dx, cy + t * dy

def intersect_diamond(cx, cy, dw, dh, tx, ty):
    dx = tx - cx
    dy = ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    a = dw / 2.0
    b = dh / 2.0
    t = 1.0 / (abs(dx) / a + abs(dy) / b)
    return cx + t * dx, cy + t * dy

def intersect_ellipse(cx, cy, rx, ry, tx, ty):
    dx = tx - cx
    dy = ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    t = 1.0 / math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
    return cx + t * dx, cy + t * dy

def draw_cardinality_symbol_svg(px, py, tx, ty, ctype, stroke='#222222'):
    dx = tx - px
    dy = ty - py
    dist = math.hypot(dx, dy)
    if dist < 1e-5:
        return ''
    ux, uy = dx / dist, dy / dist
    nx, ny = -uy, ux

    elems = []
    if ctype == 'one':
        cx, cy = px + 14 * ux, py + 14 * uy
        x1, y1 = cx - 6.5 * nx, cy - 6.5 * ny
        x2, y2 = cx + 6.5 * nx, cy + 6.5 * ny
        elems.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="1.6" />')
    elif ctype == 'opt_one':
        cx, cy = px + 11 * ux, py + 11 * uy
        x1, y1 = cx - 6.5 * nx, cy - 6.5 * ny
        x2, y2 = cx + 6.5 * nx, cy + 6.5 * ny
        elems.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="1.6" />')
        ox, oy = px + 21 * ux, py + 21 * uy
        elems.append(f'<circle cx="{ox:.1f}" cy="{oy:.1f}" r="4.8" fill="#FFFFFF" stroke="{stroke}" stroke-width="1.5" />')
    elif ctype == 'many':
        fx, fy = px + 15 * ux, py + 15 * uy
        p1x, p1y = px - 7 * nx, py - 7 * ny
        p2x, p2y = px + 7 * nx, py + 7 * ny
        elems.append(f'<line x1="{fx:.1f}" y1="{fy:.1f}" x2="{p1x:.1f}" y2="{p1y:.1f}" stroke="{stroke}" stroke-width="1.5" />')
        elems.append(f'<line x1="{fx:.1f}" y1="{fy:.1f}" x2="{p2x:.1f}" y2="{p2y:.1f}" stroke="{stroke}" stroke-width="1.5" />')
        tx1, ty1 = fx + 3 * ux - 6.5 * nx, fy + 3 * uy - 6.5 * ny
        tx2, ty2 = fx + 3 * ux + 6.5 * nx, fy + 3 * uy + 6.5 * ny
        elems.append(f'<line x1="{tx1:.1f}" y1="{ty1:.1f}" x2="{tx2:.1f}" y2="{ty2:.1f}" stroke="{stroke}" stroke-width="1.5" />')
    elif ctype == 'opt_many':
        fx, fy = px + 14 * ux, py + 14 * uy
        p1x, p1y = px - 7 * nx, py - 7 * ny
        p2x, p2y = px + 7 * nx, py + 7 * ny
        elems.append(f'<line x1="{fx:.1f}" y1="{fy:.1f}" x2="{p1x:.1f}" y2="{p1y:.1f}" stroke="{stroke}" stroke-width="1.5" />')
        elems.append(f'<line x1="{fx:.1f}" y1="{fy:.1f}" x2="{p2x:.1f}" y2="{p2y:.1f}" stroke="{stroke}" stroke-width="1.5" />')
        ox, oy = px + 21 * ux, py + 21 * uy
        elems.append(f'<circle cx="{ox:.1f}" cy="{oy:.1f}" r="4.8" fill="#FFFFFF" stroke="{stroke}" stroke-width="1.5" />')
    return "\n".join(elems)

def build_chen_svg():
    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="100%" height="100%" style="background: #FFFFFF; font-family: Arial, Helvetica, sans-serif;">')
    svg.append('''<defs>
    <filter id="soft-shadow" x="-8%" y="-8%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.08" />
    </filter>
  </defs>''')

    # 1. LEGEND BOX
    svg.append('''
    <g id="legend-box" transform="translate(50, 35)">
      <rect x="0" y="0" width="840" height="115" rx="14" ry="14" fill="#FFFFFF" stroke="#B0B0B0" stroke-width="1.3" filter="url(#soft-shadow)" />
      
      <rect x="35" y="28" width="115" height="58" fill="#C6E2F5" stroke="#9AC0DF" stroke-width="1.2" />
      <text x="92.5" y="55" text-anchor="middle" fill="#222222" font-size="13" font-weight="600">Entity</text>
      <text x="92.5" y="72" text-anchor="middle" fill="#555555" font-size="10.5">(Thực thể)</text>

      <polygon points="235,24 295,57 235,90 175,57" fill="#89A8C9" stroke="#6E8EAE" stroke-width="1.2" />
      <text x="235" y="54" text-anchor="middle" fill="#222222" font-size="12.5" font-weight="600">Action</text>
      <text x="235" y="69" text-anchor="middle" fill="#333333" font-size="10">(Quan hệ)</text>

      <ellipse cx="375" cy="57" rx="54" ry="28" fill="#FFFFFF" stroke="#666666" stroke-width="1.2" />
      <text x="375" y="54" text-anchor="middle" fill="#222222" font-size="12.5" font-weight="600">Attribute</text>
      <text x="375" y="69" text-anchor="middle" fill="#555555" font-size="10">(Thuộc tính)</text>

      <g transform="translate(475, 28)">
        <line x1="0" y1="6" x2="60" y2="6" stroke="#222222" stroke-width="1.5" />
        <line x1="15" y1="0" x2="15" y2="12" stroke="#222222" stroke-width="1.5" />
        <text x="72" y="10" fill="#111111" font-size="13" font-weight="700">= One (Một: 1)</text>
      </g>

      <g transform="translate(475, 55)">
        <line x1="0" y1="6" x2="60" y2="6" stroke="#222222" stroke-width="1.5" />
        <line x1="13" y1="6" x2="0" y2="0" stroke="#222222" stroke-width="1.5" />
        <line x1="13" y1="6" x2="0" y2="12" stroke="#222222" stroke-width="1.5" />
        <circle cx="20" cy="6" r="4.5" fill="#FFFFFF" stroke="#222222" stroke-width="1.4" />
        <text x="72" y="10" fill="#111111" font-size="13" font-weight="700">= Zero or more, Optional (0..N, Tùy chọn)</text>
      </g>

      <g transform="translate(475, 82)">
        <line x1="0" y1="6" x2="60" y2="6" stroke="#222222" stroke-width="1.5" />
        <line x1="13" y1="6" x2="0" y2="0" stroke="#222222" stroke-width="1.5" />
        <line x1="13" y1="6" x2="0" y2="12" stroke="#222222" stroke-width="1.5" />
        <text x="72" y="10" fill="#111111" font-size="13" font-weight="700">= Many (Nhiều: 1..N)</text>
      </g>
    </g>

    ''')

    # 2. ATTRIBUTE LINES
    svg.append('<g id="attribute-lines">')
    for ename, edata in entities.items():
        ex, ey, ew, eh = edata['x'], edata['y'], edata['w'], edata['h']
        for aname, is_pk, ax, ay in edata['attrs']:
            rx, ry = get_oval_rx(aname), 21
            p1x, p1y = intersect_rect(ex, ey, ew, eh, ax, ay)
            p2x, p2y = intersect_ellipse(ax, ay, rx, ry, ex, ey)
            svg.append(f'<line class="attr-line" data-entity="{ename}" x1="{p1x:.1f}" y1="{p1y:.1f}" x2="{p2x:.1f}" y2="{p2y:.1f}" stroke="#222222" stroke-width="1.3" />')
    svg.append('</g>')

    # 3. RELATIONSHIP LINES
    svg.append('<g id="relationship-lines">')
    for act in actions:
        ax, ay, dw, dh = act['x'], act['y'], act['dw'], act['dh']
        for e_key, c_key in [('e1', 'c1'), ('e2', 'c2')]:
            ename = act[e_key]
            ctype = act[c_key]
            edata = entities[ename]
            ex, ey, ew, eh = edata['x'], edata['y'], edata['w'], edata['h']
            p_ent_x, p_ent_y = intersect_rect(ex, ey, ew, eh, ax, ay)
            p_act_x, p_act_y = intersect_diamond(ax, ay, dw, dh, ex, ey)
            svg.append(f'<g class="rel-line" data-e1="{act["e1"]}" data-e2="{act["e2"]}">')
            svg.append(f'  <line x1="{p_ent_x:.1f}" y1="{p_ent_y:.1f}" x2="{p_act_x:.1f}" y2="{p_act_y:.1f}" stroke="#333333" stroke-width="1.4" />')
            svg.append(draw_cardinality_symbol_svg(p_ent_x, p_ent_y, p_act_x, p_act_y, ctype, stroke='#222222'))
            svg.append('</g>')
    svg.append('</g>')

    # 4. ATTRIBUTE OVALS
    svg.append('<g id="attributes-group">')
    for ename, edata in entities.items():
        for aname, is_pk, ax, ay in edata['attrs']:
            rx, ry = get_oval_rx(aname), 21
            svg.append(f'<g class="attr-node" data-entity="{ename}">')
            svg.append(f'  <ellipse cx="{ax}" cy="{ay}" rx="{rx:.1f}" ry="{ry}" fill="#EAECE0" stroke="#C5C8B8" stroke-width="1.1" filter="url(#soft-shadow)" />')
            if is_pk:
                svg.append(f'  <text x="{ax}" y="{ay+4}" text-anchor="middle" fill="#111111" font-size="11.5" font-weight="700" text-decoration="underline">{aname}</text>')
            else:
                svg.append(f'  <text x="{ax}" y="{ay+4}" text-anchor="middle" fill="#222222" font-size="11.5">{aname}</text>')
            svg.append('</g>')
    svg.append('</g>')

    # 5. ACTION DIAMONDS
    svg.append('<g id="actions-group">')
    for act in actions:
        ax, ay, dw, dh = act['x'], act['y'], act['dw'], act['dh']
        pts = f"{ax},{ay - dh/2} {ax + dw/2},{ay} {ax},{ay + dh/2} {ax - dw/2},{ay}"
        svg.append(f'<g class="action-node" id="{act["id"]}" data-e1="{act["e1"]}" data-e2="{act["e2"]}">')
        svg.append(f'  <polygon points="{pts}" fill="#89A8C9" stroke="#6E8EAE" stroke-width="1.3" filter="url(#soft-shadow)" />')
        svg.append(f'  <text x="{ax}" y="{ay+4}" text-anchor="middle" fill="#1E293B" font-size="12" font-weight="700">{act["label"]}</text>')
        svg.append('</g>')
    svg.append('</g>')

    # 6. ENTITY RECTANGLES
    svg.append('<g id="entities-group">')
    for ename, edata in entities.items():
        ex, ey, ew, eh = edata['x'], edata['y'], edata['w'], edata['h']
        rx0, ry0 = ex - ew / 2.0, ey - eh / 2.0
        svg.append(f'<g class="entity-node" id="ent_{ename}" data-entity="{ename}">')
        svg.append(f'  <rect x="{rx0:.1f}" y="{ry0:.1f}" width="{ew}" height="{eh}" fill="#C6E2F5" stroke="#8FB8D8" stroke-width="1.5" filter="url(#soft-shadow)" />')
        svg.append(f'  <text x="{ex}" y="{ey - 2}" text-anchor="middle" fill="#111111" font-size="14" font-weight="700">{edata["label"]}</text>')
        svg.append(f'  <text x="{ex}" y="{ey + 16}" text-anchor="middle" fill="#445566" font-size="11">{edata["sub"]}</text>')
        svg.append('</g>')
    svg.append('</g>')

    svg.append('</svg>')
    return "\n".join(svg)

def render_chen_png(output_path, scale=2):
    S = scale
    img = Image.new('RGB', (WIDTH * S, HEIGHT * S), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    font_reg = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", int(11.5 * S))
    font_small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", int(10.5 * S))
    font_bold = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(12 * S))
    font_ent = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(14 * S))
    font_legend = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(13 * S))
    font_title = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(18.5 * S))
    font_sub = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(13 * S))

    def draw_text_centered(x, y, text, font, fill=(34, 34, 34), underline=False):
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = x * S - tw / 2.0
        ty = y * S - th / 2.0 - bbox[1] * 0.5
        draw.text((tx, ty), text, font=font, fill=fill)
        if underline:
            uy = y * S + th / 2.0 + 2 * S
            draw.line([(tx, uy), (tx + tw, uy)], fill=fill, width=max(1, int(1.3 * S)))

    # 1. Legend Box
    lx, ly = 50, 35
    draw.rounded_rectangle([lx*S, ly*S, (lx+840)*S, (ly+115)*S], radius=14*S, fill=(255, 255, 255), outline=(176, 176, 176), width=int(1.4*S))
    
    draw.rectangle([(lx+35)*S, (ly+28)*S, (lx+150)*S, (ly+86)*S], fill=(198, 226, 245), outline=(154, 192, 223), width=int(1.2*S))
    draw_text_centered(lx+92.5, ly+50, "Entity", font_bold, (34, 34, 34))
    draw_text_centered(lx+92.5, ly+68, "(Thực thể)", font_small, (85, 85, 85))

    pts_leg = [((lx+235)*S, (ly+24)*S), ((lx+295)*S, (ly+57)*S), ((lx+235)*S, (ly+90)*S), ((lx+175)*S, (ly+57)*S)]
    draw.polygon(pts_leg, fill=(137, 168, 201), outline=(110, 142, 174), width=int(1.2*S))
    draw_text_centered(lx+235, ly+50, "Action", font_bold, (34, 34, 34))
    draw_text_centered(lx+235, ly+66, "(Quan hệ)", font_small, (51, 51, 51))

    draw.ellipse([(lx+321)*S, (ly+29)*S, (lx+429)*S, (ly+85)*S], fill=(255, 255, 255), outline=(102, 102, 102), width=int(1.2*S))
    draw_text_centered(lx+375, ly+50, "Attribute", font_bold, (34, 34, 34))
    draw_text_centered(lx+375, ly+66, "(Thuộc tính)", font_small, (85, 85, 85))

    ox, oy = lx + 475, ly + 28
    draw.line([(ox*S, (oy+6)*S), ((ox+60)*S, (oy+6)*S)], fill=(34, 34, 34), width=int(1.5*S))
    draw.line([((ox+15)*S, oy*S), ((ox+15)*S, (oy+12)*S)], fill=(34, 34, 34), width=int(1.5*S))
    draw.text(((ox+72)*S, (oy-2)*S), "= One (Một: 1)", font=font_legend, fill=(17, 17, 17))

    oy = ly + 55
    draw.line([(ox*S, (oy+6)*S), ((ox+60)*S, (oy+6)*S)], fill=(34, 34, 34), width=int(1.5*S))
    draw.line([((ox+13)*S, (oy+6)*S), (ox*S, oy*S)], fill=(34, 34, 34), width=int(1.5*S))
    draw.line([((ox+13)*S, (oy+6)*S), (ox*S, (oy+12)*S)], fill=(34, 34, 34), width=int(1.5*S))
    draw.ellipse([((ox+20-4.5)*S, (oy+6-4.5)*S), ((ox+20+4.5)*S, (oy+6+4.5)*S)], fill=(255, 255, 255), outline=(34, 34, 34), width=int(1.4*S))
    draw.text(((ox+72)*S, (oy-2)*S), "= Zero or more, Optional (0..N, Tùy chọn)", font=font_legend, fill=(17, 17, 17))

    oy = ly + 82
    draw.line([(ox*S, (oy+6)*S), ((ox+60)*S, (oy+6)*S)], fill=(34, 34, 34), width=int(1.5*S))
    draw.line([((ox+13)*S, (oy+6)*S), (ox*S, oy*S)], fill=(34, 34, 34), width=int(1.5*S))
    draw.line([((ox+13)*S, (oy+6)*S), (ox*S, (oy+12)*S)], fill=(34, 34, 34), width=int(1.5*S))
    draw.text(((ox+72)*S, (oy-2)*S), "= Many (Nhiều: 1..N)", font=font_legend, fill=(17, 17, 17))



    # 2. Attribute lines
    for ename, edata in entities.items():
        ex, ey, ew, eh = edata['x'], edata['y'], edata['w'], edata['h']
        for aname, is_pk, ax, ay in edata['attrs']:
            rx, ry = get_oval_rx(aname), 21
            p1x, p1y = intersect_rect(ex, ey, ew, eh, ax, ay)
            p2x, p2y = intersect_ellipse(ax, ay, rx, ry, ex, ey)
            draw.line([(p1x*S, p1y*S), (p2x*S, p2y*S)], fill=(34, 34, 34), width=int(1.3*S))

    # 3. Relationship lines + markers
    for act in actions:
        ax, ay, dw, dh = act['x'], act['y'], act['dw'], act['dh']
        for e_key, c_key in [('e1', 'c1'), ('e2', 'c2')]:
            ename = act[e_key]
            ctype = act[c_key]
            edata = entities[ename]
            ex, ey, ew, eh = edata['x'], edata['y'], edata['w'], edata['h']
            px, py = intersect_rect(ex, ey, ew, eh, ax, ay)
            tx, ty = intersect_diamond(ax, ay, dw, dh, ex, ey)
            draw.line([(px*S, py*S), (tx*S, ty*S)], fill=(51, 51, 51), width=int(1.4*S))

            dx, dy = tx - px, ty - py
            dist = math.hypot(dx, dy)
            if dist > 1e-5:
                ux, uy = dx / dist, dy / dist
                nx, ny = -uy, ux
                if ctype == 'one':
                    cx, cy = px + 14 * ux, py + 14 * uy
                    draw.line([((cx - 6.5*nx)*S, (cy - 6.5*ny)*S), ((cx + 6.5*nx)*S, (cy + 6.5*ny)*S)], fill=(34, 34, 34), width=int(1.6*S))
                elif ctype == 'opt_one':
                    cx, cy = px + 11 * ux, py + 11 * uy
                    draw.line([((cx - 6.5*nx)*S, (cy - 6.5*ny)*S), ((cx + 6.5*nx)*S, (cy + 6.5*ny)*S)], fill=(34, 34, 34), width=int(1.6*S))
                    ox, oy = px + 21 * ux, py + 21 * uy
                    draw.ellipse([((ox-4.8)*S, (oy-4.8)*S), ((ox+4.8)*S, (oy+4.8)*S)], fill=(255, 255, 255), outline=(34, 34, 34), width=int(1.5*S))
                elif ctype == 'many':
                    fx, fy = px + 15 * ux, py + 15 * uy
                    draw.line([(fx*S, fy*S), ((px - 7*nx)*S, (py - 7*ny)*S)], fill=(34, 34, 34), width=int(1.5*S))
                    draw.line([(fx*S, fy*S), ((px + 7*nx)*S, (py + 7*ny)*S)], fill=(34, 34, 34), width=int(1.5*S))
                    tx1, ty1 = fx + 3 * ux - 6.5 * nx, fy + 3 * uy - 6.5 * ny
                    tx2, ty2 = fx + 3 * ux + 6.5 * nx, fy + 3 * uy + 6.5 * ny
                    draw.line([(tx1*S, ty1*S), (tx2*S, ty2*S)], fill=(34, 34, 34), width=int(1.5*S))
                elif ctype == 'opt_many':
                    fx, fy = px + 14 * ux, py + 14 * uy
                    draw.line([(fx*S, fy*S), ((px - 7*nx)*S, (py - 7*ny)*S)], fill=(34, 34, 34), width=int(1.5*S))
                    draw.line([(fx*S, fy*S), ((px + 7*nx)*S, (py + 7*ny)*S)], fill=(34, 34, 34), width=int(1.5*S))
                    ox, oy = px + 21 * ux, py + 21 * uy
                    draw.ellipse([((ox-4.8)*S, (oy-4.8)*S), ((ox+4.8)*S, (oy+4.8)*S)], fill=(255, 255, 255), outline=(34, 34, 34), width=int(1.5*S))

    # 4. Attribute Ovals
    for ename, edata in entities.items():
        for aname, is_pk, ax, ay in edata['attrs']:
            rx, ry = get_oval_rx(aname), 21
            draw.ellipse([((ax-rx)*S, (ay-ry)*S), ((ax+rx)*S, (ay+ry)*S)], fill=(234, 236, 224), outline=(197, 200, 184), width=int(1.2*S))
            draw_text_centered(ax, ay, aname, font_bold if is_pk else font_reg, (17, 17, 17), underline=is_pk)

    # 5. Action Diamonds
    for act in actions:
        ax, ay, dw, dh = act['x'], act['y'], act['dw'], act['dh']
        pts = [(ax*S, (ay - dh/2)*S), ((ax + dw/2)*S, ay*S), (ax*S, (ay + dh/2)*S), ((ax - dw/2)*S, ay*S)]
        draw.polygon(pts, fill=(137, 168, 201), outline=(110, 142, 174), width=int(1.3*S))
        draw_text_centered(ax, ay, act['label'], font_bold, (30, 41, 59))

    # 6. Entity Rectangles
    for ename, edata in entities.items():
        ex, ey, ew, eh = edata['x'], edata['y'], edata['w'], edata['h']
        rx0, ry0 = ex - ew / 2.0, ey - eh / 2.0
        draw.rectangle([rx0*S, ry0*S, (rx0+ew)*S, (ry0+eh)*S], fill=(198, 226, 245), outline=(143, 184, 216), width=int(1.5*S))
        draw_text_centered(ex, ey - 7, edata['label'], font_ent, (17, 17, 17))
        draw_text_centered(ex, ey + 13, edata['sub'], font_small, (68, 85, 102))

    final_img = img.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    final_img.save(output_path, "PNG", optimize=True)
    print(f"Saved high-res PNG: {output_path}")

def build_chen_html_viewer(svg_str):
    return f'''<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sơ đồ ERD (Mô hình Chen) - Quản lý Nhà hàng</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    #canvas-container {{ cursor: grab; user-select: none; }}
    #canvas-container:active {{ cursor: grabbing; }}
    .entity-node {{ cursor: pointer; transition: opacity 0.2s ease, transform 0.15s ease; }}
    .action-node, .attr-node, .rel-line, .attr-line {{ transition: opacity 0.2s ease; }}
    .dimmed {{ opacity: 0.15 !important; }}
    .highlighted {{ opacity: 1 !important; }}
  </style>
</head>
<body class="bg-slate-100 text-slate-800 flex flex-col h-screen overflow-hidden font-sans">
  <header class="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-20 shadow-sm">
    <div>
      <div class="flex items-center gap-3">
        <span class="inline-block w-3 h-3 rounded-full bg-sky-500"></span>
        <h1 class="text-base font-bold text-slate-800 tracking-wide uppercase">Sơ đồ ERD Mô Hình Chen (Entity – Action – Attribute)</h1>
        <span class="text-xs px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold">11 Thực thể • 11 Quan hệ</span>
      </div>
      <p class="text-xs text-slate-500 mt-0.5">Click vào Thực thể (hình chữ nhật xanh) để làm nổi bật các thuộc tính &amp; quan hệ • Cuộn chuột để Zoom • Kéo chuột để Pan</p>
    </div>

    <div class="flex items-center gap-2">
      <button class="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition" onclick="zoomIn()">➕ Phóng to</button>
      <button class="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition" onclick="zoomOut()">➖ Thu nhỏ</button>
      <button class="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition" onclick="resetZoom()">🔄 Vừa màn hình</button>
      <a href="erd_chen.png" download="QuanLyNhaHang_ERD_Chen.png" class="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm transition">⬇ Tải ảnh PNG</a>
      <a href="erd_chen.svg" download="QuanLyNhaHang_ERD_Chen.svg" class="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition">⬇ Tải Vector SVG</a>
    </div>
  </header>

  <div id="canvas-container" class="flex-1 relative overflow-hidden bg-slate-50">
    <div id="viewport" class="absolute top-0 left-0 w-[{WIDTH}px] h-[{HEIGHT}px] origin-top-left shadow-lg bg-white rounded-lg border border-slate-200">
      {svg_str}
    </div>
  </div>

  <footer class="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-between text-xs text-slate-500 z-10">
    <div>💡 Gạch chân trong hình Elip (ví dụ: <u>MaKH</u>, <u>MaHD</u>) biểu thị Khóa chính (Primary Key).</div>
    <div id="zoom-indicator" class="font-mono font-semibold text-sky-700">Tỉ lệ: 100%</div>
  </footer>

  <script>
    let scale = 0.7;
    let panX = 20;
    let panY = 15;
    let isDragging = false;
    let startX, startY;

    const viewport = document.getElementById('viewport');
    const container = document.getElementById('canvas-container');
    const zoomText = document.getElementById('zoom-indicator');

    function updateTransform() {{
      viewport.style.transform = `translate(${{panX}}px, ${{panY}}px) scale(${{scale}})`;
      zoomText.textContent = `Tỉ lệ: ${{Math.round(scale * 100)}}%`;
    }}

    function zoomIn() {{ scale = Math.min(2.5, scale + 0.12); updateTransform(); }}
    function zoomOut() {{ scale = Math.max(0.25, scale - 0.12); updateTransform(); }}
    function resetZoom() {{
      scale = Math.min((container.clientWidth - 40) / {WIDTH}, (container.clientHeight - 30) / {HEIGHT});
      panX = Math.max(15, (container.clientWidth - {WIDTH} * scale) / 2);
      panY = Math.max(10, (container.clientHeight - {HEIGHT} * scale) / 2);
      updateTransform();
      clearHighlight();
    }}

    container.addEventListener('wheel', (e) => {{
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.max(0.25, Math.min(2.5, scale * factor));
      updateTransform();
    }});

    container.addEventListener('mousedown', (e) => {{
      if (e.target.closest('.entity-node')) return;
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

    window.addEventListener('mouseup', () => {{ isDragging = false; }});

    let activeEnt = null;
    const entNodes = document.querySelectorAll('.entity-node');
    const actNodes = document.querySelectorAll('.action-node');
    const attrNodes = document.querySelectorAll('.attr-node');
    const relLines = document.querySelectorAll('.rel-line');
    const attrLines = document.querySelectorAll('.attr-line');

    entNodes.forEach(node => {{
      node.addEventListener('click', (e) => {{
        e.stopPropagation();
        const ename = node.getAttribute('data-entity');
        if (activeEnt === ename) {{
          clearHighlight();
          activeEnt = null;
        }} else {{
          highlightEntity(ename);
          activeEnt = ename;
        }}
      }});
    }});

    container.addEventListener('click', () => {{ clearHighlight(); activeEnt = null; }});

    function highlightEntity(ename) {{
      const relatedEnts = new Set([ename]);
      actNodes.forEach(a => {{
        const e1 = a.getAttribute('data-e1');
        const e2 = a.getAttribute('data-e2');
        if (e1 === ename || e2 === ename) {{
          a.classList.remove('dimmed');
          relatedEnts.add(e1);
          relatedEnts.add(e2);
        }} else {{
          a.classList.add('dimmed');
        }}
      }});

      relLines.forEach(r => {{
        const e1 = r.getAttribute('data-e1');
        const e2 = r.getAttribute('data-e2');
        if (e1 === ename || e2 === ename) r.classList.remove('dimmed');
        else r.classList.add('dimmed');
      }});

      entNodes.forEach(e => {{
        const id = e.getAttribute('data-entity');
        if (relatedEnts.has(id)) e.classList.remove('dimmed');
        else e.classList.add('dimmed');
      }});

      attrNodes.forEach(at => {{
        if (at.getAttribute('data-entity') === ename) at.classList.remove('dimmed');
        else at.classList.add('dimmed');
      }});

      attrLines.forEach(al => {{
        if (al.getAttribute('data-entity') === ename) al.classList.remove('dimmed');
        else al.classList.add('dimmed');
      }});
    }}

    function clearHighlight() {{
      document.querySelectorAll('.dimmed').forEach(el => el.classList.remove('dimmed'));
    }}

    window.addEventListener('load', resetZoom);
    window.addEventListener('resize', resetZoom);
  </script>
</body>
</html>'''

if __name__ == '__main__':
    svg_content = build_chen_svg()
    with open("erd/erd_chen.svg", "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("Saved: erd/erd_chen.svg")
    render_chen_png("erd/erd_chen.png", scale=2)
    html_out = build_chen_html_viewer(svg_content)
    with open("erd/erd_chen_viewer.html", "w", encoding="utf-8") as f:
        f.write(html_out)
    print("Saved: erd/erd_chen_viewer.html")
