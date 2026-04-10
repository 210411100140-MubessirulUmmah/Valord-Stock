import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeStock(stockData: any[]) {
  // Simplify data to reduce token usage and avoid potential circular refs or large payloads
  const simplifiedData = stockData.map(p => ({
    sku: p.skuId,
    name: p.name,
    stock: p.stock,
    reorder: p.reorderLevel,
    status: p.status
  }));

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Timeout")), 60000)
  );

  try {
    const prompt = `
      Analyze the following stock data and provide insights:
      1. Identify items that need immediate reordering.
      2. Suggest stock optimization strategies.
      3. Predict potential stockouts based on the current levels.
      
      Data: ${JSON.stringify(simplifiedData)}
      
      Provide the response in a concise, professional format.
    `;

    const apiCall = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const response = await Promise.race([apiCall, timeoutPromise]) as any;
    return response.text || "No analysis generated.";
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    if (error.message === "Timeout") {
      return "AI analysis timed out. The data might be too large or the service is busy. Please try again later.";
    }
    return `Unable to perform AI analysis: ${error.message || 'Unknown error'}`;
  }
}
