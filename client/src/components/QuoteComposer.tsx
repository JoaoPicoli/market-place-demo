import { useRef, useState, type FormEvent } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createQuote, createQuoteVersion, type QuoteInput } from "../api";

interface QuoteComposerProps {
  identityId: number;
  conversationId: number;
  requestId: number;
  services: Array<{ id: number; title: string }>;
  quoteId?: number;
  initialServiceId?: number | null;
  initialServiceTitle?: string | null;
  onCancel: () => void;
}

interface DraftItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

function localDateTime(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1_000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function centsTotal(items: DraftItem[]) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity.replace(",", "."));
    const price = Number(item.unitPrice.replace(",", "."));
    if (!Number.isFinite(quantity) || !Number.isFinite(price) || quantity <= 0 || price < 0) return sum;
    return sum + Math.round(quantity * price * 100);
  }, 0);
}

function idempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `quote-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function QuoteComposer({ identityId, conversationId, requestId, services, quoteId, initialServiceId, initialServiceTitle, onCancel }: QuoteComposerProps) {
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState(initialServiceId ? String(initialServiceId) : "");
  const [scopeDescription, setScopeDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [estimatedDurationDays, setEstimatedDurationDays] = useState("");
  const [validUntil, setValidUntil] = useState(localDateTime(7));
  const [proposedStartAt, setProposedStartAt] = useState("");
  const [proposedEndAt, setProposedEndAt] = useState("");
  const [terms, setTerms] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const mutation = useMutation({
    mutationFn: ({ input, key }: { input: QuoteInput; key: string }) => quoteId
      ? createQuoteVersion(identityId, quoteId, input, key)
      : createQuote(identityId, conversationId, input, key),
    onSuccess: async () => {
      setSuccess(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", identityId, conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["service-request-quotes", identityId, requestId] }),
        queryClient.invalidateQueries({ queryKey: ["quote", identityId] }),
      ]);
    },
  });

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
    idempotencyRef.current = null;
    setSuccess(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(false);
    if (!scopeDescription.trim() || scopeDescription.trim().length < 10) return setFormError("Descreva o escopo do serviço com pelo menos 10 caracteres.");
    const decimalPattern = /^\d{1,8}(?:[.,]\d{1,2})?$/;
    if (!items.length || items.some((item) => !item.description.trim() || !decimalPattern.test(item.quantity.trim()) || !decimalPattern.test(item.unitPrice.trim()) || Number(item.quantity.replace(",", ".")) <= 0)) return setFormError("Preencha a descrição, quantidade e preço de cada item com valores válidos.");
    if (centsTotal(items) <= 0) return setFormError("O valor total do orçamento precisa ser maior que zero.");
    if (estimatedDurationDays && (!Number.isInteger(Number(estimatedDurationDays)) || Number(estimatedDurationDays) < 1 || Number(estimatedDurationDays) > 3_650)) return setFormError("O prazo estimado deve ser um número inteiro entre 1 e 3.650 dias.");
    if (Boolean(proposedStartAt) !== Boolean(proposedEndAt)) return setFormError("Informe o início e o fim da janela de atendimento.");
    if (proposedStartAt && new Date(proposedEndAt) <= new Date(proposedStartAt)) return setFormError("O fim da janela deve ocorrer depois do início.");
    if (!validUntil || !Number.isFinite(new Date(validUntil).getTime()) || new Date(validUntil) <= new Date()) return setFormError("A validade precisa estar no futuro.");

    const selectedService = services.find((service) => String(service.id) === serviceId);
    const input: QuoteInput = {
      ...(selectedService ? { serviceId: selectedService.id, serviceTitleSnapshot: selectedService.title } : initialServiceTitle ? { serviceTitleSnapshot: initialServiceTitle } : {}),
      scopeDescription: scopeDescription.trim(),
      totalAmount: (centsTotal(items) / 100).toFixed(2),
      items: items.map((item) => ({ description: item.description.trim(), quantity: item.quantity.replace(",", "."), unitPrice: item.unitPrice.replace(",", ".") })),
      ...(estimatedDurationDays ? { estimatedDurationDays: Number(estimatedDurationDays) } : {}),
      validUntil: new Date(validUntil).toISOString(),
      ...(proposedStartAt ? { proposedStartAt: new Date(proposedStartAt).toISOString(), proposedEndAt: new Date(proposedEndAt).toISOString() } : {}),
      ...(terms.trim() ? { terms: terms.trim() } : {}),
    };
    const fingerprint = JSON.stringify(input);
    if (idempotencyRef.current?.fingerprint !== fingerprint) idempotencyRef.current = { fingerprint, key: idempotencyKey() };
    mutation.mutate({ input, key: idempotencyRef.current.key });
  }

  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centsTotal(items) / 100);

  return (
    <form className="workflow-form quote-composer" onSubmit={submit}>
      <div className="quote-composer-heading"><div><span className="eyebrow">{quoteId ? "Revisão do orçamento" : "Nova proposta"}</span><h3>{quoteId ? "O que mudou nesta revisão?" : "Monte sua proposta de trabalho"}</h3><p>O envio fica registrado na conversa. Se revisar depois, a versão anterior continua no histórico.</p></div><button type="button" className="text-button" onClick={onCancel}>Fechar</button></div>
      {services.length > 0 && <label>Serviço anunciado (opcional)
        <select value={serviceId} onChange={(event) => { setServiceId(event.target.value); idempotencyRef.current = null; }} disabled={Boolean(quoteId)}>
          <option value="">Sem vínculo com serviço anunciado</option>
          {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
        </select>
      </label>}
      <section className="quote-form-section">
        <div className="form-section-heading"><h4>Resumo da proposta</h4><p>Explique o que será feito e o que está incluído.</p></div>
        <label><span>Escopo e descrição do trabalho <span className="required-mark">*</span></span><textarea required minLength={10} rows={4} maxLength={8_000} value={scopeDescription} onChange={(event) => { setScopeDescription(event.target.value); idempotencyRef.current = null; }} placeholder="Ex.: remover o sifão atual, instalar uma peça nova e testar se a conexão ficou sem vazamentos." /></label>
      </section>
      <section className="quote-form-section">
        <div className="quote-items-heading"><div className="form-section-heading"><h4>Preço e itens</h4><p>Discrimine cada parte do orçamento. A soma vira o valor total.</p></div><span>Total · {currency}</span></div>
        <div className="quote-draft-items">
          {items.map((item, index) => <div className="quote-draft-item" key={index}>
            <label><span>O que está incluído? <span className="required-mark">*</span></span><input required value={item.description} maxLength={255} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="Ex.: mão de obra" /></label>
            <label><span>Quantidade <span className="required-mark">*</span></span><input required inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} aria-label={`Quantidade do item ${index + 1}`} /></label>
            <label><span>Valor por unidade (R$) <span className="required-mark">*</span></span><input required inputMode="decimal" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} placeholder="0,00" aria-label={`Valor por unidade do item ${index + 1}`} /></label>
            <button type="button" className="icon-button" aria-label={`Remover item ${index + 1}`} disabled={items.length === 1} onClick={() => { setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)); idempotencyRef.current = null; }}><Trash2 size={18} /></button>
          </div>)}
        </div>
        <button type="button" className="add-item-button" disabled={items.length >= 30} onClick={() => { setItems((current) => [...current, { description: "", quantity: "1", unitPrice: "" }]); idempotencyRef.current = null; }}><Plus size={17} /> Adicionar outro item</button>
        <div className="quote-preview"><span>Valor total da proposta</span><strong>{currency}</strong><small>{items.length} {items.length === 1 ? "item" : "itens"} · a API confere a soma antes do envio</small></div>
      </section>
      <section className="quote-form-section">
        <div className="form-section-heading"><h4>Prazo e validade</h4><p>A validade é necessária. Valores podem usar vírgula como separador decimal, por exemplo 125,50.</p></div>
        <div className="form-grid-two">
          <label>Prazo estimado (dias, opcional)<input type="number" min="1" max="3650" value={estimatedDurationDays} onChange={(event) => { setEstimatedDurationDays(event.target.value); idempotencyRef.current = null; }} placeholder="Ex.: 2" /></label>
          <label>Válida até <span className="required-mark">*</span><input required type="datetime-local" value={validUntil} onChange={(event) => { setValidUntil(event.target.value); idempotencyRef.current = null; }} /></label>
          <label>Início previsto (opcional)<input type="datetime-local" value={proposedStartAt} onChange={(event) => { setProposedStartAt(event.target.value); idempotencyRef.current = null; }} /></label>
          <label>Fim previsto (opcional)<input type="datetime-local" value={proposedEndAt} onChange={(event) => { setProposedEndAt(event.target.value); idempotencyRef.current = null; }} /></label>
        </div>
      </section>
      <section className="quote-form-section">
        <div className="form-section-heading"><h4>Condições e observações <span className="optional-label">opcional</span></h4><p>Por exemplo, materiais incluídos ou cuidados necessários no local.</p></div>
        <label className="sr-only" htmlFor="quote-terms">Condições e observações</label><textarea id="quote-terms" rows={3} maxLength={8_000} value={terms} onChange={(event) => { setTerms(event.target.value); idempotencyRef.current = null; }} placeholder="Materiais incluídos, forma de execução ou outras condições relevantes" />
      </section>
      {(formError || mutation.isError) && <p className="form-error" role="alert">{formError ?? mutation.error?.message ?? "Não foi possível enviar a proposta."}</p>}
      {success && <p className="form-success" role="status">Proposta enviada na conversa. A versão anterior permanece no histórico.</p>}
      <div className="form-actions"><button type="button" className="button-secondary" onClick={onCancel}>Cancelar</button><button type="submit" className="button-primary" disabled={mutation.isPending}><Send size={18} />{mutation.isPending ? "Enviando proposta…" : quoteId ? "Enviar nova versão" : "Enviar proposta"}</button></div>
      {success && <Link className="button-link quote-return-link" to={`/conversas/${conversationId}`}>Voltar à conversa</Link>}
    </form>
  );
}
