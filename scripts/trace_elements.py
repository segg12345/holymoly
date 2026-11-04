import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')
doc = docx.Document('report/BaoCao_QuanLyNhaHang.docx')

p_idx = 0
tbl_idx = 0

with open('report/element_trace.txt', 'w', encoding='utf-8') as f:
    for i, e in enumerate(doc._body._body):
        tag = e.tag.split('}')[-1]
        if tag == 'p':
            p = doc.paragraphs[p_idx]
            txt = p.text.strip().replace('\n', ' ')[:70]
            s = p.style.name if p.style else 'None'
            has_draw = 'drawing' in p._p.xml or 'pict' in p._p.xml
            f.write(f"[{i:03d}] P_{p_idx:03d} [{s}] (draw={has_draw}): {txt}\n")
            p_idx += 1
        elif tag == 'tbl':
            t = doc.tables[tbl_idx]
            header = ' | '.join([c.text.strip().replace('\n', ' ') for c in t.rows[0].cells])[:60]
            f.write(f"[{i:03d}] TBL_{tbl_idx:02d} ({len(t.rows)}x{len(t.columns)}): {header}\n")
            tbl_idx += 1
        else:
            f.write(f"[{i:03d}] {tag}\n")

print("Traced elements successfully!")
