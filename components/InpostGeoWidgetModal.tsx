"use client";

import { useEffect } from "react";

type InpostPoint = {
  id: string;
  name?: string;
  address?: string;
  postcode?: string;
  city?: string;
};

type InpostGeoWidgetModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (point: InpostPoint) => void;
  initialPostcode?: string;
};


export default function InpostGeoWidgetModal({
  open,
  onClose,
  onSelect,
  initialPostcode,
}: InpostGeoWidgetModalProps) {
  const widgetUrl = process.env.NEXT_PUBLIC_INPOST_GEOWIDGET_URL;
  const widgetToken = process.env.NEXT_PUBLIC_INPOST_GEOWIDGET_TOKEN;

  useEffect(() => {
    if (!open) return;

    if (!widgetUrl) {
      return;
    }

    const scriptId = "inpost-geowidget-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = widgetUrl;
      script.defer = true;
      document.head.appendChild(script);
    }

    window.onInpostPointSelected = (point: InpostPoint) => {
      const id = point?.id ?? point?.name;
      if (!id) return;
      onSelect({ ...point, id });
      onClose();
    };

    const handler = (event: Event) => {
      const detailEvent = event as CustomEvent<InpostPoint>;
      const detailId = detailEvent.detail?.id ?? detailEvent.detail?.name;
      if (!detailId) return;
      onSelect({ ...detailEvent.detail, id: detailId });
      onClose();
    };

    document.addEventListener("onpointselect", handler);
    return () => {
      document.removeEventListener("onpointselect", handler);
    };
  }, [open, onClose, onSelect, widgetUrl]);

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Choose Paczkomat</h3>
          <button onClick={onClose} style={btnStyle}>
            ✕
          </button>
        </div>

        {!widgetUrl ? (
          <div style={{ marginTop: 12, color: "#b00" }}>
            GeoWidget not configured. Set{" "}
            <code>NEXT_PUBLIC_INPOST_GEOWIDGET_URL</code>.
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div
              id="inpost-geowidget"
              data-token={widgetToken ?? ""}
              data-country="pl"
              data-language="pl"
              data-callback="onInpostPointSelected"
              data-postal-code={initialPostcode ?? ""}
            />
          </div>
        )}
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
