const JSZip = require('jszip')

// 有效的PDF页树和交叉引用表，便于验证真实numPages而非伪造元数据。
function createPdf(pageCount = 3) {
  const kids = Array.from({ length: pageCount }, (_, index) => `${index + 3} 0 R`).join(' ')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`,
    ...Array.from({ length: pageCount }, () => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> >>')
  ]
  let data = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(data))
    data += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const start = Buffer.byteLength(data)
  data += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  data += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  data += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
  return Buffer.from(data)
}

async function createPptx(slideCount = 4) {
  const zip = new JSZip()
  for (let index = 1; index <= slideCount; index += 1) {
    zip.file(`ppt/slides/slide${index}.xml`, '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree /></p:cSld></p:sld>')
  }
  // 关系文件、备注和母版不计入幻灯片数。
  zip.file('ppt/slides/_rels/slide1.xml.rels', '<Relationships />')
  zip.file('ppt/slideMasters/slideMaster1.xml', '<p:sldMaster />')
  zip.file('ppt/notesSlides/notesSlide1.xml', '<p:notes />')
  return zip.generateAsync({ type: 'nodebuffer' })
}

module.exports = { createPdf, createPptx }
