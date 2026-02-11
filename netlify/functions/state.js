import { neon } from "@netlify/neon";

export default async (req) => {
  try {
    const sql = neon(); // utilise automatiquement NETLIFY_DATABASE_URL
    const method = req.method || "GET";

    // Table + ligne par défaut (sécurité, au cas où)
    await sql`
      CREATE TABLE IF NOT EXISTS hpfc_state (
        id int PRIMARY KEY,
        state jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `;
    await sql`
      INSERT INTO hpfc_state (id, state)
      VALUES (1, '{"patients":[],"audit":[]}')
      ON CONFLICT (id) DO NOTHING;
    `;

    if (method === "GET") {
      const rows = await sql`SELECT state, updated_at FROM hpfc_state WHERE id = 1;`;
      const row = rows[0];
      return new Response(
        JSON.stringify({ state: row?.state ?? { patients: [], audit: [] }, updated_at: row?.updated_at }),
        { status: 200, headers: { "content-type": "application/json; charset=utf-8" } }
      );
    }

    if (method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!body?.state) {
        return new Response(JSON.stringify({ error: "missing state" }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      }

      await sql`
        UPDATE hpfc_state
        SET state = ${body.state}::jsonb, updated_at = now()
        WHERE id = 1;
      `;

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server error", details: String(e?.message || e) }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
};
