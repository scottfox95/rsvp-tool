import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OCR not configured — add GEMINI_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/png";

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Extract all readable text from this image. Return ONLY the extracted text, preserving paragraph breaks. Do not add any commentary, labels, or formatting — just the raw text exactly as it appears.",
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", errorData);
      return NextResponse.json(
        { error: "OCR processing failed" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const extractedText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!extractedText) {
      return NextResponse.json(
        { error: "No text found in image" },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: extractedText });
  } catch (error) {
    console.error("OCR route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
