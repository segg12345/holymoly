import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')

doc = docx.Document('report/BaoCao_QuanLyNhaHang.docx')
with open('report/report_dump.txt', 'w', encoding='utf-8') as f:
    for i, p in enumerate(doc.paragraphs):
        style_name = p.style.name if p.style else 'None'
        f.write(f'--- P{i} [{style_name}] ---\n{p.text}\n')
    
    for t_idx, tbl in enumerate(doc.tables):
        f.write(f'\n=== TABLE {t_idx} (rows={len(tbl.rows)}, cols={len(tbl.columns)}) ===\n')
        for r_idx, row in enumerate(tbl.rows):
            cells = [c.text.replace('\n', ' ') for c in row.cells]
            f.write(f'R{r_idx}: ' + ' | '.join(cells) + '\n')

print('Dumped successfully!')
