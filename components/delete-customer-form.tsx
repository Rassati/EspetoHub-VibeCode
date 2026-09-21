"use client";

import { deleteCustomerAction } from "@/app/(app)/customers/actions";

export function DeleteCustomerForm({ customerId, customerName }: { customerId: string; customerName: string }) {
  return (
    <form
      action={deleteCustomerAction}
      onSubmit={(event) => {
        if (!window.confirm(`Excluir ${customerName}? Esta ação não pode ser desfeita.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="customer_id" value={customerId} />
      <button className="button button-danger" type="submit">Excluir cliente</button>
    </form>
  );
}
