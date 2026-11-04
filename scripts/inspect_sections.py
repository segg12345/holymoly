import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')
doc = docx.Document('report/BaoCao_QuanLyNhaHang.docx')

def show_section(title, start_idx, end_idx):
    print(f"\n==================== {title} (P{start_idx} - P{end_idx}) ====================")
    for i in range(start_idx, end_idx + 1):
        if i < len(doc.paragraphs):
            p = doc.paragraphs[i]
            s = p.style.name if p.style else 'None'
            print(f"P{i} [{s}]: {p.text}")

show_section("Mục tiêu", 79, 86)
show_section("Sơ đồ ERD", 102, 107)
show_section("Dữ liệu mẫu", 151, 155)
show_section("Kiểm thử & Index", 172, 178)
show_section("Giao diện Web", 178, 190)
show_section("Kết luận", 203, 211)
