import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://ai.6551.io";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return {
      text,
      json: JSON.parse(text),
    };
  } catch {
    return {
      text,
      json: null,
    };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "categories") {
      const upstream = await fetch(`${API_BASE}/open/free_categories`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 Next.js Proxy",
        },
      });

      const { text, json } = await safeJson(upstream);

      // 兼容几种常见返回格式
      let categories: unknown = json;
      if (!Array.isArray(categories) && json && typeof json === "object") {
        categories =
          (json as any).data ||
          (json as any).categories ||
          (json as any).result ||
          [];
      }

      return NextResponse.json(
        {
          success: upstream.ok,
          categories: Array.isArray(categories) ? categories : [],
          raw: json ?? text,
          status: upstream.status,
        },
        { status: upstream.ok ? 200 : upstream.status }
      );
    }

    if (type === "hot") {
      const category = searchParams.get("category") || "";
      const subcategory = searchParams.get("subcategory") || "";

      const url = new URL(`${API_BASE}/open/free_hot`);
      if (category) url.searchParams.set("category", category);
      if (subcategory) url.searchParams.set("subcategory", subcategory);

      const upstream = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 Next.js Proxy",
        },
      });

      const { text, json } = await safeJson(upstream);

      return NextResponse.json(
        json ?? {
          success: false,
          message: "上游接口返回的不是 JSON",
          raw: text,
        },
        { status: upstream.ok ? 200 : upstream.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "invalid type" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "proxy request failed",
      },
      { status: 500 }
    );
  }
}