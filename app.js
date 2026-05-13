function safeRandomUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 11);
}

const IS_ADMIN_ROUTE = /\/admin(?:\/|\/index\.(?:html|php))?$/i.test(window.location.pathname);
const PUBLIC_PROJECT_ID = new URLSearchParams(window.location.search).get("promo") || "";
const _pathSlugMatch = !IS_ADMIN_ROUTE && window.location.pathname.match(/^\/([a-z0-9][a-z0-9-]+)\/?$/);
const PUBLIC_PROJECT_SLUG = _pathSlugMatch ? _pathSlugMatch[1] : "";
const PUBLIC_LANGUAGE = new URLSearchParams(window.location.search).get("lang") || "es";
const IS_PUBLIC_HOME_ROUTE = !IS_ADMIN_ROUTE && !PUBLIC_PROJECT_ID && !PUBLIC_PROJECT_SLUG;

function createDefaultTranslation() {
  return {
    headline: "Viviendas de obra nueva pensadas para vivir mejor.",
    introText: "Un proyecto residencial contemporaneo con imagen cuidada, buena ubicacion y espacios pensados para el dia a dia.",
    youtubeUrl: "",
    qualities: [
      "Cocinas equipadas con electrodomesticos integrados",
      "Suelo radiante y climatizacion por aerotermia",
      "Plaza de garaje y trastero opcional",
    ],
    pdfName: "Dossier informativo",
    floors: [
      {
        id: "floor-seed",
        name: "Piso 2 dormitorios",
        description: "Salon abierto, terraza y zona de dia muy luminosa.",
        zones: [{ id: "zone-seed", name: "General" }],
      },
    ],
  };
}

const defaultState = {
  projectId: "",
  projectName: "",
  projectStatus: "draft",
  slug: "",
  clientId: "",
  designVariant: "mediterranea",
  companyName: "Residencial Atlas",
  languages: ["es"],
  headline: "Viviendas de obra nueva pensadas para vivir mejor.",
  introText: "Un proyecto residencial contemporaneo con imagen cuidada, buena ubicacion y espacios pensados para el dia a dia.",
  priceFrom: "",
  locationName: "Calle Mayor 18, Madrid",
  province: "",
  city: "",
  mapsUrl: "https://www.google.com/maps",
  mapsEmbedUrl: "",
  youtubeUrl: "",
  virtualTourUrl: "",
  virtualTourCover: null,
  companyLocation: "",
  companyWebsite: "",
  contactPhone: "",
  contactEmail: "",
  contactWhatsapp: "",
  socialInstagram: "",
  socialFacebook: "",
  socialTwitter: "",
  seoTitle: "",
  seoDescription: "",
  socialImage: "",
  qualities: [
    "Cocinas equipadas con electrodomesticos integrados",
    "Suelo radiante y climatizacion por aerotermia",
    "Plaza de garaje y trastero opcional",
  ],
  pdfFile: null,
  pdfName: "Dossier informativo",
  translations: {
    es: createDefaultTranslation(),
  },
  logo: null,
  cover: null,
  floors: [
    {
      id: safeRandomUUID(),
      name: "Piso 2 dormitorios",
      description: "Salon abierto, terraza y zona de dia muy luminosa.",
      area: "",
      bedrooms: "",
      bathrooms: "",
      zones: [{ id: safeRandomUUID(), name: "General", images: [] }],
      plan: null,
    },
  ],
};

const API_BASE = new URL(IS_ADMIN_ROUTE ? "../api/" : "./api/", window.location.href).pathname.replace(/\/$/, "");
let state = structuredClone(defaultState);
let db = { clients: [], users: [], projects: [], analytics: {}, leads: [], currentUser: null, backupSettings: {} };
let currentView = "auth";
let activeAdminSection = "promotions";
let selectedUserId = "";
let activeEditorLanguage = "es";
let autosaveIntervalId = null;
let clientSearchTerm = "";
let promotionSearchTerm = "";
let contactProjectFilter = "";
let lastServerSavedSnapshot = "";
let projectVersionsCache = [];
let publicProjectsCatalog = [];
let projectBackupsCache = [];
let userBackupsCache = [];

const els = {
  publicWorkspace: document.querySelector("#publicWorkspace"),
  publicProvinceFilter: document.querySelector("#publicProvinceFilter"),
  publicCityFilter: document.querySelector("#publicCityFilter"),
  publicProjectsGrid: document.querySelector("#publicProjectsGrid"),
  publicResultsCount: document.querySelector("#publicResultsCount"),
  publicBackToTopBtn: document.querySelector("#publicBackToTopBtn"),
  authWorkspace: document.querySelector("#authWorkspace"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  loginMessage: document.querySelector("#loginMessage"),
  logoutBtn: document.querySelector("#logoutBtn"),
  homeDashboard:    document.querySelector("#homeDashboard"),
  clientWorkspace:  document.querySelector("#clientWorkspace"),
  editorWorkspace:  document.querySelector("#editorWorkspace"),
  editorProjectMeta: document.querySelector("#editorProjectMeta"),
  saveStatusPill:    document.querySelector("#saveStatusPill"),
  saveDraftBtn:     document.querySelector("#saveDraftBtn"),
  previewDraftBtn:  document.querySelector("#previewDraftBtn"),
  publishProjectBtn: document.querySelector("#publishProjectBtn"),
  backToDashboardBtn: document.querySelector("#backToDashboardBtn"),
  backFromClientBtn: document.querySelector("#backFromClientBtn"),
  openClientProfileBtn: document.querySelector("#openClientProfileBtn"),
  saveClientProfileBtn: document.querySelector("#saveClientProfileBtn"),
  dashboardStats:   document.querySelector("#dashboardStats"),
  dashboardProjects: document.querySelector("#dashboardProjects"),
  contactsList: document.querySelector("#contactsList"),
  contactProjectFilter: document.querySelector("#contactProjectFilter"),
  exportContactsBtn: document.querySelector("#exportContactsBtn"),
  adminTabs: Array.from(document.querySelectorAll("[data-admin-tab]")),
  usersPanel: document.querySelector("#usersPanel"),
  usersList: document.querySelector("#usersList"),
  backupSettingsPanel: document.querySelector("#backupSettingsPanel"),
  backupProjectsKeep: document.querySelector("#backupProjectsKeep"),
  backupUsersKeep: document.querySelector("#backupUsersKeep"),
  saveBackupSettingsBtn: document.querySelector("#saveBackupSettingsBtn"),
  userBackupsList: document.querySelector("#userBackupsList"),
  createUserBackupBtn: document.querySelector("#createUserBackupBtn"),
  clientCardsList:  document.querySelector("#clientCardsList"),
  clientSearchInput: document.querySelector("#clientSearchInput"),
  promotionSearchInput: document.querySelector("#promotionSearchInput"),
  dashboardSearch:  document.querySelector("#dashboardSearch"),
  dashboardStatusFilter: document.querySelector("#dashboardStatusFilter"),
  dashboardClientFilter: document.querySelector("#dashboardClientFilter"),
  clientSelect:     document.querySelector("#clientSelect"),
  newClientBtn:     document.querySelector("#newClientBtn"),
  deleteClientBtn:  document.querySelector("#deleteClientBtn"),
  saveClientBtn:    document.querySelector("#saveClientBtn"),
  createClientProjectBtn: document.querySelector("#createClientProjectBtn"),
  clientProjectsList: document.querySelector("#clientProjectsList"),
  userName:         document.querySelector("#userName"),
  userUsername:     document.querySelector("#userUsername"),
  userPassword:     document.querySelector("#userPassword"),
  userRole:         document.querySelector("#userRole"),
  userClientId:     document.querySelector("#userClientId"),
  userClientField:  document.querySelector("#userClientField"),
  newUserBtn:       document.querySelector("#newUserBtn"),
  saveUserBtn:      document.querySelector("#saveUserBtn"),
  deleteUserBtn:    document.querySelector("#deleteUserBtn"),
  clientProfileName: document.querySelector("#clientProfileName"),
  clientProfileLocation: document.querySelector("#clientProfileLocation"),
  clientProfileWebsite: document.querySelector("#clientProfileWebsite"),
  clientProfilePhone: document.querySelector("#clientProfilePhone"),
  clientProfileEmail: document.querySelector("#clientProfileEmail"),
  clientProfileWhatsapp: document.querySelector("#clientProfileWhatsapp"),
  clientProfileInstagram: document.querySelector("#clientProfileInstagram"),
  clientProfileFacebook: document.querySelector("#clientProfileFacebook"),
  clientProfileTwitter: document.querySelector("#clientProfileTwitter"),
  projectSelect:    document.querySelector("#projectSelect"),
  projectName:      document.querySelector("#projectName"),
  projectStatus:    document.querySelector("#projectStatus"),
  newProjectBtn:    document.querySelector("#newProjectBtn"),
  saveProjectRecordBtn: document.querySelector("#saveProjectRecordBtn"),
  designVariant:    document.querySelector("#designVariant"),
  designVariantPicker: document.querySelector("#designVariantPicker"),
  languageTabs:     document.querySelector("#languageTabs"),
  addLanguageBtn:   document.querySelector("#addLanguageBtn"),
  companyName:      document.querySelector("#companyName"),
  headline:         document.querySelector("#headline"),
  introText:        document.querySelector("#introText"),
  priceFrom:        document.querySelector("#priceFrom"),
  locationName:     document.querySelector("#locationName"),
  province:         document.querySelector("#province"),
  city:             document.querySelector("#city"),
  mapsUrl:          document.querySelector("#mapsUrl"),
  mapsEmbedUrl:     document.querySelector("#mapsEmbedUrl"),
  youtubeUrl:       document.querySelector("#youtubeUrl"),
  virtualTourUrl:   document.querySelector("#virtualTourUrl"),
  projectValidation: document.querySelector("#projectValidation"),
  contactPhone:     document.querySelector("#contactPhone"),
  contactEmail:     document.querySelector("#contactEmail"),
  contactWhatsapp:  document.querySelector("#contactWhatsapp"),
  socialInstagram:  document.querySelector("#socialInstagram"),
  socialFacebook:   document.querySelector("#socialFacebook"),
  socialTwitter:    document.querySelector("#socialTwitter"),
  seoTitle:         document.querySelector("#seoTitle"),
  seoDescription:   document.querySelector("#seoDescription"),
  socialImage:      document.querySelector("#socialImage"),
  qualities:        document.querySelector("#qualities"),
  pdfName:          document.querySelector("#pdfName"),
  floorsList:       document.querySelector("#floorsList"),
  addFloorBtn:      document.querySelector("#addFloorBtn"),
  saveProjectBtn:   document.querySelector("#saveProjectBtn"),
  loadProjectInput: document.querySelector("#loadProjectInput"),
  downloadZipBtn:   document.querySelector("#downloadZipBtn"),
  downloadSiteBtn:  document.querySelector("#downloadSiteBtn"),
  downloadDossierBtn: document.querySelector("#downloadDossierBtn"),
  assetsLibrary: document.querySelector("#assetsLibrary"),
  projectVersions: document.querySelector("#projectVersions"),
  projectBackups: document.querySelector("#projectBackups"),
  createProjectBackupBtn: document.querySelector("#createProjectBackupBtn"),
  previewFrame:     document.querySelector("#previewFrame"),
  floorTemplate:    document.querySelector("#floorTemplate"),
};

init();

// ─── init ──────────────────────────────────────────────────────────────────────

async function init() {
  if (PUBLIC_PROJECT_ID || PUBLIC_PROJECT_SLUG) {
    await renderPublicProjectFromUrl(PUBLIC_PROJECT_ID, PUBLIC_PROJECT_SLUG);
    return;
  }
  if (IS_PUBLIC_HOME_ROUTE) {
    await renderPublicHome();
    return;
  }
  initEditorSections();
  renderDesignPicker();
  renderLanguageTabs();
  renderStaticDropzones();
  bindTopLevel();
  bindActions();
  await bootstrapApp();
  renderAll();
}

function getProjectLanguages(projectState = state) {
  const langs = Array.isArray(projectState.languages) && projectState.languages.length ? projectState.languages : ["es"];
  return [...new Set(langs)];
}

function ensureLanguage(projectState, lang) {
  if (!projectState.translations || typeof projectState.translations !== "object") {
    projectState.translations = {};
  }
  if (!projectState.translations[lang]) {
    const es = projectState.translations.es || createDefaultTranslation();
    projectState.translations[lang] = structuredClone(es);
  }
  return projectState.translations[lang];
}

function getActiveTranslation(projectState = state, lang = activeEditorLanguage) {
  return ensureLanguage(projectState, lang);
}

function syncLegacyLocalizedFields(projectState = state, lang = "es") {
  const translation = ensureLanguage(projectState, lang);
  projectState.headline = translation.headline || "";
  projectState.introText = translation.introText || "";
  projectState.youtubeUrl = translation.youtubeUrl || "";
  projectState.qualities = [...(translation.qualities || [])];
  projectState.pdfName = translation.pdfName || "";
}

function getFloorTranslation(translation, floor) {
  translation.floors ||= [];
  let floorTranslation = translation.floors.find((entry) => entry.id === floor.id);
  if (!floorTranslation) {
    floorTranslation = { id: floor.id, name: floor.name || "", description: floor.description || "", zones: [] };
    translation.floors.push(floorTranslation);
  }
  floorTranslation.zones ||= [];
  floor.zones.forEach((zone) => {
    if (!floorTranslation.zones.find((entry) => entry.id === zone.id)) {
      floorTranslation.zones.push({ id: zone.id, name: zone.name || "" });
    }
  });
  return floorTranslation;
}

function isGenericProjectName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized === "nueva promocion" || normalized === "nueva promoción";
}

function getProjectDisplayName(projectLike) {
  const rawName = String(projectLike?.projectName || projectLike?.name || "").trim();
  if (!isGenericProjectName(rawName)) return rawName;
  const stateRef = projectLike?.state || projectLike || {};
  const headline = String(stateRef?.headline || stateRef?.translations?.es?.headline || "").trim();
  if (headline) return headline;
  const companyName = String(stateRef?.companyName || "").trim();
  if (companyName) return companyName;
  return "Proyecto sin titulo";
}

function renderLanguageTabs() {
  if (!els.languageTabs) return;
  const langs = getProjectLanguages();
  if (!langs.includes(activeEditorLanguage)) activeEditorLanguage = langs[0];
  els.languageTabs.innerHTML = langs.map((lang) => `
    <button class="language-tab${lang === activeEditorLanguage ? " is-active" : ""}" type="button" data-language-tab="${escapeAttr(lang)}">${lang.toUpperCase()}</button>
  `).join("");
  els.languageTabs.querySelectorAll("[data-language-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeEditorLanguage = button.dataset.languageTab;
      renderAll();
    });
  });
  if (els.addLanguageBtn) {
    els.addLanguageBtn.hidden = langs.includes("en");
  }
}

// ─── bindings ──────────────────────────────────────────────────────────────────

function bindTopLevel() {
  [
    ["projectName", "projectName"], ["projectStatus", "projectStatus"],
    ["designVariant", "designVariant"], ["companyName", "companyName"],
    ["priceFrom", "priceFrom"], ["locationName", "locationName"],
    ["province", "province"], ["city", "city"],
    ["mapsUrl", "mapsUrl"], ["mapsEmbedUrl", "mapsEmbedUrl"], ["virtualTourUrl", "virtualTourUrl"],
    ["companyLocation", "companyLocation"], ["companyWebsite", "companyWebsite"],
    ["contactPhone", "contactPhone"], ["contactEmail", "contactEmail"],
    ["contactWhatsapp", "contactWhatsapp"], ["socialInstagram", "socialInstagram"],
    ["socialFacebook", "socialFacebook"], ["socialTwitter", "socialTwitter"],
    ["seoTitle", "seoTitle"], ["seoDescription", "seoDescription"], ["socialImage", "socialImage"],
    ["clientProfileName", "companyName"], ["clientProfileLocation", "companyLocation"], ["clientProfileWebsite", "companyWebsite"],
    ["clientProfilePhone", "contactPhone"], ["clientProfileEmail", "contactEmail"],
    ["clientProfileWhatsapp", "contactWhatsapp"], ["clientProfileInstagram", "socialInstagram"],
    ["clientProfileFacebook", "socialFacebook"], ["clientProfileTwitter", "socialTwitter"],
  ].forEach(([elKey, stateKey]) => {
    if (!els[elKey]) return;
    const eventName = els[elKey] instanceof HTMLSelectElement ? "change" : "input";
    els[elKey].addEventListener(eventName, (e) => {
      state[stateKey] = stateKey === "designVariant" ? resolveDesignVariantKey(e.target.value) : e.target.value;
      if (stateKey === "designVariant") syncDesignPicker();
      renderValidation();
      renderPreview();
    });
    if (els[elKey]?.type === "url") {
      els[elKey].addEventListener("blur", (e) => {
        const normalized = normalizeUrl(e.target.value);
        if (normalized !== e.target.value) {
          e.target.value = normalized;
          state[stateKey] = normalized;
        }
        renderValidation();
        renderPreview();
      });
    }
  });

  [
    ["headline", "headline"],
    ["introText", "introText"],
    ["youtubeUrl", "youtubeUrl"],
    ["pdfName", "pdfName"],
  ].forEach(([elKey, fieldKey]) => {
    if (!els[elKey]) return;
    const eventName = els[elKey] instanceof HTMLSelectElement ? "change" : "input";
    els[elKey].addEventListener(eventName, (e) => {
      const translation = getActiveTranslation();
      translation[fieldKey] = e.target.value;
      if (activeEditorLanguage === "es") syncLegacyLocalizedFields(state, "es");
      renderValidation();
      renderPreview();
    });
    if (els[elKey]?.type === "url") {
      els[elKey].addEventListener("blur", (e) => {
        const translation = getActiveTranslation();
        const normalized = normalizeUrl(e.target.value);
        e.target.value = normalized;
        translation[fieldKey] = normalized;
        if (activeEditorLanguage === "es") syncLegacyLocalizedFields(state, "es");
        renderValidation();
        renderPreview();
      });
    }
  });

  els.qualities.addEventListener("input", (e) => {
    const translation = getActiveTranslation();
    translation.qualities = splitLines(e.target.value);
    if (activeEditorLanguage === "es") syncLegacyLocalizedFields(state, "es");
    renderValidation();
    renderPreview();
  });

  els.clientSelect.addEventListener("change", (e) => {
    assignClientToState(e.target.value);
    renderAll();
  });

  // Auto-assign client when company name matches a datalist option
  els.companyName?.addEventListener("input", (e) => {
    const typed = e.target.value.trim().toLowerCase();
    if (!typed) return;
    const match = db.clients.find(c => c.name.trim().toLowerCase() === typed);
    if (match && match.id !== state.clientId) {
      assignClientToState(match.id);
      renderAll();
    }
  });
  els.clientSearchInput?.addEventListener("input", (e) => {
    clientSearchTerm = String(e.target.value || "").trim().toLowerCase();
    renderHomeDashboardV2();
  });
  els.promotionSearchInput?.addEventListener("input", (e) => {
    promotionSearchTerm = String(e.target.value || "").trim().toLowerCase();
    renderHomeDashboardV2();
  });
  els.dashboardClientFilter?.addEventListener("change", () => renderHomeDashboardV2());
  els.contactProjectFilter?.addEventListener("change", (e) => {
    contactProjectFilter = String(e.target.value || "");
    renderContactsPanel();
  });
  els.publicBackToTopBtn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("scroll", updatePublicBackToTopButton, { passive: true });
  els.userRole?.addEventListener("change", () => renderUserFormState());
  els.addLanguageBtn?.addEventListener("click", () => {
    if (getProjectLanguages().includes("en")) return;
    state.languages = [...getProjectLanguages(), "en"];
    ensureLanguage(state, "en");
    activeEditorLanguage = "en";
    renderAll();
  });
  els.loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    login();
  });
  els.logoutBtn?.addEventListener("click", () => logout());
  els.adminTabs.forEach((button) => {
    button.addEventListener("click", () => {
      activeAdminSection = button.dataset.adminTab || "control";
      renderAll();
    });
  });

  els.projectSelect.addEventListener("change", (e) => {
    if (!e.target.value) return;
    openProject(e.target.value);
  });
  els.backToDashboardBtn?.addEventListener("click", () => {
    currentView = "dashboard";
    renderAll();
  });
  els.saveDraftBtn?.addEventListener("click", () => saveProjectRecord());
  els.previewDraftBtn?.addEventListener("click", () => openPublishedProjectWindow(state));
  els.publishProjectBtn?.addEventListener("click", () => openProjectLink());
  els.createProjectBackupBtn?.addEventListener("click", () => { void createEntityBackup("project", state.projectId); });
  els.backFromClientBtn?.addEventListener("click", () => {
    currentView = "dashboard";
    renderAll();
  });
  els.openClientProfileBtn?.addEventListener("click", () => {
    currentView = "client";
    renderAll();
  });
  els.createClientProjectBtn?.addEventListener("click", () => createProject());

}

function bindActions() {
  els.addFloorBtn?.addEventListener("click", () => { state.floors.push(createFloor()); renderAll(); });
  els.newClientBtn?.addEventListener("click", () => createClient());
  els.deleteClientBtn?.addEventListener("click", () => deleteActiveClient());
  els.saveClientBtn?.addEventListener("click", () => saveClientFromState());
  els.saveClientProfileBtn?.addEventListener("click", () => saveClientFromState());
  els.newProjectBtn?.addEventListener("click", () => createProject());
  els.saveProjectRecordBtn?.addEventListener("click", () => saveProjectRecord());
  els.newUserBtn?.addEventListener("click", () => resetUserForm());
  els.saveUserBtn?.addEventListener("click", () => { void saveUserFromForm(); });
  els.deleteUserBtn?.addEventListener("click", () => { void deleteSelectedUser(); });
  els.saveBackupSettingsBtn?.addEventListener("click", () => { void saveBackupSettings(); });
  els.createUserBackupBtn?.addEventListener("click", () => { void createEntityBackup("user", selectedUserId); });
  els.exportContactsBtn?.addEventListener("click", () => exportContactsCsv());

  els.saveProjectBtn?.addEventListener("click", () => {
    normalizeStateUrlsInPlace(state);
    downloadFile(`${slugify(state.companyName || state.projectName || "proyecto")}-copia.json`, "application/json", JSON.stringify(state, null, 2));
  });
  els.loadProjectInput?.addEventListener("change", async (e) => {
    const [file] = e.target.files || [];
    if (!file) return;
    try {
      state = normalizeState(JSON.parse(await file.text()));
      currentView = "editor";
      renderAll();
    } catch { window.alert("No se ha podido cargar el proyecto JSON."); }
    finally { e.target.value = ""; }
  });

  els.downloadZipBtn?.addEventListener("click", async () => {
    normalizeStateUrlsInPlace(state);
    const issues = buildValidationIssues(state);
    if (issues.some(issue => issue.level === "error")) {
      window.alert(`Corrige antes de exportar:\n- ${issues.filter(issue => issue.level === "error").map(issue => issue.message).join("\n- ")}`);
      renderValidation();
      return;
    }
    els.downloadZipBtn.textContent = "Generando ZIP...";
    els.downloadZipBtn.disabled = true;
    try { await downloadZip(state); }
    finally { els.downloadZipBtn.textContent = "Descargar ZIP (archivos separados)"; els.downloadZipBtn.disabled = false; }
  });

  els.downloadSiteBtn?.addEventListener("click", () => {
    normalizeStateUrlsInPlace(state);
    const issues = buildValidationIssues(state);
    if (issues.some(issue => issue.level === "error")) {
      window.alert(`Corrige antes de exportar:\n- ${issues.filter(issue => issue.level === "error").map(issue => issue.message).join("\n- ")}`);
      renderValidation();
      return;
    }
    downloadFile(`${slugify(state.companyName || "promocion")}.html`, "text/html", buildSiteHtml(state, { previewMode: false, currentLanguage: activeEditorLanguage }));
  });
  els.downloadDossierBtn?.addEventListener("click", () => {
    normalizeStateUrlsInPlace(state);
    openDesignedDossier(state);
  });
}

// ─── render ────────────────────────────────────────────────────────────────────

function renderClientsDatalist() {
  const dl = document.getElementById("clientsDatalist");
  if (!dl) return;
  dl.innerHTML = db.clients.map(c => `<option value="${escapeAttr(c.name)}"></option>`).join("");
}

function renderAll() {
  state.designVariant = resolveDesignVariantKey(state.designVariant);
  const translation = getActiveTranslation();
  state.headline = translation.headline || "";
  state.introText = translation.introText || "";
  state.youtubeUrl = translation.youtubeUrl || "";
  state.qualities = [...(translation.qualities || [])];
  state.pdfName = translation.pdfName || "";
  syncView();
  renderClientsDatalist();
  renderAuthState();
  renderRoleUi();
  renderLanguageTabs();
  renderStaticDropzones();
  els.projectName.value     = state.projectName;
  els.projectStatus.value   = state.projectStatus;
  if (els.editorProjectMeta) {
    const m = getProjectMetrics(state.projectId);
    const parts = [
      `${m.pageview} visitas`,
      m.contactForm ? `${m.contactForm} contactos` : null,
      m.whatsapp ? `${m.whatsapp} WhatsApp` : null,
      m.pdf ? `${m.pdf} PDF` : null,
      m.tour ? `${m.tour} tour` : null,
    ].filter(Boolean);
    els.editorProjectMeta.textContent = parts.length ? parts.join(" · ") : getProjectDisplayName(state);
  }
  if (els.publishProjectBtn) {
    els.publishProjectBtn.textContent = (state.projectStatus === "published" || state.projectStatus === "unlisted") ? "Ver publicada" : "Publicar";
  }
  els.designVariant.value    = state.designVariant;
  els.companyName.value     = state.companyName;
  els.headline.value        = translation.headline || "";
  els.introText.value       = translation.introText || "";
  els.priceFrom.value       = state.priceFrom;
  els.locationName.value    = state.locationName;
  if (els.province) els.province.value = state.province;
  if (els.city) els.city.value = state.city;
  els.mapsUrl.value         = state.mapsUrl;
  if (els.mapsEmbedUrl) els.mapsEmbedUrl.value = state.mapsEmbedUrl;
  els.youtubeUrl.value      = translation.youtubeUrl || "";
  els.virtualTourUrl.value  = state.virtualTourUrl;
  if (els.companyLocation) els.companyLocation.value = state.companyLocation;
  if (els.companyWebsite) els.companyWebsite.value = state.companyWebsite;
  els.contactPhone.value    = state.contactPhone;
  els.contactEmail.value    = state.contactEmail;
  els.contactWhatsapp.value = state.contactWhatsapp;
  els.socialInstagram.value = state.socialInstagram;
  els.socialFacebook.value  = state.socialFacebook;
  els.socialTwitter.value   = state.socialTwitter;
  if (els.clientProfileName) els.clientProfileName.value = state.companyName;
  if (els.clientProfileLocation) els.clientProfileLocation.value = state.companyLocation;
  if (els.clientProfileWebsite) els.clientProfileWebsite.value = state.companyWebsite;
  if (els.clientProfilePhone) els.clientProfilePhone.value = state.contactPhone;
  if (els.clientProfileEmail) els.clientProfileEmail.value = state.contactEmail;
  if (els.clientProfileWhatsapp) els.clientProfileWhatsapp.value = state.contactWhatsapp;
  if (els.clientProfileInstagram) els.clientProfileInstagram.value = state.socialInstagram;
  if (els.clientProfileFacebook) els.clientProfileFacebook.value = state.socialFacebook;
  if (els.clientProfileTwitter) els.clientProfileTwitter.value = state.socialTwitter;
  if (els.seoTitle) els.seoTitle.value = state.seoTitle;
  if (els.seoDescription) els.seoDescription.value = state.seoDescription;
  if (els.socialImage) els.socialImage.value = state.socialImage;
  els.qualities.value       = (translation.qualities || []).join("\n");
  els.pdfName.value         = translation.pdfName || "";
  renderManagementUi();
  renderUsersPanel();
  renderBackupSettingsPanel();
  renderAdminSections();
  renderClientProjectsPanel();
  syncDesignPicker();
  renderValidation();
  renderFloors();
  renderAssetsLibrary();
  renderProjectVersions();
  renderProjectBackups();
  renderPreview();
  if (currentView === "editor") {
    setSaveStatus("Edicion abierta", "idle");
  }
}

function renderAdminSections() {
  document.querySelectorAll("[data-admin-section]").forEach((node) => {
    node.hidden = node.dataset.adminSection !== activeAdminSection;
  });
  els.adminTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminTab === activeAdminSection);
  });
  if (activeAdminSection === "contacts") {
    renderContactsPanel();
  }
}

function isAdminUser() {
  return db.currentUser?.role === "admin";
}

function renderRoleUi() {
  if (els.usersPanel) els.usersPanel.hidden = !isAdminUser();
  if (els.backupSettingsPanel) els.backupSettingsPanel.hidden = !isAdminUser();
  if (els.newClientBtn) els.newClientBtn.hidden = !isAdminUser();
  if (els.deleteClientBtn) els.deleteClientBtn.hidden = !isAdminUser();
  if (els.dashboardClientFilter?.closest("label")) {
    els.dashboardClientFilter.closest("label").hidden = !isAdminUser();
  }
  if (els.clientSelect) els.clientSelect.disabled = !isAdminUser();
}

function syncView() {
  if (els.publicWorkspace) els.publicWorkspace.hidden = true;
  if (els.authWorkspace) els.authWorkspace.hidden = currentView !== "auth";
  if (els.homeDashboard) els.homeDashboard.hidden = currentView !== "dashboard";
  if (els.clientWorkspace) els.clientWorkspace.hidden = currentView !== "client";
  if (els.editorWorkspace) els.editorWorkspace.hidden = currentView !== "editor";
}

function renderAuthState() {
  if (!els.loginMessage) return;
  if (!els.loginMessage.textContent) {
    els.loginMessage.hidden = true;
  }
}

async function login() {
  const username = String(els.loginUsername?.value || "").trim();
  const password = String(els.loginPassword?.value || "");
  const result = await apiRequest("/login.php", {
    method: "POST",
    body: { username, password },
  });

  if (!result.ok) {
    if (els.loginMessage) {
      els.loginMessage.hidden = false;
      els.loginMessage.textContent = result.error || "Usuario o contraseña incorrectos.";
    }
    return;
  }

  db = normalizeDatabase(result.data || {});
  hydrateDatabase();
  if (els.loginPassword) els.loginPassword.value = "";
  if (els.loginMessage) {
    els.loginMessage.hidden = true;
    els.loginMessage.textContent = "";
  }
  currentView = "dashboard";
  rememberSavedSnapshot(state);
  startAutosaveLoop();
  renderAll();
}

async function logout() {
  await apiRequest("/logout.php", { method: "POST" });
  currentView = "auth";
  stopAutosaveLoop();
  selectedUserId = "";
  projectBackupsCache = [];
  userBackupsCache = [];
  if (els.loginUsername) els.loginUsername.value = "";
  if (els.loginPassword) els.loginPassword.value = "";
  db = { clients: [], users: [], projects: [], analytics: {}, currentUser: null };
  if (els.loginMessage) {
    els.loginMessage.hidden = true;
    els.loginMessage.textContent = "";
  }
  renderAll();
}

async function bootstrapApp() {
  const result = await apiRequest("/bootstrap.php");
  if (!result.ok) {
    if (els.loginMessage) {
      els.loginMessage.hidden = false;
      els.loginMessage.textContent = "No se ha podido conectar con el backend.";
    }
    currentView = "auth";
    return;
  }
  db = normalizeDatabase(result.data || {});
  hydrateDatabase();
  currentView = result.authenticated ? "dashboard" : "auth";
  if (result.authenticated) startAutosaveLoop();
}

async function refreshDatabaseFromServer() {
  const result = await apiRequest("/bootstrap.php");
  if (!result.ok) return false;
  db = normalizeDatabase(result.data || {});
  hydrateDatabase();
  rememberSavedSnapshot(state);
  return true;
}

async function renderPublicProjectFromUrl(projectId, slug) {
  try {
    const param = projectId ? `id=${encodeURIComponent(projectId)}` : `slug=${encodeURIComponent(slug)}`;
    const response = await fetch(`${API_BASE}/public_project.php?${param}`, { credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false || !payload.data?.project?.state) {
      document.body.innerHTML = `<main style="padding:40px;font-family:Inter,Arial,sans-serif"><h1>Promocion no encontrada</h1><p>El enlace no es valido o ya no existe.</p></main>`;
      return;
    }
    const html = buildSiteHtml(normalizeState(payload.data.project.state), { previewMode: false, currentLanguage: PUBLIC_LANGUAGE });
    document.open();
    document.write(html);
    document.close();
  } catch {
    document.body.innerHTML = `<main style="padding:40px;font-family:Inter,Arial,sans-serif"><h1>Error al abrir la promocion</h1><p>No se ha podido cargar este enlace.</p></main>`;
  }
}

function bindPublicFilters() {
  if (els.publicProvinceFilter && !els.publicProvinceFilter.dataset.bound) {
    els.publicProvinceFilter.dataset.bound = "true";
    els.publicProvinceFilter.addEventListener("change", () => {
      populatePublicCityFilter();
      renderPublicCatalog();
    });
  }
  if (els.publicCityFilter && !els.publicCityFilter.dataset.bound) {
    els.publicCityFilter.dataset.bound = "true";
    els.publicCityFilter.addEventListener("change", () => renderPublicCatalog());
  }
  populatePublicProvinceFilter();
  populatePublicCityFilter();
}

function inferProjectProvince(project) {
  return String(project?.state?.province || "").trim();
}

function inferProjectCity(project) {
  return String(project?.state?.city || "").trim();
}

function populatePublicProvinceFilter() {
  if (!els.publicProvinceFilter) return;
  const currentValue = els.publicProvinceFilter.value || "";
  const provinces = [...new Set(publicProjectsCatalog.map(inferProjectProvince).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  els.publicProvinceFilter.innerHTML = [`<option value="">Todas</option>`]
    .concat(provinces.map((province) => `<option value="${escapeAttr(province)}">${escapeHtml(province)}</option>`))
    .join("");
  els.publicProvinceFilter.value = provinces.includes(currentValue) ? currentValue : "";
}

function populatePublicCityFilter() {
  if (!els.publicCityFilter) return;
  const currentValue = els.publicCityFilter.value || "";
  const selectedProvince = String(els.publicProvinceFilter?.value || "").trim();
  const cities = [...new Set(publicProjectsCatalog
    .filter((project) => !selectedProvince || inferProjectProvince(project) === selectedProvince)
    .map(inferProjectCity)
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"));
  els.publicCityFilter.innerHTML = [`<option value="">Todas</option>`]
    .concat(cities.map((city) => `<option value="${escapeAttr(city)}">${escapeHtml(city)}</option>`))
    .join("");
  els.publicCityFilter.value = cities.includes(currentValue) ? currentValue : "";
}

function getPublicFilteredProjects() {
  const province = String(els.publicProvinceFilter?.value || "").trim();
  const city = String(els.publicCityFilter?.value || "").trim();
  return publicProjectsCatalog.filter((project) => {
    const projectProvince = inferProjectProvince(project);
    const projectCity = inferProjectCity(project);
    if (province && province !== projectProvince) return false;
    if (city && city !== projectCity) return false;
    return true;
  });
}

function updatePublicBackToTopButton() {
  if (!els.publicBackToTopBtn) return;
  const shouldShow = window.scrollY > 520 && !els.publicWorkspace?.hidden;
  els.publicBackToTopBtn.hidden = !shouldShow;
}

function renderPublicCatalog() {
  if (!els.publicProjectsGrid) return;
  const projects = getPublicFilteredProjects().sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  if (els.publicResultsCount) {
    els.publicResultsCount.textContent = `${projects.length} ${projects.length === 1 ? "proyecto" : "proyectos"}`;
  }
  els.publicProjectsGrid.innerHTML = projects.length ? projects.map((project, index) => {
    const cover = project?.state?.cover || project?.state?.logo || "";
    const province = inferProjectProvince(project);
    const city = inferProjectCity(project);
    const companyName = String(project?.clientName || project?.state?.companyName || "").trim();
    const location = [city, province].filter(Boolean).join(", ");
    return `
      <article class="public-project-card">
        <a class="public-project-card__media" href="${escapeAttr(getPublicCatalogUrl(project))}">
          ${cover
            ? `<img src="${escapeAttr(cover)}" alt="${escapeAttr(project.name || "Promocion")}" />`
            : `<div class="public-project-card__placeholder">${String(index + 1).padStart(2, "0")}</div>`}
          <div class="public-project-card__overlay">
            ${location ? `<span class="public-project-card__location">${escapeHtml(location)}</span>` : ""}
          </div>
        </a>
        <div class="public-project-card__body">
          <h3>${escapeHtml(project.name || "Promocion")}</h3>
          <p>${escapeHtml(project?.state?.headline || "Promocion inmobiliaria publicada")}</p>
          <div class="public-project-card__footer">
            <strong>${escapeHtml(companyName || "Tupromocion.es")}</strong>
            <a class="site-btn site-btn--primary" style="padding:10px 20px;font-size:0.85rem" href="${escapeAttr(getPublicCatalogUrl(project))}">Ver promoción</a>
          </div>
        </div>
      </article>
    `;
  }).join("") : `<div class="public-empty-state">Todavia no hay promociones publicadas con esos filtros.</div>`;
  updatePublicBackToTopButton();
}

async function renderPublicHome() {
  if (els.publicWorkspace) els.publicWorkspace.hidden = false;
  if (els.authWorkspace) els.authWorkspace.hidden = true;
  if (els.homeDashboard) els.homeDashboard.hidden = true;
  if (els.clientWorkspace) els.clientWorkspace.hidden = true;
  if (els.editorWorkspace) els.editorWorkspace.hidden = true;

  const [projectsResult, clientsResult] = await Promise.all([
    apiRequest("/public_projects.php"),
    apiRequest("/public_clients.php"),
  ]);

  publicProjectsCatalog = Array.isArray(projectsResult.data?.projects) ? projectsResult.data.projects : [];
  bindPublicFilters();
  renderPublicCatalog();

  const clients = Array.isArray(clientsResult.data) ? clientsResult.data : [];
  renderPublicPartners(clients);
}

function renderPublicPartners(clients) {
  const section = document.getElementById("colaboradoras");
  const grid = document.getElementById("partnersGrid");
  if (!section || !grid) return;

  const visible = clients.filter(c => c.name && c.name.trim());
  if (!visible.length) return;

  grid.innerHTML = visible.map(c => {
    const tag = c.website ? "a" : "div";
    const href = c.website ? ` href="${escapeHtml(c.website)}" target="_blank" rel="noopener"` : "";
    const logoHtml = c.logo
      ? `<img class="partner-card__logo" src="${c.logo}" alt="${escapeHtml(c.name)}" loading="lazy" />`
      : `<div class="partner-card__initial">${escapeHtml(c.name.trim()[0].toUpperCase())}</div>`;
    const locationHtml = c.location
      ? `<p class="partner-card__location">${escapeHtml(c.location)}</p>`
      : "";
    return `<${tag} class="partner-card"${href}>${logoHtml}<p class="partner-card__name">${escapeHtml(c.name)}</p>${locationHtml}</${tag}>`;
  }).join("");

  section.hidden = false;
}

function normalizeDatabase(payload) {
  return {
    clients: Array.isArray(payload.clients) ? payload.clients : [],
    users: Array.isArray(payload.users) ? payload.users : [],
    projects: Array.isArray(payload.projects) ? payload.projects : [],
    analytics: payload.analytics && typeof payload.analytics === "object" ? payload.analytics : {},
    leads: Array.isArray(payload.leads) ? payload.leads : [],
    backupSettings: payload.backupSettings && typeof payload.backupSettings === "object" ? payload.backupSettings : {},
    currentUser: payload.currentUser && typeof payload.currentUser === "object" ? payload.currentUser : null,
  };
}

async function apiRequest(path, { method = "GET", body } = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok && data.ok !== false,
      authenticated: Boolean(data.authenticated),
      data: data.data || {},
      error: data.error || "",
    };
  } catch {
    return { ok: false, authenticated: false, data: {}, error: "Error de conexión." };
  }
}

function getStateSnapshotForAutosave(projectState = state) {
  try {
    return JSON.stringify(projectState);
  } catch {
    return "";
  }
}

function startAutosaveLoop() {
  if (autosaveIntervalId) return;
  autosaveIntervalId = window.setInterval(() => {
    void maybeAutosaveProject();
  }, 5000);
}

function stopAutosaveLoop() {
  if (!autosaveIntervalId) return;
  clearInterval(autosaveIntervalId);
  autosaveIntervalId = null;
}

async function maybeAutosaveProject() {
  if (currentView !== "editor") return;
  if (!db.currentUser?.id) return;
  if (!state.clientId) return;
  const snapshot = getStateSnapshotForAutosave();
  if (!snapshot || snapshot === lastServerSavedSnapshot) return;
  await saveProjectRecord("", { silent: true, autosave: true });
}

function rememberSavedSnapshot(projectState = state) {
  lastServerSavedSnapshot = getStateSnapshotForAutosave(projectState);
}

function getProjectMetrics(projectId) {
  const entry = db.analytics?.[projectId] || {};
  return {
    pageview: Number(entry.pageview || 0),
    whatsapp: Number(entry.whatsapp || 0),
    phone: Number(entry.phone || 0),
    email: Number(entry.email || 0),
    tour: Number(entry.tour || 0),
    pdf: Number(entry.pdf || 0),
    youtube: Number(entry.youtube || 0),
    contactForm: Number(entry.contactForm || 0),
  };
}

function getProjectInteractionCount(projectId) {
  const metrics = getProjectMetrics(projectId);
  return metrics.whatsapp + metrics.phone + metrics.email + metrics.tour + metrics.pdf + metrics.youtube;
}

async function loadProjectVersions(projectId) {
  if (!projectId) {
    projectVersionsCache = [];
    return;
  }
  const result = await apiRequest(`/project_versions.php?projectId=${encodeURIComponent(projectId)}`);
  projectVersionsCache = result.ok && Array.isArray(result.data?.versions) ? result.data.versions : [];
}

async function restoreProjectVersion(versionId) {
  if (!state.projectId || !versionId) return;
  const confirmed = window.confirm("Se recuperara esta version guardada del proyecto.");
  if (!confirmed) return;
  const result = await apiRequest("/restore_project_version.php", {
    method: "POST",
    body: { projectId: state.projectId, versionId },
  });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido recuperar la version.");
    return;
  }
  db = normalizeDatabase(result.data || {});
  hydrateDatabase();
  const project = getProjectById(state.projectId);
  if (project?.state) {
    state = normalizeState(project.state);
    state.projectId = project.id || state.projectId;
    state.projectStatus = project.status || state.projectStatus;
  }
  await loadProjectVersions(state.projectId);
  await loadEntityBackups("project", state.projectId);
  rememberSavedSnapshot(state);
  renderAll();
}

function collectProjectAssets(projectState = state) {
  const items = [];
  const push = (type, label, src) => {
    if (!src) return;
    items.push({ type, label, src });
  };
  push("image", "Logotipo", projectState.logo);
  push("image", "Portada", projectState.cover);
  push("image", "Imagen social", projectState.socialImage);
  push("image", "Portada tour", projectState.virtualTourCover);
  push("pdf", projectState.pdfName || "Dossier PDF", projectState.pdfFile);
  projectState.floors.forEach((floor, floorIndex) => {
    push("image", `Plano · ${floor.name || `Tipologia ${floorIndex + 1}`}`, floor.plan);
    floor.zones.forEach((zone, zoneIndex) => {
      zone.images.forEach((image, imageIndex) => {
        push("image", `${floor.name || `Tipologia ${floorIndex + 1}`} · ${zone.name || `Zona ${zoneIndex + 1}`} · ${imageIndex + 1}`, image);
      });
    });
  });
  return items;
}

function renderAssetsLibrary() {
  if (!els.assetsLibrary) return;
  const assets = collectProjectAssets();
  els.assetsLibrary.innerHTML = assets.length
    ? assets.map((asset) => asset.type === "pdf"
      ? `<article class="asset-card asset-card--file">
          <div class="asset-card__icon">${iconPdf()}</div>
          <div class="asset-card__meta">
            <strong>${escapeHtml(asset.label)}</strong>
            <span>PDF listo para descarga</span>
          </div>
          <a class="asset-card__link" href="${escapeAttr(asset.src)}" target="_blank" rel="noreferrer">Abrir</a>
        </article>`
      : `<article class="asset-card">
          <img src="${escapeAttr(asset.src)}" alt="${escapeAttr(asset.label)}" />
          <div class="asset-card__meta">
            <strong>${escapeHtml(asset.label)}</strong>
            <span>Imagen del proyecto</span>
          </div>
          <a class="asset-card__link" href="${escapeAttr(asset.src)}" target="_blank" rel="noreferrer">Abrir</a>
        </article>`)
      .join("")
    : `<div class="dashboard-empty">Todavia no hay archivos cargados en esta promocion.</div>`;
}

function renderProjectVersions() {
  if (!els.projectVersions) return;
  if (!state.projectId) {
    els.projectVersions.innerHTML = `<div class="dashboard-empty">Guarda primero la promocion para empezar a crear historial.</div>`;
    return;
  }
  els.projectVersions.innerHTML = projectVersionsCache.length
    ? projectVersionsCache.map((version) => `
      <article class="version-card">
        <div>
          <strong>${escapeHtml(version.name || "Proyecto")}</strong>
          <span>${escapeHtml(formatShortDate(version.savedAt))} · ${escapeHtml(formatClockTime(version.savedAt || new Date().toISOString()))}</span>
        </div>
        <button class="secondary-btn secondary-btn--compact" type="button" data-restore-version="${escapeAttr(version.id)}">Recuperar</button>
      </article>
    `).join("")
    : `<div class="dashboard-empty">Aun no hay versiones guardadas para esta promocion.</div>`;
  els.projectVersions.querySelectorAll("[data-restore-version]").forEach((button) => {
    button.addEventListener("click", () => { void restoreProjectVersion(button.dataset.restoreVersion); });
  });
}

function scheduleLocalDraftBackup() {
  if (localDraftSaveTimer) clearTimeout(localDraftSaveTimer);
  setSaveStatus("Actualizando copia local...", "saving");
  localDraftSaveTimer = setTimeout(() => {
    void persistLocalDraft();
  }, 500);
}

function cancelLocalDraftBackup() {
  if (!localDraftSaveTimer) return;
  clearTimeout(localDraftSaveTimer);
  localDraftSaveTimer = null;
}

function openLocalDraftDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible."));
      return;
    }
    const request = indexedDB.open(LOCAL_DRAFT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(LOCAL_DRAFT_STORE)) {
        dbInstance.createObjectStore(LOCAL_DRAFT_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No se ha podido abrir la copia local."));
  });
}

function idbPut(dbInstance, value) {
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(LOCAL_DRAFT_STORE, "readwrite");
    tx.objectStore(LOCAL_DRAFT_STORE).put(value);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("No se ha podido guardar la copia local."));
  });
}

function idbGet(dbInstance, key) {
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(LOCAL_DRAFT_STORE, "readonly");
    const request = tx.objectStore(LOCAL_DRAFT_STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("No se ha podido leer la copia local."));
  });
}

function idbDelete(dbInstance, key) {
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(LOCAL_DRAFT_STORE, "readwrite");
    tx.objectStore(LOCAL_DRAFT_STORE).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("No se ha podido borrar la copia local."));
  });
}

async function persistLocalDraft() {
  if (currentView !== "editor") return;
  try {
    normalizeStateUrlsInPlace(state);
    const dbInstance = await openLocalDraftDb();
    await idbPut(dbInstance, {
      id: LOCAL_DRAFT_KEY,
      savedAt: new Date().toISOString(),
      projectId: state.projectId || "",
      projectName: state.projectName || "",
      state: structuredClone(state),
    });
    dbInstance.close?.();
    setSaveStatus(`Copia local ${formatClockTime(new Date())}`, "local");
  } catch {
    // Si falla la copia local, no bloqueamos al usuario.
  }
}

async function clearLocalDraft() {
  try {
    const dbInstance = await openLocalDraftDb();
    await idbDelete(dbInstance, LOCAL_DRAFT_KEY);
    dbInstance.close?.();
  } catch {
    // Si falla el borrado, no bloqueamos al usuario.
  }
}

async function maybeRestoreLocalDraft() {
  if (localDraftRestoreChecked) return;
  localDraftRestoreChecked = true;
  try {
    const dbInstance = await openLocalDraftDb();
    const backup = await idbGet(dbInstance, LOCAL_DRAFT_KEY);
    dbInstance.close?.();
    if (!backup?.state) return;
    const projectName = backup.projectName || backup.state?.projectName || "esta promocion";
    const confirmed = window.confirm(`He encontrado un borrador local de "${projectName}". ¿Quieres recuperarlo?`);
    if (!confirmed) return;
    state = normalizeState(backup.state);
    currentView = "editor";
  } catch {
    // Si falla la lectura, continuamos sin interrumpir.
  }
}

function downloadRescueState() {
  normalizeStateUrlsInPlace(state);
  downloadFile(
    `${slugify(state.companyName || state.projectName || "rescate-promocion")}-rescate.json`,
    "application/json",
    JSON.stringify(state, null, 2)
  );
}

function renderFloors() {
  els.floorsList.innerHTML = "";
  const translation = getActiveTranslation();
  state.floors.forEach((floor, index) => {
    const frag = els.floorTemplate.content.cloneNode(true);
    const card = frag.querySelector(".floor-card");

    const title    = frag.querySelector(".floor-card__title");
    const duplicateBtn = frag.querySelector(".floor-duplicate-btn");
    const delBtn   = frag.querySelector(".floor-delete-btn");
    const nameInp  = frag.querySelector(".floor-name");
    const descInp  = frag.querySelector(".floor-description");
    const tourUrlInp = frag.querySelector(".floor-tour-url");
    const tourCoverWrap = frag.querySelector(".floor-tour-cover-wrap");
    const areaInp  = frag.querySelector(".floor-area");
    const bedInp   = frag.querySelector(".floor-bedrooms");
    const bathInp  = frag.querySelector(".floor-bathrooms");
    const zonesWrap = frag.querySelector(".floor-zones-wrap");
    const planWrap  = frag.querySelector(".floor-plan-wrap");

    const floorTranslation = getFloorTranslation(translation, floor);
    title.textContent = floorTranslation.name || `Tipologia ${index + 1}`;
    nameInp.value  = floorTranslation.name || "";
    descInp.value  = floorTranslation.description || "";
    tourUrlInp.value = floor.virtualTourUrl || "";
    areaInp.value  = floor.area;
    bedInp.value   = floor.bedrooms;
    bathInp.value  = floor.bathrooms;

    nameInp.addEventListener("input", (e) => { floorTranslation.name = e.target.value; if (activeEditorLanguage === "es") floor.name = e.target.value; title.textContent = floorTranslation.name || `Tipologia ${index + 1}`; renderPreview(); });
    descInp.addEventListener("input", (e) => { floorTranslation.description = e.target.value; if (activeEditorLanguage === "es") floor.description = e.target.value; renderPreview(); });
    tourUrlInp.addEventListener("input", (e) => { floor.virtualTourUrl = e.target.value; renderPreview(); });
    tourUrlInp.addEventListener("blur", (e) => {
      const normalized = normalizeUrl(e.target.value);
      e.target.value = normalized;
      floor.virtualTourUrl = normalized;
      renderPreview();
    });
    areaInp.addEventListener("input", (e) => { floor.area = e.target.value; renderPreview(); });
    bedInp.addEventListener("input",  (e) => { floor.bedrooms = e.target.value; renderPreview(); });
    bathInp.addEventListener("input", (e) => { floor.bathrooms = e.target.value; renderPreview(); });
    duplicateBtn.addEventListener("click", () => {
      duplicateFloor(floor.id);
    });
    delBtn.addEventListener("click", () => { state.floors = state.floors.filter(f => f.id !== floor.id); renderAll(); });

    // zones section heading
    const zonesHeading = document.createElement("div");
    zonesHeading.className = "floor-zones-heading";
    zonesHeading.innerHTML = `<h4>Imagenes por zona</h4><span>Una zona por espacio</span>`;
    zonesWrap.appendChild(zonesHeading);

    // render each zone
    floor.zones.forEach(zone => zonesWrap.appendChild(buildZoneCard(zone, floor)));

    // add-zone button
    const addZoneBtn = document.createElement("button");
    addZoneBtn.type = "button";
    addZoneBtn.className = "zone-add-btn";
    addZoneBtn.textContent = "+ Añadir zona";
    addZoneBtn.addEventListener("click", () => {
      floor.zones.push({ id: safeRandomUUID(), name: "", images: [] });
      floorTranslation.zones.push({ id: floor.zones.at(-1).id, name: "" });
      renderAll();
    });
    zonesWrap.appendChild(addZoneBtn);

    const tourLabel = document.createElement("p");
    tourLabel.className = "drop-label";
    tourLabel.textContent = "Portada del tour de esta tipologia";
    tourCoverWrap.appendChild(tourLabel);

    const tourNode = document.createElement("div");
    tourNode.className = "dropzone";
    tourCoverWrap.appendChild(tourNode);

    setupDropzone({
      node: tourNode, multiple: false, accept: "image/*",
      onFiles: async (files) => { floor.virtualTourCover = await compressImage(files[0], 1600, 0.84) || null; renderAll(); },
      preview: () => floor.virtualTourCover
        ? `<div class="single-thumb"><img src="${escapeAttr(floor.virtualTourCover)}" alt="Portada del tour de la tipologia" /></div>`
        : dropzoneText("Arrastra una portada", "opcional para esta tipologia"),
    });

    // plan
    const planLabel = document.createElement("p");
    planLabel.className = "drop-label";
    planLabel.textContent = "Plano de distribucion";
    planWrap.appendChild(planLabel);

    const planNode = document.createElement("div");
    planNode.className = "dropzone";
    planWrap.appendChild(planNode);

    setupDropzone({
      node: planNode, multiple: false, accept: "image/*",
      onFiles: async (files) => { floor.plan = await compressImage(files[0], 1600, 0.85) || null; renderAll(); },
      preview: () => floor.plan
        ? `<div class="single-thumb"><img src="${escapeAttr(floor.plan)}" alt="Plano" /></div>`
        : dropzoneText("Arrastra el plano", "una sola imagen"),
    });

    els.floorsList.appendChild(frag);
  });
}

function buildZoneCard(zone, floor) {
  const translation = getActiveTranslation();
  const floorTranslation = getFloorTranslation(translation, floor);
  let zoneTranslation = floorTranslation.zones.find((entry) => entry.id === zone.id);
  if (!zoneTranslation) {
    zoneTranslation = { id: zone.id, name: zone.name || "" };
    floorTranslation.zones.push(zoneTranslation);
  }
  const div = document.createElement("div");
  div.className = "zone-card";

  const header = document.createElement("div");
  header.className = "zone-card__header";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = zoneTranslation.name || "";
  nameInput.placeholder = "Nombre de la zona (ej. Salon)";
  nameInput.addEventListener("input", (e) => { zoneTranslation.name = e.target.value; if (activeEditorLanguage === "es") zone.name = e.target.value; renderPreview(); });

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "icon-btn";
  delBtn.textContent = "Eliminar";

  const duplicateBtn = document.createElement("button");
  duplicateBtn.type = "button";
  duplicateBtn.className = "soft-icon-btn";
  duplicateBtn.textContent = "Duplicar";
  duplicateBtn.addEventListener("click", () => {
    const clone = {
      id: safeRandomUUID(),
      name: `${zone.name || "Zona"} copia`,
      images: [...zone.images],
    };
    floor.zones.splice(floor.zones.indexOf(zone) + 1, 0, clone);
    floorTranslation.zones.push({ id: clone.id, name: clone.name });
    renderAll();
  });
  delBtn.addEventListener("click", () => {
    floor.zones = floor.zones.filter(z => z.id !== zone.id);
    floorTranslation.zones = floorTranslation.zones.filter(z => z.id !== zone.id);
    renderAll();
  });

  header.append(nameInput, duplicateBtn, delBtn);
  div.appendChild(header);

  const dropNode = document.createElement("div");
  dropNode.className = "dropzone";
  div.appendChild(dropNode);

  setupDropzone({
    node: dropNode, multiple: true, accept: "image/*",
    onFiles: async (files) => {
      const imgs = await Promise.all(files.map(f => compressImage(f, 1920, 0.82)));
      zone.images = [...zone.images, ...imgs.filter(Boolean)];
      renderAll();
    },
    preview: () => zone.images.length
      ? renderThumbList(zone.images, "Imagen", { reorderable: true })
      : dropzoneText("Arrastra las imagenes", "puedes soltar varias a la vez"),
  });

  dropNode.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest("[data-delete-thumb]");
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const index = Number(deleteBtn.dataset.index);
      if (!Number.isNaN(index)) {
        zone.images.splice(index, 1);
        renderAll();
      }
      return;
    }

    const btn = e.target.closest("[data-move-thumb]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const index = Number(btn.dataset.index);
    const direction = Number(btn.dataset.moveThumb);
    const targetIndex = index + direction;
    if (Number.isNaN(index) || Number.isNaN(direction)) return;
    if (targetIndex < 0 || targetIndex >= zone.images.length) return;
    [zone.images[index], zone.images[targetIndex]] = [zone.images[targetIndex], zone.images[index]];
    renderAll();
  });

  // Drag & drop reorder
  let _dragIdx = -1;
  dropNode.addEventListener("dragstart", (e) => {
    const item = e.target.closest("[data-drag-index]");
    if (!item) return;
    _dragIdx = Number(item.dataset.dragIndex);
    item.classList.add("thumb-item--dragging");
  });
  dropNode.addEventListener("dragend", (e) => {
    const item = e.target.closest("[data-drag-index]");
    if (item) item.classList.remove("thumb-item--dragging");
    dropNode.querySelectorAll(".thumb-item--dragover").forEach(el => el.classList.remove("thumb-item--dragover"));
  });
  dropNode.addEventListener("dragover", (e) => {
    const item = e.target.closest("[data-drag-index]");
    if (!item || _dragIdx < 0) return;
    e.preventDefault();
    dropNode.querySelectorAll(".thumb-item--dragover").forEach(el => el.classList.remove("thumb-item--dragover"));
    item.classList.add("thumb-item--dragover");
  });
  dropNode.addEventListener("drop", (e) => {
    const item = e.target.closest("[data-drag-index]");
    if (!item || _dragIdx < 0) return;
    e.preventDefault();
    const targetIdx = Number(item.dataset.dragIndex);
    if (targetIdx !== _dragIdx) {
      const moved = zone.images.splice(_dragIdx, 1)[0];
      zone.images.splice(targetIdx, 0, moved);
      renderAll();
    }
    _dragIdx = -1;
  });

  return div;
}

function renderPreview() {
  els.previewFrame.srcdoc = buildSiteHtml(state, { previewMode: true, currentLanguage: activeEditorLanguage });
}

function renderStaticDropzones() {
  setupDropzone({
    node: document.querySelector('[data-dropzone="logo"]'),
    multiple: false, accept: ".jpg,.jpeg,.png,image/jpeg,image/png",
    onFiles: async (files) => { state.logo = await compressImage(files[0], 400, 0.88) || null; renderAll(); },
    preview: () => state.logo
      ? `<div class="single-thumb single-thumb--logo"><img src="${escapeAttr(state.logo)}" alt="Logo" /></div>`
      : dropzoneText("Arrastra el logotipo", "formatos JPG o PNG"),
  });

  setupDropzone({
    node: document.querySelector('[data-dropzone="cover"]'),
    multiple: false, accept: "image/*",
    onFiles: async (files) => { state.cover = await compressImage(files[0], 1920, 0.85) || null; renderAll(); },
    preview: () => state.cover
      ? `<div class="single-thumb"><img src="${escapeAttr(state.cover)}" alt="Portada" /></div>`
      : dropzoneText("Arrastra la imagen principal", "ideal para la cabecera"),
  });

  setupDropzone({
    node: document.querySelector('[data-dropzone="clientLogo"]'),
    multiple: false, accept: ".jpg,.jpeg,.png,image/jpeg,image/png",
    onFiles: async (files) => { state.logo = await compressImage(files[0], 400, 0.88) || null; renderAll(); },
    preview: () => state.logo
      ? `<div class="single-thumb single-thumb--logo"><img src="${escapeAttr(state.logo)}" alt="Logo del cliente" /></div>`
      : dropzoneText("Arrastra el logotipo", "imagen corporativa en JPG o PNG"),
  });

  setupDropzone({
    node: document.querySelector('[data-dropzone="pdf"]'),
    multiple: false, accept: "application/pdf",
    onFiles: async (files) => {
      const file = files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        state.pdfFile = String(reader.result);
        if (!state.pdfName || state.pdfName === defaultState.pdfName) {
          state.pdfName = file.name.replace(/\.pdf$/i, "");
          if (els.pdfName) els.pdfName.value = state.pdfName;
        }
        renderAll();
      };
      reader.readAsDataURL(file);
    },
    preview: () => state.pdfFile
      ? `<div class="pdf-preview">
           <div class="pdf-preview__icon">${iconPdf()}</div>
           <div class="pdf-preview__info">
             <strong>${escapeHtml(state.pdfName || "Dossier")}</strong>
             <span>PDF cargado &mdash; haz clic para cambiar</span>
           </div>
         </div>`
      : dropzoneText("Arrastra el PDF", "o haz clic para seleccionar"),
  });

  setupDropzone({
    node: document.querySelector('[data-dropzone="tourCover"]'),
    multiple: false, accept: "image/*",
    onFiles: async (files) => { state.virtualTourCover = await compressImage(files[0], 1600, 0.84) || null; renderAll(); },
    preview: () => state.virtualTourCover
      ? `<div class="single-thumb"><img src="${escapeAttr(state.virtualTourCover)}" alt="Portada del tour virtual" /></div>`
      : dropzoneText("Arrastra una portada", "opcional para el tour virtual"),
  });
}

// ─── dropzone ──────────────────────────────────────────────────────────────────

function setupDropzone({ node, multiple, accept, onFiles, preview }) {
  if (!node) return;
  node.innerHTML = "";

  const input = document.createElement("input");
  input.type = "file"; input.accept = accept; input.multiple = multiple;

  const content = document.createElement("div");
  content.className = "dropzone__content";
  content.innerHTML = preview();

  node.append(content, input);
  node.addEventListener("click", (e) => {
    if (e.target.closest("[data-delete-thumb], [data-move-thumb], button, a, input, textarea, select")) {
      return;
    }
    input.click();
  });
  input.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await onFiles(files);
    input.value = "";
  });

  ["dragenter", "dragover"].forEach(ev => node.addEventListener(ev, (e) => { e.preventDefault(); node.classList.add("is-active"); }));
  ["dragleave", "drop"].forEach(ev => node.addEventListener(ev, (e) => { e.preventDefault(); node.classList.remove("is-active"); }));
  node.addEventListener("drop", async (e) => {
    const files = Array.from(e.dataTransfer?.files || []).filter(f => accept === "application/pdf" ? f.type === "application/pdf" : f.type.startsWith("image/"));
    if (!files.length) return;
    await onFiles(files);
  });
}

// ─── image compression ─────────────────────────────────────────────────────────

function compressImage(file, maxPx, quality) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
      return;
    }
    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else { width = Math.round(width * maxPx / height); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const outputType = file.type === "image/png" || file.type === "image/webp" ? "image/png" : "image/jpeg";
      resolve(canvas.toDataURL(outputType, quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ─── ZIP export ────────────────────────────────────────────────────────────────

async function downloadZip(s) {
  const zip = new JSZip();
  const assetMap = new Map();
  let counter = 0;

  function inferExtFromUrl(url, fallback = "bin") {
    try {
      const pathname = new URL(url, window.location.href).pathname;
      const last = pathname.split("/").pop() || "";
      const ext = last.includes(".") ? last.split(".").pop().toLowerCase() : "";
      return ext || fallback;
    } catch {
      return fallback;
    }
  }

  function inferExtFromContentType(contentType, fallback = "bin") {
    const value = String(contentType || "").toLowerCase();
    if (value.includes("application/pdf")) return "pdf";
    if (value.includes("image/png")) return "png";
    if (value.includes("image/webp")) return "webp";
    if (value.includes("image/svg")) return "svg";
    if (value.includes("image/gif")) return "gif";
    if (value.includes("image/jpeg")) return "jpg";
    return fallback;
  }

  async function reg(source, hint) {
    if (!source) return source;
    if (assetMap.has(source)) return assetMap.get(source);

    let path = "";
    if (source.startsWith("data:")) {
      const isPdf = source.startsWith("data:application/pdf");
      const ext = isPdf ? "pdf" : (source.startsWith("data:image/png") ? "png" : (source.startsWith("data:image/webp") ? "webp" : "jpg"));
      path = `assets/${hint}-${++counter}.${ext}`;
      const base64 = source.split(",")[1];
      if (base64) zip.file(path, base64, { base64: true });
      assetMap.set(source, path);
      return path;
    }

    try {
      const response = await fetch(source);
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const ext = inferExtFromContentType(contentType, inferExtFromUrl(source, "bin"));
        path = `assets/${hint}-${++counter}.${ext}`;
        zip.file(path, await response.arrayBuffer());
        assetMap.set(source, path);
        return path;
      }
    } catch {
      // Si no se puede descargar, dejamos la URL tal cual.
    }

    return source;
  }

  const mapped = {
    ...s,
    logo:    await reg(s.logo, "logo"),
    cover:   await reg(s.cover, "cover"),
    socialImage: await reg(s.socialImage, "social"),
    virtualTourCover: await reg(s.virtualTourCover, "tour-cover"),
    pdfFile: await reg(s.pdfFile, "dossier"),
    floors:  await Promise.all(s.floors.map(async (f) => ({
      ...f,
      virtualTourCover: await reg(f.virtualTourCover, "floor-tour-cover"),
      zones: await Promise.all(f.zones.map(async (z) => ({ ...z, images: await Promise.all(z.images.map(img => reg(img, "render"))) }))),
      plan: await reg(f.plan, "plan"),
    }))),
  };

  zip.file("index.html", buildSiteHtml(mapped, { usePaths: true, previewMode: false, currentLanguage: activeEditorLanguage }));
  zip.file("dossier-print.html", buildDesignedDossierHtml(mapped, { currentLanguage: activeEditorLanguage, autoPrint: false }));

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${slugify(s.companyName || "promocion")}.zip`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function createFloor() {
  return {
    id: safeRandomUUID(),
    name: "",
    description: "",
    area: "",
    bedrooms: "",
    bathrooms: "",
    virtualTourUrl: "",
    virtualTourCover: null,
    zones: [{ id: safeRandomUUID(), name: "General", images: [] }],
    plan: null,
  };
}

function duplicateFloor(floorId) {
  const sourceIndex = state.floors.findIndex((floor) => floor.id === floorId);
  if (sourceIndex < 0) return;
  const sourceFloor = state.floors[sourceIndex];
  const clonedFloor = {
    ...structuredClone(sourceFloor),
    id: safeRandomUUID(),
    zones: sourceFloor.zones.map((zone) => ({
      ...structuredClone(zone),
      id: safeRandomUUID(),
      images: [...zone.images],
    })),
  };
  state.floors.splice(sourceIndex + 1, 0, clonedFloor);

  getProjectLanguages().forEach((lang) => {
    const translation = ensureLanguage(state, lang);
    const sourceTranslation = getFloorTranslation(translation, sourceFloor);
    translation.floors.splice(sourceIndex + 1, 0, {
      id: clonedFloor.id,
      name: sourceTranslation.name ? `${sourceTranslation.name} copia` : "",
      description: sourceTranslation.description || "",
      zones: clonedFloor.zones.map((zone, zoneIndex) => ({
        id: zone.id,
        name: sourceTranslation.zones?.[zoneIndex]?.name || "",
      })),
    });
  });

  renderAll();
}

function splitLines(text) { return text.split("\n").map(s => s.trim()).filter(Boolean); }

function renderThumbList(images, alt, { reorderable = false } = {}) {
  return `<div class="thumb-list">${images.map((img, index) => `
    <div class="thumb-item" ${reorderable ? `draggable="true" data-drag-index="${index}"` : ""}>
      <img class="thumb" src="${escapeAttr(img)}" alt="${escapeAttr(`${alt} ${index + 1}`)}" />
      ${reorderable ? `
        <div class="thumb-actions">
          <button class="thumb-action-btn" type="button" title="Subir" aria-label="Subir" data-move-thumb="-1" data-index="${index}" ${index === 0 ? "disabled" : ""}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l-6 6h4v8h4v-8h4z"/></svg>
          </button>
          <button class="thumb-action-btn" type="button" title="Bajar" aria-label="Bajar" data-move-thumb="1" data-index="${index}" ${index === images.length - 1 ? "disabled" : ""}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19l6-6h-4V5h-4v8H6z"/></svg>
          </button>
          <button class="thumb-action-btn thumb-action-btn--danger" type="button" title="Quitar" aria-label="Quitar" data-delete-thumb="1" data-index="${index}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13H7zm3-3h6l1 2H8z"/></svg>
          </button>
        </div>
      ` : ""}
    </div>
  `).join("")}</div>`;
}

function ensureSeedClient() {
  if (db.clients.length) {
    if (!state.clientId) assignClientToState(db.clients[0].id);
    return;
  }
  state.clientId = "";
}

function hydrateDatabase() {
  db.clients = Array.isArray(db.clients)
    ? db.clients
        .filter((client) => client && typeof client === "object")
        .map((client) => ({
          id: String(client.id || safeRandomUUID()),
          name: String(client.name || "").trim() || "Cliente sin nombre",
          logo: typeof client.logo === "string" ? client.logo : null,
          companyLocation: String(client.companyLocation || ""),
          companyWebsite: String(client.companyWebsite || ""),
          contactPhone: String(client.contactPhone || ""),
          contactEmail: String(client.contactEmail || ""),
          contactWhatsapp: String(client.contactWhatsapp || ""),
          socialInstagram: String(client.socialInstagram || ""),
          socialFacebook: String(client.socialFacebook || ""),
          socialTwitter: String(client.socialTwitter || ""),
          createdAt: String(client.createdAt || new Date().toISOString()),
          updatedAt: String(client.updatedAt || new Date().toISOString()),
        }))
    : [];
  db.users = Array.isArray(db.users)
    ? db.users
        .filter((user) => user && typeof user === "object")
        .map((user) => ({
          id: String(user.id || safeRandomUUID()),
          name: String(user.name || user.username || "").trim(),
          username: String(user.username || "").trim() || "admin",
          password: String(user.password || ""),
          role: String(user.role || "admin"),
          clientId: String(user.clientId || ""),
          createdAt: String(user.createdAt || new Date().toISOString()),
          updatedAt: String(user.updatedAt || new Date().toISOString()),
        }))
    : [];
  db.projects = Array.isArray(db.projects) ? db.projects.filter(Boolean) : [];
  db.analytics = db.analytics && typeof db.analytics === "object" ? db.analytics : {};
  db.leads = Array.isArray(db.leads) ? db.leads.filter((lead) => lead && typeof lead === "object") : [];
  db.backupSettings = db.backupSettings && typeof db.backupSettings === "object" ? db.backupSettings : {};
  if (!db.clients.length) ensureSeedClient();
}

function getUiClients() {
  hydrateDatabase();
  return db.clients.length ? db.clients : [{
    id: "seed",
    name: state.companyName || defaultState.companyName,
    logo: state.logo || null,
  }];
}

function getClientById(clientId) {
  return db.clients.find((client) => client.id === clientId) || null;
}

function getProjectById(projectId) {
  return db.projects.find((project) => project.id === projectId) || null;
}

function assignClientToState(clientId) {
  const client = getClientById(clientId);
  state.clientId = clientId || "";
  if (!client) return;
  state.companyName = client.name || "";
  state.logo = client.logo || null;
  state.companyLocation = client.companyLocation || "";
  state.companyWebsite = client.companyWebsite || "";
  state.contactPhone = client.contactPhone || "";
  state.contactEmail = client.contactEmail || "";
  state.contactWhatsapp = client.contactWhatsapp || "";
  state.socialInstagram = client.socialInstagram || "";
  state.socialFacebook = client.socialFacebook || "";
  state.socialTwitter = client.socialTwitter || "";
}

async function createClient() {
  const name = `Nuevo cliente ${db.clients.length + 1}`;
  const client = {
    id: safeRandomUUID(),
    name,
    logo: null,
    companyLocation: "",
    companyWebsite: "",
    contactPhone: "",
    contactEmail: "",
    contactWhatsapp: "",
    socialInstagram: "",
    socialFacebook: "",
    socialTwitter: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const result = await apiRequest("/upsert_client.php", { method: "POST", body: { client } });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido crear el cliente.");
    return;
  }
  await refreshDatabaseFromServer();
  assignClientToState(client.id);
  currentView = "client";
  renderAll();
}

async function deleteActiveClient() {
  const clientId = state.clientId;
  if (!clientId) {
    window.alert("No hay cliente seleccionado.");
    return;
  }

  const linkedProjects = db.projects.filter((project) => project.clientId === clientId);
  if (linkedProjects.length) {
    window.alert("No puedes borrar este cliente porque tiene promociones asociadas.");
    return;
  }

  const client = getClientById(clientId);
  if (!client) return;
  const confirmed = window.confirm(`Se borrara el cliente "${client.name || "Cliente"}".`);
  if (!confirmed) return;

  const result = await apiRequest("/delete_client.php", { method: "POST", body: { id: clientId } });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido borrar el cliente.");
    return;
  }
  await refreshDatabaseFromServer();
  state.clientId = db.clients[0]?.id || "";
  if (state.clientId) assignClientToState(state.clientId);
  renderAll();
}

async function saveClientFromState() {
  const now = new Date().toISOString();
  let client = getClientById(state.clientId);
  if (!client) {
    client = { id: safeRandomUUID(), createdAt: now };
    state.clientId = client.id;
  }
  const payload = {
    ...client,
    name: state.companyName.trim() || "Cliente sin nombre",
    logo: state.logo || null,
    companyLocation: state.companyLocation,
    companyWebsite: state.companyWebsite,
    contactPhone: state.contactPhone,
    contactEmail: state.contactEmail,
    contactWhatsapp: state.contactWhatsapp,
    socialInstagram: state.socialInstagram,
    socialFacebook: state.socialFacebook,
    socialTwitter: state.socialTwitter,
    updatedAt: now,
  };
  const result = await apiRequest("/upsert_client.php", { method: "POST", body: { client: payload } });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido guardar el cliente.");
    return;
  }
  await refreshDatabaseFromServer();
  if (currentView === "client") currentView = "dashboard";
  renderAll();
}

function createProject() {
  const client = getClientById(state.clientId) || db.clients[0] || null;
  state = structuredClone(defaultState);
  state.projectId = safeRandomUUID();
  state.projectName = "";
  state.projectStatus = "draft";
  state.clientId = client?.id || "";
  if (client) assignClientToState(client.id);
  currentView = "editor";
  renderAll();
}

async function saveProjectRecord(statusOverride = "", { openPublishedWindow = false, silent = false, autosave = false } = {}) {
  normalizeStateUrlsInPlace(state);
  if (!state.projectId) state.projectId = safeRandomUUID();
  if (!state.projectName.trim()) state.projectName = state.headline.trim() || state.companyName.trim() || "Proyecto sin titulo";
  if (statusOverride) state.projectStatus = statusOverride;
  setSaveStatus(autosave ? "Autoguardando..." : "Guardando proyecto...", "saving");
  const now = new Date().toISOString();
  const current = getProjectById(state.projectId);
  const record = {
    id: state.projectId,
    clientId: state.clientId || "",
    name: state.projectName.trim(),
    status: state.projectStatus || "draft",
    updatedAt: now,
    createdAt: current?.createdAt || now,
    state: structuredClone(state),
  };
  try {
    const serverRecord = await prepareProjectForServerSave(record);
    const result = await apiRequest("/upsert_project.php", { method: "POST", body: { project: serverRecord } });
    if (!result.ok) {
      setSaveStatus("Error al guardar", "error");
      if (!silent) window.alert(result.error || "No se ha podido guardar la promocion.");
      return false;
    }
    await refreshDatabaseFromServer();
    rememberSavedSnapshot(state);
    await loadProjectVersions(state.projectId);
    await loadEntityBackups("project", state.projectId);
    if (openPublishedWindow && record.status === "published") {
      openPublishedProjectWindow(record.state);
      currentView = "dashboard";
    }
    renderAll();
    setSaveStatus(`${autosave ? "Autoguardado" : "Guardado"} ${formatClockTime(now)}`, "saved");
    return true;
  } catch {
    setSaveStatus("Error al guardar", "error");
    if (!silent) window.alert("No se ha podido guardar la promocion.");
    return false;
  }
}

async function openProjectLink() {
  const saved = await saveProjectRecord("published");
  if (!saved) return;
  window.open(getProjectPublicUrl(state.projectId), "_blank");
}

function openPublishedProjectWindow(projectState) {
  const html = buildSiteHtml(projectState, { previewMode: false, currentLanguage: activeEditorLanguage });
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank");
  if (!popup) {
    window.alert("El navegador ha bloqueado la ventana de la promocion publicada.");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function getPublicCatalogUrl(catalogProject) {
  const slug = catalogProject?.state?.slug || catalogProject?.slug || "";
  const url = new URL("./", window.location.href);
  url.search = "";
  url.hash = "";
  if (slug) {
    url.pathname = url.pathname.replace(/\/?$/, "") + "/" + slug;
  } else {
    url.searchParams.set("promo", catalogProject?.id || "");
  }
  return url.toString();
}

function getProjectPublicUrl(projectId) {
  const project = getProjectById(projectId);
  const slug = project?.state?.slug || project?.slug || "";
  const url = new URL(IS_ADMIN_ROUTE ? "../" : "./", window.location.href);
  url.search = "";
  url.hash = "";
  if (slug) {
    url.pathname = url.pathname.replace(/\/?$/, "") + "/" + slug;
  } else {
    url.searchParams.set("promo", projectId);
  }
  return url.toString();
}

async function copyProjectLink(projectId) {
  const url = getProjectPublicUrl(projectId);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    window.alert("Enlace copiado.");
  } catch {
    window.alert("No he podido copiar el enlace.");
  }
}

async function duplicateProject(projectId) {
  const project = getProjectById(projectId);
  if (!project?.state) return;
  const now = new Date().toISOString();
  const duplicateState = normalizeState(project.state);
  duplicateState.projectId = safeRandomUUID();
  duplicateState.projectName = `${project.name || "Promocion"} copia`;
  const record = {
    id: duplicateState.projectId,
    clientId: project.clientId || "",
    name: duplicateState.projectName,
    status: project.status || "draft",
    updatedAt: now,
    createdAt: now,
    state: duplicateState,
  };
  const prepared = await prepareProjectForServerSave(record);
  const result = await apiRequest("/upsert_project.php", { method: "POST", body: { project: prepared } });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido duplicar la promocion.");
    return;
  }
  await refreshDatabaseFromServer();
  renderAll();
}

async function deleteProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const confirmed = window.confirm(`Se borrara "${project.name || "esta promocion"}".`);
  if (!confirmed) return;
  const result = await apiRequest("/delete_project.php", { method: "POST", body: { id: projectId } });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido borrar la promocion.");
    return;
  }
  if (state.projectId === projectId) state.projectId = "";
  await refreshDatabaseFromServer();
  renderAll();
}

async function setProjectPublication(projectId, status) {
  const project = getProjectById(projectId);
  if (!project?.state) return;
  const nextStatus = status === "published" ? "published" : "draft";
  const record = {
    ...project,
    name: project.name || getProjectDisplayName(project),
    status: nextStatus,
    updatedAt: new Date().toISOString(),
    state: {
      ...normalizeState(project.state),
      projectStatus: nextStatus,
    },
  };
  const prepared = await prepareProjectForServerSave(record);
  const result = await apiRequest("/upsert_project.php", { method: "POST", body: { project: prepared } });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido actualizar el estado de la promocion.");
    return;
  }
  await refreshDatabaseFromServer();
  if (state.projectId === projectId) {
    state.projectStatus = nextStatus;
  }
  renderAll();
}

async function prepareProjectForServerSave(record) {
  const clone = structuredClone(record);
  const projectId = clone.id || clone.state?.projectId || safeRandomUUID();
  if (clone.state) {
    clone.state.logo = await uploadAssetIfNeeded(projectId, "logo", clone.state.logo);
    clone.state.cover = await uploadAssetIfNeeded(projectId, "cover", clone.state.cover);
    clone.state.socialImage = await uploadAssetIfNeeded(projectId, "social", clone.state.socialImage);
    clone.state.virtualTourCover = await uploadAssetIfNeeded(projectId, "tour-cover", clone.state.virtualTourCover);
    clone.state.pdfFile = await uploadAssetIfNeeded(projectId, "dossier", clone.state.pdfFile);
    clone.state.floors = await Promise.all((clone.state.floors || []).map(async (floor, floorIndex) => ({
      ...floor,
      virtualTourCover: await uploadAssetIfNeeded(projectId, `tour-floor-${floorIndex + 1}`, floor.virtualTourCover),
      zones: await Promise.all((floor.zones || []).map(async (zone, zoneIndex) => ({
        ...zone,
        images: await Promise.all((zone.images || []).map((image, imageIndex) => uploadAssetIfNeeded(projectId, `render-${floorIndex + 1}-${zoneIndex + 1}-${imageIndex + 1}`, image))),
      }))),
      plan: await uploadAssetIfNeeded(projectId, `plan-${floorIndex + 1}`, floor.plan),
    })));
  }
  return clone;
}

async function uploadAssetIfNeeded(projectId, hint, value) {
  if (!value || typeof value !== "string" || !value.startsWith("data:")) {
    return value;
  }
  const result = await apiRequest("/upload_asset.php", {
    method: "POST",
    body: { projectId, hint, dataUrl: value },
  });
  if (!result.ok || !result.data?.path) {
    throw new Error(result.error || "No se ha podido subir un archivo del proyecto.");
  }
  return result.data.path;
}

function getApproxJsonSizeMb(value) {
  try {
    return new Blob([JSON.stringify(value)]).size / (1024 * 1024);
  } catch {
    return 0;
  }
}

function openProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  state = normalizeState(project.state || {});
  state.projectId = project.id;
  state.projectName = project.name || state.projectName;
  state.projectStatus = project.status || "draft";
  state.slug = project.state?.slug || project.slug || state.slug;
  state.clientId = project.clientId || state.clientId;
  currentView = "editor";
  rememberSavedSnapshot(state);
  void Promise.all([loadProjectVersions(state.projectId), loadEntityBackups("project", state.projectId)]).then(() => renderAll());
}

function getProjectVisitCount(projectId) {
  return getProjectMetrics(projectId).pageview;
}

function renderManagementUi() {
  hydrateDatabase();
  renderDashboardStats();
  renderClientOptions();
  renderProjectOptions();
  renderHomeDashboardV2();
}

function renderDashboardStats() {
  if (!els.dashboardStats) return;
  const totalVisits = db.projects.reduce((sum, project) => sum + getProjectVisitCount(project.id), 0);
  const totalContacts = db.projects.reduce((sum, project) => sum + getProjectMetrics(project.id).contactForm, 0);
  const totalClicks = db.projects.reduce((sum, project) => sum + getProjectInteractionCount(project.id), 0);

  els.dashboardStats.innerHTML = `
    <article class="dashboard-stat">
      <strong>${db.clients.length}</strong>
      <span>Clientes</span>
    </article>
    <article class="dashboard-stat">
      <strong>${db.projects.length}</strong>
      <span>Promociones</span>
    </article>
    <article class="dashboard-stat">
      <strong>${totalContacts}</strong>
      <span>Contactos</span>
    </article>
    <article class="dashboard-stat">
      <strong>${totalVisits}</strong>
      <span>Visitas</span>
    </article>
    <article class="dashboard-stat">
      <strong>${totalClicks}</strong>
      <span>Clics</span>
    </article>
  `;
}

function renderClientOptions() {
  if (!els.clientSelect) return;
  const clients = getUiClients();
  const options = clients.map((client) => `<option value="${escapeAttr(client.id)}">${escapeHtml(client.name || "Cliente sin nombre")}</option>`).join("");
  els.clientSelect.innerHTML = options;
  if (!getClientById(state.clientId) && db.clients[0]) state.clientId = db.clients[0].id;
  els.clientSelect.value = state.clientId && getClientById(state.clientId) ? state.clientId : (clients[0]?.id || "");
}

function renderProjectOptions() {
  if (!els.projectSelect) return;
  const options = [`<option value="">Selecciona una promocion</option>`].concat(
    db.projects.map((project) => `<option value="${escapeAttr(project.id)}">${escapeHtml(getProjectDisplayName(project))}</option>`)
  );
  els.projectSelect.innerHTML = options.join("");
  els.projectSelect.value = state.projectId || "";
}

function resetUserForm() {
  selectedUserId = "";
  if (els.userName) els.userName.value = "";
  if (els.userUsername) els.userUsername.value = "";
  if (els.userPassword) els.userPassword.value = "";
  if (els.userRole) els.userRole.value = "promoter";
  if (els.userClientId) els.userClientId.value = db.clients[0]?.id || "";
  renderUserFormState();
}

function renderUserFormState() {
  const isPromoter = (els.userRole?.value || "promoter") === "promoter";
  if (els.userClientField) els.userClientField.hidden = !isPromoter;
}

function renderUsersPanel() {
  if (!isAdminUser() || !els.usersList) return;
  if (els.userClientId) {
    els.userClientId.innerHTML = db.clients.map((client) => `<option value="${escapeAttr(client.id)}">${escapeHtml(client.name || "Cliente sin nombre")}</option>`).join("");
  }
  if (!selectedUserId && db.users.length) {
    const firstPromoter = db.users.find((user) => user.role !== "admin") || db.users[0];
    selectedUserId = firstPromoter?.id || "";
  }
  els.usersList.innerHTML = db.users.length ? db.users.map((user) => `
    <button class="user-card${user.id === selectedUserId ? " is-active" : ""}" type="button" data-user-card="${escapeAttr(user.id)}">
      <strong>${escapeHtml(user.name || user.username || "Usuario")}</strong>
      <span>${escapeHtml(user.username || "")}</span>
      <em>${user.role === "admin" ? "Administrador" : "Promotor"}</em>
    </button>
  `).join("") : `<div class="dashboard-empty">Todavia no hay usuarios.</div>`;
  els.usersList.querySelectorAll("[data-user-card]").forEach((button) => {
    button.addEventListener("click", () => {
      loadUserIntoForm(button.dataset.userCard);
    });
  });
  if (selectedUserId) loadUserIntoForm(selectedUserId, { silent: true });
  else resetUserForm();
  renderUserBackups();
}

function loadUserIntoForm(userId, { silent = false } = {}) {
  const user = db.users.find((entry) => entry.id === userId);
  if (!user) return;
  selectedUserId = user.id;
  if (els.userName) els.userName.value = user.name || "";
  if (els.userUsername) els.userUsername.value = user.username || "";
  if (els.userPassword) els.userPassword.value = "";
  if (els.userRole) els.userRole.value = user.role || "promoter";
  if (els.userClientId) els.userClientId.value = user.clientId || db.clients[0]?.id || "";
  renderUserFormState();
  void loadEntityBackups("user", user.id);
  if (!silent) renderUsersPanel();
}

function renderBackupSettingsPanel() {
  if (!isAdminUser() || !els.backupSettingsPanel) return;
  const settings = db.backupSettings || {};
  const projectKeep = Number(settings.projects?.keep || 30);
  const userKeep = Number(settings.users?.keep || 20);
  if (els.backupProjectsKeep) els.backupProjectsKeep.value = String(projectKeep);
  if (els.backupUsersKeep) els.backupUsersKeep.value = String(userKeep);
}

async function saveBackupSettings() {
  const payload = {
    settings: {
      projects: {
        enabled: true,
        keep: Number(els.backupProjectsKeep?.value || 30),
      },
      users: {
        enabled: true,
        keep: Number(els.backupUsersKeep?.value || 20),
      },
    },
  };
  const result = await apiRequest("/backup_settings.php", { method: "POST", body: payload });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido guardar la configuracion de copias.");
    return;
  }
  db = normalizeDatabase(result.data || {});
  hydrateDatabase();
  renderAll();
  window.alert("Configuracion de copias guardada.");
}

async function loadEntityBackups(type, id) {
  if (!id) {
    if (type === "project") projectBackupsCache = [];
    if (type === "user") userBackupsCache = [];
    return;
  }
  const result = await apiRequest(`/entity_backups.php?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
  const backups = result.ok && Array.isArray(result.data?.backups) ? result.data.backups : [];
  if (type === "project") {
    projectBackupsCache = backups;
    renderProjectBackups();
  } else {
    userBackupsCache = backups;
    renderUserBackups();
  }
}

async function createEntityBackup(type, id) {
  if (!id) {
    window.alert(type === "project" ? "Primero guarda la promocion." : "Primero selecciona un usuario.");
    return;
  }
  const result = await apiRequest("/create_entity_backup.php", {
    method: "POST",
    body: { type, id },
  });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido crear la copia.");
    return;
  }
  if (type === "project") {
    projectBackupsCache = Array.isArray(result.data?.backups) ? result.data.backups : [];
    renderProjectBackups();
  } else {
    userBackupsCache = Array.isArray(result.data?.backups) ? result.data.backups : [];
    renderUserBackups();
  }
  window.alert("Copia creada.");
}

async function restoreEntityBackup(type, id, backupId) {
  const confirmed = window.confirm("Se restaurara esta copia. Continuar?");
  if (!confirmed) return;
  const result = await apiRequest("/restore_entity_backup.php", {
    method: "POST",
    body: { type, id, backupId },
  });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido restaurar la copia.");
    return;
  }
  db = normalizeDatabase(result.data || {});
  hydrateDatabase();
  if (type === "project") {
    const restored = getProjectById(id);
    if (restored?.state) {
      state = normalizeState(restored.state);
      state.projectId = restored.id || state.projectId;
      state.projectName = restored.name || state.projectName;
      state.projectStatus = restored.status || state.projectStatus;
      currentView = "editor";
      rememberSavedSnapshot(state);
      await loadProjectVersions(state.projectId);
      await loadEntityBackups("project", state.projectId);
    }
  } else {
    selectedUserId = id;
    await loadEntityBackups("user", id);
  }
  renderAll();
  window.alert("Copia restaurada.");
}

function renderProjectBackups() {
  if (!els.projectBackups) return;
  if (!state.projectId) {
    els.projectBackups.innerHTML = `<div class="dashboard-empty">Guarda la promocion para tener copias cronologicas.</div>`;
    return;
  }
  els.projectBackups.innerHTML = projectBackupsCache.length
    ? projectBackupsCache.map((backup) => `
      <article class="version-card">
        <div>
          <strong>${escapeHtml(backup.name || "Proyecto")}</strong>
          <span>${escapeHtml(formatShortDate(backup.savedAt))} · ${escapeHtml(formatClockTime(backup.savedAt || new Date().toISOString()))} · ${escapeHtml(getBackupReasonLabel(backup.reason))}</span>
        </div>
        <button class="secondary-btn secondary-btn--compact" type="button" data-restore-project-backup="${escapeAttr(backup.id)}">Restaurar</button>
      </article>
    `).join("")
    : `<div class="dashboard-empty">Aun no hay copias guardadas para esta promocion.</div>`;
  els.projectBackups.querySelectorAll("[data-restore-project-backup]").forEach((button) => {
    button.addEventListener("click", () => { void restoreEntityBackup("project", state.projectId, button.dataset.restoreProjectBackup); });
  });
}

function renderUserBackups() {
  if (!els.userBackupsList) return;
  if (!selectedUserId) {
    els.userBackupsList.innerHTML = `<div class="dashboard-empty">Selecciona un usuario para ver sus copias.</div>`;
    return;
  }
  els.userBackupsList.innerHTML = userBackupsCache.length
    ? userBackupsCache.map((backup) => `
      <article class="version-card">
        <div>
          <strong>${escapeHtml(backup.name || backup.username || "Usuario")}</strong>
          <span>${escapeHtml(formatShortDate(backup.savedAt))} · ${escapeHtml(formatClockTime(backup.savedAt || new Date().toISOString()))} · ${escapeHtml(getBackupReasonLabel(backup.reason))}</span>
        </div>
        <button class="secondary-btn secondary-btn--compact" type="button" data-restore-user-backup="${escapeAttr(backup.id)}">Restaurar</button>
      </article>
    `).join("")
    : `<div class="dashboard-empty">Aun no hay copias guardadas para este usuario.</div>`;
  els.userBackupsList.querySelectorAll("[data-restore-user-backup]").forEach((button) => {
    button.addEventListener("click", () => { void restoreEntityBackup("user", selectedUserId, button.dataset.restoreUserBackup); });
  });
}

function getBackupReasonLabel(reason) {
  if (reason === "manual") return "manual";
  if (reason === "delete") return "antes de borrar";
  return "automatica";
}

function renderContactsPanel() {
  if (!els.contactsList) return;
  const projectOptions = [...db.projects].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  if (els.contactProjectFilter) {
    const currentValue = contactProjectFilter || els.contactProjectFilter.value || "";
    els.contactProjectFilter.innerHTML = [`<option value="">Todas las promociones</option>`]
      .concat(projectOptions.map((project) => `<option value="${escapeAttr(project.id)}">${escapeHtml(project.name || "Promocion sin nombre")}</option>`))
      .join("");
    els.contactProjectFilter.value = currentValue;
    contactProjectFilter = currentValue;
  }
  const leads = [...db.leads]
    .filter((lead) => !contactProjectFilter || String(lead.projectId || "") === contactProjectFilter)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  els.contactsList.innerHTML = leads.length
    ? leads.map((lead) => `
      <article class="contact-card">
        <div class="contact-card__top">
          <div>
            <strong>${escapeHtml(lead.name || "Contacto")}</strong>
            <span>${escapeHtml(lead.projectName || "Promocion")}</span>
          </div>
          <em>${escapeHtml(formatShortDate(lead.createdAt))}</em>
        </div>
        <p>${escapeHtml(lead.message || "")}</p>
        <div class="contact-card__meta">
          ${lead.email ? `<a href="mailto:${escapeAttr(lead.email)}">${escapeHtml(lead.email)}</a>` : `<span>Sin email</span>`}
          ${lead.phone ? `<a href="tel:${escapeAttr(String(lead.phone).replace(/\s/g, ""))}">${escapeHtml(lead.phone)}</a>` : `<span>Sin telefono</span>`}
        </div>
      </article>
    `).join("")
    : `<div class="dashboard-empty">Todavia no hay mensajes recibidos.</div>`;
}

function renderClientProjectsPanel() {
  if (!els.clientProjectsList) return;
  const projects = [...db.projects]
    .filter((project) => project.clientId === state.clientId)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  els.clientProjectsList.innerHTML = projects.length
    ? projects.map((project, index) => {
      const thumb = project.state?.cover || project.state?.logo || "";
      return `
        <article class="promo-card">
          <button class="promo-card__main" type="button" data-open-client-project="${escapeAttr(project.id)}">
            ${thumb
              ? `<img class="promo-card__thumb" src="${escapeAttr(thumb)}" alt="${escapeAttr(getProjectDisplayName(project))}" />`
              : `<div class="promo-card__icon">${String(index + 1).padStart(2, "0")}</div>`}
            <strong>${escapeHtml(getProjectDisplayName(project))}</strong>
            <span>${project.status === "published" ? "Publicado" : project.status === "unlisted" ? "Oculto" : "Borrador"}</span>
          </button>
        </article>
      `;
    }).join("")
    : `<div class="dashboard-empty">Esta empresa todavia no tiene promociones.</div>`;
  els.clientProjectsList.querySelectorAll("[data-open-client-project]").forEach((button) => {
    button.addEventListener("click", () => openProject(button.dataset.openClientProject));
  });
}

function exportContactsCsv() {
  const leads = [...db.leads]
    .filter((lead) => !contactProjectFilter || String(lead.projectId || "") === contactProjectFilter)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  if (!leads.length) {
    window.alert("No hay contactos para exportar.");
    return;
  }
  const rows = [
    ["fecha", "promocion", "nombre", "email", "telefono", "mensaje"],
    ...leads.map((lead) => [
      formatShortDate(lead.createdAt),
      lead.projectName || "",
      lead.name || "",
      lead.email || "",
      lead.phone || "",
      String(lead.message || "").replace(/\r?\n/g, " "),
    ]),
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  downloadFile(`contactos-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8", csv);
}

async function saveUserFromForm() {
  const payload = {
    id: selectedUserId || safeRandomUUID(),
    name: String(els.userName?.value || "").trim(),
    username: String(els.userUsername?.value || "").trim(),
    password: String(els.userPassword?.value || "").trim(),
    role: String(els.userRole?.value || "promoter"),
    clientId: String(els.userClientId?.value || ""),
  };
  if (!payload.name || !payload.username || !payload.password) {
    window.alert("Faltan datos del usuario.");
    return;
  }
  const result = await apiRequest("/upsert_user.php", { method: "POST", body: { user: payload } });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido guardar el usuario.");
    return;
  }
  db = normalizeDatabase(result.data || {});
  hydrateDatabase();
  selectedUserId = payload.id;
  await loadEntityBackups("user", selectedUserId);
  renderAll();
}

async function deleteSelectedUser() {
  if (!selectedUserId) {
    window.alert("No hay usuario seleccionado.");
    return;
  }
  const user = db.users.find((entry) => entry.id === selectedUserId);
  if (!user) return;
  const confirmed = window.confirm(`Se borrara el usuario "${user.username}".`);
  if (!confirmed) return;
  const result = await apiRequest("/delete_user.php", { method: "POST", body: { id: selectedUserId } });
  if (!result.ok) {
    window.alert(result.error || "No se ha podido borrar el usuario.");
    return;
  }
  db = normalizeDatabase(result.data || {});
  hydrateDatabase();
  selectedUserId = "";
  userBackupsCache = [];
  renderAll();
}

function renderDashboard() {
  if (!els.dashboardStats || !els.dashboardProjects) return;
  const published = db.projects.filter((project) => project.status === "published");
  const totalVisits = db.projects.reduce((sum, project) => sum + getProjectVisitCount(project.id), 0);
  const totalContacts = db.projects.reduce((sum, project) => sum + getProjectMetrics(project.id).contactForm, 0);

  els.dashboardStats.innerHTML = `
    <article class="stat-card"><strong>${db.clients.length}</strong><span>Clientes</span></article>
    <article class="stat-card"><strong>${db.projects.length}</strong><span>Promociones</span></article>
    <article class="stat-card"><strong>${published.length}</strong><span>Publicadas</span></article>
    <article class="stat-card"><strong>${totalVisits}</strong><span>Visitas</span></article>
    <article class="stat-card"><strong>${totalContacts}</strong><span>Contactos</span></article>
  `;

  const projects = [...db.projects].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  els.dashboardProjects.innerHTML = projects.length ? projects.map((project) => {
    const client = getClientById(project.clientId);
    const metrics = getProjectMetrics(project.id);
    return `
      <article class="dashboard-project-card">
        <div class="dashboard-project-card__top">
          <strong>${escapeHtml(getProjectDisplayName(project))}</strong>
          <span class="status-badge status-badge--${escapeAttr(project.status || "draft")}">${project.status === "published" ? "Publicado" : project.status === "unlisted" ? "Oculto" : "Borrador"}</span>
        </div>
        <p>${escapeHtml(client?.name || "Sin cliente")} · ${metrics.pageview} visitas · ${metrics.contactForm} contactos</p>
        <button class="secondary-btn secondary-btn--compact" type="button" data-open-project="${escapeAttr(project.id)}">Abrir</button>
      </article>
    `;
  }).join("") : `<div class="dashboard-empty">Todavia no hay promociones guardadas.</div>`;

  els.dashboardProjects.querySelectorAll("[data-open-project]").forEach((button) => {
    button.addEventListener("click", () => openProject(button.dataset.openProject));
  });
}

function renderDashboardAdmin() {
  if (!els.dashboardStats || !els.dashboardProjects) return;
  const published = db.projects.filter((project) => project.status === "published");
  const draft = db.projects.filter((project) => project.status !== "published");
  const totalVisits = db.projects.reduce((sum, project) => sum + getProjectVisitCount(project.id), 0);
  const totalContacts = db.projects.reduce((sum, project) => sum + getProjectMetrics(project.id).contactForm, 0);
  const activeClientFilter = els.dashboardClientFilter?.value || "";
  const searchTerm = String(els.dashboardSearch?.value || "").trim().toLowerCase();
  const statusFilter = els.dashboardStatusFilter?.value || "";

  if (els.dashboardClientFilter) {
    const currentValue = els.dashboardClientFilter.value;
    els.dashboardClientFilter.innerHTML = [`<option value="">Todos los clientes</option>`].concat(
      db.clients.map((client) => `<option value="${escapeAttr(client.id)}">${escapeHtml(client.name || "Cliente sin nombre")}</option>`)
    ).join("");
    els.dashboardClientFilter.value = activeClientFilter || currentValue || "";
  }

  els.dashboardStats.innerHTML = `
    <article class="stat-card stat-card--admin"><strong>${db.projects.length}</strong><span>Total proyectos</span></article>
    <article class="stat-card stat-card--admin"><strong>${draft.length}</strong><span>Borrador</span></article>
    <article class="stat-card stat-card--admin"><strong>${published.length}</strong><span>Publicadas</span></article>
    <article class="stat-card stat-card--admin"><strong>${db.clients.length}</strong><span>Clientes</span></article>
    <article class="stat-card stat-card--admin"><strong>${totalVisits}</strong><span>Visitas web</span></article>
    <article class="stat-card stat-card--admin"><strong>${totalContacts}</strong><span>Formularios</span></article>
  `;

  const projects = [...db.projects]
    .filter((project) => !statusFilter || project.status === statusFilter)
    .filter((project) => !activeClientFilter || project.clientId === activeClientFilter)
    .filter((project) => {
      if (!searchTerm) return true;
      const client = getClientById(project.clientId);
      return `${project.name} ${client?.name || ""}`.toLowerCase().includes(searchTerm);
    })
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  els.dashboardProjects.innerHTML = projects.length ? `
    <div class="dashboard-table">
      <div class="dashboard-table__head">
        <span>#</span>
        <span>Cliente / Proyecto</span>
        <span>Estado</span>
        <span>Visitas</span>
        <span>Actualizado</span>
        <span>Acciones</span>
      </div>
      ${projects.map((project, index) => {
        const client = getClientById(project.clientId);
        const metrics = getProjectMetrics(project.id);
        return `
          <article class="dashboard-row">
            <span class="dashboard-row__id">${String(index + 1).padStart(2, "0")}</span>
            <div class="dashboard-row__project">
              <strong>${escapeHtml(getProjectDisplayName(project))}</strong>
              <span>${escapeHtml(client?.name || "Sin cliente")}</span>
            </div>
            <span class="status-badge status-badge--${escapeAttr(project.status || "draft")}">${project.status === "published" ? "Publicado" : project.status === "unlisted" ? "Oculto" : "Borrador"}</span>
            <span class="dashboard-row__visits">${metrics.pageview}</span>
            <span class="dashboard-row__date">${formatShortDate(project.updatedAt)}</span>
            <div class="dashboard-row__actions">
              <button class="admin-icon-btn" type="button" data-open-project="${escapeAttr(project.id)}">Abrir</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  ` : `<div class="dashboard-empty">Todavia no hay promociones guardadas.</div>`;

  els.dashboardProjects.querySelectorAll("[data-open-project]").forEach((button) => {
    button.addEventListener("click", () => openProject(button.dataset.openProject));
  });
}

function renderHomeDashboard() {
  if (!els.dashboardProjects) return;
  const projects = [...db.projects].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  els.dashboardProjects.innerHTML = `
    <button class="promo-card promo-card--new" type="button" data-create-project>
      <span class="promo-card__plus">+</span>
      <strong>Nueva promoción</strong>
      <span>Crear una nueva ficha</span>
    </button>
    ${projects.map((project, index) => {
      const client = getClientById(project.clientId);
      const metrics = getProjectMetrics(project.id);
      return `
        <button class="promo-card" type="button" data-open-project="${escapeAttr(project.id)}">
          <div class="promo-card__icon">${String(index + 1).padStart(2, "0")}</div>
          <strong>${escapeHtml(getProjectDisplayName(project))}</strong>
          <span>${escapeHtml(client?.name || "Sin cliente")}</span>
          <em>${metrics.pageview} visitas · ${metrics.contactForm} contactos</em>
        </button>
      `;
    }).join("")}
  `;

  els.dashboardProjects.querySelector("[data-create-project]")?.addEventListener("click", () => createProject());
  els.dashboardProjects.querySelectorAll("[data-open-project]").forEach((button) => {
    button.addEventListener("click", () => openProject(button.dataset.openProject));
  });
}

function renderHomeDashboardV2() {
  const clients = getUiClients();
  const activeClientFilter = els.dashboardClientFilter?.value || "";
  const visibleClients = clients.filter((client) => {
    if (!clientSearchTerm) return true;
    return String(client.name || "").toLowerCase().includes(clientSearchTerm);
  });

  if (els.dashboardClientFilter) {
    els.dashboardClientFilter.innerHTML = [`<option value="">Todos los clientes</option>`].concat(
      clients.filter((client) => client.id !== "seed").map((client) => `<option value="${escapeAttr(client.id)}">${escapeHtml(client.name || "Cliente sin nombre")}</option>`)
    ).join("");
    els.dashboardClientFilter.value = activeClientFilter;
  }
  if (els.clientSearchInput) els.clientSearchInput.value = clientSearchTerm;
  if (els.promotionSearchInput) els.promotionSearchInput.value = promotionSearchTerm;

  if (els.clientCardsList) {
    const hasRealClients = db.clients.length > 0;
    els.clientCardsList.innerHTML = visibleClients.length ? visibleClients.map((client) => `
      <button class="client-card${client.id === state.clientId ? " is-active" : ""}" type="button" data-client-card="${escapeAttr(client.id)}">
        ${client.logo ? `<img class="client-card__logo" src="${escapeAttr(client.logo)}" alt="${escapeAttr(client.name)}" />` : `<span class="client-card__mono">${escapeHtml(getInitials(client.name || "CL"))}</span>`}
        <strong>${escapeHtml(client.name || "Cliente sin nombre")}</strong>
        <span>${db.projects.filter((project) => project.clientId === client.id).length} promociones</span>
      </button>
    `).join("") : `<div class="dashboard-empty">${clientSearchTerm ? "No hay empresas con ese nombre." : "Todavia no hay clientes. Crea uno nuevo para empezar."}</div>`;
    els.clientCardsList.querySelectorAll("[data-client-card]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!hasRealClients && button.dataset.clientCard === "seed") {
          createClient();
          return;
        }
        assignClientToState(button.dataset.clientCard);
        currentView = "client";
        renderAll();
      });
    });
  }

  if (!els.dashboardProjects) return;
  const projects = [...db.projects]
    .filter((project) => !activeClientFilter || project.clientId === activeClientFilter)
    .filter((project) => {
      if (!promotionSearchTerm) return true;
      const client = getClientById(project.clientId);
      return `${project.name || ""} ${client?.name || ""}`.toLowerCase().includes(promotionSearchTerm);
    })
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  els.dashboardProjects.innerHTML = `
    <button class="promo-card promo-card--new" type="button" data-create-project>
      <span class="promo-card__plus">+</span>
      <strong>Nueva promocion</strong>
      <span>Crear una nueva ficha</span>
    </button>
    ${projects.map((project, index) => {
      const client = getClientById(project.clientId);
      const thumb = project.state?.cover || project.state?.logo || "";
      const metrics = getProjectMetrics(project.id);
      return `
        <article class="promo-card">
          <button class="promo-card__main" type="button" data-open-project="${escapeAttr(project.id)}">
            ${thumb
              ? `<img class="promo-card__thumb" src="${escapeAttr(thumb)}" alt="${escapeAttr(getProjectDisplayName(project))}" />`
              : `<div class="promo-card__icon">${String(index + 1).padStart(2, "0")}</div>`}
            <strong>${escapeHtml(getProjectDisplayName(project))}</strong>
            <span>${escapeHtml(client?.name || "Sin cliente")} · ${metrics.pageview} visitas</span>
          </button>
          <div class="promo-card__actions">
            <button class="promo-mini-btn" type="button" data-copy-project-link="${escapeAttr(project.id)}">Copiar link</button>
            <button class="promo-mini-btn" type="button" data-duplicate-project="${escapeAttr(project.id)}">Duplicar</button>
            <button class="promo-mini-btn promo-mini-btn--danger" type="button" data-delete-project="${escapeAttr(project.id)}">Borrar</button>
          </div>
        </article>
      `;
    }).join("")}
  `;

  els.dashboardProjects.querySelector("[data-create-project]")?.addEventListener("click", () => createProject());
  els.dashboardProjects.querySelectorAll("[data-open-project]").forEach((button) => {
    button.addEventListener("click", () => openProject(button.dataset.openProject));
  });
  enhanceDashboardProjectCards();
  els.dashboardProjects.querySelectorAll("[data-copy-project-link]").forEach((button) => {
    button.addEventListener("click", () => { void copyProjectLink(button.dataset.copyProjectLink); });
  });
  els.dashboardProjects.querySelectorAll("[data-duplicate-project]").forEach((button) => {
    button.addEventListener("click", () => { void duplicateProject(button.dataset.duplicateProject); });
  });
  els.dashboardProjects.querySelectorAll("[data-delete-project]").forEach((button) => {
    button.addEventListener("click", () => { void deleteProject(button.dataset.deleteProject); });
  });
}

function enhanceDashboardProjectCards() {
  if (!els.dashboardProjects) return;
  els.dashboardProjects.querySelectorAll(".promo-card").forEach((card) => {
    const openButton = card.querySelector("[data-open-project]");
    if (!openButton) return;
    const projectId = openButton.dataset.openProject;
    const project = getProjectById(projectId);
    if (!project) return;

    const main = card.querySelector(".promo-card__main");
    if (main && !main.querySelector(".promo-card__badge")) {
      main.insertAdjacentHTML("afterbegin", `<span class="status-badge status-badge--${escapeAttr(project.status || "draft")} promo-card__badge">${project.status === "published" ? "Publicado" : project.status === "unlisted" ? "Oculto" : "Borrador"}</span>`);
    }

    const actions = card.querySelector(".promo-card__actions");
    if (actions && !actions.querySelector("[data-toggle-project-status]")) {
      actions.insertAdjacentHTML("afterbegin", `<button class="promo-mini-btn promo-mini-btn--accent" type="button" data-toggle-project-status="${escapeAttr(project.id)}" data-next-status="${project.status === "published" ? "draft" : "published"}">${project.status === "published" || project.status === "unlisted" ? "Pasar a borrador" : "Publicar"}</button>`);
    }
  });

  els.dashboardProjects.querySelectorAll("[data-toggle-project-status]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => { void setProjectPublication(button.dataset.toggleProjectStatus, button.dataset.nextStatus); });
  });
}

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dropzoneText(title, sub) {
  return `<div class="dropzone__text"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(sub)}</span></div>`;
}

function iconPdf() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
}

function getSiteVariants() {
  return window.SITE_VARIANTS || {
    mediterranea: { label: "Mediterranea", description: "Calida", palette: ["#214940", "#C69A54", "#F3EEE5"], sectionOrder: ["media", "map", "floors", "qualities", "pdf", "contact"], copy: {} },
    comercial: { label: "Comercial", description: "Clara", palette: ["#123C61", "#2D6D9F", "#F3F6F8"], sectionOrder: ["map", "media", "floors", "qualities", "pdf", "contact"], copy: {} },
    urbano: { label: "Urbano", description: "Sobria", palette: ["#111111", "#7B7B7B", "#ECEBE8"], sectionOrder: ["qualities", "map", "media", "floors", "pdf", "contact"], copy: {} },
    galeria: { label: "Galeria", description: "Visual", palette: ["#5D4632", "#C9A57B", "#F6F0E7"], sectionOrder: ["floors", "media", "map", "qualities", "pdf", "contact"], copy: {} },
    catalogo: { label: "Catalogo", description: "Ordenada", palette: ["#233041", "#8FA6BE", "#F3F5F7"], sectionOrder: ["map", "floors", "media", "qualities", "pdf", "contact"], copy: {} },
  };
}

function getDesignVariantKeys() {
  return Object.keys(getSiteVariants());
}

function resolveDesignVariantKey(value) {
  const aliases = {
    actual: "mediterranea",
    portal: "comercial",
    resort: "mediterranea",
    editorial: "urbano",
  };
  const raw = String(value || "").trim().toLowerCase();
  const resolved = aliases[raw] || raw;
  return getDesignVariantKeys().includes(resolved) ? resolved : defaultState.designVariant;
}

function getVariantConfig(key) {
  const variants = getSiteVariants();
  return variants[resolveDesignVariantKey(key)] || variants[defaultState.designVariant];
}

function getVariantLayout(variant) {
  return {
    hero: "poster",
    media: "duo",
    floors: "stacked",
    qualities: "full",
    dossier: "classic",
    ...(variant?.layout || {}),
  };
}

function formatClockTime(value) {
  return new Date(value).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function setSaveStatus(text, stateName = "idle") {
  if (!els.saveStatusPill) return;
  els.saveStatusPill.textContent = text;
  els.saveStatusPill.dataset.state = stateName;
}

function initEditorSections() {
  const panel = document.querySelector(".panel");
  const ordered = ["Dashboard", "Diseno", "Idioma", "SEO", "Empresa", "Ubicacion", "Multimedia", "Tipologias", "Memoria de calidades", "Dossier PDF", "Contacto", "Redes sociales", "Acciones"];
  const sections = [...document.querySelectorAll(".editor-section")];
  const byTitle = new Map(sections.map((section) => [section.querySelector(".section-heading h2")?.textContent?.trim(), section]));

  ordered.forEach((title) => {
    const section = byTitle.get(title);
    if (section) panel.appendChild(section);
  });

  sections.forEach((section) => {
    const heading = section.querySelector(".section-heading");
    if (!heading || heading.querySelector(".section-collapse-btn")) return;
    const title = section.querySelector(".section-heading h2")?.textContent?.trim() || "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "section-collapse-btn";
    btn.textContent = "Ocultar";
    btn.addEventListener("click", () => {
      section.classList.toggle("is-collapsed");
      const collapsed = section.classList.contains("is-collapsed");
      btn.textContent = collapsed ? "Mostrar" : "Ocultar";
      btn.setAttribute("aria-expanded", String(!collapsed));
    });
    heading.appendChild(btn);
    if (["Redes sociales", "Acciones"].includes(title)) {
      section.classList.add("is-collapsed");
      btn.textContent = "Mostrar";
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

function renderDesignPicker() {
  if (!els.designVariantPicker) return;
  const variants = getSiteVariants();
  els.designVariantPicker.innerHTML = getDesignVariantKeys().map((key) => {
    const variant = variants[key];
    const swatches = (variant.palette || []).map((color) => `<span style="background:${escapeAttr(color)}"></span>`).join("");
    return `
      <button class="design-card" type="button" data-design-card="${escapeAttr(key)}">
        <div class="design-card__swatches">${swatches}</div>
        <strong>${escapeHtml(variant.label)}</strong>
        <span>${escapeHtml(variant.description || "")}</span>
      </button>
    `;
  }).join("");

  els.designVariantPicker.addEventListener("click", (e) => {
    const card = e.target.closest("[data-design-card]");
    if (!card) return;
    state.designVariant = card.dataset.designCard;
    els.designVariant.value = state.designVariant;
    renderAll();
  });
}

function syncDesignPicker() {
  document.querySelectorAll("[data-design-card]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.designCard === state.designVariant);
  });
}

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^(data:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function normalizeStateUrlsInPlace(targetState) {
  ["mapsUrl", "virtualTourUrl", "companyWebsite", "socialInstagram", "socialFacebook", "socialTwitter", "socialImage"].forEach((key) => {
    targetState[key] = normalizeUrl(targetState[key]);
    if (els[key]) els[key].value = targetState[key];
  });

  if (targetState.translations && typeof targetState.translations === "object") {
    getProjectLanguages(targetState).forEach((lang) => {
      const translation = ensureLanguage(targetState, lang);
      translation.youtubeUrl = normalizeUrl(translation.youtubeUrl);
    });
  }

  const esTranslation = targetState.translations?.es;
  targetState.youtubeUrl = normalizeUrl(esTranslation?.youtubeUrl || targetState.youtubeUrl);

  const activeTranslation = targetState.translations?.[activeEditorLanguage];
  if (els.youtubeUrl) {
    els.youtubeUrl.value = activeTranslation?.youtubeUrl || "";
  }
}

function isValidHttpUrl(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildValidationIssues(currentState) {
  const issues = [];
  const currentTranslation = getActiveTranslation(currentState, activeEditorLanguage);
  const currentHeadline = currentTranslation.headline || currentState.headline;
  const currentYoutube = currentTranslation.youtubeUrl || currentState.youtubeUrl;
  if (!currentState.companyName.trim()) issues.push({ level: "warning", message: "Falta el nombre de la promocion o empresa." });
  if (!String(currentHeadline || "").trim()) issues.push({ level: "warning", message: "Falta el titular principal." });

  [
    ["mapsUrl", "El enlace de Google Maps no es valido."],
    ["virtualTourUrl", "El enlace del tour virtual no es valido."],
    ["companyWebsite", "La web de la empresa no es valida."],
    ["socialInstagram", "El enlace de Instagram no es valido."],
    ["socialFacebook", "El enlace de Facebook no es valido."],
    ["socialTwitter", "El enlace de X / Twitter no es valido."],
  ].forEach(([key, message]) => {
    if (!isValidHttpUrl(currentState[key])) issues.push({ level: "error", message });
  });

  if (!isValidHttpUrl(currentYoutube)) {
    issues.push({ level: "error", message: "El enlace de YouTube no es valido." });
  }

  if (currentYoutube && !getYouTubeEmbedUrl(currentYoutube)) {
    issues.push({ level: "warning", message: "El link de YouTube se abrira como enlace de respaldo si no se puede embeber." });
  }

  if (!currentState.floors.some((floor) => floor.name || floor.description || floor.zones.some((zone) => zone.images.length) || floor.plan)) {
    issues.push({ level: "warning", message: "No hay tipologias completas todavia." });
  }

  return issues;
}

function renderValidation() {
  if (!els.projectValidation) return;
  const issues = buildValidationIssues(state);
  if (!issues.length) {
    els.projectValidation.hidden = false;
    els.projectValidation.className = "validation-box validation-box--ok";
    els.projectValidation.innerHTML = `<strong>Proyecto listo</strong><span>Sin avisos importantes por ahora.</span>`;
    return;
  }
  els.projectValidation.hidden = false;
  const hasError = issues.some((issue) => issue.level === "error");
  els.projectValidation.className = `validation-box ${hasError ? "validation-box--error" : "validation-box--warn"}`;
  els.projectValidation.innerHTML = `
    <strong>${hasError ? "Revisiones necesarias" : "Avisos del proyecto"}</strong>
    <ul>${issues.map((issue) => `<li>${escapeHtml(issue.message)}</li>`).join("")}</ul>
  `;
}

function getYouTubeEmbedUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") videoId = parsed.searchParams.get("v") || "";
      else if (parsed.pathname.startsWith("/embed/")) videoId = parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
      else if (parsed.pathname.startsWith("/shorts/")) videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    }

    if (host === "youtu.be") {
      videoId = parsed.pathname.replace(/^\/+/, "").split("/")[0] || "";
    }

    if (!videoId) return "";
    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
  } catch {
    return "";
  }
}

function normalizeState(c) {
  const n = structuredClone(defaultState);
  n.projectId        = String(c.projectId || "");
  n.projectName      = String(c.projectName || n.projectName);
  n.projectStatus    = ["published", "unlisted"].includes(c.projectStatus) ? c.projectStatus : "draft";
  n.slug             = String(c.slug || "");
  n.clientId         = String(c.clientId || "");
  n.designVariant    = resolveDesignVariantKey(c.designVariant);
  n.companyName     = String(c.companyName    || n.companyName);
  n.headline        = String(c.headline       || n.headline);
  n.introText       = String(c.introText      || n.introText);
  n.priceFrom       = String(c.priceFrom      || "");
  n.locationName    = String(c.locationName   || n.locationName);
  n.province        = String(c.province       || "");
  n.city            = String(c.city           || "");
  n.mapsUrl         = String(c.mapsUrl        || n.mapsUrl);
  n.mapsEmbedUrl    = String(c.mapsEmbedUrl   || "");
  n.youtubeUrl      = String(c.youtubeUrl     || "");
  n.virtualTourUrl  = String(c.virtualTourUrl || "");
  n.companyLocation = String(c.companyLocation || "");
  n.companyWebsite  = String(c.companyWebsite || "");
  n.contactPhone    = String(c.contactPhone   || "");
  n.contactEmail    = String(c.contactEmail   || "");
  n.contactWhatsapp = String(c.contactWhatsapp|| "");
  n.socialInstagram = String(c.socialInstagram|| "");
  n.socialFacebook  = String(c.socialFacebook || "");
  n.socialTwitter   = String(c.socialTwitter  || "");
  n.seoTitle        = String(c.seoTitle || "");
  n.seoDescription  = String(c.seoDescription || "");
  n.socialImage     = String(c.socialImage || "");
  n.pdfFile         = typeof c.pdfFile === "string" ? c.pdfFile : null;
  n.pdfName         = String(c.pdfName || "Dossier informativo");
  n.virtualTourCover = typeof c.virtualTourCover === "string" ? c.virtualTourCover : null;
  n.qualities       = Array.isArray(c.qualities) ? c.qualities.map(String).filter(Boolean) : splitLines(String(c.qualities || ""));
  n.logo            = typeof c.logo  === "string" ? c.logo  : null;
  n.cover           = typeof c.cover === "string" ? c.cover : null;
  n.languages       = Array.isArray(c.languages) && c.languages.length ? [...new Set(c.languages.map(String))] : ["es"];
  n.floors = Array.isArray(c.floors) && c.floors.length
    ? c.floors.map(f => ({
        id:          f.id || safeRandomUUID(),
        name:        String(f.name        || ""),
        description: String(f.description || ""),
        area:        String(f.area        || ""),
        bedrooms:    String(f.bedrooms    || ""),
        bathrooms:   String(f.bathrooms   || ""),
        virtualTourUrl: String(f.virtualTourUrl || ""),
        virtualTourCover: typeof f.virtualTourCover === "string" ? f.virtualTourCover : null,
        zones: Array.isArray(f.zones) && f.zones.length
          ? f.zones.map(z => ({ id: z.id || safeRandomUUID(), name: String(z.name || ""), images: Array.isArray(z.images) ? z.images.filter(Boolean).map(String) : [] }))
          // backward compat: old gallery → one zone
          : [{ id: safeRandomUUID(), name: "General", images: Array.isArray(f.gallery) ? f.gallery.filter(Boolean).map(String) : [] }],
        plan: typeof f.plan === "string" ? f.plan : null,
      }))
    : [createFloor()];
  n.translations = {};
  const sourceTranslations = c.translations && typeof c.translations === "object" ? c.translations : {};
  getProjectLanguages(n).forEach((lang) => {
    const source = sourceTranslations[lang] && typeof sourceTranslations[lang] === "object" ? sourceTranslations[lang] : {};
    n.translations[lang] = {
      headline: String(source.headline || (lang === "es" ? n.headline : "")),
      introText: String(source.introText || (lang === "es" ? n.introText : "")),
      youtubeUrl: String(source.youtubeUrl || (lang === "es" ? n.youtubeUrl : "")),
      qualities: Array.isArray(source.qualities) ? source.qualities.map(String).filter(Boolean) : (lang === "es" ? [...n.qualities] : []),
      pdfName: String(source.pdfName || (lang === "es" ? n.pdfName : "")),
      floors: n.floors.map((floor) => {
        const sourceFloor = Array.isArray(source.floors) ? source.floors.find((entry) => entry?.id === floor.id) : null;
        return {
          id: floor.id,
          name: String(sourceFloor?.name || (lang === "es" ? floor.name : "")),
          description: String(sourceFloor?.description || (lang === "es" ? floor.description : "")),
          zones: floor.zones.map((zone) => {
            const sourceZone = Array.isArray(sourceFloor?.zones) ? sourceFloor.zones.find((entry) => entry?.id === zone.id) : null;
            return { id: zone.id, name: String(sourceZone?.name || (lang === "es" ? zone.name : "")) };
          }),
        };
      }),
    };
  });
  syncLegacyLocalizedFields(n, "es");
  return n;
}

function getInitials(v) { return v.split(" ").map(p => p.trim()[0]).filter(Boolean).slice(0, 2).join("").toUpperCase(); }
function escapeHtml(v) { return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;"); }
function safeJsonEmbed(v) { return JSON.stringify(v).replace(/<\//g, "<\\/"); }
function escapeAttr(v) { return escapeHtml(v).replaceAll("`","&#96;"); }
function slugify(v) { return String(v).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
function downloadFile(filename, mime, content) {
  const href = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 200);
}

// ─── site HTML builder ─────────────────────────────────────────────────────────

function buildSiteHtml(s, { usePaths = false, previewMode = false, currentLanguage = "es" } = {}) {
  const designVariant = resolveDesignVariantKey(s.designVariant);
  const variant = getVariantConfig(designVariant);
  const layout = getVariantLayout(variant);
  const languages = getProjectLanguages(s);
  const language = languages.includes(currentLanguage) ? currentLanguage : languages[0];
  const translation = getActiveTranslation(s, language);
  const copy = {
    heroKicker: "",
    mediaKicker: "",
    mediaTitle: "Descubre la promocion",
    mediaLead: "",
    youtubeKicker: "",
    youtubeTitle: "YouTube",
    youtubeLead: "",
    tourKicker: "",
    tourTitle: "Tour virtual",
    tourLead: "",
    floorsKicker: "",
    floorsTitle: "Tipologias disponibles",
    floorsLead: "",
    qualitiesKicker: "",
    qualitiesTitle: "Memoria de calidades",
    qualitiesMoreLabel: "Mas informacion",
    qualitiesLessLabel: "Ver menos",
    pdfLead: "",
    contactKicker: "",
    contactTitle: "Solicita mas informacion",
    locationLink: "Ver ubicacion",
    contactFormTitle: "Solicitar informacion",
    contactFormName: "Nombre",
    contactFormEmail: "Email",
    contactFormPhone: "Telefono",
    contactFormMessage: "Cuentanos que te interesa",
    contactFormSubmit: "Enviar consulta",
    contactFormSending: "Enviando...",
    contactFormSuccess: "Gracias. Hemos recibido tu consulta.",
    contactFormError: "No se ha podido enviar la consulta ahora mismo.",
    contactFormPreview: "La vista previa no envia formularios.",
  };
  if (language === "en") {
    Object.assign(copy, {
      mediaTitle: "Discover the development",
      mediaLead: "",
      youtubeLead: "",
      tourTitle: "Virtual tour",
      tourLead: "",
      floorsTitle: "Available typologies",
      floorsLead: "",
      qualitiesKicker: "",
      qualitiesTitle: "Quality specifications",
      qualitiesMoreLabel: "More information",
      qualitiesLessLabel: "Show less",
      pdfLead: "",
      contactKicker: "",
      contactTitle: "Request more information",
      locationLink: "View location",
      contactFormTitle: "Request information",
      contactFormName: "Name",
      contactFormEmail: "Email",
      contactFormPhone: "Phone",
      contactFormMessage: "Tell us what interests you",
      contactFormSubmit: "Send enquiry",
      contactFormSending: "Sending...",
      contactFormSuccess: "Thank you. We have received your enquiry.",
      contactFormError: "We could not send your enquiry right now.",
      contactFormPreview: "Preview mode does not send forms.",
    });
  }
  const variantCss = typeof window.getSiteVariantCss === "function" ? window.getSiteVariantCss() : "";
  const projectId   = s.projectId || slugify(`${s.companyName || "promo"}-${s.headline || ""}`) || "promo";
  const cn          = s.companyName  || "Promocion residencial";
  const headline    = translation.headline || s.headline || cn;
  const introText   = translation.introText || s.introText || "";
  const priceFrom   = s.priceFrom    || "";
  const locationName = s.locationName || "";
  const mapsUrl     = s.mapsUrl      || "#";
  const mapsEmbedUrl = s.mapsEmbedUrl || "";
  const youtubeUrl  = translation.youtubeUrl || s.youtubeUrl || "";
  const virtualTourUrl = s.virtualTourUrl || "";
  const virtualTourCover = s.virtualTourCover || "";
  const youtubeEmbedUrl = getYouTubeEmbedUrl(youtubeUrl);
  const phone       = s.contactPhone    || "";
  const email       = s.contactEmail    || "";
  const whatsapp    = s.contactWhatsapp || "";
  const companyLocation = s.companyLocation || "";
  const companyWebsite = s.companyWebsite || "";
  const instagram   = s.socialInstagram || "";
  const facebook    = s.socialFacebook  || "";
  const twitter     = s.socialTwitter   || "";
  const qualities   = (translation.qualities || s.qualities || []).filter(Boolean);
  const visibleQualities = qualities.slice(0, 10);
  const extraQualities = qualities.slice(10);
  const pdfFile     = s.pdfFile || null;
  const pdfName     = translation.pdfName || s.pdfName || "Dossier informativo";
  const seoTitle = s.seoTitle || headline || cn;
  const seoDescription = s.seoDescription || introText || "";
  const socialImage = s.socialImage || s.cover || s.logo || "";
  const languageSwitch = languages.length > 1 && s.projectId ? `
    <div class="lang-switch">
      ${languages.map((lang) => `<a class="lang-link${lang === language ? " is-active" : ""}" href="?promo=${encodeURIComponent(s.projectId)}&lang=${encodeURIComponent(lang)}">${escapeHtml(lang.toUpperCase())}</a>`).join("")}
    </div>` : "";

  const floors = s.floors.filter(f => f.name || f.description || f.zones.some(z => z.images.length) || f.plan);

  // ── logo/cover markup
  const logoMk = s.logo
    ? `<img class="brand__logo${isTransparentLogo(s.logo) ? " brand__logo--transparent" : ""}" src="${escapeAttr(s.logo)}" alt="${escapeAttr(cn)}" />`
    : `<div class="brand__monogram">${escapeHtml(getInitials(cn))}</div>`;

  // ── hero
  const heroBg = s.cover
    ? `<img class="hero__bg-img" src="${escapeAttr(s.cover)}" alt="${escapeAttr(cn)}" />`
    : "";
  const heroTextMarkup = `
    ${copy.heroKicker ? `<span class="kicker${layout.hero === "statement" ? "" : " kicker--light"}">${escapeHtml(copy.heroKicker)}</span>` : ""}
    <h1>${escapeHtml(headline)}</h1>
    <p class="hero__intro">${escapeHtml(introText)}</p>
    <div class="hero__badges">
      ${priceFrom ? `<span class="price-badge">${escapeHtml(priceFrom)}</span>` : ""}
    </div>
  `;

  // ── map section
  const mapSection = `
  <section class="section section--map" id="ubicacion">
    <div class="shell">
      ${locationName || mapsUrl !== "#"
        ? `<a class="location-card-plain" href="${escapeAttr(mapsUrl)}" target="_blank" rel="noreferrer">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
             <span>${escapeHtml(locationName || "Abrir Google Maps")}</span>
             <span class="location-card-plain__cta">${escapeHtml(copy.locationLink)}</span>
             <svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
           </a>`
        : ""
      }
      ${mapsEmbedUrl ? `<div class="map-embed"><iframe src="${escapeAttr(mapsEmbedUrl)}" title="Mapa de ubicacion" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>` : ""}
    </div>
  </section>`;

  const mediaSection = (youtubeUrl || virtualTourUrl) ? `
  <section class="section section--media" id="multimedia">
    <div class="shell">
      <div class="section-header">
        <div>
          ${copy.mediaKicker ? `<span class="kicker">${escapeHtml(copy.mediaKicker)}</span>` : ""}
          <h2>${escapeHtml(copy.mediaTitle)}</h2>
        </div>
        ${copy.mediaLead ? `<p>${escapeHtml(copy.mediaLead)}</p>` : ""}
      </div>
      <div class="media-grid media-grid--${escapeAttr(layout.media)}">
        ${youtubeUrl ? `
          <div class="media-video-card media-video-card--${escapeAttr(layout.media)}${virtualTourUrl ? "" : " media-video-card--full"}">
            <div class="media-video-card__head">
              <div>
                ${copy.youtubeKicker ? `<span class="kicker">${escapeHtml(copy.youtubeKicker)}</span>` : ""}
                <h3>${escapeHtml(copy.youtubeTitle)}</h3>
              </div>
              <a class="media-video-link" href="${escapeAttr(youtubeUrl)}" target="_blank" rel="noreferrer" data-track="youtube">Abrir en YouTube</a>
            </div>
            ${youtubeEmbedUrl
              ? `<div class="media-video-frame"><iframe src="${escapeAttr(youtubeEmbedUrl)}" title="Video de la promocion en YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
              : `<a class="media-card media-card--fallback" href="${escapeAttr(youtubeUrl)}" target="_blank" rel="noreferrer" data-track="youtube">
                  <div class="media-card__icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.8 31.8 0 0 0 0 12a31.8 31.8 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.8 31.8 0 0 0 24 12a31.8 31.8 0 0 0-.5-5.8M9.6 15.7V8.3l6.4 3.7z"/></svg>
                  </div>
                  <div class="media-card__body">
                    <p>La URL no se puede embeber. Abre el video en YouTube.</p>
                  </div>
                  <span class="media-card__arrow">Abrir</span>
                </a>`
            }
          </div>
        ` : ""}
        ${virtualTourUrl ? `<a class="media-card media-card--tour media-card--${escapeAttr(layout.media)}" href="${escapeAttr(virtualTourUrl)}" target="_blank" rel="noreferrer" data-track="tour">
          ${virtualTourCover ? `<img class="media-card__cover" src="${escapeAttr(virtualTourCover)}" alt="${escapeAttr(copy.tourTitle)}" />` : ""}
          <div class="media-card__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M2.5 12h19"/><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"/></svg>
          </div>
          <div class="media-card__body">
            ${copy.tourKicker ? `<span class="kicker">${escapeHtml(copy.tourKicker)}</span>` : ""}
            <h3>${escapeHtml(copy.tourTitle)}</h3>
            ${copy.tourLead ? `<p>${escapeHtml(copy.tourLead)}</p>` : ""}
          </div>
          <span class="media-card__arrow">Entrar</span>
        </a>` : ""}
      </div>
    </div>
  </section>` : "";

  // ── floors
  const allFloorImages = (floor) => floor.zones.flatMap(z => z.images);

  const floorsMarkup = floors.length
    ? floors.map((floor, idx) => {
        const allImgs = allFloorImages(floor);
        const floorId = escapeAttr(floor.id);
        const floorTranslation = (translation.floors || []).find((entry) => entry.id === floor.id) || { name: floor.name, description: floor.description, zones: [] };

        const zonesHtml = floor.zones
          .filter(z => z.images.length)
          .map(z => `
            <div class="floor-zone">
              ${((floorTranslation.zones || []).find((entry) => entry.id === z.id)?.name || z.name) ? `<div class="floor-zone__label"><span>${escapeHtml((floorTranslation.zones || []).find((entry) => entry.id === z.id)?.name || z.name || "")}</span><em>${z.images.length} ${z.images.length === 1 ? "imagen" : "imagenes"}</em></div>` : ""}
              <div class="floor-gallery${z.images.length === 1 ? " floor-gallery--single" : ""}">
                ${z.images.map((img, i) => {
                  const globalIdx = allFloorImages(floor).indexOf(img);
                  const thumbSrc = img.replace(/(\.[^./?#]+)$/, '-thumb.jpg');
                  return `<figure class="floor-gallery__item${i === 0 ? " floor-gallery__item--hero" : ""}" data-reveal style="--reveal-delay:${i * 90}ms">
                    <img src="${escapeAttr(thumbSrc)}"
                         data-lb-src="${escapeAttr(img)}"
                         alt="${escapeAttr(`${floor.name || "Vivienda"} — ${z.name || "imagen"} ${i + 1}`)}"
                         class="lb-trigger"
                         loading="lazy"
                         data-lb-floor="${floorId}"
                         data-lb-index="${globalIdx >= 0 ? globalIdx : i}" />
                  </figure>`;
                }).join("")}
              </div>
            </div>`
          ).join("");

        const noImages = !floor.zones.some(z => z.images.length);
        const floorTourUrl = floor.virtualTourUrl || "";
        const floorTourCover = floor.virtualTourCover || "";

        const floorAnchorId = `tipologia-${idx + 1}`;

        return `
        <article class="floor-card" id="${escapeAttr(floorAnchorId)}">
          <div class="floor-body">
            <div class="floor-body__header">
              <span class="kicker">Tipologia ${String(idx + 1).padStart(2, "0")}</span>
              <h3>${escapeHtml(floorTranslation.name || floor.name || "Vivienda")}</h3>
            </div>
            ${(floor.area || floor.bedrooms || floor.bathrooms) ? `
            <div class="floor-specs">
              ${floor.bedrooms  ? `<span class="spec"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 9v11M22 9v11M2 14h20M7 14V9a5 5 0 0 1 10 0v5"/></svg>${escapeHtml(floor.bedrooms)} dorm.</span>` : ""}
              ${floor.bathrooms ? `<span class="spec"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 6V3.5a2.5 2.5 0 0 1 5 0V6"/><path d="M2 14h20v2a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-2z"/><path d="M2 14a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4"/></svg>${escapeHtml(floor.bathrooms)} ban.</span>` : ""}
              ${floor.area      ? `<span class="spec"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h4v4H3zM17 3h4v4h-4zM3 17h4v4H3zM17 17h4v4h-4z"/><path d="M7 5h10M19 7v10M17 19H7M5 17V7"/></svg>${escapeHtml(floor.area)}</span>` : ""}
            </div>` : ""}
            ${(floorTranslation.description || floor.description) ? `<p class="floor-body__desc">${escapeHtml(floorTranslation.description || floor.description)}</p>` : ""}
          </div>
          ${floorTourUrl ? `
          <a class="floor-tour-link" href="${escapeAttr(floorTourUrl)}" target="_blank" rel="noreferrer" data-track="tour">
            ${floorTourCover ? `<img class="floor-tour-link__cover" src="${escapeAttr(floorTourCover)}" alt="${escapeAttr(`Tour ${floorTranslation.name || floor.name || "tipologia"}`)}" />` : ""}
            <div class="floor-tour-link__body">
              <span class="kicker">Tour virtual</span>
              <strong>Ver esta tipologia</strong>
            </div>
          </a>` : ""}
          ${noImages ? "" : zonesHtml}

          ${floor.plan ? `
          <div class="floor-plan" data-reveal style="--reveal-delay:140ms">
            <div class="floor-plan__label"><span class="kicker">Plano de distribucion</span></div>
            <div class="floor-plan__media">
              <img src="${escapeAttr(floor.plan)}" alt="${escapeAttr(`Plano ${floor.name || "piso"}`)}" class="lb-trigger" data-lb-floor="${floorId}-plan" data-lb-index="0" />
              <button class="floor-plan__zoom" type="button" data-lb-open data-lb-floor="${floorId}-plan" data-lb-index="0">Ampliar plano</button>
            </div>
          </div>` : ""}
        </article>`;
      }).join("")
    : ``;

  const floorsQuickLinks = floors.length > 1 ? `
    <div class="floor-jump-list">
      ${floors.map((floor, idx) => {
        const floorTranslation = getFloorTranslation(translation, floor);
        return `<a class="floor-jump-link" href="#${escapeAttr(`tipologia-${idx + 1}`)}">${escapeHtml(floorTranslation.name || floor.name || `Tipologia ${idx + 1}`)}</a>`;
      }).join("")}
    </div>
  ` : "";

  // ── qualities
  const visibleQualitiesMk = visibleQualities.length
    ? visibleQualities.map(q => `<li><span class="q-bullet"></span><span>${escapeHtml(q)}</span></li>`).join("")
    : `<li><span class="q-bullet"></span><span>Personaliza la memoria de calidades desde el editor.</span></li>`;
  const extraQualitiesMk = extraQualities.map(q => `<li><span class="q-bullet"></span><span>${escapeHtml(q)}</span></li>`).join("");

  // ── PDF section
  const pdfSection = pdfFile ? `
  <section class="section section--pdf" id="dossier">
    <div class="shell">
      <div class="pdf-card">
        <div class="pdf-card__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div class="pdf-card__body">
          <h3>${escapeHtml(pdfName)}</h3>
          <p>${escapeHtml(copy.pdfLead)}</p>
        </div>
        <a href="${escapeAttr(pdfFile)}" download="${escapeAttr(pdfName + ".pdf")}" class="pdf-dl-btn" data-track="pdf">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Descargar PDF
        </a>
      </div>
    </div>
  </section>` : "";

  // ── contact section
  const hasContact = phone || email || whatsapp || companyWebsite || companyLocation || s.projectId;
  const contactSection = hasContact ? `
  <section class="section section--contact" id="contacto">
    <div class="shell">
      <div class="contact-card">
        <div class="contact-card__brand">
          ${s.logo ? `<img class="contact-logo${isTransparentLogo(s.logo) ? " contact-logo--transparent" : ""}" src="${escapeAttr(s.logo)}" alt="${escapeAttr(cn)}" />` : `<div class="contact-monogram">${escapeHtml(getInitials(cn))}</div>`}
        </div>
        <div class="contact-card__body">
          <span class="kicker kicker--light">${escapeHtml(copy.contactKicker)}</span>
          <h2>${escapeHtml(copy.contactTitle)}</h2>
          <p>${escapeHtml(cn)}${companyLocation ? ` &mdash; ${escapeHtml(companyLocation)}` : locationName ? ` &mdash; ${escapeHtml(locationName)}` : ""}</p>
        </div>
        <div class="contact-card__actions">
          ${companyWebsite ? `<a href="${escapeAttr(companyWebsite)}" target="_blank" rel="noreferrer" class="contact-btn contact-btn--ghost"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Web</a>` : ""}
          ${whatsapp ? `<a href="https://wa.me/${escapeAttr(whatsapp.replace(/\D/g,""))}" target="_blank" rel="noreferrer" class="contact-btn contact-btn--whatsapp" data-track="whatsapp"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>WhatsApp</a>` : ""}
          ${phone ? `<a href="tel:${escapeAttr(phone.replace(/\s/g,""))}" class="contact-btn contact-btn--primary" data-track="phone"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.36 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${escapeHtml(phone)}</a>` : ""}
          ${email ? `<a href="mailto:${escapeAttr(email)}" class="contact-btn contact-btn--ghost" data-track="email"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${escapeHtml(email)}</a>` : ""}
        </div>
        ${s.projectId ? `
        <form class="contact-form" data-contact-form>
          <h3>${escapeHtml(copy.contactFormTitle)}</h3>
          <div class="contact-form__grid">
            <input type="text" name="name" placeholder="${escapeAttr(copy.contactFormName)}" required />
            <input type="email" name="email" placeholder="${escapeAttr(copy.contactFormEmail)}" />
            <input type="tel" name="phone" placeholder="${escapeAttr(copy.contactFormPhone)}" />
          </div>
          <textarea name="message" rows="4" placeholder="${escapeAttr(copy.contactFormMessage)}" required></textarea>
          <button class="contact-btn contact-btn--primary" type="submit">${escapeHtml(copy.contactFormSubmit)}</button>
          <p class="contact-form__message" hidden></p>
        </form>` : ""}
      </div>
    </div>
  </section>` : "";

  // ── socials footer markup
  const socialsMk = (instagram || facebook || twitter) ? `
  <div class="footer__socials">
    ${instagram ? `<a href="${escapeAttr(instagram)}" target="_blank" rel="noreferrer" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>` : ""}
    ${facebook  ? `<a href="${escapeAttr(facebook)}"  target="_blank" rel="noreferrer" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>` : ""}
    ${twitter   ? `<a href="${escapeAttr(twitter)}"   target="_blank" rel="noreferrer" aria-label="X / Twitter"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>` : ""}
  </div>` : "";

  // ── WhatsApp float button
  const waFloat = whatsapp ? `<a class="wa-float" href="https://wa.me/${escapeAttr(whatsapp.replace(/\D/g,""))}" target="_blank" rel="noreferrer" aria-label="WhatsApp" data-track="whatsapp"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></a>` : "";
  const backToTopFloat = `<button class="site-back-to-top" type="button" aria-label="Subir arriba">↑</button>`;
  const floorsSection = `
  <section class="section" id="tipologias">
    <div class="shell">
      <div class="section-header">
        <div>
          ${copy.floorsKicker ? `<span class="kicker">${escapeHtml(copy.floorsKicker)}</span>` : ""}
          <h2>${escapeHtml(copy.floorsTitle)}</h2>
        </div>
        ${copy.floorsLead ? `<p>${escapeHtml(copy.floorsLead)}</p>` : ""}
      </div>
      ${floorsQuickLinks}
      <div class="floors-list floors-list--${escapeAttr(layout.floors)}">${floorsMarkup}</div>
    </div>
  </section>`;
  const qualitiesPanelMarkup = `
    <div class="quality-panel${layout.qualities === "full" ? " quality-panel--full" : ""}">
      <ul class="quality-list">${visibleQualitiesMk}</ul>
      ${extraQualities.length ? `
        <div class="quality-more" hidden>
          <ul class="quality-list quality-list--extra">${extraQualitiesMk}</ul>
        </div>
        <button class="quality-toggle" type="button" data-quality-toggle>${escapeHtml(copy.qualitiesMoreLabel)}</button>
      ` : ""}
    </div>
  `;
  const qualitiesSection = layout.qualities === "full"
    ? `
  <section class="section" id="calidades">
    <div class="shell">
      <div class="quality-panel quality-panel--full">
        <h2>${escapeHtml(copy.qualitiesTitle)}</h2>
        <ul class="quality-list">${visibleQualitiesMk}</ul>
        ${extraQualities.length ? `
          <div class="quality-more" hidden>
            <ul class="quality-list quality-list--extra">${extraQualitiesMk}</ul>
          </div>
          <button class="quality-toggle" type="button" data-quality-toggle>${escapeHtml(copy.qualitiesMoreLabel)}</button>
        ` : ""}
      </div>
    </div>
  </section>`
    : `
  <section class="section" id="calidades">
    <div class="shell">
      <div class="qualities-shell qualities-shell--${escapeAttr(layout.qualities)}">
        <div class="quality-intro">
          <h2>${escapeHtml(copy.qualitiesTitle)}</h2>
        </div>
        ${qualitiesPanelMarkup}
      </div>
    </div>
  </section>`;
  const sectionMarkup = {
    map: mapSection,
    media: mediaSection,
    floors: floors.length ? floorsSection : "",
    qualities: qualities.length ? qualitiesSection : "",
    pdf: pdfSection,
    contact: contactSection,
  };
  const orderedSections = (variant.sectionOrder || ["map", "media", "floors", "qualities", "pdf", "contact"])
    .map((sectionKey) => sectionMarkup[sectionKey] || "")
    .join("");

  return `<!DOCTYPE html>
<html lang="${escapeAttr(language)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeAttr(seoDescription)}" />
  <meta property="og:title" content="${escapeAttr(seoTitle)}" />
  <meta property="og:description" content="${escapeAttr(seoDescription)}" />
  <meta property="og:type" content="website" />
  ${socialImage ? `<meta property="og:image" content="${escapeAttr(socialImage)}" />` : ""}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(seoTitle)}" />
  <meta name="twitter:description" content="${escapeAttr(seoDescription)}" />
  ${socialImage ? `<meta name="twitter:image" content="${escapeAttr(socialImage)}" />` : ""}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700;800&display=swap');

    :root {
      --bg: #F5F1EB; --white: #FEFCF8; --ink: #1A1611; --muted: #72685F;
      --line: rgba(26,22,17,.10); --line-strong: rgba(26,22,17,.14);
      --accent: #1B3B35; --accent-mid: #2D5A51;
      --shadow: 0 28px 90px rgba(26,22,17,.10); --shadow-sm: 0 4px 24px rgba(26,22,17,.07);
      --r-sm: 14px; --r-md: 20px; --r-lg: 30px; --r-xl: 38px;
    }
    *,*::before,*::after{box-sizing:border-box;}
    body{margin:0;font-family:'Outfit','Segoe UI',sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;}
    img{display:block;max-width:100%;}
    a{color:inherit;text-decoration:none;}
    .shell{width:min(1280px,calc(100% - 40px));margin:0 auto;}
    .kicker{display:inline-flex;align-items:center;gap:10px;text-transform:uppercase;letter-spacing:.20em;font-size:.68rem;font-weight:700;color:var(--muted);}
    .kicker::before{content:'';display:inline-block;width:22px;height:1.5px;background:currentColor;border-radius:2px;}
    .kicker--light{color:rgba(255,255,255,.55);}
    .kicker--light::before{background:rgba(255,255,255,.55);}

    ${variantCss}

    /* ── HERO (full-bleed cover) ────────────────────────────── */
    .hero{padding:20px 0 0;}
    .hero__topbar{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 4px 14px;}
    .hero__panel{
      position:relative;border-radius:var(--r-xl);overflow:hidden;
      min-height:min(82vh,720px);display:flex;flex-direction:column;justify-content:space-between;
      padding:20px;background:linear-gradient(145deg,var(--accent),#2D5A51);
    }
    .lang-switch{display:flex;align-items:center;gap:14px;flex-shrink:0}
    .lang-link{font-size:.82rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
    .lang-link.is-active{color:var(--accent)}
    .hero__bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
    .hero__overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.22) 0%,rgba(0,0,0,.10) 40%,rgba(0,0,0,.72) 100%);}
    .hero__nav{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:20px;min-width:0;flex:1;}
    .brand{display:flex;align-items:center;gap:16px;min-width:0;}
    .brand__logo,.brand__monogram{width:108px;height:108px;border-radius:24px;flex-shrink:0;}
    .brand__logo{object-fit:contain;background:transparent;padding:0;border:none;}
    .brand__logo--transparent{background:transparent;border:none;padding:0;}
    .brand__monogram{background:var(--white);border:1px solid var(--line);display:grid;place-items:center;color:var(--accent);font-weight:800;font-size:1.35rem;}
    .brand__copy span{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:var(--muted);display:block;margin-bottom:6px;}
    .brand__copy strong{display:block;font-family:'Instrument Serif',Georgia,serif;font-size:1.65rem;font-weight:400;color:var(--ink);line-height:1.04;letter-spacing:-.02em;}
    .nav-pill{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:999px;border:1px solid var(--line);background:var(--white);font-size:.84rem;font-weight:600;color:var(--ink);flex-shrink:0;}
    .hero__bottom{position:relative;z-index:1;color:#fff;padding:0 4px 6px;}
    .hero__bottom h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:clamp(2.8rem,7vw,6rem);line-height:.94;letter-spacing:-.05em;margin:14px 0 16px;max-width:14ch;color:#fff;}
    .hero__intro{margin:0 0 20px;color:rgba(255,255,255,.78);font-size:1.02rem;line-height:1.78;max-width:54ch;}
    .hero__badges{display:flex;flex-wrap:wrap;gap:10px;}
    .price-badge{display:inline-flex;align-items:center;padding:10px 18px;border-radius:999px;background:#fff;color:var(--ink);font-size:.90rem;font-weight:700;}
    .tag-pill{display:inline-flex;align-items:center;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.22);color:#fff;font-size:.84rem;font-weight:600;}
    .hero--statement .hero__panel{min-height:min(62vh,560px);}
    .hero--statement .hero__overlay{background:linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.14) 100%);}
    .hero__statement{padding:18px 6px 0;max-width:980px;display:grid;gap:12px;}
    .hero__statement h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:clamp(3rem,7vw,5.8rem);line-height:.92;letter-spacing:-.05em;margin:0;color:var(--ink);max-width:10ch;}
    .hero__statement .hero__intro{margin:0;color:var(--muted);max-width:62ch;}
    .hero--statement .price-badge{background:var(--accent);color:#fff;}


    /* ── MAP ────────────────────────────────────────────────── */
    .section--map{padding:28px 0 0;}
    .location-card-plain{display:inline-flex;align-items:center;gap:14px;padding:20px 28px;border-radius:var(--r-lg);border:1px solid var(--line);background:var(--white);font-size:1rem;font-weight:600;transition:box-shadow .15s ease;}
    .location-card-plain:hover{box-shadow:var(--shadow-sm);}
    .location-card-plain__cta{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);}
    .location-card-plain .arrow{margin-left:auto;color:var(--muted);}
    .map-embed{margin-top:18px;border-radius:var(--r-lg);overflow:hidden;border:1px solid var(--line);box-shadow:var(--shadow-sm);aspect-ratio:16/6;}
    .map-embed iframe{width:100%;height:100%;border:0;display:block;}

    /* ── MEDIA ──────────────────────────────────────────────── */
    .section--media{padding:36px 0 16px;}
    .media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;}
    .media-grid--stack{grid-template-columns:1fr;}
    .media-video-card{display:grid;gap:14px;align-self:start;}
    .media-video-card--full{grid-column:1/-1;}
    .media-video-card__head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;}
    .media-video-card__head h3{font-family:'Instrument Serif',Georgia,serif;font-size:1.8rem;font-weight:400;letter-spacing:-.03em;margin:6px 0 0;}
    .media-video-link{font-size:.82rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.14em;}
    .media-video-frame{position:relative;overflow:hidden;border-radius:var(--r-lg);border:1px solid rgba(255,255,255,.65);background:#000;box-shadow:var(--shadow-sm);aspect-ratio:16 / 9;}
    .media-video-frame iframe{width:100%;height:100%;border:0;display:block;}
    .media-card{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;padding:26px 28px;border-radius:var(--r-lg);border:1px solid rgba(255,255,255,.65);background:linear-gradient(180deg,rgba(255,253,249,.92),rgba(252,249,243,.80));box-shadow:var(--shadow-sm);transition:transform .15s ease,box-shadow .15s ease;}
    .media-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);}
    .media-card--tour{position:relative;grid-template-columns:auto 1fr auto;align-items:end;overflow:hidden;min-height:320px;background:linear-gradient(160deg,var(--accent),var(--accent-mid));border-color:transparent;}
    .media-card__cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
    .media-card--tour::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.10) 35%,rgba(0,0,0,.62) 100%);}
    .media-card--tour .media-card__icon,
    .media-card--tour .media-card__body,
    .media-card--tour .media-card__arrow{position:relative;z-index:1;}
    .media-card--tour .media-card__icon{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.22);color:#fff;}
    .media-card--tour .media-card__body{align-self:end;}
    .media-card--tour .media-card__body .kicker,
    .media-card--tour .media-card__body p,
    .media-card--tour .media-card__arrow,
    .media-card--tour .media-card__body h3{color:#fff;}
    .media-card--tour .media-card__body .kicker::before{background:rgba(255,255,255,.55);}
    .media-card__icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:rgba(27,59,53,.08);border:1px solid rgba(27,59,53,.12);color:var(--accent);}
    .media-card__body h3{font-family:'Instrument Serif',Georgia,serif;font-size:1.8rem;font-weight:400;letter-spacing:-.03em;margin:6px 0;}
    .media-card__body p{margin:0;color:var(--muted);line-height:1.65;}
    .media-card__arrow{font-size:.82rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.14em;}

    /* ── SECTIONS ───────────────────────────────────────────── */
    .section{padding:56px 0 72px;}
    .section-header{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:32px;}
    .section-header h2{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:clamp(2.2rem,5vw,3.6rem);line-height:.96;letter-spacing:-.04em;margin:10px 0 0;max-width:12ch;}
    .section-header p{margin:0;color:var(--muted);max-width:34ch;line-height:1.75;}

    /* ── FLOORS ─────────────────────────────────────────────── */
    .floors-list{display:grid;gap:20px;}
    .floors-list--gallery{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;}
    .floors-list--editorial{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:26px;}
    .floor-card{border:1px solid rgba(255,255,255,.70);border-radius:var(--r-lg);background:linear-gradient(180deg,rgba(255,253,249,.92),rgba(252,249,243,.80));box-shadow:var(--shadow-sm);overflow:hidden;scroll-margin-top:22px;}
    .floor-jump-list{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px;}
    .floor-jump-link{display:inline-flex;align-items:center;padding:10px 14px;border-radius:999px;border:1px solid var(--line-strong);background:rgba(255,255,255,.78);font-size:.82rem;font-weight:700;color:var(--ink);transition:transform .15s ease,box-shadow .15s ease;}
    .floor-jump-link:hover{transform:translateY(-1px);box-shadow:var(--shadow-sm);}
    .floor-body{padding:26px 28px 16px;display:grid;gap:14px;}
    .floor-body__header h3{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:clamp(1.9rem,4vw,2.9rem);line-height:.98;letter-spacing:-.04em;margin:8px 0 0;}
    .floor-specs{display:flex;flex-wrap:wrap;gap:10px;}
    .spec{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;border:1px solid var(--line-strong);background:rgba(255,255,255,.75);font-size:.84rem;font-weight:600;}
    .spec svg{color:var(--accent-mid);flex-shrink:0;}
    .floor-body__desc{margin:0;color:var(--muted);line-height:1.78;max-width:70ch;}
    .floor-zone{margin-bottom:4px;}
    .floor-zone__label{display:flex;align-items:baseline;gap:12px;padding:14px 14px 10px;border-top:1px solid var(--line);}
    .floor-zone__label span{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);}
    .floor-zone__label em{font-style:normal;font-size:.74rem;color:var(--muted);opacity:.7;}
    .floor-zone:first-child .floor-zone__label{border-top:none;padding-top:6px;}
    .floor-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 14px 14px;}
    .floor-gallery--single{grid-template-columns:1fr;}
    .floor-gallery__item{position:relative;margin:0;border-radius:16px;overflow:hidden;}
    .floor-gallery__item--hero{grid-column:1/-1;}
    .floor-gallery__item[data-reveal],
    .floor-plan[data-reveal]{opacity:0;transform:translateY(24px) scale(.985);transition:opacity .75s ease,transform .75s ease;transition-delay:var(--reveal-delay,0ms);}
    .floor-gallery__item.is-visible,
    .floor-plan.is-visible{opacity:1;transform:none;}
    .floor-gallery img{width:100%;height:100%;object-fit:cover;min-height:180px;cursor:zoom-in;transition:transform .2s ease;}
    .floor-gallery img:hover{transform:scale(1.02);}
    .floor-gallery__item--hero img{min-height:320px;max-height:500px;}
    .floor-gallery--empty{grid-template-columns:1fr;padding:14px;}
    .floor-gallery__placeholder{display:grid;place-items:center;gap:10px;padding:50px 24px;border-radius:16px;background:rgba(26,22,17,.04);color:var(--muted);}
    .floor-tour-link{margin:0 14px 18px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:14px 16px;border-radius:18px;border:1px solid var(--line);background:rgba(27,59,53,.06);color:var(--ink);}
    .floor-tour-link__cover{width:88px;height:72px;object-fit:cover;border-radius:12px;border:1px solid var(--line);}
    .floor-tour-link__body{display:grid;gap:6px;}
    .floor-tour-link__body strong{font-size:.95rem;}
    .floor-plan{padding:6px 14px 18px;}
    .floor-plan__label{padding:12px 0 10px;border-top:1px solid var(--line);}
    .floor-plan__media{position:relative;display:grid;justify-items:center;gap:12px;}
    .floor-plan img{width:min(100%,520px);max-height:360px;object-fit:contain;border-radius:16px;border:1px solid var(--line);cursor:zoom-in;background:#fff;padding:10px;}
    .floor-plan__zoom{border:1px solid var(--line);background:rgba(255,255,255,.86);color:var(--ink);border-radius:999px;padding:10px 16px;font:inherit;font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;}
    .empty-floors{padding:40px 28px;border-radius:var(--r-lg);border:1.5px dashed var(--line-strong);text-align:center;color:var(--muted);}
    .theme--galeria .floors-list--gallery .floor-card{background:#fff;}
    .theme--galeria .floors-list--gallery .floor-gallery{grid-template-columns:repeat(2,1fr);gap:12px;}
    .theme--galeria .floors-list--gallery .floor-gallery__item--hero img{min-height:420px;max-height:560px;}
    .theme--catalogo .floors-list--editorial .floor-card{display:grid;grid-template-rows:auto 1fr;background:#fff;}
    .theme--catalogo .floors-list--editorial .floor-body{padding-bottom:8px;}
    .theme--catalogo .floors-list--editorial .floor-gallery{grid-template-columns:repeat(2,1fr);}
    .theme--catalogo .floors-list--editorial .floor-gallery__item--hero{grid-column:auto;}
    .theme--catalogo .floors-list--editorial .floor-gallery__item img{min-height:210px;max-height:300px;}

    /* ── QUALITIES ──────────────────────────────────────────── */
    .qualities-shell{display:grid;gap:22px;}
    .quality-intro{padding:28px 30px;border-radius:var(--r-lg);border:1px solid rgba(255,255,255,.65);background:linear-gradient(180deg,rgba(255,253,249,.92),rgba(252,249,243,.80));box-shadow:var(--shadow-sm);}
    .quality-intro h2{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:clamp(1.9rem,4vw,3rem);line-height:1.0;letter-spacing:-.04em;margin:10px 0 14px;}
    .quality-intro p{margin:0;color:var(--muted);line-height:1.75;max-width:42ch;}
    .quality-panel{padding:30px 34px;border-radius:var(--r-lg);background:linear-gradient(150deg,var(--accent),#152E28);color:#F8F4ED;box-shadow:var(--shadow);}
    .quality-panel--full{max-width:none;}
    .quality-panel .kicker{color:rgba(248,244,237,.45);}
    .quality-panel .kicker::before{background:rgba(248,244,237,.45);}
    .quality-panel h2,
    .quality-panel h3{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:clamp(1.9rem,4vw,3rem);line-height:1.0;letter-spacing:-.04em;margin:10px 0 14px;}
    .quality-panel__lead{margin:0 0 22px;color:rgba(248,244,237,.78);line-height:1.78;max-width:54ch;}
    .quality-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:12px 18px;}
    .quality-list li{display:flex;gap:10px;align-items:flex-start;color:rgba(248,244,237,.78);font-size:.92rem;line-height:1.60;}
    .q-bullet{width:7px;height:7px;border-radius:999px;background:linear-gradient(135deg,#D4A85A,#F0D08A);flex-shrink:0;margin-top:8px;}
    .quality-more{margin-top:14px;}
    .quality-list--extra{padding-top:14px;border-top:1px solid rgba(248,244,237,.14);}
    .quality-toggle{margin-top:18px;border:1px solid rgba(255,255,255,.20);background:rgba(255,255,255,.08);color:#F8F4ED;border-radius:999px;padding:12px 18px;font:inherit;font-size:.82rem;font-weight:700;letter-spacing:.10em;text-transform:uppercase;cursor:pointer;}
    .quality-toggle:hover{background:rgba(255,255,255,.14);}

    /* ── PDF ────────────────────────────────────────────────── */
    .section--pdf{padding:0 0 56px;}
    .pdf-card{display:flex;align-items:center;gap:20px;padding:28px 32px;border-radius:var(--r-lg);border:1px solid rgba(255,255,255,.65);background:linear-gradient(180deg,rgba(255,253,249,.92),rgba(252,249,243,.80));box-shadow:var(--shadow-sm);}
    .pdf-card__icon{width:56px;height:56px;border-radius:14px;background:rgba(27,59,53,.08);border:1px solid rgba(27,59,53,.12);display:grid;place-items:center;flex-shrink:0;color:var(--accent);}
    .pdf-card__body{flex:1;}
    .pdf-card__body h3{font-family:'Instrument Serif',Georgia,serif;font-size:1.5rem;font-weight:400;letter-spacing:-.03em;margin:0 0 6px;}
    .pdf-card__body p{margin:0;color:var(--muted);font-size:.88rem;line-height:1.6;}
    .pdf-dl-btn{display:inline-flex;align-items:center;gap:9px;padding:12px 20px;border-radius:999px;background:var(--accent);color:#fff;font-size:.88rem;font-weight:700;flex-shrink:0;transition:opacity .15s ease;}
    .pdf-dl-btn:hover{opacity:.88;}

    /* ── CONTACT ────────────────────────────────────────────── */
    .section--contact{padding:0 0 72px;}
    .contact-card{border-radius:var(--r-xl);background:linear-gradient(145deg,var(--accent),#152E28);padding:clamp(28px,5vw,52px);display:grid;grid-template-columns:auto 1fr auto;gap:26px;align-items:center;box-shadow:var(--shadow);}
    .contact-card__brand{display:flex;align-items:center;}
    .contact-logo{width:96px;height:96px;border-radius:22px;object-fit:contain;background:rgba(255,255,255,.92);padding:12px;border:1px solid rgba(255,255,255,.20);}
    .contact-logo--transparent{background:transparent;border:none;padding:2px;}
    .contact-monogram{width:76px;height:76px;border-radius:18px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.20);display:grid;place-items:center;color:#fff;font-weight:800;font-size:1.4rem;}
    .contact-card__body h2{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:clamp(1.9rem,4vw,3rem);line-height:.98;letter-spacing:-.04em;color:#FEFCF8;margin:10px 0 8px;}
    .contact-card__body p{margin:0;color:rgba(254,252,248,.55);font-size:.88rem;}
    .contact-card__actions{display:grid;gap:10px;}
    .contact-btn{display:inline-flex;align-items:center;gap:10px;padding:13px 20px;border-radius:999px;font-size:.90rem;font-weight:700;white-space:nowrap;transition:transform .15s ease;}
    .contact-btn:hover{transform:translateY(-2px);}
    .contact-btn--whatsapp{background:#25D366;color:#fff;}
    .contact-btn--primary{background:#FEFCF8;color:var(--accent);}
    .contact-btn--ghost{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.20);color:#FEFCF8;}
    .contact-form{grid-column:1/-1;display:grid;gap:14px;margin-top:10px;padding-top:22px;border-top:1px solid rgba(255,255,255,.14);}
    .contact-form h3{margin:0;font-family:'Instrument Serif',Georgia,serif;font-size:1.7rem;font-weight:400;letter-spacing:-.03em;color:#FEFCF8;}
    .contact-form__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
    .contact-form input,.contact-form textarea{width:100%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.10);color:#FEFCF8;border-radius:16px;padding:14px 16px;font:inherit;outline:none;}
    .contact-form input::placeholder,.contact-form textarea::placeholder{color:rgba(255,255,255,.55);}
    .contact-form input:focus,.contact-form textarea:focus{border-color:rgba(255,255,255,.42);background:rgba(255,255,255,.14);}
    .contact-form textarea{min-height:120px;resize:vertical;}
    .contact-form__message{margin:0;font-size:.88rem;color:rgba(255,255,255,.74);}
    .contact-form__message.is-error{color:#FFD7D2;}
    .contact-form .contact-btn{justify-self:start;}

    /* ── WA FLOAT ───────────────────────────────────────────── */
    .wa-float{position:fixed;bottom:26px;right:26px;z-index:999;width:54px;height:54px;border-radius:999px;background:#25D366;color:#fff;display:grid;place-items:center;box-shadow:0 4px 20px rgba(37,211,102,.45);transition:transform .15s ease;}
    .wa-float:hover{transform:scale(1.08);}
    .site-back-to-top{position:fixed;right:26px;bottom:92px;z-index:998;width:48px;height:48px;border:none;border-radius:999px;background:rgba(26,22,17,.84);color:#fff;display:grid;place-items:center;font:inherit;font-size:1.1rem;font-weight:800;box-shadow:0 14px 36px rgba(26,22,17,.22);opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity .18s ease,transform .18s ease;}
    .site-back-to-top.is-visible{opacity:1;pointer-events:auto;transform:translateY(0);}

    /* ── FOOTER ─────────────────────────────────────────────── */
    .footer{padding:0 0 36px;}
    .footer__bar{border-radius:var(--r-lg);border:1px solid rgba(255,255,255,.65);background:linear-gradient(180deg,rgba(255,253,249,.90),rgba(252,249,243,.78));box-shadow:var(--shadow-sm);padding:20px 28px;display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;}
    .footer__name{font-family:'Instrument Serif',Georgia,serif;font-size:1.25rem;font-weight:400;letter-spacing:-.02em;}
    .footer__meta{font-size:.80rem;color:var(--muted);display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
    .footer__sep{width:3px;height:3px;border-radius:999px;background:var(--muted);opacity:.4;}
    .footer__socials{display:flex;gap:12px;align-items:center;}
    .footer__socials a{display:grid;place-items:center;color:var(--muted);transition:color .15s;}
    .footer__socials a:hover{color:var(--ink);}
    .footer__powered{font-size:.72rem;color:var(--muted);opacity:.65;}
    .footer__powered a{text-decoration:underline;text-underline-offset:2px;}

    /* ── LIGHTBOX ───────────────────────────────────────────── */
    .lb{position:fixed;inset:0;z-index:9999;background:rgba(8,7,6,.95);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .20s ease;}
    .lb--open{opacity:1;pointer-events:all;}
    .lb__stage{max-width:92vw;max-height:90vh;display:flex;align-items:center;}
    .lb__stage img{max-width:92vw;max-height:90vh;object-fit:contain;border-radius:6px;user-select:none;}
    .lb__btn{position:fixed;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);color:#fff;width:50px;height:50px;border-radius:999px;display:grid;place-items:center;cursor:pointer;transition:background .15s;font-size:1.5rem;user-select:none;}
    .lb__btn:hover{background:rgba(255,255,255,.20);}
    .lb__prev{left:18px;}.lb__next{right:18px;}
    .lb__close{position:fixed;top:18px;right:18px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);color:#fff;width:42px;height:42px;border-radius:999px;display:grid;place-items:center;cursor:pointer;font-size:1rem;transition:background .15s;}
    .lb__close:hover{background:rgba(255,255,255,.20);}
    .lb__counter{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);font-size:.78rem;font-weight:600;color:rgba(255,255,255,.50);letter-spacing:.10em;pointer-events:none;}

    /* ── RESPONSIVE ─────────────────────────────────────────── */
    @media(max-width:1080px){
      .contact-card,.media-grid{grid-template-columns:1fr;}
      .floors-list--gallery,.floors-list--editorial{grid-template-columns:1fr;}
      .contact-card{text-align:center;}
      .contact-card__brand{justify-content:center;}
      .contact-card__actions{justify-items:center;}
      .contact-form__grid{grid-template-columns:1fr;}
      .contact-form .contact-btn{justify-self:center;}
      .pdf-card{flex-direction:column;text-align:center;}
    }
    @media(max-width:760px){
      .shell{width:calc(100% - 20px);}
      .hero{padding:12px 0 0;}
      .hero__panel{min-height:min(70vh,560px);padding:14px;}
      .hero__topbar{flex-direction:column;align-items:flex-start;gap:12px;padding:0 0 12px;}
      .hero__nav{width:100%;flex-direction:column;align-items:flex-start;gap:14px;}
      .brand__logo,.brand__monogram{width:78px;height:78px;border-radius:20px;}
      .brand__copy strong{font-size:1.28rem;}
      .hero__statement{padding:8px 0 0;}
      .section{padding:36px 0 52px;}
      .section-header{flex-direction:column;align-items:flex-start;}
      .media-video-card__head{flex-direction:column;align-items:flex-start;}
      .media-card{grid-template-columns:1fr;justify-items:start;}
      .floor-gallery{grid-template-columns:1fr;}
      .floor-gallery__item--hero{grid-column:auto;}
      .floor-body{padding:18px 18px 12px;}
      .floor-tour-link{grid-template-columns:1fr;}
      .floor-tour-link__cover{width:100%;height:180px;}
      .quality-list{grid-template-columns:1fr;}
      .quality-panel{padding:22px;}
      .footer__bar{flex-direction:column;align-items:flex-start;gap:10px;}
      .wa-float{bottom:16px;right:16px;}
      .site-back-to-top{right:16px;bottom:82px;}
    }
  </style>
</head>
<body class="theme theme--${escapeAttr(designVariant)} hero--${escapeAttr(layout.hero)}">
  ${waFloat}
  ${backToTopFloat}

  <section class="hero hero--${escapeAttr(layout.hero)}">
    <div class="shell">
      <div class="hero__topbar">
        ${languageSwitch}
        <div class="hero__nav">
          <div class="brand">
            ${logoMk}
            <div class="brand__copy">
              <span>Promocion residencial</span>
              <strong>${escapeHtml(cn)}</strong>
            </div>
          </div>
          <a class="nav-pill" href="${escapeAttr(mapsUrl)}" target="_blank" rel="noreferrer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            ${escapeHtml(copy.locationLink)}
          </a>
        </div>
      </div>
      <div class="hero__panel hero__panel--${escapeAttr(layout.hero)}">
        ${heroBg}
        <div class="hero__overlay"></div>
        ${layout.hero === "statement" ? "" : `<div class="hero__bottom">${heroTextMarkup}</div>`}
      </div>
      ${layout.hero === "statement" ? `<div class="hero__statement">${heroTextMarkup}</div>` : ""}
    </div>
  </section>

  ${orderedSections}

  <footer class="footer">
    <div class="shell">
      <div class="footer__bar">
        <span class="footer__name">${escapeHtml(cn)}</span>
        <div class="footer__meta">
          ${locationName ? `<span>${escapeHtml(locationName)}</span><span class="footer__sep"></span>` : ""}
          <a href="${escapeAttr(mapsUrl)}" target="_blank" rel="noreferrer">${escapeHtml(copy.locationLink)}</a>
          <span class="footer__sep"></span>
          <span>Visitas: <strong id="visit-counter">${getProjectVisitCount(projectId)}</strong></span>
          ${socialsMk ? `<span class="footer__sep"></span>${socialsMk}` : ""}
          <span class="footer__sep"></span>
          <span>&copy; ${new Date().getFullYear()}</span>
        </div>
        <span class="footer__powered">Hecho con <a href="https://www.tucasaen3d.es" target="_blank" rel="noreferrer">Tu Casa en 3D</a></span>
      </div>
    </div>
  </footer>

  <!-- lightbox -->
  <div id="lb" class="lb" role="dialog" aria-modal="true">
    <button class="lb__close" id="lb-close">&#x2715;</button>
    <button class="lb__btn lb__prev" id="lb-prev">&#8249;</button>
    <div class="lb__stage"><img id="lb-img" src="" alt="" /></div>
    <button class="lb__btn lb__next" id="lb-next">&#8250;</button>
    <span class="lb__counter" id="lb-counter"></span>
  </div>

  <script>
    (function(){
      var isPreview = ${previewMode ? "true" : "false"};
      var projectId = ${safeJsonEmbed(projectId)};
      var visitNode = document.getElementById('visit-counter');
      var backToTopBtn = document.querySelector('.site-back-to-top');
      var localVisitKey = 'promoVisits:' + projectId;
      function setVisitCount(value){
        if(visitNode && isFinite(Number(value))) visitNode.textContent = String(Number(value));
      }
      function fallbackVisitCounter(){
        try {
          var currentVisits = Number(localStorage.getItem(localVisitKey) || '0');
          if (!isPreview) {
            currentVisits += 1;
            localStorage.setItem(localVisitKey, String(currentVisits));
          }
          setVisitCount(currentVisits);
        } catch (e) {}
      }
      function syncBackToTop(){
        if(!backToTopBtn) return;
        backToTopBtn.classList.toggle('is-visible', window.scrollY > 520);
      }
      if(backToTopBtn){
        backToTopBtn.addEventListener('click', function(){
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        window.addEventListener('scroll', syncBackToTop, { passive:true });
        syncBackToTop();
      }
      function postJson(url, payload, keepalive){
        return fetch(url, {
          method:'POST',
          credentials:'same-origin',
          keepalive: !!keepalive,
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload || {})
        }).then(function(res){ return res.json().catch(function(){ return {}; }); });
      }
      function trackEvent(type, keepalive){
        if(isPreview || !projectId) return Promise.resolve(null);
        return postJson('./api/track_event.php', { projectId: projectId, type: type }, keepalive)
          .catch(function(){ return null; });
      }
      if(!isPreview && projectId){
        trackEvent('pageview').then(function(result){
          if(result && result.ok && result.data && result.data.pageview != null){
            setVisitCount(result.data.pageview);
          } else {
            fallbackVisitCounter();
          }
        });
      } else {
        fallbackVisitCounter();
      }
      var lb=document.getElementById('lb'),lbImg=document.getElementById('lb-img'),
          lbCtr=document.getElementById('lb-counter'),
          lbPrev=document.getElementById('lb-prev'),lbNext=document.getElementById('lb-next');
      var imgs=[],cur=0;
      function show(i){cur=(i+imgs.length)%imgs.length;lbImg.src=imgs[cur];lbCtr.textContent=imgs.length>1?(cur+1)+' / '+imgs.length:'';}
      function open(floorId,idx){
        imgs=Array.from(document.querySelectorAll('img[data-lb-floor="'+floorId+'"]')).map(function(el){return el.dataset.lbSrc||el.src;});
        if(!imgs.length)return;
        show(idx);lb.classList.add('lb--open');document.body.style.overflow='hidden';
      }
      function close(){lb.classList.remove('lb--open');document.body.style.overflow='';}
      document.getElementById('lb-close').addEventListener('click',close);
      var qualityToggle=document.querySelector('[data-quality-toggle]');
      if(qualityToggle){
        var qualityMore=document.querySelector('.quality-more');
        qualityToggle.addEventListener('click',function(){
          var isHidden=qualityMore.hasAttribute('hidden');
          if(isHidden){
            qualityMore.removeAttribute('hidden');
            qualityToggle.textContent=${safeJsonEmbed(copy.qualitiesLessLabel)};
          }else{
            qualityMore.setAttribute('hidden','');
            qualityToggle.textContent=${safeJsonEmbed(copy.qualitiesMoreLabel)};
          }
        });
      }
      lbPrev.addEventListener('click',function(e){e.stopPropagation();show(cur-1);});
      lbNext.addEventListener('click',function(e){e.stopPropagation();show(cur+1);});
      lb.addEventListener('click',function(e){if(e.target===lb)close();});
      document.addEventListener('keydown',function(e){
        if(!lb.classList.contains('lb--open'))return;
        if(e.key==='ArrowLeft')show(cur-1);
        if(e.key==='ArrowRight')show(cur+1);
        if(e.key==='Escape')close();
      });
      var tx=0;
      lb.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;},{passive:true});
      lb.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>48)dx<0?show(cur+1):show(cur-1);});
      document.querySelectorAll('.lb-trigger,[data-lb-open]').forEach(function(img){
        img.addEventListener('click',function(){open(img.dataset.lbFloor,parseInt(img.dataset.lbIndex,10));});
      });
      if('IntersectionObserver' in window){
        var revealObserver = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if(entry.isIntersecting){
              entry.target.classList.add('is-visible');
              revealObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.16, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('[data-reveal]').forEach(function(node){
          revealObserver.observe(node);
        });
      } else {
        document.querySelectorAll('[data-reveal]').forEach(function(node){
          node.classList.add('is-visible');
        });
      }
      document.querySelectorAll('[data-track]').forEach(function(node){
        node.addEventListener('click',function(){
          var type = node.getAttribute('data-track');
          if(type) trackEvent(type, true);
        });
      });
      var contactForm = document.querySelector('[data-contact-form]');
      if(contactForm){
        var messageNode = contactForm.querySelector('.contact-form__message');
        contactForm.addEventListener('submit', function(e){
          e.preventDefault();
          if(!messageNode) return;
          messageNode.hidden = false;
          messageNode.classList.remove('is-error');
          if(isPreview || !projectId){
            messageNode.textContent = ${safeJsonEmbed(copy.contactFormPreview)};
            return;
          }
          var formData = new FormData(contactForm);
          messageNode.textContent = ${safeJsonEmbed(copy.contactFormSending)};
          postJson('./api/submit_contact.php', {
            projectId: projectId,
            name: String(formData.get('name') || ''),
            email: String(formData.get('email') || ''),
            phone: String(formData.get('phone') || ''),
            message: String(formData.get('message') || '')
          }).then(function(result){
            if(result && result.ok){
              contactForm.reset();
              messageNode.textContent = ${safeJsonEmbed(copy.contactFormSuccess)};
              return;
            }
            messageNode.classList.add('is-error');
            messageNode.textContent = (result && result.error) ? result.error : ${safeJsonEmbed(copy.contactFormError)};
          }).catch(function(){
            messageNode.classList.add('is-error');
            messageNode.textContent = ${safeJsonEmbed(copy.contactFormError)};
          });
        });
      }
    })();
  </script>
</body>
</html>`.trim();
}

function buildDesignedDossierHtml(s, { currentLanguage = "es", autoPrint = true } = {}) {
  const designVariant = resolveDesignVariantKey(s.designVariant);
  const variant = getVariantConfig(designVariant);
  const layout = getVariantLayout(variant);
  const languages = getProjectLanguages(s);
  const language = languages.includes(currentLanguage) ? currentLanguage : languages[0];
  const translation = getActiveTranslation(s, language);
  const copy = {
    sectionSummary: "Resumen del proyecto",
    sectionQualities: "Memoria de calidades",
    sectionHomes: "Tipologias",
    sectionContact: "Contacto",
    videoLabel: "Video de YouTube",
    tourLabel: "Tour virtual",
    locationLabel: "Ubicacion",
    pdfLabel: "PDF comercial",
    homesLead: "Tipologias, planos e imagenes clave del proyecto.",
    contactLead: "",
  };

  if (language === "en") {
    Object.assign(copy, {
      sectionSummary: "Project summary",
      sectionQualities: "Quality specifications",
      sectionHomes: "Typologies",
      sectionContact: "Contact",
      videoLabel: "YouTube video",
      tourLabel: "Virtual tour",
      locationLabel: "Location",
      pdfLabel: "Sales PDF",
      homesLead: "Typologies, plans and key images for the development.",
      contactLead: "",
    });
  }

  const cn = s.companyName || "Promocion residencial";
  const headline = translation.headline || s.headline || cn;
  const introText = translation.introText || s.introText || "";
  const youtubeUrl = translation.youtubeUrl || s.youtubeUrl || "";
  const qualities = (translation.qualities || s.qualities || []).filter(Boolean);
  const locationName = s.locationName || "";
  const mapsUrl = s.mapsUrl || "";
  const virtualTourUrl = s.virtualTourUrl || "";
  const pdfName = translation.pdfName || s.pdfName || "Dossier informativo";
  const floors = s.floors.filter((floor) => floor.name || floor.description || floor.zones.some((zone) => zone.images.length) || floor.plan);
  const coverMedia = s.cover
    ? `<img class="dossier-cover__image" src="${escapeAttr(s.cover)}" alt="${escapeAttr(headline)}" />`
    : `<div class="dossier-cover__placeholder">${escapeHtml(cn)}</div>`;
  const logoMarkup = s.logo
    ? `<img class="dossier-cover__logo${isTransparentLogo(s.logo) ? " dossier-cover__logo--transparent" : ""}" src="${escapeAttr(s.logo)}" alt="${escapeAttr(cn)}" />`
    : `<div class="dossier-cover__mono">${escapeHtml(getInitials(cn))}</div>`;
  const qualitiesMarkup = qualities.length
    ? qualities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : `<li>Completa las calidades en el editor.</li>`;
  const summaryFacts = [
    youtubeUrl ? `<a class="dossier-link-card" href="${escapeAttr(youtubeUrl)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(copy.videoLabel)}</strong><span>${escapeHtml(copy.youtubeTitle || "YouTube")}</span></a>` : "",
    virtualTourUrl ? `<a class="dossier-link-card" href="${escapeAttr(virtualTourUrl)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(copy.tourLabel)}</strong><span>${escapeHtml(copy.tourTitle || "Tour virtual")}</span></a>` : "",
    mapsUrl ? `<a class="dossier-link-card" href="${escapeAttr(mapsUrl)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(copy.locationLabel)}</strong><span>${escapeHtml(locationName || copy.locationLink || "Ver ubicacion")}</span></a>` : "",
    s.pdfFile ? `<a class="dossier-link-card" href="${escapeAttr(s.pdfFile)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(copy.pdfLabel)}</strong><span>${escapeHtml(pdfName)}</span></a>` : "",
  ].filter(Boolean).join("");
  const coverLinksStrip = summaryFacts ? `<div class="dossier-cover__links">${summaryFacts}</div>` : "";

  const floorPages = floors.map((floor, index) => {
    const floorTranslation = (translation.floors || []).find((entry) => entry.id === floor.id) || { name: floor.name, description: floor.description, zones: [] };
    const zoneBlocks = floor.zones.filter((zone) => zone.images.length).map((zone) => {
      const zoneTranslation = (floorTranslation.zones || []).find((entry) => entry.id === zone.id);
      return `
        <div class="dossier-zone">
          <div class="dossier-zone__label">${escapeHtml(zoneTranslation?.name || zone.name || `Zona ${index + 1}`)}</div>
          <div class="dossier-zone__gallery${zone.images.length === 1 ? " dossier-zone__gallery--single" : ""}">
            ${zone.images.slice(0, 4).map((image) => `<img src="${escapeAttr(image)}" alt="${escapeAttr(zoneTranslation?.name || zone.name || "Imagen de la vivienda")}" />`).join("")}
          </div>
        </div>
      `;
    }).join("");

    return `
      <section class="dossier-page dossier-page--floor">
        <div class="dossier-page__content">
          <div class="dossier-page__head">
            <span class="dossier-kicker">${escapeHtml(copy.sectionHomes)}</span>
            <h2>${escapeHtml(floorTranslation.name || floor.name || `Tipologia ${index + 1}`)}</h2>
            <p>${escapeHtml(floorTranslation.description || floor.description || copy.homesLead)}</p>
          </div>
          <div class="dossier-specs">
            ${floor.area ? `<span>${escapeHtml(floor.area)}</span>` : ""}
            ${floor.bedrooms ? `<span>${escapeHtml(floor.bedrooms)} dorm.</span>` : ""}
            ${floor.bathrooms ? `<span>${escapeHtml(floor.bathrooms)} baños</span>` : ""}
          </div>
          ${floor.virtualTourUrl ? `<a class="dossier-link-card" href="${escapeAttr(floor.virtualTourUrl)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(copy.tourLabel)}</strong><span>${escapeHtml(floorTranslation.name || floor.name || `Tipologia ${index + 1}`)}</span></a>` : ""}
          ${floor.plan ? `<div class="dossier-plan"><img src="${escapeAttr(floor.plan)}" alt="${escapeAttr(`Plano ${floorTranslation.name || floor.name || ""}`)}" /></div>` : ""}
          ${zoneBlocks || `<div class="dossier-empty">Añade renders para esta tipologia.</div>`}
        </div>
      </section>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${escapeAttr(language)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pdfName)} - ${escapeHtml(cn)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700;800&display=swap');
    @page { size: A4; margin: 12mm; }
    :root{
      --bg:#F5F1EB;--paper:#FFFCF7;--ink:#1A1611;--muted:#74695F;--line:rgba(26,22,17,.12);
      --accent:${escapeHtml((variant.palette && variant.palette[0]) || "#1B3B35")};--accentMid:${escapeHtml((variant.palette && variant.palette[1]) || "#D4A85A")};
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);font-family:'Outfit','Segoe UI',sans-serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}
    img{display:block;max-width:100%}
    a{color:inherit;text-decoration:none}
    .dossier-page{position:relative;min-height:272mm;padding:14mm;border-radius:24px;background:var(--paper);box-shadow:0 20px 60px rgba(26,22,17,.08);page-break-after:always;overflow:hidden}
    .dossier-page:last-child{page-break-after:auto}
    .dossier-page__content{position:relative;z-index:1;display:grid;gap:18px}
    .dossier-kicker{font-size:.76rem;font-weight:700;letter-spacing:.20em;text-transform:uppercase;color:var(--muted)}
    .dossier-cover__head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
    .dossier-cover__brand{display:flex;gap:16px;align-items:center}
    .dossier-cover__logo,.dossier-cover__mono{width:88px;height:88px;border-radius:22px;flex-shrink:0}
    .dossier-cover__logo{object-fit:contain;background:#fff;padding:10px;border:1px solid var(--line)}
    .dossier-cover__logo--transparent{background:transparent;border:none;padding:0}
    .dossier-cover__mono{display:grid;place-items:center;background:rgba(27,59,53,.08);color:var(--accent);font-weight:800;font-size:1.4rem}
    .dossier-cover__meta strong{display:block;font-family:'Instrument Serif',Georgia,serif;font-size:1.7rem;font-weight:400;line-height:1.02}
    .dossier-cover__meta span{display:block;margin-bottom:6px;color:var(--muted);font-size:.78rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
    .dossier-cover__price{padding:10px 16px;border-radius:999px;background:var(--accent);color:#fff;font-size:.86rem;font-weight:700}
    .dossier-cover__hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:24px;align-items:end}
    .dossier-cover__copy h1{margin:0 0 16px;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:clamp(3rem,7vw,5.4rem);line-height:.92;letter-spacing:-.05em}
    .dossier-cover__copy p{margin:0;color:var(--muted);font-size:1rem;line-height:1.8;max-width:48ch}
    .dossier-cover__links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:22px;max-width:560px}
    .dossier-cover__image,.dossier-cover__placeholder{width:100%;min-height:300px;height:100%;border-radius:28px;object-fit:cover;background:linear-gradient(145deg,var(--accent),#2D5A51)}
    .dossier-cover__placeholder{display:grid;place-items:center;color:#fff;font-family:'Instrument Serif',Georgia,serif;font-size:2rem;padding:24px;text-align:center}
    .dossier-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:22px}
    .dossier-card{border:1px solid var(--line);border-radius:24px;padding:22px;background:rgba(255,255,255,.72)}
    .dossier-card h2{margin:10px 0 12px;font-family:'Instrument Serif',Georgia,serif;font-size:2.2rem;font-weight:400;line-height:1}
    .dossier-card p{margin:0;color:var(--muted);line-height:1.75}
    .dossier-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
    .dossier-list li{padding:12px 0;border-bottom:1px solid var(--line);font-size:.94rem;line-height:1.65}
    .dossier-list li:last-child{border-bottom:none}
    .dossier-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .dossier-link-card{border:1px solid var(--line);border-radius:20px;padding:18px;background:#fff;display:grid;gap:6px}
    .dossier-link-card strong{font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
    .dossier-link-card span{font-size:1rem;font-weight:600}
    .dossier-page__head h2{margin:8px 0 10px;font-family:'Instrument Serif',Georgia,serif;font-size:2.5rem;font-weight:400;line-height:.98}
    .dossier-page__head p{margin:0;color:var(--muted);line-height:1.75;max-width:60ch}
    .dossier-specs{display:flex;flex-wrap:wrap;gap:10px}
    .dossier-specs span{padding:9px 14px;border-radius:999px;background:rgba(27,59,53,.08);color:var(--accent);font-size:.84rem;font-weight:700}
    .dossier-plan img{width:100%;max-height:120mm;object-fit:contain;border-radius:24px;border:1px solid var(--line);background:#fff;padding:10px}
    .dossier-zone{display:grid;gap:10px}
    .dossier-zone__label{font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700}
    .dossier-zone__gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .dossier-zone__gallery--single{grid-template-columns:1fr}
    .dossier-zone__gallery img{width:100%;height:86mm;object-fit:cover;border-radius:22px}
    .dossier-empty{padding:24px;border:1px dashed var(--line);border-radius:22px;color:var(--muted);text-align:center}
    .dossier-contact{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:22px}
    .dossier-contact__panel{padding:24px;border-radius:26px;background:linear-gradient(145deg,var(--accent),#152E28);color:#fff}
    .dossier-contact__panel h2{margin:10px 0 14px;font-family:'Instrument Serif',Georgia,serif;font-size:2.5rem;font-weight:400;line-height:1}
    .dossier-contact__panel p{margin:0 0 14px;color:rgba(255,255,255,.76);line-height:1.7}
    .dossier-contact__list{display:grid;gap:10px}
    .dossier-contact__item{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.10);font-size:.92rem}
    .dossier-contact__item strong{display:block;margin-bottom:4px;font-size:.74rem;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.55)}
    .dossier-contact__aside{display:grid;gap:16px}
    .dossier-footer-note{font-size:.78rem;color:var(--muted)}
    .dossier--mediterranea .dossier-cover__hero{grid-template-columns:minmax(0,1fr) minmax(300px,1fr)}
    .dossier--mediterranea .dossier-cover__image{min-height:340px}
    .dossier--comercial .dossier-cover__copy h1,
    .dossier--comercial .dossier-card h2,
    .dossier--comercial .dossier-page__head h2,
    .dossier--comercial .dossier-contact__panel h2{font-family:'Outfit','Segoe UI',sans-serif;font-weight:800;letter-spacing:-.05em}
    .dossier--comercial .dossier-card,
    .dossier--comercial .dossier-link-card{background:#fff;border-radius:18px}
    .dossier--comercial .dossier-specs span{background:rgba(18,60,97,.08);color:#123C61}
    .dossier--comercial .dossier-cover__image{border-radius:20px}
    .dossier--urbano .dossier-page,
    .dossier--urbano .dossier-card,
    .dossier--urbano .dossier-link-card,
    .dossier--urbano .dossier-cover__image,
    .dossier--urbano .dossier-cover__placeholder,
    .dossier--urbano .dossier-plan img,
    .dossier--urbano .dossier-zone__gallery img,
    .dossier--urbano .dossier-contact__panel{border-radius:0;box-shadow:none}
    .dossier--urbano .dossier-cover__copy h1,
    .dossier--urbano .dossier-card h2,
    .dossier--urbano .dossier-page__head h2,
    .dossier--urbano .dossier-contact__panel h2{font-family:'Outfit','Segoe UI',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.05em}
    .dossier--urbano .dossier-specs span{border-radius:0}
    body.theme--sales .dossier-cover__hero{grid-template-columns:minmax(0,.95fr) minmax(300px,1.05fr)}
    body.theme--architectural .dossier-cover__copy h1{max-width:8ch}
    body.theme--architectural .dossier-page,
    body.theme--architectural .dossier-plan img,
    body.theme--architectural .dossier-zone__gallery img,
    body.theme--architectural .dossier-card,
    body.theme--architectural .dossier-link-card{border-radius:0}
    @media screen and (max-width: 900px){
      .dossier-cover__hero,.dossier-grid,.dossier-contact,.dossier-links,.dossier-cover__links{grid-template-columns:1fr}
      .dossier-page{min-height:auto}
    }
  </style>
</head>
<body class="theme--${escapeAttr(layout.dossier)} dossier--${escapeAttr(designVariant)}">
  <section class="dossier-page dossier-page--cover">
    <div class="dossier-page__content">
      <div class="dossier-cover__head">
        <div class="dossier-cover__brand">
          ${logoMarkup}
          <div class="dossier-cover__meta">
            <span>${escapeHtml(copy.contactKicker || "Promocion residencial")}</span>
            <strong>${escapeHtml(cn)}</strong>
          </div>
        </div>
        ${s.priceFrom ? `<div class="dossier-cover__price">${escapeHtml(s.priceFrom)}</div>` : ""}
      </div>
      <div class="dossier-cover__hero">
        <div class="dossier-cover__copy">
          <span class="dossier-kicker">${escapeHtml(copy.heroKicker || "Promocion")}</span>
          <h1>${escapeHtml(headline)}</h1>
          <p>${escapeHtml(introText)}</p>
          ${coverLinksStrip}
        </div>
        ${coverMedia}
      </div>
    </div>
  </section>
  <section class="dossier-page">
    <div class="dossier-page__content dossier-grid">
      <div class="dossier-card">
        <span class="dossier-kicker">${escapeHtml(copy.sectionQualities)}</span>
        <h2>${escapeHtml(copy.qualitiesTitle || "Calidades")}</h2>
        <p>${escapeHtml(copy.qualitiesLead || "")}</p>
      </div>
      <div class="dossier-card">
        <ul class="dossier-list">${qualitiesMarkup}</ul>
      </div>
      <div class="dossier-card">
        <span class="dossier-kicker">${escapeHtml(copy.sectionSummary)}</span>
        <h2>${escapeHtml(copy.mediaTitle || "Recursos")}</h2>
        ${copy.mediaLead ? `<p>${escapeHtml(copy.mediaLead)}</p>` : ""}
      </div>
      <div class="dossier-links">${summaryFacts || `<div class="dossier-empty">No hay enlaces multimedia añadidos.</div>`}</div>
    </div>
  </section>
  ${floorPages || `<section class="dossier-page"><div class="dossier-page__content"><div class="dossier-empty">Añade tipologias para generar el dossier completo.</div></div></section>`}
  <section class="dossier-page">
    <div class="dossier-page__content dossier-contact">
      <div class="dossier-contact__panel">
        <span class="dossier-kicker" style="color:rgba(255,255,255,.62)">${escapeHtml(copy.sectionContact)}</span>
        <h2>${escapeHtml(copy.contactTitle || "Solicita mas informacion")}</h2>
        ${copy.contactLead ? `<p>${escapeHtml(copy.contactLead)}</p>` : ""}
        <div class="dossier-contact__list">
          ${s.contactPhone ? `<div class="dossier-contact__item"><strong>Telefono</strong>${escapeHtml(s.contactPhone)}</div>` : ""}
          ${s.contactEmail ? `<div class="dossier-contact__item"><strong>Email</strong>${escapeHtml(s.contactEmail)}</div>` : ""}
          ${s.contactWhatsapp ? `<div class="dossier-contact__item"><strong>WhatsApp</strong>${escapeHtml(s.contactWhatsapp)}</div>` : ""}
          ${s.companyWebsite ? `<div class="dossier-contact__item"><strong>Web</strong>${escapeHtml(s.companyWebsite)}</div>` : ""}
          ${s.companyLocation || locationName ? `<div class="dossier-contact__item"><strong>Ubicacion</strong>${escapeHtml(s.companyLocation || locationName)}</div>` : ""}
        </div>
      </div>
      <div class="dossier-contact__aside">
        ${s.logo ? `<div class="dossier-card">${logoMarkup}</div>` : ""}
        ${s.pdfFile ? `<a class="dossier-link-card" href="${escapeAttr(s.pdfFile)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(copy.pdfLabel)}</strong><span>${escapeHtml(pdfName)}</span></a>` : ""}
        <div class="dossier-footer-note">Este dossier está preparado para guardar en PDF desde el navegador.</div>
      </div>
    </div>
  </section>
  <script>
    window.addEventListener('load', function () {
      ${autoPrint ? "setTimeout(function(){ window.print(); }, 350);" : ""}
    });
  </script>
</body>
</html>`.trim();
}

function openDesignedDossier(projectState) {
  const html = buildDesignedDossierHtml(projectState, { currentLanguage: activeEditorLanguage, autoPrint: true });
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank");
  if (!popup) {
    window.alert("El navegador ha bloqueado la ventana del dossier.");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function isTransparentLogo(value) {
  const candidate = String(value || "").toLowerCase();
  return candidate.startsWith("data:image/png") || candidate.includes(".png");
}
