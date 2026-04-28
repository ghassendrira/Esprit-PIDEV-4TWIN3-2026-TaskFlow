/** Payload snake_case attendu par le service ML /detect/anomaly */
export function buildInvoiceAnomalyPayload(inv: any, nbFacturesClient: number) {
  const issue = inv.issueDate ? new Date(inv.issueDate) : new Date();
  const due = inv.dueDate ? new Date(inv.dueDate) : issue;
  const delai = Math.max(0, (due.getTime() - issue.getTime()) / 86400000);
  const addr = inv.client?.address || '';
  const ville = (addr.split(',')[0] || 'UNKNOWN').trim().slice(0, 80) || 'UNKNOWN';
  const categorie = inv.items?.[0]?.description || inv.notes || 'SERVICE';
  return {
    invoice_id: inv.id,
    score_credit: 700,
    anciennete_mois: 12,
    montant_ttc: Number(inv.totalAmount) || 0,
    delai_paiement_j: delai,
    mode_paiement: 'VIREMENT',
    categorie_produit: String(categorie).slice(0, 120),
    ville,
    nb_factures_client: nbFacturesClient,
    trimestre: Math.floor(issue.getMonth() / 3) + 1,
    mois: issue.getMonth() + 1,
  };
}

export function countInvoicesPerClient(invoices: { clientId: string }[]) {
  const counts = new Map<string, number>();
  for (const i of invoices) {
    counts.set(i.clientId, (counts.get(i.clientId) || 0) + 1);
  }
  return counts;
}
