# -*- coding: utf-8 -*-
"""
Script apply_report_updates.py
Thực hiện cập nhật toàn bộ báo cáo BaoCao_QuanLyNhaHang.docx:
1. Cập nhật ngày tháng trang bìa
2. Cập nhật Mục tiêu (Section 1.2)
3. Cập nhật Sơ đồ ERD (Section 3.1): Cả 2 hình Chen và Crow's Foot kèm diễn giải chi tiết
4. Cập nhật Dữ liệu mẫu (Section 5, Table 15, Table 16)
5. Bổ sung Mục 5.2: Kiểm toán chất lượng & Tính nhất quán dữ liệu
6. Cập nhật Chỉ mục & Đánh giá hiệu năng thực tế (Section 8.2, Table 34)
7. Cập nhật Giao diện Web "Sen Vàng POS" (Section 9): 5 hình ảnh mới, anti-jiggle, Table 35
8. Cập nhật Kết luận & Bảng đối chiếu (Section 11, Table 37)
9. Cập nhật Mục lục
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

sys.stdout.reconfigure(encoding='utf-8')

DOCX_IN = os.path.abspath('report/BaoCao_QuanLyNhaHang.docx')
doc = docx.Document(DOCX_IN)
print(f"Loaded docx: {len(doc.paragraphs)} paragraphs, {len(doc.tables)} tables.")

# =====================================================================
# STYLING HELPERS
# =====================================================================
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

def add_run_to_p(p, text, size=13.0, bold=False, italic=False, color=None):
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    if color:
        r.font.color.rgb = color
    return r

def format_caption(p, text):
    return set_p_text(p, text, align=WD_ALIGN_PARAGRAPH.CENTER, size=11.0, italic=True, color=RGBColor(0x55, 0x55, 0x55), space_before=4, space_after=12, line_spacing=1.15)

def format_heading2(p, text):
    p.style = 'Heading 2'
    return set_p_text(p, text, align=WD_ALIGN_PARAGRAPH.LEFT, size=14.0, bold=True, color=RGBColor(0x1E, 0x4D, 0x3B), space_before=14, space_after=6, line_spacing=1.2)

def format_heading3(p, text):
    p.style = 'Heading 3'
    return set_p_text(p, text, align=WD_ALIGN_PARAGRAPH.LEFT, size=13.0, bold=True, italic=True, color=RGBColor(0x2B, 0x54, 0x44), space_before=10, space_after=4, line_spacing=1.2)

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

# =====================================================================
# 1. CẬP NHẬT TRANG BÌA (THÁNG 11 NĂM 2026)
# =====================================================================
for p in doc.paragraphs[:35]:
    if 'Hà Nội, tháng' in p.text:
        print("Updating cover date at:", p.text)
        set_p_text(p, "Hà Nội, tháng 11 năm 2026", align=WD_ALIGN_PARAGRAPH.CENTER, size=13.0, bold=True)
        break

# =====================================================================
# 2. CẬP NHẬT MỤC TIÊU (SECTION 1.2)
# =====================================================================
for i, p in enumerate(doc.paragraphs):
    if '1.2. Mục tiêu' in p.text:
        print(f"Found Section 1.2 at P_{i}")
        # Next paragraphs are list items
        for j in range(i+1, i+6):
            pj = doc.paragraphs[j]
            if 'Sinh dữ liệu mẫu đủ lớn' in pj.text:
                print(f"Updating sample data goal at P_{j}")
                set_p_text(pj, "Sinh và kiểm toán tập dữ liệu mẫu quy mô lớn, chân thực (hơn 3.000 hóa đơn, hơn 10.000 dòng chi tiết gọi món) trải dài liên tục 5 năm (2020 – 2025), hỗ trợ công cụ sinh dữ liệu giả lập (synthetic data) benchmark lên tới 50.000 khách hàng; kiểm toán tự động bảo đảm 100% tính nhất quán tài chính và logic kinh doanh.", size=13.0, space_after=4, line_spacing=1.25)
            elif 'Xây dựng giao diện web kết nối trực tiếp' in pj.text:
                print(f"Updating web goal at P_{j}")
                set_p_text(pj, "Xây dựng ứng dụng web quản lý nhà hàng hiện đại \"Sen Vàng POS\" chuẩn thương mại: kiến trúc 3 lớp kết nối trực tiếp CSDL qua Stored Procedures, Views, Functions; giao diện sang trọng, responsive, mượt mà (anti-jiggle, subtle motion) phục vụ toàn bộ chu trình vận hành thời gian thực.", size=13.0, space_after=4, line_spacing=1.25)
        break

# =====================================================================
# 3. CẬP NHẬT SƠ ĐỒ ERD (SECTION 3.1)
# =====================================================================
p_erd_heading = None
for i, p in enumerate(doc.paragraphs):
    if '3.1. Sơ đồ thực thể – quan hệ (ERD)' in p.text:
        p_erd_heading = p
        p_erd_idx = i
        print(f"Found ERD Heading at P_{i}")
        break

if p_erd_heading:
    # Identify paragraphs: P104 (image), P105 (caption), P106 (desc)
    # We will locate the next heading '3.2. Chuẩn hóa dữ liệu'
    p_norm_heading = None
    for j in range(p_erd_idx+1, p_erd_idx+10):
        if '3.2. Chuẩn hóa dữ liệu' in doc.paragraphs[j].text:
            p_norm_heading = doc.paragraphs[j]
            break
    
    # We will clear/replace the content between p_erd_heading and p_norm_heading
    # First, let's collect and remove old paragraphs between them
    old_ps = []
    curr = p_erd_heading._p.getnext()
    while curr is not None and curr != p_norm_heading._p:
        old_ps.append(curr)
        curr = curr.getnext()
    
    for op in old_ps:
        op.getparent().remove(op)
    print(f"Removed {len(old_ps)} old ERD elements.")
    
    # Now insert comprehensive content before p_norm_heading:
    # 1. Intro text
    p_intro = p_norm_heading.insert_paragraph_before()
    set_p_text(p_intro, "Hệ thống cơ sở dữ liệu Quản lý nhà hàng được thiết kế theo 2 cấp độ mô hình trực quan hoàn chỉnh: (1) Sơ đồ thực thể – liên kết mức quan niệm theo ký pháp Chen (Conceptual ERD - Chen's Notation) nhằm làm rõ cấu trúc thực thể, thuộc tính và bản số quan hệ nghiệp vụ theo chuẩn học thuật; (2) Lược đồ quan hệ vật lý chi tiết theo ký pháp Crow's Foot (Physical Relational Schema) thể hiện chính xác các bảng dữ liệu thực thi trên SQL Server với kiểu dữ liệu T-SQL, ràng buộc toàn vẹn và các bảng liên kết chuẩn hóa.")
    
    # 2. Image Chen ERD
    p_img1 = p_norm_heading.insert_paragraph_before()
    p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img1.paragraph_format.space_before = Pt(8)
    p_img1.paragraph_format.space_after = Pt(2)
    r1 = p_img1.add_run()
    r1.add_picture('erd/erd_chen.png', width=Inches(6.3))
    
    # 3. Caption Chen ERD
    p_cap1 = p_norm_heading.insert_paragraph_before()
    format_caption(p_cap1, "Hình 3.1a. Sơ đồ thực thể – liên kết hệ thống quản lý nhà hàng (Ký pháp Chen)")
    
    # 4. Detailed explanation of Chen ERD
    p_desc_chen = p_norm_heading.insert_paragraph_before()
    set_p_text(p_desc_chen, "Sơ đồ ký pháp Chen (Hình 3.1a) phản ánh mô hình quan niệm trực quan, tuân thủ nghiêm ngặt các quy ước thiết kế cơ sở dữ liệu:")
    
    p_c1 = p_norm_heading.insert_paragraph_before()
    p_c1.style = 'List Paragraph'
    set_p_text(p_c1, " gồm 8 thực thể độc lập (KhachHang, NhanVien, BanAn, DanhMucMon, MonAn, NguyenLieu, DatBan, HoaDon) cùng 2 thực thể liên kết/yếu (ChiTietHoaDon, CongThuc) đại diện cho các bảng dữ liệu trung gian giải quyết quan hệ nhiều–nhiều.", size=13.0, space_after=4, line_spacing=1.25)
    r_bold1 = p_c1.runs[0]
    p_c1.text = ""
    add_run_to_p(p_c1, "• Thực thể (Entities - Khối chữ nhật):", bold=True)
    add_run_to_p(p_c1, " gồm 8 thực thể độc lập (KhachHang, NhanVien, BanAn, DanhMucMon, MonAn, NguyenLieu, DatBan, HoaDon) cùng 2 thực thể liên kết/yếu (ChiTietHoaDon, CongThuc) đại diện cho các bảng dữ liệu trung gian giải quyết quan hệ nhiều–nhiều.")
    
    p_c2 = p_norm_heading.insert_paragraph_before()
    p_c2.style = 'List Paragraph'
    set_p_text(p_c2, "", size=13.0, space_after=4, line_spacing=1.25)
    add_run_to_p(p_c2, "• Mối quan hệ (Relationships - Hình thoi):", bold=True)
    add_run_to_p(p_c2, " Thể hiện các hành vi tương tác nghiệp vụ như \"Đặt\" (Khách hàng đặt bàn), \"Xếp\" (Bàn gắn với đặt bàn), \"Lập\" (Nhân viên lập hóa đơn), \"Thuộc\" (Món ăn thuộc danh mục), \"Gồm\" (Hóa đơn gồm các món ăn qua ChiTietHoaDon), \"Chế biến\" (Món ăn định lượng từ kho qua CongThuc).")
    
    p_c3 = p_norm_heading.insert_paragraph_before()
    p_c3.style = 'List Paragraph'
    set_p_text(p_c3, "", size=13.0, space_after=4, line_spacing=1.25)
    add_run_to_p(p_c3, "• Thuộc tính (Attributes - Hình oval):", bold=True)
    add_run_to_p(p_c3, " Thể hiện các đặc tính dữ liệu; trong đó các thuộc tính khóa chính (PK) được gạch chân (MaKH, MaNV, MaBan, MaDM, MaMon, MaNL, MaDatBan, MaHD).")
    
    p_c4 = p_norm_heading.insert_paragraph_before()
    p_c4.style = 'List Paragraph'
    set_p_text(p_c4, "", size=13.0, space_after=6, line_spacing=1.25)
    add_run_to_p(p_c4, "• Bản số (Cardinality):", bold=True)
    add_run_to_p(p_c4, " Thể hiện tường minh các quan hệ 1:1, 1:N và M:N giữa các thực thể, làm nền tảng cho bước chuẩn hóa và chuyển đổi sang lược đồ quan hệ.")
    
    # 5. Image Crow's Foot Relational Schema
    p_img2 = p_norm_heading.insert_paragraph_before()
    p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img2.paragraph_format.space_before = Pt(8)
    p_img2.paragraph_format.space_after = Pt(2)
    r2 = p_img2.add_run()
    r2.add_picture('erd/erd.png', width=Inches(6.2))
    
    # 6. Caption Crow's Foot
    p_cap2 = p_norm_heading.insert_paragraph_before()
    format_caption(p_cap2, "Hình 3.1b. Lược đồ cơ sở dữ liệu quan hệ vật lý chi tiết (Crow's Foot Notation)")
    
    # 7. Detailed explanation of Physical Schema
    p_desc_rel = p_norm_heading.insert_paragraph_before()
    set_p_text(p_desc_rel, "Lược đồ quan hệ vật lý (Hình 3.1b) gồm 10 bảng nghiệp vụ chính và 1 bảng nhật ký kiểm toán hệ thống (NhatKyHoaDon):")
    
    p_r1 = p_norm_heading.insert_paragraph_before()
    p_r1.style = 'List Paragraph'
    set_p_text(p_r1, "", size=13.0, space_after=4, line_spacing=1.25)
    add_run_to_p(p_r1, "• Phân nhóm nghiệp vụ theo màu sắc:", bold=True)
    add_run_to_p(p_r1, " Đỏ – Con người & Khách hàng (KhachHang, NhanVien); Xanh lá – Bàn ăn & Đặt bàn (BanAn, DatBan); Vàng – Thực đơn (MonAn, DanhMucMon); Tím – Kho bãi (NguyenLieu); Xanh dương – Doanh thu & Hóa đơn (HoaDon, ChiTietHoaDon); Xám – Kiểm toán (NhatKyHoaDon).")
    
    p_r2 = p_norm_heading.insert_paragraph_before()
    p_r2.style = 'List Paragraph'
    set_p_text(p_r2, "", size=13.0, space_after=6, line_spacing=1.25)
    add_run_to_p(p_r2, "• Chuẩn hóa quan hệ nhiều–nhiều:", bold=True)
    add_run_to_p(p_r2, " Hai quan hệ nhiều–nhiều (MonAn–HoaDon và MonAn–NguyenLieu) được phân rã thành hai bảng liên kết ChiTietHoaDon và CongThuc với khóa chính phức hợp. Quan hệ KhachHang–HoaDon vẽ nét đứt vì MaKH trong HoaDon cho phép NULL (phục vụ khách lẻ vãng lai).")
    
    print("Updated Section 3.1 with both Chen & Crow's foot ERD diagrams successfully.")

# Save checkpoint
doc.save(DOCX_IN)
print("Saved checkpoint 1.")
