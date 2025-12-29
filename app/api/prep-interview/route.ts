import { NextResponse } from "next/server";

// YOUR KEY
const GOOGLE_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobTitle, employer, jobDescription, userProfile } = body;

    console.log(`INITIATING WAR ROOM SIMULATION FOR: ${employer}`);

    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_KEY}`
    );
    const listData = await listResponse.json();
    const models = listData.models || [];
    const validModel = models.find((m: any) => 
      m.name.includes("gemini") && m.supportedGenerationMethods?.includes("generateContent")
    );

    if (!validModel) throw new Error("No AI Coach Available.");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `
                ACT AS: A ruthless, high-level Interview Coach.
                
                CONTEXT:
                Candidate is applying for: ${jobTitle} at ${employer}.
                
                JOB INTEL:
                "${jobDescription.slice(0, 1500)}"
                
                CANDIDATE DOSSIER:
                "${userProfile.slice(0, 2000)}"
                
                MISSION:
                Generate a tactical interview briefing.
                
                OUTPUT FORMAT (Strict JSON string, no markdown code blocks):
                {
                  "questions": [
                    {
                      "q": "The likely hard question they will ask",
                      "why": "Why they are asking this",
                      "answer": "The perfect winning answer using the candidate's real experience"
                    }
                  ],
                  "red_flags": ["Weakness 1 to defend", "Weakness 2 to defend"],
                  "questions_to_ask_them": ["Smart question 1", "Smart question 2"]
                }
                
                Generate 3 high-probability questions.
              `
            }]
          }]
        }),
      }
    );

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Clean up markdown formatting if the AI adds it
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    return NextResponse.json(JSON.parse(rawText));

  } catch (error: any) {
    console.error("COACH FAILED:", error);
    return NextResponse.json({ error: "Simulation Failed" }, { status: 500 });
  }
}