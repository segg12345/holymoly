# -*- coding: utf-8 -*-
"""
Script update_toc_pages.py
Cập nhật số trang chính xác cho toàn bộ Mục lục trong BaoCao_QuanLyNhaHang.docx
dựa trên thống kê trang thực tế từ Microsoft Word engine:
"""

import os
import sys
import docx
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

sys.stdout.reconfigure(encoding='utf-8')

DOCX_PATH = os.path.abspath('report/BaoCao_QuanLyNhaHang.docx')
doc = docx.Document(DOCX_PATH)

toc_mapping = [
    ("1. GIỚI THIỆU ĐỀ TÀI", "1. GIỚI THIỆU ĐỀ TÀI\t4"),
    ("1.1. Lý do chọn đề tài", "1.1. Lý do chọn đề tài\t4"),
    ("1.2. Mục tiêu", "1.2. Mục tiêu\t4"),
    ("1.3. Phạm vi", "1.3. Phạm vi\t4"),
    ("1.4. Công cụ sử dụng", "1.4. Công cụ sử dụng\t5"),
    ("2. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ", "2. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ\t5"),
    ("2.1. Mô tả hoạt động của nhà hàng", "2.1. Mô tả hoạt động của nhà hàng\t5"),
    ("2.2. Các quy trình nghiệp vụ chính", "2.2. Các quy trình nghiệp vụ chính\t5"),
    ("2.3. Thực thể và quan hệ", "2.3. Thực thể và quan hệ\t6"),
    ("2.4. Quy tắc nghiệp vụ", "2.4. Quy tắc nghiệp vụ (business rules)\t6"),
    ("3. THIẾT KẾ CƠ SỞ DỮ LIỆU", "3. THIẾT KẾ CƠ SỞ DỮ LIỆU\t7"),
    ("3.1. Sơ đồ thực thể – quan hệ", "3.1. Sơ đồ thực thể – quan hệ (ERD Chen & Crow's foot)\t7"),
    ("3.2. Chuẩn hóa dữ liệu", "3.2. Chuẩn hóa dữ liệu\t9"),
    ("3.3. Từ điển dữ liệu", "3.3. Từ điển dữ liệu\t9"),
    ("4. RÀNG BUỘC TOÀN VẸN", "4. RÀNG BUỘC TOÀN VẸN\t14"),
    ("4.1. Ví dụ khai báo ràng buộc", "4.1. Ví dụ khai báo ràng buộc – bảng HoaDon\t14"),
    ("4.2. Ràng buộc mức bảng", "4.2. Ràng buộc mức bảng và ràng buộc liên cột\t15"),
    ("5. DỮ LIỆU MẪU", "5. DỮ LIỆU MẪU\t15"),
    ("5.1. Đoạn script sinh", "5.1. Đoạn script sinh dữ liệu 3.006 hóa đơn giai đoạn 2020 – 2026\t16"),
    ("5.2. Kiểm toán chất lượng", "5.2. Kiểm toán chất lượng và tính nhất quán dữ liệu (Data Quality & Consistency Audit)\t17"),
    ("6. TRUY VẤN NGHIỆP VỤ", "6. TRUY VẤN NGHIỆP VỤ\t17"),
    ("6.1. Một số truy vấn tiêu biểu", "6.1. Một số truy vấn tiêu biểu\t18"),
    ("6.2. Kết quả thực thi minh họa", "6.2. Kết quả thực thi minh họa trên SQL Server Management Studio\t20"),
    ("7. VIEW, FUNCTION, STORED PROCEDURE", "7. VIEW, FUNCTION, STORED PROCEDURE VÀ TRIGGER\t22"),
    ("7.1. Khung nhìn (VIEW)", "7.1. Khung nhìn (VIEW)\t22"),
    ("7.2. Hàm người dùng (FUNCTION)", "7.2. Hàm người dùng (FUNCTION)\t23"),
    ("7.3. Thủ tục lưu trữ (STORED PROCEDURE)", "7.3. Thủ tục lưu trữ (STORED PROCEDURE)\t24"),
    ("7.4. 3 Trigger", "7.4. 3 Trigger kiểm soát toàn vẹn & đồng bộ trạng thái\t27"),
    ("7.4. Trigger", "7.4. 3 Trigger kiểm soát toàn vẹn & đồng bộ trạng thái\t27"),
    ("8. KIỂM THỬ, TRANSACTION VÀ TỐI ƯU", "8. KIỂM THỬ, TRANSACTION VÀ TỐI ƯU\t29"),
    ("8.1. Kịch bản kiểm thử", "8.1. Kịch bản kiểm thử (06_Test_Demo.sql)\t29"),
    ("8.2. Chỉ mục (INDEX)", "8.2. Chỉ mục (INDEX) và đánh giá hiệu năng trên dữ liệu lớn\t29"),
    ("9. GIAO DIỆN WEB KẾT NỐI", "9. GIAO DIỆN WEB KẾT NỐI CƠ SỞ DỮ LIỆU\t31"),
    ("9.1. Kiến trúc", "9.1. Kiến trúc ứng dụng Sen Vàng POS\t31"),
    ("9.2. Hình ảnh", "9.2. Hình ảnh các phân hệ giao diện POS nâng cao\t32"),
    ("9.3. Ví dụ mã nguồn", "9.3. Ví dụ mã nguồn gọi stored procedure từ Node.js\t35"),
    ("10. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY", "10. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY\t37"),
    ("10.1. Chạy script SQL", "10.1. Chạy script SQL\t37"),
    ("10.2. Chạy giao diện web", "10.2. Chạy giao diện web\t37"),
    ("11. KẾT LUẬN", "11. KẾT LUẬN\t37"),
    ("11.1. Kết quả đạt được", "11.1. Kết quả đạt được\t37"),
    ("11.2. Hạn chế và hướng phát triển", "11.2. Hạn chế và hướng phát triển\t38"),
    ("TÀI LIỆU THAM KHẢO", "TÀI LIỆU THAM KHẢO\t38"),
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
        break
    
    # Try to match with toc_mapping
    for prefix, full_text in toc_mapping:
        if prefix in p.text:
            format_toc_line(p, full_text)
            break

doc.save(DOCX_PATH)
print("Updated Table of Contents with exact page numbers!")
