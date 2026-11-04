# -*- coding: utf-8 -*-
"""
Script update_toc_pages.py
Cập nhật số trang chính xác cho toàn bộ Mục lục trong BaoCao_QuanLyNhaHang.docx
dựa trên thống kê trang thực tế từ Microsoft Word engine:
"""

import os
import sys
import docx
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

sys.stdout.reconfigure(encoding='utf-8')

DOCX_PATH = os.path.abspath('report/BaoCao_QuanLyNhaHang.docx')
doc = docx.Document(DOCX_PATH)

toc_mapping = [
    ("1. GIỚI THIỆU ĐỀ TÀI", "1. GIỚI THIỆU ĐỀ TÀI\t4"),
    ("1.1. Lý do chọn đề tài", "1.1. Lý do chọn đề tài\t4"),
    ("1.2. Mục tiêu", "1.2. Mục tiêu\t4"),
    ("1.3. Phạm vi", "1.3. Phạm vi\t4"),
    ("1.4. Công cụ sử dụng", "1.4. Công cụ sử dụng\t4"),
    ("2. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ", "2. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ\t5"),
    ("2.1. Mô tả hoạt động của nhà hàng", "2.1. Mô tả hoạt động của nhà hàng\t5"),
    ("2.2. Các quy trình nghiệp vụ chính", "2.2. Các quy trình nghiệp vụ chính\t5"),
    ("2.3. Thực thể và quan hệ", "2.3. Thực thể và quan hệ\t5"),
    ("2.4. Quy tắc nghiệp vụ", "2.4. Quy tắc nghiệp vụ (business rules)\t6"),
    ("3. THIẾT KẾ CƠ SỞ DỮ LIỆU", "3. THIẾT KẾ CƠ SỞ DỮ LIỆU\t7"),
    ("3.1. Sơ đồ thực thể – quan hệ", "3.1. Sơ đồ thực thể – quan hệ (ERD Chen & Crow's foot)\t7"),
    ("3.2. Chuẩn hóa dữ liệu", "3.2. Chuẩn hóa dữ liệu\t9"),
    ("3.3. Từ điển dữ liệu", "3.3. Từ điển dữ liệu\t9"),
    ("4. RÀNG BUỘC TOÀN VẸN", "4. RÀNG BUỘC TOÀN VẸN\t14"),
    ("4.1. Ví dụ khai báo ràng buộc", "4.1. Ví dụ khai báo ràng buộc – bảng HoaDon\t14"),
    ("4.2. Ràng buộc mức bảng", "4.2. Ràng buộc mức bảng và ràng buộc liên cột\t15"),
    ("5. DỮ LIỆU MẪU", "5. DỮ LIỆU MẪU\t15"),
    ("5.1. Đoạn script sinh", "5.1. Đoạn script sinh 3.000 hóa đơn (2020 – 2025)\t16"),
    ("5.2. Kiểm toán chất lượng", "5.2. Kiểm toán chất lượng và tính nhất quán dữ liệu\t17"),
    ("6. TRUY VẤN NGHIỆP VỤ", "6. TRUY VẤN NGHIỆP VỤ\t17"),
    ("6.1. Một số truy vấn tiêu biểu", "6.1. Một số truy vấn tiêu biểu\t18"),
    ("7. VIEW, FUNCTION, STORED PROCEDURE", "7. VIEW, FUNCTION, STORED PROCEDURE VÀ TRIGGER\t20"),
    ("7.1. Khung nhìn (VIEW)", "7.1. Khung nhìn (VIEW)\t20"),
    ("7.2. Hàm người dùng (FUNCTION)", "7.2. Hàm người dùng (FUNCTION)\t20"),
    ("7.3. Thủ tục lưu trữ (STORED PROCEDURE)", "7.3. Thủ tục lưu trữ (STORED PROCEDURE)\t21"),
    ("7.4. Trigger", "7.4. Trigger\t24"),
    ("8. KIỂM THỬ, TRANSACTION VÀ TỐI ƯU", "8. KIỂM THỬ, TRANSACTION VÀ TỐI ƯU\t25"),
    ("8.1. Kịch bản kiểm thử", "8.1. Kịch bản kiểm thử (06_Test_Demo.sql)\t25"),
    ("8.2. Chỉ mục (INDEX)", "8.2. Chỉ mục (INDEX) và đánh giá hiệu năng trên dữ liệu lớn\t25"),
    ("9. GIAO DIỆN WEB KẾT NỐI", "9. GIAO DIỆN WEB KẾT NỐI CƠ SỞ DỮ LIỆU\t27"),
    ("9.1. Kiến trúc", "9.1. Kiến trúc ứng dụng Sen Vàng POS\t27"),
    ("9.2. Hình ảnh", "9.2. Hình ảnh các phân hệ giao diện POS nâng cao\t28"),
    ("9.3. Ví dụ mã nguồn", "9.3. Ví dụ mã nguồn gọi stored procedure từ Node.js\t31"),
    ("10. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY", "10. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY\t32"),
    ("10.1. Chạy script SQL", "10.1. Chạy script SQL\t32"),
    ("10.2. Chạy giao diện web", "10.2. Chạy giao diện web\t32"),
    ("11. KẾT LUẬN", "11. KẾT LUẬN\t32"),
    ("11.1. Kết quả đạt được", "11.1. Kết quả đạt được\t32"),
    ("11.2. Hạn chế và hướng phát triển", "11.2. Hạn chế và hướng phát triển\t33"),
    ("TÀI LIỆU THAM KHẢO", "TÀI LIỆU THAM KHẢO\t33"),
]

def format_toc_line(p, text):
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    is_main = any(text.startswith(x) for x in ['1. ', '2. ', '3. ', '4. ', '5. ', '6. ', '7. ', '8. ', '9. ', '10.', '11.', 'TÀI'])
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11.0)
    r.font.bold = is_main
    return p

# Search within paragraphs before P75 (Table of Contents range)
# First, let's find the TOC start: paragraph containing 'MỤC LỤC'
toc_start = -1
for i, p in enumerate(doc.paragraphs[:50]):
    if 'MỤC LỤC' in p.text:
        toc_start = i
        break

print(f"MỤC LỤC found at P_{toc_start}")

# Match and update existing TOC paragraphs
for i in range(toc_start + 1, min(toc_start + 50, len(doc.paragraphs))):
    p = doc.paragraphs[i]
    if p.text.strip().startswith('1. GIỚI THIỆU'):
        # Reached body! Stop TOC scan
        break
    
    # Try to match with toc_mapping
    for prefix, full_text in toc_mapping:
        if prefix in p.text:
            format_toc_line(p, full_text)
            break

# Ensure Section 5.2 exists in TOC
has_5_2 = any('5.2. Kiểm toán' in p.text for p in doc.paragraphs[toc_start:toc_start+45])
if not has_5_2:
    for i in range(toc_start + 1, toc_start + 45):
        if '5.1. Đoạn script' in doc.paragraphs[i].text:
            p_new = doc.paragraphs[i].insert_paragraph_before()
            format_toc_line(p_new, "5.2. Kiểm toán chất lượng và tính nhất quán dữ liệu\t17")
            # Move it after 5.1
            p_new._p.getparent().remove(p_new._p)
            doc.paragraphs[i]._p.addnext(p_new._p)
            print("Inserted 5.2 into TOC successfully.")
            break

doc.save(DOCX_PATH)
print("Updated Table of Contents with exact page numbers!")
