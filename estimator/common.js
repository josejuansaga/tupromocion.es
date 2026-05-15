const Estimator = (() => {
  const API_BASE = "../api";
  const preparedByPresets = {
    jose: {
      preparedByPreset: "jose",
      preparedByName: "José Juan Sánchez García",
      preparedByRole: "Tu Casa en 3D",
      preparedByEmail: "info@tucasaen3d.es",
      preparedByPhone: "+34 634 55 70 33",
      ctaEmail: "info@tucasaen3d.es",
      ctaPhone: "+34 634 55 70 33",
    },
    noelia: {
      preparedByPreset: "noelia",
      preparedByName: "Noelia Cocchi",
      preparedByRole: "Tu Casa en 3D",
      preparedByEmail: "arquitectura@tucasaen3d.es",
      preparedByPhone: "+34 634 56 67 18",
      ctaEmail: "arquitectura@tucasaen3d.es",
      ctaPhone: "+34 634 56 67 18",
    },
  };

  const defaultPreparedBy = preparedByPresets.jose;

  function uid(prefix = "id") {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function publicAssetPath(value) {
    const text = String(value || "");
    if (!text) return "";
    if (text.startsWith("./")) return `/${text.slice(2)}`;
    return text;
  }

  function money(value) {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: Number(value) % 1 ? 2 : 0 }).format(Number(value || 0));
  }

  function shortDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("es-ES");
  }

  function shortDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("es-ES");
  }

  function monthKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function proposalStatusMeta(status) {
    switch (String(status || "").toLowerCase()) {
      case "sent": return { label: "Enviada", tone: "sent" };
      case "accepted": return { label: "Aceptada", tone: "accepted" };
      case "expired": return { label: "Caducada", tone: "expired" };
      default: return { label: "Borrador", tone: "draft" };
    }
  }

  async function api(path, options = {}) {
    const init = { method: options.method || "GET", headers: {}, credentials: "same-origin" };
    if (options.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await fetch(`${API_BASE}${path}`, init);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok !== false, status: res.status, raw: data, data: data.data || {}, authenticated: data.authenticated !== false };
  }

  async function bootstrap() {
    return api("/estimator_bootstrap.php");
  }

  async function loadCatalog() {
    const result = await api("/estimator_catalog.php");
    return Array.isArray(result.data.catalog) ? result.data.catalog : [];
  }

  async function saveCatalog(catalog) {
    return api("/estimator_catalog.php", { method: "POST", body: { catalog } });
  }

  async function saveProposal(proposal) {
    return api("/upsert_proposal.php", { method: "POST", body: { proposal } });
  }

  async function deleteProposal(id) {
    return api("/delete_proposal.php", { method: "POST", body: { id } });
  }

  async function uploadAssetIfNeeded(entityId, hint, value) {
    if (!value || typeof value !== "string" || !value.startsWith("data:")) return value;
    const result = await api("/upload_asset.php", { method: "POST", body: { projectId: entityId, hint, dataUrl: value } });
    if (!result.ok || !result.data?.path) throw new Error("No se ha podido subir el archivo.");
    return result.data.path;
  }

  async function uploadAssetFile(entityId, hint, file) {
    const formData = new FormData();
    formData.append("projectId", entityId);
    formData.append("hint", hint);
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/upload_asset.php`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false || !data?.data?.path) {
      throw new Error(data?.error || "No se ha podido subir el archivo.");
    }
    return data.data.path;
  }

  function defaultCatalog() {
    return [
      {
        id: "estancias-interiores",
        name: "Estancias interiores",
        sub: "Tarifa base por imagen interior",
        color: "green",
        products: [
          { id: "salon-comedor-cocina", name: "Salon - comedor - cocina", desc: "Vista conjunta de la zona principal. Precio + IVA - IRPF. 1a mod. incluida.", price: 220, unit: "imagen", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
          { id: "cocina", name: "Cocina", desc: "Imagen individual de cocina. Precio + IVA - IRPF. 1a mod. incluida.", price: 120, unit: "imagen", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
          { id: "dormitorio", name: "Dormitorio", desc: "Imagen individual de dormitorio. Precio + IVA - IRPF. 1a mod. incluida.", price: 120, unit: "imagen", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
          { id: "bano", name: "Bano", desc: "Imagen individual de bano. Precio + IVA - IRPF. 1a mod. incluida.", price: 90, unit: "imagen", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
        ],
      },
      {
        id: "packs-base",
        name: "Packs y escenas base",
        sub: "Soluciones rapidas para interiorismo y arquitectura",
        color: "orange",
        products: [
          { id: "pack-interiorista", name: "Pack interiorista", desc: "Salon comedor cocina + dormitorio principal + bano. Precio + IVA - IRPF. 1a mod. incluida.", price: 420, unit: "pack", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
          { id: "exterior-vivienda-unifamiliar", name: "Exterior - vivienda unifamiliar", desc: "A partir de 420 EUR. Fachada exterior o vista principal.", price: 420, unit: "imagen", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
          { id: "restaurante-local-fachada", name: "Restaurante / local comercial con fachada", desc: "A partir de 420 EUR. Escena comercial con fachada o acceso principal.", price: 420, unit: "imagen", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
        ],
      },
      {
        id: "servicios-complementarios",
        name: "Servicios complementarios",
        sub: "Servicios del dossier comercial y presentacion",
        color: "blue",
        products: [
          { id: "tour-virtual-extra", name: "Tour virtual", desc: "Suplemento orientativo: +50 % sobre el presupuesto base.", price: 0, unit: "extra", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
          { id: "tour-vr", name: "Tour virtual + experiencia inmersiva VR", desc: "Precio a medida segun alcance y dispositivo.", price: 0, unit: "proyecto", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
          { id: "video-animaciones", name: "Video y animaciones", desc: "Servicio audiovisual bajo presupuesto personalizado.", price: 0, unit: "proyecto", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
          { id: "integraciones-imagen", name: "Integraciones en imagen", desc: "Inserciones y composiciones especiales bajo presupuesto personalizado.", price: 0, unit: "imagen", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
          { id: "ficha-digital-microsite", name: "Ficha digital / microsite", desc: "Presentacion online compartible del proyecto o promocion.", price: 290, unit: "proyecto", image: "", images: [], technicalPdf: "", technicalPdfThumbnail: "" },
        ],
      },
    ];
  }

  function normalizeCatalog(catalog = []) {
    const source = Array.isArray(catalog) && catalog.length ? catalog : defaultCatalog();
    return source.map((category, index) => ({
      id: String(category.id || uid(`cat${index + 1}`)),
      name: String(category.name || `Seccion ${index + 1}`),
      sub: String(category.sub || ""),
      color: ["green", "orange", "blue"].includes(category.color) ? category.color : ["green", "orange", "blue"][index % 3],
      products: Array.isArray(category.products) ? category.products.map((product, productIndex) => ({
        id: String(product.id || uid(`prod${productIndex + 1}`)),
        name: String(product.name || "Nuevo producto"),
        desc: String(product.desc || ""),
        price: Number(product.price || 0),
        unit: String(product.unit || "ud"),
        image: String(product.image || ""),
        images: Array.isArray(product.images) ? product.images.map(String).filter(Boolean) : (product.image ? [String(product.image)] : []),
        technicalPdf: String(product.technicalPdf || ""),
        technicalPdfThumbnail: String(product.technicalPdfThumbnail || ""),
      })) : [],
    }));
  }

  function createProposalDraft() {
    const now = new Date().toISOString();
    return {
      id: uid("proposal"),
      slug: "",
      status: "draft",
      proposalDate: now.slice(0, 10),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      validDays: 30,
      clientId: "",
      clientName: "",
      projectName: "",
      projectType: "Promotora / Obra nueva",
      introText: "Crear el material visual necesario para presentar y comercializar la promoción: renders, planos, tour virtual y ficha digital online lista para compartir con compradores, agencias o colaboradores.",
      servicesIncluded: [],
      usageContexts: [
        "Presentación comercial al cliente final.",
        "Web o ficha digital del proyecto.",
        "Redes sociales y campañas visuales.",
        "Catálogo o dossier comercial.",
      ],
      timeline: [
        "Recepción de planos, referencias y briefing.",
        "Preparación de primeras vistas o propuesta visual.",
        "Revisión principal y ajustes acordados.",
        "Entrega final en formato digital.",
      ],
      requiredDocuments: [
        "Planos actualizados o distribución definitiva.",
        "Referencias de estilo, materiales o ambiente.",
        "Memoria de calidades si existe.",
        "Indicaciones comerciales o de marketing del proyecto.",
      ],
      paymentTerms: ["50 % al inicio del proyecto.", "50 % antes de la entrega final."],
      exclusions: ["Cambios ilimitados.", "Trabajos no descritos en esta propuesta.", "Campañas publicitarias.", "Gestión comercial de leads."],
      priceItems: [],
      examples: [],
      applyVat: true,
      vatRate: 21,
      applyIrpf: false,
      irpfRate: 15,
      globalDiscountType: "none",
      globalDiscountValue: 0,
      priceSummary: [],
      totalText: "",
      createdAt: now,
      updatedAt: now,
      ...defaultPreparedBy,
    };
  }

  function normalizeProposal(raw = {}) {
    const base = { ...createProposalDraft(), ...(raw || {}) };
    base.priceItems = Array.isArray(base.priceItems) ? base.priceItems.map((item) => ({
      id: String(item.id || uid("line")),
      categoryId: String(item.categoryId || ""),
      productId: String(item.productId || ""),
      concept: String(item.concept || ""),
      quantity: Math.max(1, Number(item.quantity || 1)),
      unitPrice: Number(item.unitPrice || 0),
      subtotal: Number(item.quantity || 1) * Number(item.unitPrice || 0),
      note: String(item.note || ""),
      image: String(item.image || ""),
      images: Array.isArray(item.images) ? item.images.map(String).filter(Boolean) : (item.image ? [String(item.image)] : []),
      discountType: ["percent", "amount"].includes(String(item.discountType || "")) ? String(item.discountType) : "none",
      discountValue: Number(item.discountValue || 0),
    })) : [];
    base.examples = Array.isArray(base.examples) ? base.examples.map((item) => ({
      image: String(item.image || ""),
      title: String(item.title || ""),
      text: String(item.text || ""),
    })) : [];
    ["servicesIncluded", "usageContexts", "timeline", "requiredDocuments", "paymentTerms", "exclusions"].forEach((key) => {
      base[key] = Array.isArray(base[key]) ? base[key].map(String).filter(Boolean) : [];
    });
    base.preparedByPreset = String(base.preparedByPreset || "jose");
    base.preparedByName = String(base.preparedByName || defaultPreparedBy.preparedByName);
    base.preparedByRole = String(base.preparedByRole || defaultPreparedBy.preparedByRole);
    base.preparedByEmail = String(base.preparedByEmail || defaultPreparedBy.preparedByEmail);
    base.preparedByPhone = String(base.preparedByPhone || defaultPreparedBy.preparedByPhone);
    base.ctaEmail = String(base.ctaEmail || base.preparedByEmail || defaultPreparedBy.ctaEmail);
    base.ctaPhone = String(base.ctaPhone || base.preparedByPhone || defaultPreparedBy.ctaPhone);
    base.validDays = Math.max(0, Number(base.validDays || 0));
    return base;
  }

  function ensureProposalSlug(proposal) {
    if (!proposal.slug) {
      proposal.slug = slugify(`${proposal.projectName || proposal.clientName || "presupuesto"}-${proposal.id.slice(-6)}`);
    }
    return proposal.slug;
  }

  function proposalTotals(proposal) {
    const items = Array.isArray(proposal?.priceItems) ? proposal.priceItems : [];
    const baseSubtotal = items.reduce((sum, item) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const unitPrice = Number(item.unitPrice || 0);
      return sum + (quantity * unitPrice);
    }, 0);

    const lineDiscount = items.reduce((sum, item) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const unitPrice = Number(item.unitPrice || 0);
      const rawSubtotal = quantity * unitPrice;
      const type = String(item.discountType || "none");
      const value = Number(item.discountValue || 0);
      if (type === "percent") return sum + (rawSubtotal * value / 100);
      if (type === "amount") return sum + value;
      return sum;
    }, 0);

    const subtotalAfterLineDiscount = Math.max(0, baseSubtotal - lineDiscount);
    const globalType = String(proposal?.globalDiscountType || "none");
    const globalValue = Number(proposal?.globalDiscountValue || 0);
    let globalDiscount = 0;
    if (globalType === "percent") globalDiscount = subtotalAfterLineDiscount * globalValue / 100;
    if (globalType === "amount") globalDiscount = globalValue;
    globalDiscount = Math.min(Math.max(0, globalDiscount), subtotalAfterLineDiscount);

    const taxableBase = Math.max(0, subtotalAfterLineDiscount - globalDiscount);
    const vatAmount = proposal?.applyVat === false ? 0 : taxableBase * (Number(proposal?.vatRate || 0) / 100);
    const irpfAmount = proposal?.applyIrpf ? taxableBase * (Number(proposal?.irpfRate || 0) / 100) : 0;
    const total = Math.max(0, taxableBase + vatAmount - irpfAmount);

    return {
      baseSubtotal,
      lineDiscount,
      subtotalAfterLineDiscount,
      globalDiscount,
      taxableBase,
      vatAmount,
      irpfAmount,
      total,
    };
  }

  function proposalTotal(proposal) {
    return proposalTotals(proposal).total;
  }

  function buildPriceSummary(proposal) {
    const totals = proposalTotals(proposal);
    const rows = [{ label: "Base imponible", value: totals.baseSubtotal }];
    if (totals.lineDiscount > 0) rows.push({ label: "Descuento por lineas", valueText: `-${money(totals.lineDiscount)}` });
    if (totals.globalDiscount > 0) rows.push({ label: "Descuento global", valueText: `-${money(totals.globalDiscount)}` });
    if (totals.vatAmount > 0) rows.push({ label: `IVA (${Number(proposal?.vatRate || 0)} %)`, value: totals.vatAmount });
    if (totals.irpfAmount > 0) rows.push({ label: `IRPF (${Number(proposal?.irpfRate || 0)} %)`, valueText: `-${money(totals.irpfAmount)}` });
    return rows;
  }

  function publicProposalUrl(slug) {
    return `${location.origin}/propuesta/${slug}`;
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const input = document.createElement("input");
    input.value = value;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  function renderAuthGuard() {
    const box = document.querySelector("#authGuard");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = `<h2>Acceso bloqueado</h2><p>El estimator solo se abre desde el panel de administracion.</p><p><a class="btn btn-primary" href="/admin/">Ir al panel</a></p>`;
  }

  return {
    api,
    bootstrap,
    loadCatalog,
    saveCatalog,
    saveProposal,
    deleteProposal,
    preparedByPresets,
    uploadAssetIfNeeded,
    uploadAssetFile,
    defaultCatalog,
    normalizeCatalog,
    normalizeProposal,
    createProposalDraft,
    ensureProposalSlug,
    proposalTotals,
    proposalTotal,
    buildPriceSummary,
    proposalStatusMeta,
    publicProposalUrl,
    fileToDataUrl,
    escapeHtml,
    publicAssetPath,
    money,
    shortDate,
    shortDateTime,
    slugify,
    uid,
    copyText,
    renderAuthGuard,
    monthKey,
  };
})();
