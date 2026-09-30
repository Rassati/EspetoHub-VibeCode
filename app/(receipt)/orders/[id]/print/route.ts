import { getCompanyContext } from "@/lib/auth";
import { getReceiptOrder } from "@/lib/data";
import { createReceiptPdf } from "@/lib/receipt-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { company }] = await Promise.all([params, getCompanyContext()]);
  const { order, items } = await getReceiptOrder(company.id, id);
  const pdf = await createReceiptPdf({ companyName: company.name, order, items });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="comanda-${Number(order.order_number)}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
