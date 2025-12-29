import { NextResponse } from "next/server";

// YOUR KEY (Kept safe)
const GOOGLE_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jobDescription = body.jobDescription || "No description provided";
    // READ THE USER'S CV FROM THE REQUEST
    const userProfile = body.userProfile || "Anonymous Candidate";

    console.log("V5: INITIATING UPLINK WITH REAL USER IDENTITY...");

    // 1. DISCOVER MODELS (Using your proven V3 logic)
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_KEY}`
    );
    const listData = await listResponse.json();
    const models = listData.models || [];
    const validModel = models.find((m: any) => 
      m.name.includes("gemini") && m.supportedGenerationMethods?.includes("generateContent")
    );

    if (!validModel) throw new Error("No AI models found.");

    // 2. THE "REALITY CHECK" PROMPT
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `
                You are a ruthless Career Sniper. 
                Compare this CANDIDATE against this JOB.
                
                CANDIDATE PROFILE:
                "${userProfile.slice(0, 4000)}"
                
                TARGET JOB:
                "${jobDescription.slice(0, 3000)}"
                
                MISSION:
                1. matchScore: Calculate a realistic % chance of getting an interview. Be strict.
                2. warningLog: List SKILLS THE CANDIDATE IS MISSING. If they match perfectly, say "None."
                3. attackPlan: Give 1 sentence of specific advice on how to tailor their application to bridge the gap.
                
                STRICT JSON OUTPUT ONLY:
                {
                  "matchScore": number,
                  "keyKeywords": ["Top 3 matching skills"],
                  "warningLog": "Short warning string",
                  "attackPlan": "Short tactical string"
                }
              `
            }]
          }]
        }),
      }
    );

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error("AI returned empty response.");
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    const cleanJson = textResponse.replace(/```json|```/g, "").trim();
    
    return NextResponse.json(JSON.parse(cleanJson));

  } catch (error: any) {
    console.error("V5 CRASH:", error);
    return NextResponse.json({ 
        matchScore: 0,
        keyKeywords: ["SYSTEM ERROR"],
        warningLog: "ANALYSIS FAILED",
        attackPlan: error.message 
    });
  }
}