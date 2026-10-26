import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useI18n } from "../lib/i18n";

// Legal/help pages are stored in content_pages so admins can edit them without a redeploy.
export default function Page() {
  const { slug } = useParams(); const { t, lang } = useI18n();
  const [p, setP] = useState<{ title_en: string; title_ur: string | null; body_en: string; body_ur: string | null } | null | undefined>(undefined);
  useEffect(() => { setP(undefined); supabase.from("content_pages").select("*").eq("slug", slug ?? "").maybeSingle().then(({ data }) => setP(data)); }, [slug]);
  if (p === undefined) return <p>{t.loading}</p>;
  if (p === null) return <p>{t.empty}</p>;
  return <article className="card wide"><h1>{(lang === "ur" && p.title_ur) || p.title_en}</h1><p className="prewrap">{(lang === "ur" && p.body_ur) || p.body_en}</p></article>;
}
