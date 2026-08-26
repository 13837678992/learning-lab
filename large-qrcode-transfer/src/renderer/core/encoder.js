import QRCode from 'qrcode'

export async function generateQrCode(text, size = 500) {
  const dataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: size,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
  return dataUrl
}
