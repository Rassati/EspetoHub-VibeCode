"use client";

import { useEffect } from "react";

type ReceiptPrintControlsProps = {
  orderId: string;
  orderNumber: number;
};

export function ReceiptPrintControls({ orderId, orderNumber }: ReceiptPrintControlsProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `Comanda #${orderNumber} | Espeto Hub`;
    const printTimer = window.setTimeout(() => window.print(), 300);

    return () => {
      window.clearTimeout(printTimer);
      document.title = previousTitle;
    };
  }, [orderNumber]);

  return (
    <div className="print-toolbar">
      <div>
        <p className="eyebrow">Comanda pronta</p>
        <p className="muted">Escolha a impressora e confirme para gerar o papel do cliente.</p>
      </div>
      <div className="print-toolbar-actions">
        <button className="button button-primary" type="button" onClick={() => window.print()}>
          Imprimir comanda
        </button>
        <a className="button button-ghost" href={`/orders/${orderId}`}>
          Voltar ao pedido
        </a>
      </div>
    </div>
  );
}
