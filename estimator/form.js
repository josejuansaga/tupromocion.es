(async () => {
  const guard = document.querySelector("#authGuard");
  const page = document.querySelector("#formPage");
  const noticeNode = document.querySelector("#estimateNotice");
  const linesNode = document.querySelector("#catalogBuilder");
  const summaryNode = document.querySelector("#summaryPanel");
  const saveStateNode = document.querySelector("#estimateSaveState");
  const publicPathNode = document.querySelector("#proposalPublicPath");
  const params = new URLSearchParams(location.search);

  const boot = await Estimator.bootstrap();
  if (!boot.ok || !boot.authenticated) {
    Estimator.renderAuthGuard();
    return;
  }

  guard.hidden = true;
  page.hidden = false;

  const proposals = (boot.data.proposals || []).map(Estimator.normalizeProposal);
  const catalog = Estimator.normalizeCatalog(await Estimator.loadCatalog());
  const products = catalog.flatMap((category) =>
    (category.products || []).map((product) => ({
      ...product,
      categoryId: category.id,
      categoryName: category.name,
    }))
  );

  let proposal = Estimator.normalizeProposal(
    proposals.find((item) => item.id === params.get("id")) || Estimator.createProposalDraft()
  );

  const fields = {
    clientName: document.querySelector("#clientName"),
    projectName: document.querySelector("#projectName"),
    projectType: document.querySelector("#projectType"),
    proposalDate: document.querySelector("#proposalDate"),
    validUntil: document.querySelector("#validUntil"),
    validDays: document.querySelector("#validDays"),
    validDaysInfo: document.querySelector("#validDaysInfo"),
    status: document.querySelector("#status"),
    introText: document.querySelector("#introText"),
    applyVat: document.querySelector("#applyVat"),
    vatRate: document.querySelector("#vatRate"),
    applyIrpf: document.querySelector("#applyIrpf"),
    irpfRate: document.querySelector("#irpfRate"),
    globalDiscountType: document.querySelector("#globalDiscountType"),
    globalDiscountValue: document.querySelector("#globalDiscountValue"),
  };

  function touch(label = "Pendiente de guardar") {
    saveStateNode.textContent = label;
  }

  function addDays(dateText, days) {
    if (!dateText) return "";
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }

  function diffDays(startText, endText) {
    if (!startText || !endText) return 0;
    const start = new Date(`${startText}T00:00:00`);
    const end = new Date(`${endText}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  function ensureLine(line) {
    line.quantity = Math.max(1, Number(line.quantity || 1));
    line.unitPrice = Number(line.unitPrice || 0);
    line.discountValue = Number(line.discountValue || 0);
    line.discountType = ["percent", "amount"].includes(String(line.discountType || "")) ? String(line.discountType) : "none";
    line.subtotal = line.quantity * line.unitPrice;
    return line;
  }

  function makeManualLine() {
    return ensureLine({
      id: Estimator.uid("line"),
      categoryId: "",
      productId: "",
      concept: "Nueva linea",
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
      note: "",
      image: "",
      images: [],
      discountType: "none",
      discountValue: 0,
    });
  }

  function makeProductLine(product) {
    return ensureLine({
      id: Estimator.uid("line"),
      categoryId: product.categoryId || "",
      productId: product.id || "",
      concept: product.name || "Producto",
      quantity: 1,
      unitPrice: Number(product.price || 0),
      subtotal: Number(product.price || 0),
      note: product.desc || "",
      image: product.image || "",
      images: Array.isArray(product.images) ? [...product.images] : (product.image ? [product.image] : []),
      discountType: "none",
      discountValue: 0,
    });
  }

  function bindFields() {
    fields.clientName.value = proposal.clientName || "";
    fields.projectName.value = proposal.projectName || "";
    fields.projectType.value = proposal.projectType || "";
    fields.proposalDate.value = proposal.proposalDate || "";
    fields.validUntil.value = proposal.validUntil || "";
    fields.validDays.value = Number(proposal.validDays || 30);
    fields.validDaysInfo.value = `${diffDays(proposal.proposalDate, proposal.validUntil)} dias`;
    fields.status.value = proposal.status || "draft";
    fields.introText.value = proposal.introText || "";
    fields.applyVat.checked = proposal.applyVat !== false;
    fields.vatRate.value = Number(proposal.vatRate || 21);
    fields.applyIrpf.checked = !!proposal.applyIrpf;
    fields.irpfRate.value = Number(proposal.irpfRate || 15);
    fields.globalDiscountType.value = proposal.globalDiscountType || "none";
    fields.globalDiscountValue.value = Number(proposal.globalDiscountValue || 0);

    Object.entries(fields).forEach(([key, input]) => {
      if (!input) return;
      const handler = () => {
        if (input.type === "checkbox") proposal[key] = input.checked;
        else if (input.type === "number") proposal[key] = Number(input.value || 0);
        else proposal[key] = input.value;
        if (key === "proposalDate" || key === "validDays") {
          proposal.validUntil = addDays(proposal.proposalDate, proposal.validDays || 0);
          fields.validUntil.value = proposal.validUntil || "";
        }
        if (key === "validUntil") {
          proposal.validDays = diffDays(proposal.proposalDate, proposal.validUntil);
          fields.validDays.value = Number(proposal.validDays || 0);
        }
        fields.validDaysInfo.value = `${diffDays(proposal.proposalDate, proposal.validUntil)} dias`;
        touch();
        renderSummary();
      };
      input.oninput = handler;
      input.onchange = handler;
    });
  }

  function addManualLine() {
    proposal.priceItems.push(makeManualLine());
    touch();
    renderLines();
    renderSummary();
  }

  function addProductLineById(productId) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    proposal.priceItems.push(makeProductLine(product));
    touch();
    renderLines();
    renderSummary();
  }

  function updateLine(lineId, field, value) {
    const line = proposal.priceItems.find((item) => item.id === lineId);
    if (!line) return;
    if (["quantity", "unitPrice", "discountValue"].includes(field)) line[field] = Number(value || 0);
    else line[field] = value;
    ensureLine(line);
    touch();
    renderSummary();
  }

  function removeLine(lineId) {
    proposal.priceItems = proposal.priceItems.filter((item) => item.id !== lineId);
    touch();
    renderLines();
    renderSummary();
  }

  function lineDiscountText(item) {
    if (item.discountType === "percent" && Number(item.discountValue || 0) > 0) return `${Number(item.discountValue || 0)} %`;
    if (item.discountType === "amount" && Number(item.discountValue || 0) > 0) return Estimator.money(item.discountValue || 0);
    return "Sin descuento";
  }

  function renderLines() {
    const options = products
      .map(
        (product) =>
          `<option value="${Estimator.escapeHtml(product.id)}">${Estimator.escapeHtml(product.categoryName)} · ${Estimator.escapeHtml(product.name)} · ${Estimator.money(product.price)}</option>`
      )
      .join("");

    linesNode.innerHTML = `
      <div class="line-toolbar">
        <button class="btn btn-primary" type="button" id="addManualLineBtn">+ Linea manual</button>
        <div class="line-toolbar__picker">
          <select id="productPicker" class="filter-input">
            <option value="">Anadir producto del catalogo</option>
            ${options}
          </select>
          <button class="btn btn-ghost" type="button" id="addProductLineBtn">Anadir producto</button>
        </div>
      </div>
      <div class="line-list">
        ${
          proposal.priceItems.length
            ? proposal.priceItems
                .map(
                  (item) => `
          <article class="line-card">
            <div class="line-card__top">
              <div>
                <strong>${Estimator.escapeHtml(item.concept || "Linea")}</strong>
                <div class="muted">${item.productId ? "Producto del catalogo" : "Linea manual"}</div>
              </div>
              <button class="btn btn-danger btn-mini" type="button" data-remove-line="${item.id}">Borrar</button>
            </div>
            <div class="line-card__grid">
              <label class="field"><span>Concepto</span><input type="text" value="${Estimator.escapeHtml(item.concept || "")}" data-line="${item.id}" data-field="concept" /></label>
              <label class="field"><span>Cantidad</span><input type="number" min="1" step="1" value="${Number(item.quantity || 1)}" data-line="${item.id}" data-field="quantity" /></label>
              <label class="field"><span>Precio</span><input type="number" min="0" step="0.01" value="${Number(item.unitPrice || 0)}" data-line="${item.id}" data-field="unitPrice" /></label>
              <label class="field"><span>Descuento</span>
                <select data-line="${item.id}" data-field="discountType">
                  <option value="none" ${item.discountType === "none" ? "selected" : ""}>Sin descuento</option>
                  <option value="percent" ${item.discountType === "percent" ? "selected" : ""}>%</option>
                  <option value="amount" ${item.discountType === "amount" ? "selected" : ""}>EUR</option>
                </select>
              </label>
              <label class="field"><span>Valor descuento</span><input type="number" min="0" step="0.01" value="${Number(item.discountValue || 0)}" data-line="${item.id}" data-field="discountValue" /></label>
              <label class="field"><span>Subtotal</span><input type="text" value="${Estimator.money(item.subtotal || 0)}" disabled /></label>
            </div>
            <label class="field"><span>Nota</span><textarea data-line="${item.id}" data-field="note">${Estimator.escapeHtml(item.note || "")}</textarea></label>
          </article>
        `
                )
                .join("")
            : `<div class="empty-state"><p>Aun no has anadido lineas al presupuesto.</p></div>`
        }
      </div>
    `;

    document.querySelector("#addManualLineBtn")?.addEventListener("click", addManualLine);
    document.querySelector("#addProductLineBtn")?.addEventListener("click", () => {
      const picker = document.querySelector("#productPicker");
      if (!picker?.value) return;
      addProductLineById(picker.value);
      picker.value = "";
    });

    linesNode.querySelectorAll("[data-line][data-field]").forEach((input) => {
      const handler = () => updateLine(input.dataset.line, input.dataset.field, input.value);
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    });

    linesNode.querySelectorAll("[data-remove-line]").forEach((button) => {
      button.addEventListener("click", () => removeLine(button.dataset.removeLine));
    });
  }

  function renderSummary() {
    proposal.priceItems = proposal.priceItems.map((item) => ensureLine({ ...item }));
    const totals = Estimator.proposalTotals(proposal);
    proposal.priceSummary = Estimator.buildPriceSummary(proposal);
    Estimator.ensureProposalSlug(proposal);
    publicPathNode.textContent = proposal.slug ? `/propuesta/${proposal.slug}` : "Sin guardar";
    summaryNode.innerHTML = `
      <div class="summary-totals">
        <div class="summary-line"><span>Cliente</span><strong>${Estimator.escapeHtml(proposal.clientName || "-")}</strong></div>
        <div class="summary-line"><span>Proyecto</span><strong>${Estimator.escapeHtml(proposal.projectName || "-")}</strong></div>
        <div class="summary-line"><span>Estado</span><strong>${Estimator.proposalStatusMeta(proposal.status).label}</strong></div>
      </div>
      <div class="summary-total">${Estimator.money(totals.total)}</div>
      <div class="summary-items">
        ${
          proposal.priceItems.length
            ? proposal.priceItems
                .map(
                  (item) => `
          <div class="summary-item">
            <strong>${Estimator.escapeHtml(item.concept)}</strong>
            <div class="muted">${Number(item.quantity || 1)} x ${Estimator.money(item.unitPrice || 0)}</div>
            <div class="muted">${lineDiscountText(item)}</div>
            <div class="mono">${Estimator.money(item.subtotal || 0)}</div>
          </div>
        `
                )
                .join("")
            : `<div class="muted">Aun no has anadido lineas.</div>`
        }
      </div>
      <div class="summary-breakdown">
        ${proposal.priceSummary
          .map(
            (row) =>
              `<div class="summary-line"><span>${Estimator.escapeHtml(row.label)}</span><strong>${Estimator.escapeHtml(
                row.valueText || Estimator.money(row.value || 0)
              )}</strong></div>`
          )
          .join("")}
      </div>
      <div class="inline-actions">
        <button class="btn btn-primary" type="button" id="saveProposalBtn">Guardar</button>
        <a class="btn btn-ghost" href="${proposal.slug ? Estimator.publicProposalUrl(proposal.slug) : "#"}" target="_blank" rel="noreferrer" id="openProposalBtn">Abrir link</a>
        <button class="btn btn-ghost" type="button" id="copyProposalBtn">Copiar link</button>
        <a class="btn btn-ghost" href="./">Volver</a>
      </div>
    `;

    document.querySelector("#saveProposalBtn")?.addEventListener("click", saveProposal);
    document.querySelector("#copyProposalBtn")?.addEventListener("click", async () => {
      if (!proposal.slug) return;
      await Estimator.copyText(Estimator.publicProposalUrl(proposal.slug));
      touch("Link copiado");
    });
    document.querySelector("#openProposalBtn")?.addEventListener("click", (event) => {
      if (!proposal.slug) {
        event.preventDefault();
        touch("Guarda primero para crear el link");
      }
    });
  }

  async function saveProposal() {
    const previewTab = window.open("", "_blank", "noopener");
    if (!proposal.projectName) {
      if (previewTab) previewTab.close();
      touch("Falta el nombre del proyecto");
      return;
    }
    if (!proposal.clientName) {
      if (previewTab) previewTab.close();
      touch("Falta el cliente");
      return;
    }
    Estimator.ensureProposalSlug(proposal);
    proposal.updatedAt = new Date().toISOString();
    proposal.priceItems = proposal.priceItems.map((item) => ensureLine({ ...item }));
    proposal.priceSummary = Estimator.buildPriceSummary(proposal);
    proposal.totalText = Estimator.money(Estimator.proposalTotal(proposal));
    proposal.servicesIncluded = proposal.priceItems.map((item) => item.concept);
    proposal.examples = proposal.priceItems.flatMap((item) => {
      const images = Array.isArray(item.images) && item.images.length ? item.images : item.image ? [item.image] : [];
      return images.map((image, index) => ({
        image,
        title: index === 0 ? item.concept : `${item.concept} ${index + 1}`,
        text: item.note || "",
      }));
    });
    touch("Guardando...");
    const result = await Estimator.saveProposal(proposal);
    if (!result.ok) {
      if (previewTab) previewTab.close();
      touch("Error al guardar");
      return;
    }
    const saved = (result.data.proposals || []).map(Estimator.normalizeProposal).find((item) => item.id === proposal.id);
    if (saved) proposal = saved;
    bindFields();
    renderLines();
    renderSummary();
    touch("Guardado");
    const publicUrl = Estimator.publicProposalUrl(proposal.slug);
    if (previewTab) previewTab.location.href = publicUrl;
    window.location.href = "./";
  }

  noticeNode.innerHTML = `<div><strong>Presupuesto online</strong><span>Ahora trabajas por lineas: puedes anadir productos del catalogo o escribirlos a mano.</span></div>`;
  bindFields();
  renderLines();
  renderSummary();
})();
