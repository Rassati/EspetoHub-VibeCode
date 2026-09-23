"use client";

import { useEffect, useState } from "react";
import { fitReceiptToPage, waitForReceiptStyles } from "@/lib/receipt-print";

type ReceiptPrintControlsProps = {
  orderId: string;
  orderNumber: number;
};

export function ReceiptPrintControls({ orderId, orderNumber }: ReceiptPrintControlsProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  function printReceipt() {
    try {
      fitReceiptToPage();
      setError("");
      window.print();
    } catch {
      setError("Não foi possível ajustar a comanda. Recarregue a página e tente novamente.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    const previousTitle = document.title;
    document.title = `Comanda #${orderNumber} | Espeto Hub`;
    const beforePrint = () => {
      try { fitReceiptToPage(); }
      catch { setError("A impressão ainda não está pronta. Aguarde o carregamento e tente novamente."); }
    };
    window.addEventListener("beforeprint", beforePrint);
    Promise.all([document.fonts.ready, waitForReceiptStyles()]).then(() => {
      if (cancelled) return;
      fitReceiptToPage();
      setReady(true);
      window.print();
    }).catch(() => {
      if (!cancelled) setError("Não foi possível preparar a impressão. Recarregue a página e tente novamente.");
    });

    return () => {
      cancelled = true;
      window.removeEventListener("beforeprint", beforePrint);
      document.title = previousTitle;
    };
  }, [orderNumber]);

  return (
    <div className="print-toolbar">
      <div>
        <p className="eyebrow">Comanda pronta</p>
        <p className="muted">Comanda ajustada para 1 folha A4. Use papel A4, escala 100% e desative cabeçalhos e rodapés do navegador.</p>
        <p className="muted">Pedidos maiores terão letras menores para manter todos os itens na mesma folha.</p>
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="print-toolbar-actions">
        <button className="button button-primary" type="button" disabled={!ready} onClick={printReceipt}>
          {ready ? "Imprimir comanda" : "Preparando impressão…"}
        </button>
        <a className="button button-ghost" href={`/orders/${orderId}`}>
          Voltar ao pedido
        </a>
      </div>
    </div>
  );
}
