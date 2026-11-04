# -*- coding: utf-8 -*-
"""
Script fix_toc_exact.py
Gán chính xác từng dòng mục lục từ P35 đến P76 trong BaoCao_QuanLyNhaHang.docx
theo đúng số trang thực tế đo được từ Microsoft Word.
"""

import os
import sys
import docx
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

sys.stdout.reconfigure(encoding='utf-8')

DOCX_PATH = os.path.abspath('report/BaoCao_QuanLyNhaHang.docx')
doc = docx.Document(DOCX_PATH)

exact_toc = [
    (35, "1. GIỚI THIỆU ĐỀ TÀI\t4", True),
    (36, "1.1. Lý do chọn đề tài\t4", False),
    (37, "1.2. Mục tiêu\t4", False),
    (38, "1.3. Phạm vi\t4", False),
    (39, "1.4. Công cụ sử dụng\t5", False),
    (40, "2. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ\t5", True),
    (41, "2.1. Mô tả hoạt động của nhà hàng\t5", False),
    (42, "2.2. Các quy trình nghiệp vụ chính\t5", False),
    (43, "2.3. Thực thể và quan hệ\t6", False),
    (44, "2.4. Quy tắc nghiệp vụ (business rules)\t6", False),
    (45, "3. THIẾT KẾ CƠ SỞ DỮ LIỆU\t7", True),
    (46, "3.1. Sơ đồ thực thể – quan hệ (ERD)\t7", False),
    (47, "3.2. Chuẩn hóa dữ liệu\t9", False),
    (48, "3.3. Từ điển dữ liệu\t9", False),
    (49, "4. RÀNG BUỘC TOÀN VẸN\t14", True),
    (50, "4.1. Ví dụ khai báo ràng buộc – bảng HoaDon\t14", False),
    (51, "4.2. Ràng buộc mức bảng và ràng buộc liên cột\t15", False),
    (52, "5. DỮ LIỆU MẪU\t15", True),
    (53, "5.1. Đoạn script sinh dữ liệu 3.006 hóa đơn giai đoạn 2020 – 2026\t16", False),
    (54, "5.2. Kiểm toán chất lượng và tính nhất quán dữ liệu\t17", False),
    (55, "6. TRUY VẤN NGHIỆP VỤ\t17", True),
    (56, "6.1. Một số truy vấn tiêu biểu\t18", False),
    (57, "6.2. Kết quả thực thi minh họa trên SQL Server Management Studio\t20", False),
    (58, "7. VIEW, FUNCTION, STORED PROCEDURE VÀ TRIGGER\t22", True),
    (59, "7.1. Khung nhìn (VIEW)\t22", False),
    (60, "7.2. Hàm người dùng (FUNCTION)\t23", False),
    (61, "7.3. Thủ tục lưu trữ (STORED PROCEDURE)\t24", False),
    (62, "7.4. 3 Trigger kiểm soát toàn vẹn & đồng bộ trạng thái\t27", False),
    (63, "8. KIỂM THỬ, TRANSACTION VÀ TỐI ƯU\t29", True),
    (64, "8.1. Kịch bản kiểm thử (06_Test_Demo.sql)\t29", False),
    (65, "8.2. Chỉ mục (INDEX) và đánh giá hiệu năng trên dữ liệu lớn\t29", False),
    (66, "9. GIAO DIỆN WEB KẾT NỐI CƠ SỞ DỮ LIỆU\t31", True),
    (67, "9.1. Kiến trúc ứng dụng Sen Vàng POS\t31", False),
    (68, "9.2. Hình ảnh các phân hệ giao diện POS nâng cao\t32", False),
    (69, "9.3. Ví dụ mã nguồn gọi stored procedure từ Node.js\t35", False),
    (70, "10. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY\t37", True),
    (71, "10.1. Chạy script SQL\t37", False),
    (72, "10.2. Chạy giao diện web\t37", False),
    (73, "11. KẾT LUẬN\t37", True),
    (74, "11.1. Kết quả đạt được\t37", False),
    (75, "11.2. Hạn chế và hướng phát triển\t38", False),
    (76, "TÀI LIỆU THAM KHẢO\t38", True),
]

for idx, text, is_main in exact_toc:
    p = doc.paragraphs[idx]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11.0)
    r.font.bold = is_main

doc.save(DOCX_PATH)
print("SUCCESS: Exact TOC written to BaoCao_QuanLyNhaHang.docx!")
