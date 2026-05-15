(async () => {
  const guard = document.querySelector("#authGuard");
  const page = document.querySelector("#dashboardPage");
  const statsNode = document.querySelector("#dashboardStats");
  const tableNode = document.querySelector("#dashboardTable");
  const noticeNode = document.querySelector("#dashboardNotice");
  const searchInput = document.querySelector("#dashboardSearch");
  const statusInput = document.querySelector("#dashboardStatus");

  const boot = await Estimator.bootstrap();
  if (!boot.ok || !boot.authenticated) {
    Estimator.renderAuthGuard();
    return;
  }

  guard.hidden = true;
  page.hidden = false;
  const proposals = (boot.data.proposals || []).map(Estimator.normalizeProposal);

  function renderStats(list) {
    const sent = list.filter((item) => item.status === "sent").length;
    const accepted = list.filter((item) => item.status === "accepted").length;
    const rejected = list.filter((item) => item.status === "rejected").length;
    const drafts = list.filter((item) => item.status === "draft").length;
    const visits = list.reduce((sum, item) => sum + Number(item.viewCount || 0), 0);
    const volume = list.reduce((sum, item) => sum + Estimator.proposalTotal(item), 0);
    statsNode.innerHTML = `
      <article class="stat-card green"><div class="stat-card__value">${list.length}</div><div class="stat-card__label">Total presupuestos</div></article>
      <article class="stat-card"><div class="stat-card__value">${drafts}</div><div class="stat-card__label">Borrador</div></article>
      <article class="stat-card orange"><div class="stat-card__value">${sent}</div><div class="stat-card__label">Enviadas</div></article>
      <article class="stat-card blue"><div class="stat-card__value">${accepted}</div><div class="stat-card__label">Aceptadas</div></article>
      <article class="stat-card red"><div class="stat-card__value">${rejected}</div><div class="stat-card__label">Rechazadas</div></article>
      <article class="stat-card"><div class="stat-card__value">${visits}</div><div class="stat-card__label">Visitas</div></article>
      <article class="stat-card green"><div class="stat-card__value">${Estimator.money(volume)}</div><div class="stat-card__label">Volumen total</div></article>
    `;
  }

  function filtered() {
    const search = String(searchInput.value || "").trim().toLowerCase();
    const status = String(statusInput.value || "");
    return proposals.filter((proposal) => {
      if (status && proposal.status !== status) return false;
      if (!search) return true;
      return `${proposal.clientName} ${proposal.projectName} ${proposal.projectType} ${proposal.slug} ${proposal.preparedByName}`
        .toLowerCase()
        .includes(search);
    });
  }

  function renderNotice(list) {
    const response = [...list]
      .filter((item) => ["accepted", "rejected"].includes(item.status))
      .sort((a, b) => String(b.respondedAt || b.updatedAt).localeCompare(String(a.respondedAt || a.updatedAt)))[0];
    if (response) {
      const status = Estimator.proposalStatusMeta(response.status);
      noticeNode.innerHTML = `<div><strong>Ultima respuesta de cliente</strong><span>${Estimator.escapeHtml(response.projectName)} · ${Estimator.escapeHtml(response.clientName || "Cliente")} · <span class="badge badge-${status.tone}">${status.label}</span></span></div><div class="inline-actions"><a class="btn btn-ghost" href="./form.html?id=${encodeURIComponent(response.id)}">Abrir</a><a class="btn btn-primary" href="${Estimator.publicProposalUrl(response.slug)}" target="_blank" rel="noreferrer">Ver enlace</a></div>`;
    } else {
      noticeNode.innerHTML = `<div><strong>Sin respuestas todavia</strong><span>Cuando un cliente acepte o rechace una propuesta, aparecera aqui para seguirla rapido.</span></div>`;
    }
  }

  function renderTable() {
    const list = filtered().sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    renderStats(list);
    renderNotice(list);
    if (!list.length) {
      tableNode.innerHTML = `<tr><td colspan="8"><div class="empty-state"><h2>No hay presupuestos</h2><p>Crea el primero desde "Nuevo presupuesto" o ajusta la busqueda.</p></div></td></tr>`;
      return;
    }
    tableNode.innerHTML = list.map((proposal) => {
      const status = Estimator.proposalStatusMeta(proposal.status);
      return `
        <tr>
          <td><strong>${Estimator.escapeHtml(proposal.projectName || "Sin titulo")}</strong><div class="muted">${Estimator.escapeHtml(proposal.projectType || "")}</div></td>
          <td>${Estimator.escapeHtml(proposal.clientName || "Cliente pendiente")}</td>
          <td><span class="badge badge-${status.tone}">${status.label}</span></td>
          <td class="mono">${Estimator.money(Estimator.proposalTotal(proposal))}</td>
          <td><strong>${Number(proposal.viewCount || 0)}</strong><div class="muted">${proposal.lastViewedAt ? `Ultima ${Estimator.shortDate(proposal.lastViewedAt)}` : "Sin abrir"}</div></td>
          <td>${Estimator.shortDate(proposal.updatedAt || proposal.createdAt)}${proposal.sentAt ? `<div class="muted">Enviada ${Estimator.shortDate(proposal.sentAt)}</div>` : ""}</td>
          <td class="muted">${Estimator.escapeHtml(proposal.slug || "")}</td>
          <td class="r">
            <div class="inline-actions" style="justify-content:flex-end">
              <a class="btn btn-ghost btn-mini" href="./form.html?id=${encodeURIComponent(proposal.id)}">Editar</a>
              ${proposal.status === "draft" ? `<button class="btn btn-ghost btn-mini" type="button" data-mark-sent="${Estimator.escapeHtml(proposal.id)}">Enviada</button>` : ""}
              <button class="btn btn-ghost btn-mini" type="button" data-copy="${Estimator.escapeHtml(proposal.slug || "")}">Copiar</button>
              <a class="btn btn-primary btn-mini" href="${Estimator.publicProposalUrl(proposal.slug)}" target="_blank" rel="noreferrer">Abrir</a>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    tableNode.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const slug = button.dataset.copy || "";
        if (!slug) return;
        await Estimator.copyText(Estimator.publicProposalUrl(slug));
        button.textContent = "Copiado";
        setTimeout(() => { button.textContent = "Copiar"; }, 1200);
      });
    });

    tableNode.querySelectorAll("[data-mark-sent]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.markSent || "";
        if (!id) return;
        button.textContent = "Guardando";
        const result = await Estimator.updateProposalStatus(id, "sent");
        if (!result.ok) {
          button.textContent = "Error";
          return;
        }
        const updated = (result.data.proposals || []).map(Estimator.normalizeProposal);
        proposals.splice(0, proposals.length, ...updated);
        renderTable();
      });
    });
  }

  searchInput.addEventListener("input", renderTable);
  statusInput.addEventListener("change", renderTable);
  renderTable();
})();
