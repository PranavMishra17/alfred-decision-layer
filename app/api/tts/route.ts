import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * /api/tts
 * Proxy Cartesia API to keep keys secure.
 * Receives: { text, api_key }
 * Returns: binary audio stream (mp3 or pcm)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, api_key: body_api_key } = body;
    const api_key = body_api_key || process.env.CARTESIA_API_KEY;

    if (!api_key || !text) {
      return new Response(JSON.stringify({ error: "Missing api_key or text" }), { status: 400 });
    }

    // Cartesia REST TTS bytes endpoint
    // We use a general standard professional voice ID (e.g. 'a0e99841-438c-4a64-b679-ae501e7d6091')
    const cartesiaRes = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        "X-API-Key": api_key,
        "Cartesia-Version": "2024-06-10",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: "sonic-english",
        transcript: text,
        voice: {
          mode: "id",
          id: "a0e99841-438c-4a64-b679-ae501e7d6091", 
        },
        output_format: {
          container: "raw",
          encoding: "pcm_f32le",
          sample_rate: 44100
        }
      })
    });

    if (!cartesiaRes.ok) {
      const err = await cartesiaRes.text();
      return new Response(JSON.stringify({ error: `Cartesia error: ${err}` }), { status: cartesiaRes.status });
    }

    // Proxy the stream back
    return new Response(cartesiaRes.body, {
      headers: {
        "Content-Type": cartesiaRes.headers.get("Content-Type") || "application/octet-stream",
        "Cache-Control": "no-store",
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
