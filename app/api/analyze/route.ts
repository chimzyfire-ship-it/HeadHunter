import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
// --- 1. PRISMA DATABASE SETUP (Global Singleton) ---
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// YOUR KEY (Kept safe)
const GOOGLE_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    // --- 2. AUTHENTICATION GATE ---
    const { userId } = auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return new NextResponse("Unauthorized: Access Denied", { status: 401 });
    }

    // --- 3. PARSE REQUEST ---
    const body = await req.json();
    const { jobDescription, userProfile, type } = body; 
    const email = user.emailAddresses[0].emailAddress;

    // --- 4. DATABASE: GET OR CREATE USER ---
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log(`[DB] Creating new Agent: ${email}`);
      dbUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: email,
          credits: 3, // <--- FREE TRIAL STARTING AMOUNT
          tier: 'free'
        }
      });
    }

    // --- 5. CREDIT CHECK (THE WALL) ---
    if (dbUser.credits <= 0) {
      console.log(`[PAYWALL] User ${email} hit credit limit.`);
      return NextResponse.json(
        { error: "Insufficient credits", code: "PAYWALL" },
        { status: 402 } // 402 = Payment Required
      );
    }

    // --- 6. HANDLE "JUST CHECKING" REQUESTS ---
    // The frontend calls this before searching to see if it should show the paywall immediately
    if (type === 'CREDIT_CHECK') {
      return NextResponse.json({ success: true, credits: dbUser.credits });
    }

    // --- 7. AI EXECUTION (COSTS 1 CREDIT) ---
    console.log(`[V5] INITIATING UPLINK FOR ${email} (Credits: ${dbUser.credits})...`);

    // A. DISCOVER MODELS
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_KEY}`
    );
    const listData = await listResponse.json();
    const models = listData.models || [];
    const validModel = models.find((m: any) => 
      m.name.includes("gemini") && m.supportedGenerationMethods?.includes("generateContent")
    );

    if (!validModel) throw new Error("No AI models found.");

    // B. RUN THE PROMPT
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
                "${(userProfile || "Anonymous").slice(0, 4000)}"
                
                TARGET JOB:
                "${(jobDescription || "").slice(0, 3000)}"
                
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
    const parsedResult = JSON.parse(cleanJson);

    // --- 8. DEDUCT CREDIT (TRANSACTION COMPLETE) ---
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: dbUser.credits - 1 }
    });

    console.log(`[SUCCESS] Analysis complete. Credits remaining: ${dbUser.credits - 1}`);
    
    return NextResponse.json(parsedResult);

  } catch (error: any) {
    console.error("V5 CRASH:", error);
    // Don't deduct credits on error
    return NextResponse.json({ 
        matchScore: 0,
        keyKeywords: ["SYSTEM ERROR"],
        warningLog: "ANALYSIS FAILED",
        attackPlan: error.message 
    });
  }
}