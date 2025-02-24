import QRCode from "qrcode";

const generateQRCode = async (text) => {
  try {
    const qrCode = await QRCode.toDataURL(text);
    return qrCode;
  } catch (error) {
    throw new Error("Failed to generate QR Code");
  }
};

export default generateQRCode;
