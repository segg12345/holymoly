param (
    [string]$docxPath = "D:\Quan-ly-nha-hang-master\report\BaoCao_QuanLyNhaHang.docx",
    [string]$pdfPath = "D:\Quan-ly-nha-hang-master\report\BaoCao_QuanLyNhaHang.pdf"
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    Write-Host "Opening document: $docxPath"
    $doc = $word.Documents.Open($docxPath)
    $pages = $doc.ComputeStatistics(2)
    Write-Host "Current page count: $pages"
    
    Write-Host "Exporting to PDF: $pdfPath"
    # wdExportFormatPDF = 17
    $doc.ExportAsFixedFormat($pdfPath, 17)
    Write-Host "Export PDF successful!"
    $doc.Close()
} catch {
    Write-Host "Error: $_"
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
