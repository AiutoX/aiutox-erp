/**
 * zxing.ts — lazy ZXing-WASM wrapper for the field app.
 *
 * The zxing-wasm/reader module is loaded on demand (dynamic import) so it does
 * NOT appear in the initial field-app bundle. It is only fetched when the user
 * first opens the QR/Barcode scanner modal.
 *
 * Supported formats: QRCode, Code128, EAN-13, EAN-8, DataMatrix.
 */

import type { ReaderOptions } from "zxing-wasm/reader";

type ZXingReaderModule = typeof import("zxing-wasm/reader");

let zxingModule: ZXingReaderModule | null = null;

/**
 * Lazily loads the ZXing-WASM reader module.
 * Subsequent calls return the cached module (no double-fetch).
 */
export async function loadZXing(): Promise<ZXingReaderModule> {
  if (!zxingModule) {
    zxingModule = await import("zxing-wasm/reader");
  }
  return zxingModule;
}

const READER_OPTIONS: ReaderOptions = {
  formats: ["QRCode", "Code128", "EAN-13", "EAN-8", "DataMatrix"],
  tryHarder: true,
};

/**
 * Decodes the first barcode/QR found in the given ImageData frame.
 * Returns the decoded text string, or null if nothing was detected.
 *
 * Caller is responsible for providing a valid ImageData (e.g. from a
 * canvas drawImage of a video frame).
 */
export async function decodeBarcode(
  imageData: ImageData
): Promise<string | null> {
  const zxing = await loadZXing();
  const results = await zxing.readBarcodesFromImageData(
    imageData,
    READER_OPTIONS
  );
  const valid = results.find((r) => r.isValid && r.text);
  return valid?.text ?? null;
}
