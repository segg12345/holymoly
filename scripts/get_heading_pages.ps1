$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open("D:\Quan-ly-nha-hang-master\report\BaoCao_QuanLyNhaHang.docx")
    foreach ($p in $doc.Paragraphs) {
        $text = $p.Range.Text.Trim()
        $style = $p.Range.Style.NameLocal
        if ($style -match "Heading 1|Heading 2" -and $p.Range.Start -gt 1500) {
            $pageNum = $p.Range.Information(3) # 3 = wdActiveEndPageNumber
            Write-Host "$pageNum : [$style] $text"
        }
    }
    $doc.Close()
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
