export function receiptFixture(count = 60, longNames = false) {
  const items = Array.from({ length: count }, (_, index) => ({
    id: String(index), product_name: `PRODUTO${String(index).padStart(3, "0")} Linguiças${longNames ? " artesanais da churrascaria com temperos e acompanhamentos especiais da casa" : ""}`,
    variant_name: `VARIACAO${String(index).padStart(3, "0")} ${["Toscana", "Apimentada", "Com queijo", "De frango"][index % 4]}${longNames ? " preparada com ervas frescas e ingredientes selecionados" : ""}`,
    quantity: index % 3 + 1, units_per_package: null, total_units: null,
    unit_price_cents: 1500 + index, line_total_cents: (index % 3 + 1) * (1500 + index),
  }));
  const subtotal = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  return { companyName: "Churrascaria de demonstração", order: {
    id: "fixture", customer_id: "fixture", order_number: 42, status: "ready", created_at: "2026-09-30T15:00:00Z", delivered_at: null,
    customers: { name: "Cliente de demonstração", phone: "(11) 99999-0000", address: "ENDERECO_NAO_PODE_APARECER" },
    notes: longNames ? "Separar as linguiças apimentadas e identificar todos os pacotes. ".repeat(30).slice(0, 2000) : "Separar cada sabor e identificar as linguiças apimentadas.",
    subtotal_cents: subtotal, discount_cents: Math.min(500, subtotal), total_cents: Math.max(0, subtotal - 500),
  }, items };
}
