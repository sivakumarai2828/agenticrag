import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { extractText } from "npm:unpdf@0.11.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (file.type !== "application/pdf") {
      return new Response(
        JSON.stringify({ error: "File must be a PDF" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing PDF: ${file.name} (${file.size} bytes)`);

    const arrayBuffer = await file.arrayBuffer();

    let extractedText = "";

    try {
      const { text } = await extractText(new Uint8Array(arrayBuffer));
      extractedText = text.trim();

      console.log(`Extracted ${extractedText.length} characters from ${file.name}`);

      if (!extractedText || extractedText.length < 50) {
        extractedText = `PDF content from: ${file.name}\n\nNote: This PDF may contain images or complex formatting that cannot be fully extracted.`;
      }

    } catch (parseError) {
      console.error("PDF parsing error:", parseError);
      extractedText = `PDF file: ${file.name}\n\nUnable to extract text content. The PDF may be encrypted, image-based, or use complex encoding.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        fileName: file.name,
        fileSize: file.size,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process PDF",
        details: "An error occurred while extracting text from the PDF",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
