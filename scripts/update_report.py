# -*- coding: utf-8 -*-
"""
Script cập nhật toàn diện file báo cáo BaoCao_QuanLyNhaHang.docx:
- Đồng bộ thông tin trang bìa & mục lục
- Cập nhật Mục tiêu (Section 1.2)
- Cập nhật Sơ đồ ERD (Section 3.1): Cả 2 dạng Chen Notation & Crow's Foot Relational Schema
- Cập nhật Dữ liệu mẫu (Section 5): 3.000+ hóa đơn (2020-2025), 10.000+ chi tiết, benchmark 50.000 khách, Table 15, Table 16
- Thêm Mục 5.2: Kiểm toán chất lượng & Tính nhất quán dữ liệu (Data Quality & Financial Consistency Audit)
- Cập nhật Chỉ mục & Đánh giá hiệu năng thực tế trên dữ liệu lớn (Section 8.2 & Table 34)
- Cập nhật Giao diện Web "Sen Vàng POS" (Section 9): Kiến trúc 3 lớp, 5 hình ảnh giao diện mới sắc nét, cải tiến anti-jiggle & subtle tilt, Table 35
- Cập nhật Kết luận & Bảng đối chiếu yêu cầu đề bài (Section 11 & Table 37)
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding='utf-8')

DOCX_PATH = os.path.abspath('report/BaoCao_QuanLyNhaHang.docx')
doc = docx.Document(DOCX_PATH)
print("Loaded document successfully. Total paragraphs:", len(doc.paragraphs), "Total tables:", len(doc.tables))

# Helper: format a body paragraph
def set_p_body(p, text, bold_prefix=None):
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing = 1.33
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(6)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Times New Roman'
        r_pre.font.size = Pt(13)
        r_pre.font.bold = True
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(13)
    return p

# Helper: format a list item paragraph
def set_p_list(p, text, bold_prefix=None):
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing = 1.25
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Times New Roman'
        r_pre.font.size = Pt(13)
        r_pre.font.bold = True
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(13)
    return p

# Helper: format caption paragraph
def set_p_caption(p, text):
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(12)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.italic = True
    r.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
    return p

# Helper: format heading 2
def set_p_heading2(p, text):
    p.text = ""
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.2
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = RGBColor(0x1E, 0x4D, 0x3B) # Lotus Forest Green
    return p

# Helper: format heading 3
def set_p_heading3(p, text):
    p.text = ""
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.italic = True
    r.font.color.rgb = RGBColor(0x2B, 0x54, 0x44)
    return p

# Helper: insert image paragraph
def insert_image_p(target_p, img_path, width_inches=6.2):
    p_img = target_p.insert_paragraph_before()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(8)
    p_img.paragraph_format.space_after = Pt(2)
    run = p_img.add_run()
    run.add_picture(img_path, width=Inches(width_inches))
    return p_img

print("Helper functions defined.")
