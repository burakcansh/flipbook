"use client";

import { useRef, useState } from "react";
import type { Certificate, CertificatePersonnel } from "@/lib/types";
import CertificateCard from "./CertificateCard";
import { blankPersonnel } from "@/lib/defaults";
import { uploadImage } from "@/lib/api";
import { useT } from "@/lib/LangProvider";

// Full-size render used for the PDF snapshot (A4 landscape ≈ 1.414:1).
const PDF_W = 1123;
const PDF_H = 794;

function fileName(p: CertificatePersonnel): string {
  const raw = (p.fullName || "sertifika").trim();
  return (
    raw.replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60) ||
    "sertifika"
  );
}

export default function CertificateEditor({
  cert,
  onChange,
  onCommit,
}: {
  cert: Certificate;
  onChange: (next: Certificate) => void;
  onCommit: () => void;
}) {
  const t = useT();
  const FIELDS: { key: keyof CertificatePersonnel; label: string; ph: string }[] =
    [
      { key: "fullName", label: t.cert.fFullName, ph: t.cert.phFullName },
      { key: "date", label: t.cert.fDate, ph: t.cert.phDate },
      { key: "trainingType", label: t.cert.fType, ph: t.cert.phType },
      { key: "trainingSubject", label: t.cert.fSubject, ph: t.cert.phSubject },
      { key: "company", label: t.cert.fCompany, ph: t.cert.phCompany },
      { key: "branch", label: t.cert.fBranch, ph: t.cert.phBranch },
    ];
  const [selected, setSelected] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);
  const [pdfPerson, setPdfPerson] = useState<CertificatePersonnel | null>(null);
  const [uploading, setUploading] = useState<"logo" | "bg" | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const personnel = cert.personnel.length ? cert.personnel : [blankPersonnel()];
  const person = personnel[Math.min(selected, personnel.length - 1)];

  const patch = (p: Partial<Certificate>) => onChange({ ...cert, ...p });
  const setField = (
    id: string,
    key: keyof CertificatePersonnel,
    value: string
  ) =>
    onChange({
      ...cert,
      personnel: personnel.map((pr) =>
        pr.id === id ? { ...pr, [key]: value } : pr
      ),
    });
  const addPerson = () => {
    onChange({ ...cert, personnel: [...personnel, blankPersonnel()] });
    setSelected(personnel.length);
    onCommit();
  };
  const delPerson = (id: string) => {
    onChange({ ...cert, personnel: personnel.filter((pr) => pr.id !== id) });
    setSelected(0);
    onCommit();
  };

  async function upload(kind: "logo" | "bg", file?: File | null) {
    if (!file) return;
    setUploading(kind);
    try {
      const { url } = await uploadImage(file);
      patch(kind === "logo" ? { logo: url } : { bgImage: url });
      onCommit();
    } catch {
      alert(t.cert.uploadFailed);
    } finally {
      setUploading(null);
    }
  }

  async function exportPdf(p: CertificatePersonnel) {
    setExporting(p.id);
    setPdfPerson(p);
    try {
      await new Promise((r) => setTimeout(r, 450));
      const node = stageRef.current;
      if (!node) throw new Error("stage");
      const [{ default: html2canvas }, jspdf] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: PDF_W,
        height: PDF_H,
      });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jspdf.jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [PDF_W, PDF_H],
      });
      pdf.addImage(img, "JPEG", 0, 0, PDF_W, PDF_H);
      pdf.save(`${fileName(p)}.pdf`);
    } catch (e) {
      alert(t.editor.pdfFailed + ": " + (e instanceof Error ? e.message : "?"));
    } finally {
      setExporting(null);
      setPdfPerson(null);
    }
  }

  async function exportAll() {
    for (const p of personnel) {
      if (!p.fullName.trim()) continue;
      // eslint-disable-next-line no-await-in-loop
      await exportPdf(p);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const inputCls =
    "w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm text-amber-950 outline-none focus:border-amber-600";
  const labelCls = "block text-xs font-medium text-amber-900/70";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        {/* ---- template settings ---- */}
        <aside className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-950">
            🎓 {t.cert.design}
          </h2>

          <div>
            <label className={labelCls}>{t.cert.title}</label>
            <input
              className={`${inputCls} mt-1`}
              value={cert.title}
              onChange={(e) => patch({ title: e.target.value })}
              onBlur={onCommit}
            />
          </div>
          <div>
            <label className={labelCls}>{t.cert.subtitle}</label>
            <input
              className={`${inputCls} mt-1`}
              value={cert.subtitle}
              onChange={(e) => patch({ subtitle: e.target.value })}
              onBlur={onCommit}
            />
          </div>
          <div>
            <label className={labelCls}>{t.cert.body}</label>
            <textarea
              className={`${inputCls} mt-1 h-28 resize-y`}
              value={cert.body}
              onChange={(e) => patch({ body: e.target.value })}
              onBlur={onCommit}
            />
            <p className="mt-1 text-[11px] leading-relaxed text-amber-900/50">
              {t.cert.autoFields} <code>{"{ad}"}</code>{" "}
              <code>{"{tarih}"}</code> <code>{"{tur}"}</code>{" "}
              <code>{"{konu}"}</code> <code>{"{sirket}"}</code>{" "}
              <code>{"{sube}"}</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className={labelCls}>{t.cert.accent}</label>
              <input
                type="color"
                value={cert.accent}
                onChange={(e) => patch({ accent: e.target.value })}
                onBlur={onCommit}
                className="mt-1 h-9 w-14 cursor-pointer rounded border border-amber-900/20"
              />
            </div>
            <div className="flex-1">
              <label className={labelCls}>{t.cert.logo}</label>
              <div className="mt-1 flex items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-amber-700 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">
                  {uploading === "logo"
                    ? "…"
                    : cert.logo
                    ? t.cert.change
                    : t.cert.upload}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => upload("logo", e.target.files?.[0])}
                  />
                </label>
                {cert.logo && (
                  <button
                    onClick={() => {
                      patch({ logo: null });
                      onCommit();
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    {t.cert.remove}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t.cert.bgLabel}</label>
            <div className="mt-1 flex items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-amber-700 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">
                {uploading === "bg"
                  ? "…"
                  : cert.bgImage
                  ? t.cert.change
                  : t.cert.bgUpload}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => upload("bg", e.target.files?.[0])}
                />
              </label>
              {cert.bgImage && (
                <button
                  onClick={() => {
                    patch({ bgImage: null });
                    onCommit();
                  }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  {t.cert.bgRemove}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>{t.cert.signName}</label>
              <input
                className={`${inputCls} mt-1`}
                value={cert.signerName ?? ""}
                onChange={(e) => patch({ signerName: e.target.value })}
                onBlur={onCommit}
              />
            </div>
            <div>
              <label className={labelCls}>{t.cert.signTitle}</label>
              <input
                className={`${inputCls} mt-1`}
                value={cert.signerTitle ?? ""}
                onChange={(e) => patch({ signerTitle: e.target.value })}
                onBlur={onCommit}
              />
            </div>
          </div>
        </aside>

        {/* ---- preview + personnel ---- */}
        <section className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-2xl border border-amber-900/15 shadow-lg">
            <CertificateCard cert={cert} person={person} />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-amber-950">
              {t.cert.personnel} ({personnel.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={exportAll}
                disabled={!!exporting}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white disabled:opacity-50"
              >
                {exporting ? t.cert.preparing : t.cert.downloadAll}
              </button>
              <button
                onClick={addPerson}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
              >
                {t.cert.newPersonnel}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {personnel.map((p, i) => (
              <div
                key={p.id}
                onClick={() => setSelected(i)}
                className={`cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition ${
                  i === selected
                    ? "border-amber-600 ring-1 ring-amber-500/40"
                    : "border-amber-900/15 hover:border-amber-400"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900/70">
                    #{i + 1} {p.fullName || t.cert.unnamed}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportPdf(p);
                      }}
                      disabled={exporting === p.id}
                      className="rounded-md border border-amber-700 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                    >
                      {exporting === p.id ? "…" : "⬇ PDF"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        delPerson(p.id);
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                      title="Sil"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-[10px] uppercase tracking-wide text-amber-900/45">
                        {f.label}
                      </label>
                      <input
                        value={p[f.key]}
                        placeholder={f.ph}
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        name={`cert-${f.key}-${p.id}`}
                        onChange={(e) => setField(p.id, f.key, e.target.value)}
                        onBlur={onCommit}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 w-full rounded-md border border-amber-900/15 bg-white px-2 py-1.5 text-sm text-amber-950 outline-none focus:border-amber-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* off-screen full-size stage used only for the PDF snapshot */}
      {pdfPerson && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: -100000,
            top: 0,
            width: PDF_W,
            pointerEvents: "none",
          }}
        >
          <div ref={stageRef} style={{ width: PDF_W, height: PDF_H }}>
            <CertificateCard cert={cert} person={pdfPerson} />
          </div>
        </div>
      )}
    </main>
  );
}
