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

function cleanMoneyText(value) {
  return String(value || "").replace(/\?\?/g, " €").replace(/\s+/g, " ").trim();
}

function getProposalIntroText(data = {}) {
  const text = String(data.introText || "").trim();
  const genericOldText = "Esta propuesta contempla la creacion de material visual 3D";
  if (!text || text.startsWith(genericOldText)) {
    return "Crear el material visual necesario para presentar y comercializar la promoción: renders, planos, tour virtual y ficha digital online lista para compartir con compradores, agencias o colaboradores.";
  }
  return text;
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
    expired: "Caducada",
  };
  return map[status] || "Propuesta";
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

function getProposalPhases(phases = []) {
  const fallback = [
    {
      label: "Fase 1",
      title: "Preparación del proyecto",
      text: "Revisión de planos, referencias, memoria de calidades y objetivos comerciales.",
    },
    {
      label: "Fase 2",
      title: "Producción visual 3D",
      text: "Modelado, materiales, iluminación, cámaras y renders.",
    },
    {
      label: "Fase 3",
      title: "Presentación comercial",
      text: "Ficha digital online, galería, textos y enlace compartible.",
    },
  ];
  const source = Array.isArray(phases) && phases.length ? phases : fallback;
  return source
    .map((phase, index) => ({
      label: phase.label || `Fase ${index + 1}`,
      title: phase.title || "",
      text: phase.text || "",
    }))
    .filter((phase) => phase.title || phase.text);
}

function renderProposalPhases(phases = []) {
  const items = getProposalPhases(phases);
  if (!items.length) return "";
  return `
    <section class="proposal-section">
      <div class="proposal-section__inner">
        <article class="proposal-card">
          <p class="site-eyebrow">Desglose por fases</p>
          <div class="proposal-phase-grid">
            ${items.map((phase) => `
              <div class="proposal-phase-card">
                <span>${escapeHtml(phase.label)}</span>
                <h3>${escapeHtml(phase.title)}</h3>
                <p>${escapeHtml(phase.text)}</p>
              </div>
            `).join("")}
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
      text: "Imágenes pensadas para presentar espacios con claridad, atmósfera y valor comercial.",
    },
    {
      image: "/storage/assets/id-moj3ri3j-jj7i3rwz5/render-93185426a176aa22.jpg",
      title: "Renders exteriores",
      text: "Visualización de fachadas, terrazas y zonas exteriores para venta sobre plano o presentación.",
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
              <p>Creamos renders, planos comerciales, vídeos, fichas digitales y material visual para presentar mejor promociones, reformas e interiorismo.</p>
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
        cleanMoneyText(item.valueText) ||
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
  const totalText = cleanMoneyText(
    data.totalText || `${formatProposalMoney(data.total ?? 0, currency)}${data.vatNote ? ` ${data.vatNote}` : ""}`
  );
  const introText = getProposalIntroText(data);
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
            <h1>${escapeHtml(data.proposalTitle || data.projectName || "Propuesta visual 3D para promoción inmobiliaria")}</h1>
            <p>${escapeHtml(data.clientName || "")} · ${escapeHtml(data.projectType || "")} · ${escapeHtml(formatProposalDate(data.proposalDate))}${data.validUntil ? ` · Válida hasta ${escapeHtml(formatProposalDate(data.validUntil))}` : ""}</p>
            ${preparedByBits.length ? `<p class="proposal-hero__prepared">Preparado por <strong>${escapeHtml(preparedByBits.join(" · "))}</strong></p>` : ""}
          </div>
          <div class="proposal-hero__actions">
            ${data.ctaEmail ? `<a class="site-btn site-btn--primary" href="mailto:${escapeHtml(data.ctaEmail)}?subject=${encodeURIComponent(data.acceptSubject || `Aceptación de propuesta ${data.projectName || ""}`)}">${escapeHtml(data.acceptLabel || "Aceptar propuesta y reservar producción")}</a>` : ""}
            <button class="site-btn site-btn--ghost proposal-print-btn" type="button" onclick="window.print()">${escapeHtml(data.printLabel || "Imprimir / Guardar PDF")}</button>
          </div>
        </div>
      </section>

      <section class="proposal-section">
        <div class="proposal-section__inner">
          <div class="proposal-card">
            <p class="site-eyebrow">Resumen del proyecto</p>
            <p>${escapeHtml(introText)}</p>
          </div>
        </div>
      </section>

      ${renderProposalPhases(data.phases || [])}

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
            <div class="proposal-total-highlight">
              <div>
                <h3>Total propuesta</h3>
                <p>${escapeHtml(data.totalNote || "Importe final del alcance descrito en esta propuesta.")}</p>
              </div>
              <strong>${escapeHtml(totalText)}</strong>
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
            ${data.ctaEmail ? `<a class="site-btn site-btn--gold" href="mailto:${escapeHtml(data.ctaEmail)}?subject=${encodeURIComponent(data.acceptSubject || `Aceptación de propuesta ${data.projectName || ""}`)}">${escapeHtml(data.acceptLabel || "Quiero avanzar con esta propuesta")}</a>` : ""}
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

async function initProposalTemplate() {
  const mountNode = document.querySelector("#proposal-root");
  if (!mountNode) return;
  try {
    const data = await resolveProposalData();
    if (!data) return;
    const title = data.proposalTitle || data.projectName || "Propuesta visual 3D";
    document.title = `${title} | TuPromoción.es`;
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        "content",
        getProposalIntroText(data) || "Propuesta visual 3D online con renders, planos, tour virtual, ficha digital y presupuesto claro para compartir."
      );
    }
    mountNode.innerHTML = buildProposalMarkup(data);
  } catch (error) {
    mountNode.innerHTML =
      '<main class="proposal-page"><section class="proposal-section"><div class="proposal-section__inner"><div class="proposal-card"><p class="site-eyebrow">Error</p><p>No se ha podido cargar la propuesta.</p></div></div></section></main>';
  }
}

document.addEventListener("DOMContentLoaded", initProposalTemplate);
