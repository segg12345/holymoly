import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')
doc = docx.Document('report/BaoCao_QuanLyNhaHang.docx')

def inspect_p(p, label):
    print(f"\n--- Paragraph: {label} ---")
    print(f"Style: {p.style.name if p.style else 'None'}")
    print(f"Alignment: {p.alignment}")
    if p.runs:
        r = p.runs[0]
        font = r.font
        print(f"Run 0: text='{r.text[:30]}', font={font.name}, size={font.size.pt if font.size else None}, bold={font.bold}, italic={font.italic}, color={font.color.rgb if font.color else None}")
    print(f"Space before: {p.paragraph_format.space_before}, Space after: {p.paragraph_format.space_after}, Line spacing: {p.paragraph_format.line_spacing}")

inspect_p(doc.paragraphs[80], "List paragraph (P80)")
inspect_p(doc.paragraphs[86], "Body text (P86)")
inspect_p(doc.paragraphs[103], "Heading 2 (P103)")
inspect_p(doc.paragraphs[105], "Figure Caption (P105)")

print("\n--- Inspect Table 15 ---")
t = doc.tables[15]
print(f"Table style: {t.style.name if t.style else 'None'}")
cell_00 = t.cell(0, 0)
print(f"Cell 0,0 text: '{cell_00.text}', runs count: {len(cell_00.paragraphs[0].runs)}")
if cell_00.paragraphs[0].runs:
    r = cell_00.paragraphs[0].runs[0]
    print(f"Cell 0,0 font: {r.font.name}, size={r.font.size.pt if r.font.size else None}, bold={r.font.bold}")

print("\n--- Inspect Code Table 16 ---")
t16 = doc.tables[16]
print(f"Table 16 style: {t16.style.name if t16.style else 'None'}")
c = t16.cell(0, 0)
if c.paragraphs[0].runs:
    r = c.paragraphs[0].runs[0]
    print(f"Code run font: {r.font.name}, size={r.font.size.pt if r.font.size else None}")
