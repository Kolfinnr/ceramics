"use client";

import { useEffect } from "react";

type InpostPoint = {
  id?: string;
  name?: string;
  address?: string;
  [key: string]: unknown;
};


export default function InpostPointPickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (point: InpostPoint) => void;
}) {
  const token = process.env.NEXT_PUBLIC_INPOST_GEOWIDGET_TOKEN;

  useEffect(() => {
    if (!open) return;

    // 1) Inject CSS once
    const cssId = "inpost-geowidget-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://geowidget.inpost-group.com/inpost-geowidget.css";
      document.head.appendChild(link);
    }

    // 2) Provide callback (used by onpoint="afterPointSelected")
    window.afterPointSelected = (point: InpostPoint) => {
      onSelect(point);
      onClose();
    };

    // 3) Inject script once
    const scriptId = "inpost-geowidget-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://geowidget.inpost-group.com/inpost-geowidget.js";
      script.defer = true;
      document.body.appendChild(script);
    }

    // 4) Alternative event-based capture (works too)
    const handler = (e: Event) => {
      const detailEvent = e as CustomEvent<InpostPoint>;
      if (detailEvent.detail) {
        onSelect(detailEvent.detail);
        onClose();
      }
    };
    document.addEventListener("onpointselect", handler);

    return () => {
      document.removeEventListener("onpointselect", handler);
    };
  }, [open, onClose, onSelect]);

  if (!open) return null;

  if (!token) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h3>Missing Geowidget token</h3>
          <p>Add <code>NEXT_PUBLIC_INPOST_GEOWIDGET_TOKEN</code> in Vercel env.</p>
          <button onClick={onClose} style={btnStyle}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Choose Paczkomat</h3>
          <button onClick={onClose} style={btnStyle}>✕</button>
        </div>

        <div style={{ marginTop: 12 }}>
          {/* Geowidget element */}
          {/* onpoint callback is documented, token is required */}
          <inpost-geowidget
            onpoint="afterPointSelected"
            token={token}
            language="pl"
            // config can be omitted; you can later tune it (types, services, etc.)
          ></inpost-geowidget>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "grid",
  placeItems: "center",
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  width: "min(980px, 92vw)",
  height: "min(760px, 92vh)",
  background: "#fff",
  borderRadius: 18,
  padding: 14,
  overflow: "hidden",
};

const btnStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: "8px 12px",
  background: "#fff",
  cursor: "pointer",
};
