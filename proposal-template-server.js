function formatProposalDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatProposalMoney(value, currency = "EUR") {
  if (typeof value !== "number") return String(value || "");
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function publicPath(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.startsWith("./")) return `/${text.slice(2)}`;
  return text;
}

function renderTextList(items = []) {
  return items.length
    ? `<ul class="scope-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
}

function renderWarningList(items = []) {
  return items.length
    ? `<ul class="scope-list scope-list--warning">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
}

function getProposalStatusLabel(status) {
  const map = {
    draft: "Borrador",
    sent: "Enviada",
    accepted: "Aceptada",
    rejected: "Rechazada",
    expired: "Caducada",
  };
  return map[status] || "Propuesta";
}

/**
 * Renderiza los botones de acción (Aceptar / Rechazar) o el estado final si ya se respondió.
 * Se inserta en la sección hero y en la banda CTA.
 */
function renderRespondButtons(data) {
  const slug   = window.PROPOSAL_PUBLIC_SLUG || "";
  const status = String(data.status || "draft");

  if (status === "accepted") {
    const when = data.respondedAt ? `el ${formatProposalDate(data.respondedAt)}` : "";
    return `
      <div class="proposal-responded-state proposal-responded-state--accepted">
        <span class="proposal-responded-icon">✓</span>
        <div>
          <strong>Propuesta aceptada</strong>
          ${when ? `<small>${when}</small>` : ""}
        </div>
      </div>`;
  }

  if (status === "rejected") {
    const when    = data.respondedAt ? `el ${formatProposalDate(data.respondedAt)}` : "";
    const msg     = String(data.respondedMessage || "").trim();
    return `
      <div class="proposal-responded-state proposal-responded-state--rejected">
        <span class="proposal-responded-icon">✗</span>
        <div>
          <strong>Respuesta enviada${when ? ` ${when}` : ""}</strong>
          ${msg ? `<em class="proposal-responded-message">${escapeHtml(msg)}</em>` : "<small>Nos pondremos en contacto contigo.</small>"}
        </div>
      </div>`;
  }

  if (!slug) {
    // Fallback: sin slug no podemos llamar a la API — usar mailto si está disponible
    return data.ctaEmail
      ? `<a class="site-btn site-btn--gold" href="mailto:${escapeHtml(data.ctaEmail)}?subject=${encodeURIComponent(data.acceptSubject || `Aceptación de propuesta ${data.projectName || ""}`)}">${escapeHtml(data.acceptLabel || "Aceptar propuesta")}</a>`
      : "";
  }

  return `
    <div class="proposal-respond-buttons" data-proposal-respond-zone>
      <button class="site-btn site-btn--gold" type="button" data-proposal-respond-action="accepted">
        ${escapeHtml(data.acceptLabel || "Aceptar propuesta")}
      </button>
      <button class="site-btn site-btn--ghost proposal-reject-btn" type="button" data-proposal-respond-action="rejected">
        No acepto / Necesito cambios
      </button>
    </div>`;
}

function isProposalExpired(validUntil) {
  if (!validUntil) return false;
  const end = new Date(`${validUntil}T23:59:59`);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < Date.now();
}

function groupProposalExamples(examples = []) {
  const groups = [];
  const index = new Map();

  examples.forEach((example, position) => {
    const title = String(example?.title || "").trim();
    const text = String(example?.text || "").trim();
    const image = String(example?.image || "").trim();
    if (!image) return;
    const key = `${title}||${text}`;
    if (!index.has(key)) {
      index.set(key, groups.length);
      groups.push({
        title,
        text,
        images: [],
        firstPosition: position,
      });
    }
    groups[index.get(key)].images.push(image);
  });

  return groups.sort((a, b) => a.firstPosition - b.firstPosition);
}

function proposalExamplesFromItems(items = []) {
  return (items || []).flatMap((item) => {
    const images = Array.isArray(item?.images) && item.images.length
      ? item.images
      : item?.image
        ? [item.image]
        : [];
    return images.map((image) => ({
      image,
      title: String(item?.concept || ""),
      text: String(item?.note || ""),
    }));
  });
}

function renderProposalExamples(examples = [], priceItems = []) {
  const sourceExamples = Array.isArray(examples) && examples.length ? examples : proposalExamplesFromItems(priceItems);
  const groups = groupProposalExamples(sourceExamples);
  if (!groups.length) return "";
  return `
    <section class="proposal-section proposal-section--soft">
      <div class="proposal-section__inner">
        <article class="proposal-card">
          <p class="site-eyebrow">Portfolio visual</p>
          <div class="proposal-examples-grid">
            ${groups
              .map(
                (group) => `
              <figure class="proposal-example-card">
                <div class="proposal-example-card__media ${group.images.length > 1 ? "proposal-example-card__media--gallery" : ""}">
                  ${group.images
                    .map(
                      (image, imageIndex) => `
                    <img src="${escapeHtml(publicPath(image))}" alt="${escapeHtml(group.title || `Ejemplo visual ${imageIndex + 1}`)}" />
                  `
                    )
                    .join("")}
                </div>
                <figcaption>
                  <strong>${escapeHtml(group.title || "")}</strong>
                  <p>${escapeHtml(group.text || "")}</p>
                </figcaption>
              </figure>
            `
              )
              .join("")}
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderProposalUsage(items = []) {
  if (!items.length) return "";
  return `
    <section class="proposal-section">
      <div class="proposal-section__inner">
        <article class="proposal-card">
          <p class="site-eyebrow">Cómo se verá tu promoción</p>
          <div class="proposal-usage-grid">
            ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderCompanyShowcase(data) {
  const items = [
    {
      image: "/storage/assets/id-moj3ri3j-jj7i3rwz5/render-061262829493de9d.jpg",
      title: "Renders interiores",
      text: "Imagenes pensadas para presentar espacios con claridad, atmosfera y valor comercial.",
    },
    {
      image: "/storage/assets/id-moj3ri3j-jj7i3rwz5/render-93185426a176aa22.jpg",
      title: "Renders exteriores",
      text: "Visualizacion de fachadas, terrazas y zonas exteriores para venta sobre plano o presentacion.",
    },
    {
      image: "/storage/assets/id-moj3ri3j-jj7i3rwz5/plan-c62d40b94df84120.jpg",
      title: "Planos y soporte comercial",
      text: "Material listo para usar en web, dossier, redes sociales y propuestas compartibles.",
    },
  ];

  return `
    <section class="proposal-section proposal-section--soft">
      <div class="proposal-section__inner">
        <article class="proposal-card">
          <div class="proposal-company">
            <div class="proposal-company__copy">
              <p class="site-eyebrow">Tu Casa en 3D</p>
              <img class="proposal-company__logo" src="/img/tupromocion-logo.png?v=20260514d" alt="Tu Casa en 3D" />
              <p>Creamos renders, planos comerciales, videos, fichas digitales y material visual para presentar mejor promociones, reformas e interiorismo.</p>
            </div>
            <div class="proposal-examples-grid">
              ${items.map((item) => `
                <figure class="proposal-example-card">
                  <img src="${escapeHtml(publicPath(item.image))}" alt="${escapeHtml(item.title)}" />
                  <figcaption>
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.text)}</p>
                  </figcaption>
                </figure>
              `).join("")}
            </div>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderPriceRows(items = [], currency) {
  return items
    .map((item) => {
      const qty = item.quantity != null ? escapeHtml(item.quantity) : "";
      const unit = item.unitPrice != null ? formatProposalMoney(item.unitPrice, currency) : "";
      const subtotal = item.subtotal != null ? formatProposalMoney(item.subtotal, currency) : "";
      return `
      <div class="proposal-table__row">
        <span>${escapeHtml(item.concept || "")}</span>
        <span>${qty}</span>
        <span>${unit}</span>
        <strong>${subtotal}</strong>
      </div>
    `;
    })
    .join("");
}

function renderPriceSummaryRows(items = [], currency) {
  return items
    .map((item) => {
      const value =
        item.valueText ||
        (typeof item.value === "number" ? formatProposalMoney(item.value, currency) : String(item.value || ""));
      const rowClass = item.isTotal
        ? "proposal-table__row proposal-table__row--summary proposal-table__row--total"
        : "proposal-table__row proposal-table__row--summary";
      return `
      <div class="${rowClass}">
        <span>${escapeHtml(item.label || "")}</span>
        <span></span>
        <span></span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
    })
    .join("");
}

function renderValueRows(items = []) {
  return items
    .map(
      (item) => `
    <article class="bonus-value-card">
      <span class="bonus-value-card__badge">${escapeHtml(item.badge || "Bonus")}</span>
      <h3>${escapeHtml(item.title || "")}</h3>
      ${item.text ? `<p class="bonus-value-card__text">${escapeHtml(item.text)}</p>` : ""}
      <div class="bonus-value-card__rows">
        ${item.valueText ? `<p><span>Valor orientativo</span><strong>${escapeHtml(item.valueText)}</strong></p>` : ""}
        ${item.discountText ? `<p><span>${escapeHtml(item.discountLabel || "Bonificación")}</span><strong>${escapeHtml(item.discountText)}</strong></p>` : ""}
        <p class="is-total"><span>Total</span><strong>${escapeHtml(item.totalText || "Incluido")}</strong></p>
      </div>
    </article>
  `
    )
    .join("");
}

function buildProposalMarkup(data) {
  const currency = data.currency || "EUR";
  const totalText =
    data.totalText || `${formatProposalMoney(data.total ?? 0, currency)}${data.vatNote ? ` ${data.vatNote}` : ""}`;
  const expired = isProposalExpired(data.validUntil);
  const preparedByBits = [
    data.preparedByName,
    data.preparedByRole,
    data.preparedByEmail,
    data.preparedByPhone,
  ].filter(Boolean);

  return `
    <main class="proposal-page">
      ${expired ? `
        <section class="proposal-section">
          <div class="proposal-section__inner">
            <div class="proposal-card proposal-card--warning">
              <p class="site-eyebrow">Presupuesto vencido</p>
              <p>Ponte en contacto para volver a retomar el presupuesto.</p>
            </div>
          </div>
        </section>
      ` : ""}
      <section class="proposal-hero">
        <div class="proposal-hero__inner">
          <div class="proposal-hero__top">
            <div class="proposal-brand">
              <img src="${escapeHtml(publicPath(data.brandLogo || "/img/tupromocion-logo.png"))}" alt="Tu Casa en 3D" />
              <div class="proposal-brand__copy">
                <span>${escapeHtml(data.brandPrimary || "Tu Casa en 3D")}</span>
                <small>${escapeHtml(data.brandSecondary || "Propuesta comercial online")}</small>
              </div>
            </div>
            <span class="proposal-status proposal-status--${escapeHtml(data.status || "draft")}">${escapeHtml(getProposalStatusLabel(data.status))}</span>
          </div>
          <div class="proposal-hero__copy">
            <p class="site-eyebrow">Propuesta personalizada</p>
            <h1>${escapeHtml(data.projectName || "")}</h1>
            <p>${escapeHtml(data.clientName || "")} · ${escapeHtml(data.projectType || "")} · ${escapeHtml(formatProposalDate(data.proposalDate))}${data.validUntil ? ` · Válida hasta ${escapeHtml(formatProposalDate(data.validUntil))}` : ""}</p>
            ${preparedByBits.length ? `<p class="proposal-hero__prepared">Preparado por <strong>${escapeHtml(preparedByBits.join(" · "))}</strong></p>` : ""}
          </div>
          <div class="proposal-hero__actions">
            ${renderRespondButtons(data)}
            <button class="site-btn site-btn--ghost proposal-print-btn" type="button" onclick="window.print()">${escapeHtml(data.printLabel || "Imprimir / Guardar PDF")}</button>
          </div>
        </div>
      </section>

      <section class="proposal-section">
        <div class="proposal-section__inner">
          <div class="proposal-card">
            <p class="site-eyebrow">Resumen del proyecto</p>
            <p>${escapeHtml(data.introText || "")}</p>
          </div>
        </div>
      </section>

      <section class="proposal-section proposal-section--soft">
        <div class="proposal-section__inner proposal-grid">
          <article class="proposal-card">
            <p class="site-eyebrow">Servicios incluidos</p>
            ${renderTextList(data.servicesIncluded || [])}
          </article>
          <article class="proposal-card">
            <p class="site-eyebrow">Plazos estimados</p>
            ${renderTextList(data.timeline || [])}
          </article>
        </div>
      </section>

      <section class="proposal-section">
        <div class="proposal-section__inner">
          <article class="proposal-card proposal-card--table">
            <p class="site-eyebrow">Presupuesto económico</p>
            <div class="proposal-table">
              <div class="proposal-table__head"><span>Concepto</span><span>Cantidad</span><span>Precio unitario</span><span>Subtotal</span></div>
              ${renderPriceRows(data.priceItems || [], currency)}
              ${renderPriceSummaryRows(data.priceSummary || [], currency)}
              <div class="proposal-table__row proposal-table__row--total"><span>Total</span><span></span><span></span><strong>${escapeHtml(totalText)}</strong></div>
            </div>
          </article>
        </div>
      </section>

      ${(data.discounts?.length || data.bonusItems?.length)
        ? `
        <section class="proposal-section proposal-section--soft">
          <div class="proposal-section__inner proposal-value-grid">
            ${renderValueRows([...(data.discounts || []), ...(data.bonusItems || [])])}
          </div>
        </section>
      `
        : ""}

      ${renderProposalExamples(data.examples || [], data.priceItems || [])}
      ${renderCompanyShowcase(data)}
      ${renderProposalUsage(data.usageContexts || [])}

      <section class="proposal-section">
        <div class="proposal-section__inner proposal-grid">
          <article class="proposal-card">
            <p class="site-eyebrow">Documentación necesaria</p>
            ${renderTextList(data.requiredDocuments || [])}
          </article>
          <article class="proposal-card">
            <p class="site-eyebrow">Condiciones de pago</p>
            ${renderTextList(data.paymentTerms || [])}
          </article>
        </div>
      </section>

      <section class="proposal-section proposal-section--soft">
        <div class="proposal-section__inner">
          <article class="proposal-card">
            <p class="site-eyebrow">Qué no incluye</p>
            ${renderWarningList(data.exclusions || [])}
          </article>
        </div>
      </section>

      <section class="cta-band">
        <div class="cta-band__inner">
          <div class="cta-band__copy">
            <p class="site-eyebrow site-eyebrow--gold">Siguiente paso</p>
            <h2>${escapeHtml(data.nextStepTitle || "Si esta estructura encaja, podemos continuar con la confirmación del proyecto.")}</h2>
            <p>${escapeHtml(data.nextStepText || "La propuesta está pensada para explicar mejor el valor del trabajo, el alcance real y los bonus aplicados.")}</p>
          </div>
          <div class="cta-band__actions">
            ${renderRespondButtons(data)}
            ${data.secondaryCtaHref ? `<a class="site-btn site-btn--ghost-light" href="${escapeHtml(data.secondaryCtaHref)}">${escapeHtml(data.secondaryCtaLabel || "Ver más")}</a>` : ""}
          </div>
        </div>
      </section>

      ${data.ctaPhone ? `
        <a class="proposal-floating-wa" href="https://api.whatsapp.com/send?phone=${escapeHtml(String(data.ctaPhone).replace(/\D/g, ""))}&text=${encodeURIComponent(data.callText || `Hola, quiero comentar la propuesta ${data.projectName || ""}`)}" target="_blank" rel="noopener" aria-label="WhatsApp">
          WhatsApp
        </a>
      ` : ""}
    </main>
  `;
}

async function resolveProposalData() {
  const dataNode = document.querySelector("#proposal-data");
  if (dataNode) {
    return JSON.parse(dataNode.textContent || "{}");
  }
  if (window.PROPOSAL_PUBLIC_SLUG) {
    const response = await fetch(`/api/public_proposal.php?slug=${encodeURIComponent(window.PROPOSAL_PUBLIC_SLUG)}`, {
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false || !payload.data?.proposal) {
      throw new Error("proposal-not-found");
    }
    return payload.data.proposal;
  }
  return null;
}

/**
 * Genera el formulario inline que aparece al pulsar "No acepto / Necesito cambios".
 * Permite al cliente escribir un mensaje antes de confirmar el rechazo.
 */
function renderRejectionForm() {
  return `
    <div class="proposal-rejection-form" data-proposal-respond-zone>
      <p class="proposal-rejection-form__label">
        ¿Qué necesitas cambiar o por qué no lo aceptas?
        <span class="proposal-rejection-form__optional">(opcional)</span>
      </p>
      <textarea
        class="proposal-rejection-form__textarea"
        id="proposal-rejection-message"
        placeholder="Ej: El precio está fuera de mi presupuesto, necesito ajustar el alcance del proyecto…"
        rows="3"
        maxlength="600"
      ></textarea>
      <div class="proposal-rejection-form__actions">
        <button class="site-btn site-btn--ghost proposal-reject-btn" type="button" data-proposal-confirm-reject>
          Enviar respuesta
        </button>
        <button class="site-btn site-btn--ghost-light proposal-cancel-reject-btn" type="button" data-proposal-cancel-reject>
          Cancelar
        </button>
      </div>
    </div>`;
}

/**
 * Conecta los botones de aceptar / rechazar con el endpoint /api/proposal_respond.php.
 * — Aceptar: envía directamente sin diálogos.
 * — Rechazar: despliega un formulario inline para escribir un mensaje opcional.
 */
function wireProposalRespond(data) {
  const slug = window.PROPOSAL_PUBLIC_SLUG || "";
  if (!slug) return;

  /* Reemplaza todas las zonas de respuesta con el nuevo HTML */
  function replaceZones(html) {
    document.querySelectorAll("[data-proposal-respond-zone]").forEach((zone) => {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      zone.replaceWith(tmp.firstElementChild || tmp);
    });
  }

  /* Envía la respuesta a la API y actualiza la UI */
  async function sendResponse(action, message = "") {
    // Deshabilitar todos los botones en curso
    document.querySelectorAll(
      "[data-proposal-respond-action], [data-proposal-confirm-reject], [data-proposal-cancel-reject]"
    ).forEach((b) => { b.disabled = true; });
    const sendBtn = document.querySelector("[data-proposal-confirm-reject]");
    if (sendBtn) sendBtn.textContent = "Enviando…";

    try {
      const res    = await fetch("/api/proposal_respond.php", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slug, action, message }),
      });
      const result = await res.json().catch(() => ({}));
      if (!result.ok && !result.alreadyResponded) throw new Error(result.error || "Error desconocido");

      const freshData = {
        ...data,
        status:           result.status || action,
        respondedAt:      result.respondedAt || new Date().toISOString(),
        respondedMessage: message || undefined,
      };
      replaceZones(renderRespondButtons(freshData));
    } catch {
      window.alert("No se ha podido registrar la respuesta. Por favor contacta directamente.");
      // Restaurar botones originales
      replaceZones(renderRespondButtons(data));
      wireProposalRespond(data);
    }
  }

  /* Botones principales: Aceptar / No acepto */
  document.querySelectorAll("[data-proposal-respond-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.proposalRespondAction;

      if (action === "accepted") {
        // Aceptar: envío directo, sin formulario
        void sendResponse("accepted");
        return;
      }

      // Rechazar: mostrar formulario inline en todas las zonas
      replaceZones(renderRejectionForm());

      /* Botón "Enviar respuesta" dentro del formulario */
      document.querySelector("[data-proposal-confirm-reject]")?.addEventListener("click", () => {
        const msg = (document.querySelector("#proposal-rejection-message")?.value || "").trim();
        void sendResponse("rejected", msg);
      });

      /* Botón "Cancelar" — restaura los botones originales */
      document.querySelector("[data-proposal-cancel-reject]")?.addEventListener("click", () => {
        replaceZones(renderRespondButtons(data));
        wireProposalRespond(data);
      });
    });
  });
}

async function initProposalTemplate() {
  const mountNode = document.querySelector("#proposal-root");
  if (!mountNode) return;
  try {
    const data = await resolveProposalData();
    if (!data) return;
    mountNode.innerHTML = buildProposalMarkup(data);
    wireProposalRespond(data);
  } catch (error) {
    mountNode.innerHTML =
      '<main class="proposal-page"><section class="proposal-section"><div class="proposal-section__inner"><div class="proposal-card"><p class="site-eyebrow">Error</p><p>No se ha podido cargar la propuesta.</p></div></div></section></main>';
  }
}

document.addEventListener("DOMContentLoaded", initProposalTemplate);
