import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')
doc = docx.Document('report/BaoCao_QuanLyNhaHang.docx')

for t_idx in [15, 16, 34, 35, 37]:
    t = doc.tables[t_idx]
    print(f"\n==================== TABLE {t_idx} (rows={len(t.rows)}, cols={len(t.columns)}) ====================")
    for r_idx, row in enumerate(t.rows):
        cells = [c.text.strip().replace('\n', ' ') for c in row.cells]
        print(f"R{r_idx}: " + " | ".join(cells))
