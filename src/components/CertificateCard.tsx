"use client";

import type { Certificate, CertificatePersonnel } from "@/lib/types";
import { useT } from "@/lib/LangProvider";

/**
 * A single landscape training certificate for one person. Sizing uses container
 * query units (cqw = 1% of the card width) so the preview and the full-size PDF
 * render look identical at any scale — no JS measuring needed.
 */

export function fillBody(body: string, p: CertificatePersonnel): string {
  return body
    .replace(/\{ad\}/g, p.fullName || "………")
    .replace(/\{tarih\}/g, p.date || "…")
    .replace(/\{tur\}/g, p.trainingType || "…")
    .replace(/\{konu\}/g, p.trainingSubject || "…")
    .replace(/\{sirket\}/g, p.company || "…")
    .replace(/\{sube\}/g, p.branch || "…");
}

export default function CertificateCard({
  cert,
  person,
}: {
  cert: Certificate;
  person: CertificatePersonnel;
}) {
  const t = useT();
  const a = cert.accent || "#b8923f";
  const ink = "#1e293b";
  const soft = "#475569";

  return (
    <div
      style={
        {
          containerType: "inline-size",
          position: "relative",
          width: "100%",
          aspectRatio: "1.414 / 1",
          background: "#ffffff",
          overflow: "hidden",
          color: ink,
        } as React.CSSProperties
      }
    >
      {/* optional uploaded background */}
      {cert.bgImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cert.bgImage}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {/* decorative frame (hidden when a custom background is used) */}
      {!cert.bgImage && (
        <>
          <div
            style={{
              position: "absolute",
              inset: "2.2cqw",
              border: `0.5cqw solid ${a}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "3.1cqw",
              border: `0.12cqw solid ${a}`,
              opacity: 0.7,
            }}
          />
          {/* corner accents */}
          {[
            { top: "2.2cqw", left: "2.2cqw" },
            { top: "2.2cqw", right: "2.2cqw" },
            { bottom: "2.2cqw", left: "2.2cqw" },
            { bottom: "2.2cqw", right: "2.2cqw" },
          ].map((pos, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "3cqw",
                height: "3cqw",
                background: a,
                opacity: 0.9,
                ...pos,
              }}
            />
          ))}
        </>
      )}

      {/* content */}
      <div
        style={{
          position: "absolute",
          inset: "6cqw 8cqw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ width: "100%" }}>
          {cert.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cert.logo}
              alt=""
              style={{
                height: "7cqw",
                objectFit: "contain",
                margin: "0 auto 1.5cqw",
              }}
            />
          )}
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "5cqw",
              fontWeight: 800,
              letterSpacing: "0.15cqw",
              color: ink,
              lineHeight: 1.05,
            }}
          >
            {cert.title || "SERTİFİKA"}
          </div>
          {cert.subtitle && (
            <div
              style={{
                fontSize: "1.5cqw",
                letterSpacing: "0.4cqw",
                color: a,
                marginTop: "0.6cqw",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {cert.subtitle}
            </div>
          )}
          <div
            style={{
              width: "22cqw",
              height: "0.3cqw",
              background: a,
              margin: "1.8cqw auto 0",
            }}
          />
        </div>

        {/* name + body */}
        <div style={{ width: "100%" }}>
          <div
            style={{
              fontSize: "1.6cqw",
              color: soft,
              marginBottom: "0.6cqw",
            }}
          >
            {t.cert.dear}
          </div>
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "6cqw",
              fontWeight: 700,
              color: a,
              lineHeight: 1.05,
            }}
          >
            {person.fullName || t.cert.namePlaceholder}
          </div>
          <p
            style={{
              fontSize: "2.1cqw",
              lineHeight: 1.55,
              color: soft,
              maxWidth: "78cqw",
              margin: "2.2cqw auto 0",
            }}
          >
            {fillBody(cert.body, person)}
          </p>
        </div>

        {/* footer: training meta + signature */}
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "2cqw",
          }}
        >
          <Meta
            label={t.cert.cardType}
            value={person.trainingType}
            accent={a}
            soft={soft}
          />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5cqw", color: soft }}>
              {person.date || ""}
            </div>
            <div
              style={{
                width: "20cqw",
                height: "0.15cqw",
                background: soft,
                margin: "3.5cqw auto 0.5cqw",
              }}
            />
            <div style={{ fontSize: "1.7cqw", fontWeight: 700, color: ink }}>
              {cert.signerName || " "}
            </div>
            <div style={{ fontSize: "1.4cqw", color: soft }}>
              {cert.signerTitle || ""}
            </div>
          </div>
          <Meta
            label={t.cert.cardCompany}
            value={
              person.company + (person.branch ? ` — ${person.branch}` : "")
            }
            accent={a}
            soft={soft}
            align="right"
          />
        </div>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  accent,
  soft,
  align = "left",
}: {
  label: string;
  value: string;
  accent: string;
  soft: string;
  align?: "left" | "right";
}) {
  return (
    <div style={{ textAlign: align, maxWidth: "26cqw" }}>
      <div
        style={{
          fontSize: "1.3cqw",
          letterSpacing: "0.2cqw",
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "1.8cqw", color: soft, marginTop: "0.3cqw" }}>
        {value || "—"}
      </div>
    </div>
  );
}
