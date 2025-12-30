import { NextResponse } from "next/server";
// @ts-ignore
import * as pdfLib from "pdf-parse";
// --- HELPER: THE DEEP SEARCH ---
// This function digs through the imported object to find the actual function
function findPdfFunction(library: any): any {
  // 1. Is the library itself the function?
  if (typeof library === 'function') return library;
  
  // 2. Is it inside .default?
  if (library.default && typeof library.default === 'function') return library.default;

  // 3. Is it inside .default.default? (Common in Next.js 15)
  if (library.default?.default && typeof library.default.default === 'function') return library.default.default;

  // 4. If we still can't find it, print what we see to the console (for debugging)
  console.error("PDF-PARSE STRUCTURE:", Object.keys(library));
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileData, mimeType } = body;

    console.log(`RESUME UPLINK: Receiving ${mimeType}...`);

    // 1. UNWRAP THE LIBRARY
    const pdfParse = findPdfFunction(pdfLib);

    if (!pdfParse) {
      throw new Error("Server Error: Could not locate pdf-parse function. Check console logs.");
    }

    let extractedText = "";

    if (mimeType === "application/pdf") {
      const buffer = Buffer.from(fileData, 'base64');
      
      // 2. EXECUTE
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else {
      throw new Error("Please upload a PDF file.");
    }

    // Clean text
    const cleanText = extractedText.replace(/\n/g, " ").trim();
    
    if (cleanText.length < 50) {
      throw new Error("PDF text layer appears empty. Please paste text manually.");
    }

    console.log("SUCCESS: Extracted " + cleanText.length + " chars");
    return NextResponse.json({ text: extractedText });

  } catch (error: any) {
    console.error("PARSING FAILED:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}