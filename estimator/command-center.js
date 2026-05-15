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

  const boot = await Estimator.bootstrap();
  if (!boot.ok || !boot.authenticated) {
    Estimator.renderAuthGuard();
    return;
  }

  guard.hidden = true;
  page.hidden = false;
  const proposals = (boot.data.proposals || []).map(Estimator.normalizeProposal);
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
    const draft = list.filter((item) => item.status === "draft");
    const totalBudget = list.reduce((sum, item) => sum + Estimator.proposalTotal(item), 0);
    const monthlyBudget = totalBudget / 12;
    const acceptedRate = list.length ? Math.round((accepted.length / list.length) * 100) : 0;
    statsNode.innerHTML = `
      <article class="stat-card green"><div class="stat-card__value">${list.length}</div><div class="stat-card__label">Pedidos</div></article>
      <article class="stat-card orange"><div class="stat-card__value">${(list.length / 12).toFixed(1)}</div><div class="stat-card__label">Pedidos / mes</div></article>
      <article class="stat-card blue"><div class="stat-card__value">${accepted.length}</div><div class="stat-card__label">Aceptadas</div></article>
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

  function render() {
    const list = currentList();
    renderStats(list);
    renderCharts(list);
    renderTopClients(list);
    renderRecent(list);
  }

  yearInput.addEventListener("change", render);
  statusInput.addEventListener("change", render);
  render();
})();
