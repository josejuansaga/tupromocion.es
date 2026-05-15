(async () => {
  const guard = document.querySelector("#authGuard");
  const page = document.querySelector("#centerPage");
  const yearInput = document.querySelector("#centerYear");
  const statusInput = document.querySelector("#centerStatus");
  const statsNode = document.querySelector("#centerStats");
  const ordersNode = document.querySelector("#ordersChart");
  const budgetNode = document.querySelector("#budgetChart");
  const topClientsNode = document.querySelector("#topClients");
  const recentNode = document.querySelector("#recentActivity");
  const backupEnabled = document.querySelector("#backupEnabled");
  const backupKeep = document.querySelector("#backupKeep");
  const backupFrequency = document.querySelector("#backupFrequency");
  const backupInfo = document.querySelector("#backupInfo");
  const backupStatus = document.querySelector("#backupStatus");
  const saveBackupSettingsBtn = document.querySelector("#saveBackupSettingsBtn");
  const runBackupBtn = document.querySelector("#runBackupBtn");

  const boot = await Estimator.bootstrap();
  if (!boot.ok || !boot.authenticated) {
    Estimator.renderAuthGuard();
    return;
  }

  guard.hidden = true;
  page.hidden = false;
  const proposals = (boot.data.proposals || []).map(Estimator.normalizeProposal);
  let backupSettings = boot.data.backupSettings || {};
  const years = [...new Set(proposals.map((item) => new Date(item.updatedAt || item.createdAt || item.proposalDate).getFullYear()).filter(Boolean))].sort((a, b) => b - a);
  yearInput.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("") || `<option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>`;

  function currentList() {
    const year = Number(yearInput.value || new Date().getFullYear());
    const status = String(statusInput.value || "");
    return proposals.filter((proposal) => {
      const proposalYear = new Date(proposal.updatedAt || proposal.createdAt || proposal.proposalDate).getFullYear();
      if (proposalYear !== year) return false;
      if (status && proposal.status !== status) return false;
      return true;
    });
  }

  function renderStats(list) {
    const accepted = list.filter((item) => item.status === "accepted");
    const rejected = list.filter((item) => item.status === "rejected");
    const draft = list.filter((item) => item.status === "draft");
    const totalBudget = list.reduce((sum, item) => sum + Estimator.proposalTotal(item), 0);
    const monthlyBudget = totalBudget / 12;
    const acceptedRate = list.length ? Math.round((accepted.length / list.length) * 100) : 0;
    statsNode.innerHTML = `
      <article class="stat-card green"><div class="stat-card__value">${list.length}</div><div class="stat-card__label">Pedidos</div></article>
      <article class="stat-card orange"><div class="stat-card__value">${(list.length / 12).toFixed(1)}</div><div class="stat-card__label">Pedidos / mes</div></article>
      <article class="stat-card blue"><div class="stat-card__value">${accepted.length}</div><div class="stat-card__label">Aceptadas</div></article>
      <article class="stat-card red"><div class="stat-card__value">${rejected.length}</div><div class="stat-card__label">Rechazadas</div></article>
      <article class="stat-card green"><div class="stat-card__value">${Estimator.money(monthlyBudget)}</div><div class="stat-card__label">Presupuesto / mes</div></article>
      <article class="stat-card blue"><div class="stat-card__value">${Estimator.money(totalBudget)}</div><div class="stat-card__label">Presupuesto / año</div></article>
      <article class="stat-card red"><div class="stat-card__value">${acceptedRate}%</div><div class="stat-card__label">Ratio de cierre</div></article>
    `;
  }

  function renderCharts(list) {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const counts = Array.from({ length: 12 }, () => 0);
    const amounts = Array.from({ length: 12 }, () => 0);
    list.forEach((proposal) => {
      const date = new Date(proposal.updatedAt || proposal.createdAt || proposal.proposalDate);
      const month = date.getMonth();
      counts[month] += 1;
      amounts[month] += Estimator.proposalTotal(proposal);
    });
    const maxCount = Math.max(...counts, 1);
    const maxAmount = Math.max(...amounts, 1);
    ordersNode.innerHTML = months.map((label, index) => `<div class="bar-col"><div class="bar-wrap"><div class="bar" style="height:${(counts[index] / maxCount) * 100}%"></div></div><div class="bar-label">${label}</div><div class="bar-value">${counts[index]}</div></div>`).join("");
    budgetNode.innerHTML = months.map((label, index) => `<div class="bar-col"><div class="bar-wrap"><div class="bar blue" style="height:${(amounts[index] / maxAmount) * 100}%"></div></div><div class="bar-label">${label}</div><div class="bar-value">${Estimator.money(amounts[index])}</div></div>`).join("");
    document.querySelector("#ordersSubtitle").textContent = yearInput.value || "";
    document.querySelector("#budgetSubtitle").textContent = yearInput.value || "";
  }

  function renderTopClients(list) {
    const grouped = new Map();
    list.forEach((proposal) => {
      const key = proposal.clientName || "Cliente pendiente";
      const current = grouped.get(key) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += Estimator.proposalTotal(proposal);
      grouped.set(key, current);
    });
    const rows = [...grouped.entries()].sort((a, b) => b[1].amount - a[1].amount);
    topClientsNode.innerHTML = rows.length ? `<div class="metric-list">${rows.map(([name, entry]) => `<div class="metric-row"><div><strong>${Estimator.escapeHtml(name)}</strong><div class="muted">${entry.count} presupuestos</div></div><div class="mono">${Estimator.money(entry.amount)}</div></div>`).join("")}</div>` : `<div class="empty-state"><p>Sin datos para este filtro.</p></div>`;
  }

  function renderRecent(list) {
    const rows = [...list].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt))).slice(0, 8);
    recentNode.innerHTML = rows.length ? `<div class="activity-list">${rows.map((proposal) => {
      const status = Estimator.proposalStatusMeta(proposal.status);
      return `<div class="activity-row"><div><strong>${Estimator.escapeHtml(proposal.projectName || "Sin título")}</strong><div class="muted">${Estimator.escapeHtml(proposal.clientName || "Cliente")} · <span class="badge badge-${status.tone}">${status.label}</span></div></div><div class="mono">${Estimator.money(Estimator.proposalTotal(proposal))}</div></div>`;
    }).join("")}</div>` : `<div class="empty-state"><p>Sin actividad reciente.</p></div>`;
  }

  function renderBackup() {
    const storage = backupSettings.storage || {};
    backupEnabled.checked = storage.enabled !== false;
    backupKeep.value = Number(storage.keep || 14);
    backupFrequency.value = Number(storage.frequencyHours || 24);
    backupStatus.textContent = storage.lastStatus ? `Ultimo estado: ${storage.lastStatus}` : "Pendiente de primer backup";
    backupInfo.innerHTML = `
      <div class="metric-row"><div><strong>Ultima copia</strong><div class="muted">${storage.lastRunAt ? Estimator.shortDateTime(storage.lastRunAt) : "Todavia sin ejecutar"}</div></div><div class="mono">${Estimator.escapeHtml(storage.lastFile || "-")}</div></div>
      <div class="metric-row"><div><strong>Enlace para cron del hosting</strong><div class="muted">Programar una llamada diaria si quieres backup 100% externo.</div></div><div class="mono">/api/run_storage_backup.php?token=${Estimator.escapeHtml(storage.token || "")}</div></div>
    `;
  }

  async function saveBackupSettings() {
    backupSettings.storage = {
      ...(backupSettings.storage || {}),
      enabled: backupEnabled.checked,
      keep: Number(backupKeep.value || 14),
      frequencyHours: Number(backupFrequency.value || 24),
    };
    backupStatus.textContent = "Guardando...";
    const result = await Estimator.saveBackupSettings(backupSettings);
    if (!result.ok) {
      backupStatus.textContent = "Error al guardar";
      return;
    }
    backupSettings = result.data.backupSettings || backupSettings;
    renderBackup();
  }

  async function runBackupNow() {
    runBackupBtn.textContent = "Creando backup...";
    const result = await Estimator.runStorageBackup();
    if (!result.ok) {
      backupStatus.textContent = result.error || "Error al crear backup";
      runBackupBtn.textContent = "Hacer backup ahora";
      return;
    }
    backupSettings = result.data.settings || backupSettings;
    runBackupBtn.textContent = "Backup creado";
    renderBackup();
    setTimeout(() => { runBackupBtn.textContent = "Hacer backup ahora"; }, 1500);
  }

  function render() {
    const list = currentList();
    renderStats(list);
    renderCharts(list);
    renderTopClients(list);
    renderRecent(list);
  }

  yearInput.addEventListener("change", render);
  statusInput.addEventListener("change", render);
  saveBackupSettingsBtn?.addEventListener("click", saveBackupSettings);
  runBackupBtn?.addEventListener("click", runBackupNow);
  render();
  renderBackup();
})();
