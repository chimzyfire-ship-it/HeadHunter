import { NextResponse } from "next/server";

// YOUR KEY
const GOOGLE_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobDescription, userProfile, employerName } = body;

    // GET TODAY'S REAL DATE
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    console.log("WRITING PROTOCOL INITIATED...");

    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_KEY}`
    );
    const listData = await listResponse.json();
    const models = listData.models || [];
    const validModel = models.find((m: any) => 
      m.name.includes("gemini") && m.supportedGenerationMethods?.includes("generateContent")
    );

    if (!validModel) throw new Error("No AI Writer Available.");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `
                You are a professional Ghostwriter.
                
                TASK: Write a Cover Letter.
                DATE: ${today}
                EMPLOYER: ${employerName}
                
                CANDIDATE: "${userProfile.slice(0, 3000)}"
                JOB: "${jobDescription.slice(0, 2000)}"
                
                RULES:
                1. Start with the date: "${today}".
                2. Address the hiring manager professionally.
                3. Use the candidate's real name from the profile at the bottom.
                4. Tone: Confident, specific, and human.
                5. NO placeholders like "[Date]" or "[Company Name]". Fill them in using the data provided.
                
                OUTPUT: Return ONLY the letter text.
              `
            }]
          }]
        }),
      }
    );

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) throw new Error("AI Writer returned empty page.");

    return NextResponse.json({ letter: textResponse });

  } catch (error: any) {
    console.error("WRITER FAILED:", error);
    return NextResponse.json({ letter: "Error generating letter." }, { status: 500 });
  }
}