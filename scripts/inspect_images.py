import docx
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
doc = docx.Document('report/BaoCao_QuanLyNhaHang.docx')
for p_idx in [104, 182, 184, 186]:
    p = doc.paragraphs[p_idx]
    xml = p._p.xml
    blips = re.findall(r'r:embed="([^"]+)"', xml)
    for b in blips:
        part = doc.part.related_parts[b]
        print(f'P{p_idx}: embed={b}, target={part.partname}, size={len(part.blob)}')
