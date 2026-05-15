(async () => {
  const guard = document.querySelector("#authGuard");
  const page = document.querySelector("#productsPage");
  const catalogNode = document.querySelector("#productsCatalog");
  const saveStateNode = document.querySelector("#catalogSaveState");
  const addCategoryBtn = document.querySelector("#addCategoryBtn");
  const saveCatalogBtn = document.querySelector("#saveCatalogBtn");

  const boot = await Estimator.bootstrap();
  if (!boot.ok || !boot.authenticated) {
    Estimator.renderAuthGuard();
    return;
  }

  guard.hidden = true;
  page.hidden = false;
  let catalog = Estimator.normalizeCatalog(await Estimator.loadCatalog());

  function touch(state = "Sin guardar", cls = "") {
    saveStateNode.textContent = state;
    saveStateNode.className = `save-state ${cls}`.trim();
  }

  async function persistCatalog(successText = "Guardado") {
    touch("Guardando...");
    const result = await Estimator.saveCatalog(catalog);
    if (!result.ok) {
      touch("Error al guardar", "error");
      throw new Error("No se ha podido guardar el catalogo.");
    }
    catalog = Estimator.normalizeCatalog(result.data.catalog || catalog);
    touch(successText, "ok");
  }

  async function uploadProductImages(cat, prod, files) {
    const product = catalog[cat].products[prod];
    const uploaded = [];

    try {
      touch("Subiendo imagen...");
      for (const file of files) {
        const path = await Estimator.uploadAssetFile(
          "estimator-catalog",
          `product-image-${cat + 1}-${prod + 1}-${Date.now()}`,
          file
        );
        uploaded.push(path);
      }
    } catch (error) {
      touch("Error al subir imagen", "error");
      return;
    }

    product.images = [...(product.images || []), ...uploaded];
    product.image = product.images[0] || "";
    render();
    await persistCatalog("Imagen subida");
  }

  function render() {
    catalogNode.innerHTML = catalog.map((category, categoryIndex) => `
      <section class="category-card">
        <div class="category-head ${category.color}">
          <div class="category-fields">
            <input data-cat="${categoryIndex}" data-field="name" value="${Estimator.escapeHtml(category.name)}" placeholder="Nombre de la seccion" />
            <input data-cat="${categoryIndex}" data-field="sub" value="${Estimator.escapeHtml(category.sub)}" placeholder="Descripcion corta" />
            <select data-cat="${categoryIndex}" data-field="color">
              ${["green", "orange", "blue"].map((color) => `<option value="${color}" ${category.color === color ? "selected" : ""}>${color}</option>`).join("")}
            </select>
          </div>
          <div class="toolbar-actions">
            <button class="btn btn-ghost btn-mini" type="button" data-move-cat="${categoryIndex}" data-dir="-1">Subir</button>
            <button class="btn btn-ghost btn-mini" type="button" data-move-cat="${categoryIndex}" data-dir="1">Bajar</button>
            <button class="btn btn-ghost" type="button" data-add-product="${categoryIndex}">Anadir producto</button>
            <button class="btn btn-danger" type="button" data-delete-cat="${categoryIndex}">Borrar</button>
          </div>
        </div>
        ${(category.products || []).map((product, productIndex) => `
          <div class="product-row">
            <div class="product-grid">
              <div>
                <label class="thumb-box thumb-box--multi" data-upload-image="${categoryIndex}:${productIndex}">
                  ${product.image ? `<img src="${Estimator.escapeHtml(Estimator.publicAssetPath(product.image))}" alt="" />` : `<span>Arrastra imagenes o pulsa aqui</span>`}
                  <input hidden type="file" accept="image/*" multiple data-file-image="${categoryIndex}:${productIndex}" />
                </label>
              </div>
              <div class="field">
                <span>Producto</span>
                <input data-product="${categoryIndex}:${productIndex}" data-field="name" value="${Estimator.escapeHtml(product.name)}" placeholder="Nombre" />
                <textarea data-product="${categoryIndex}:${productIndex}" data-field="desc" placeholder="Descripcion">${Estimator.escapeHtml(product.desc)}</textarea>
              </div>
              <div class="field">
                <span>Unidad</span>
                <input data-product="${categoryIndex}:${productIndex}" data-field="unit" value="${Estimator.escapeHtml(product.unit)}" placeholder="ud" />
              </div>
              <div class="field">
                <span>Precio</span>
                <input data-product="${categoryIndex}:${productIndex}" data-field="price" type="number" step="0.01" value="${Number(product.price || 0)}" />
              </div>
              <div class="toolbar-actions">
                <label class="btn btn-ghost" data-upload-pdf="${categoryIndex}:${productIndex}">
                  PDF
                  <input hidden type="file" accept="application/pdf" data-file-pdf="${categoryIndex}:${productIndex}" />
                </label>
                <button class="btn btn-danger" type="button" data-delete-product="${categoryIndex}:${productIndex}">Borrar</button>
              </div>
            </div>
            ${(product.images || []).length ? `
              <div class="product-gallery">
                ${(product.images || []).map((image, imageIndex) => `
                  <div class="product-gallery__item">
                    <img src="${Estimator.escapeHtml(Estimator.publicAssetPath(image))}" alt="" />
                    <button class="gallery-remove" type="button" data-delete-image="${categoryIndex}:${productIndex}:${imageIndex}">Quitar</button>
                  </div>
                `).join("")}
              </div>
            ` : ""}
            ${product.technicalPdf ? `<div class="muted">PDF: ${Estimator.escapeHtml(product.technicalPdf.split("/").pop())}</div>` : ""}
          </div>
        `).join("")}
      </section>
    `).join("");

    catalogNode.querySelectorAll("[data-cat][data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const cat = Number(input.dataset.cat);
        catalog[cat][input.dataset.field] = input.value;
        touch();
      });
      input.addEventListener("change", () => {
        const cat = Number(input.dataset.cat);
        catalog[cat][input.dataset.field] = input.value;
        touch();
      });
    });

    catalogNode.querySelectorAll("[data-product][data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const [cat, prod] = input.dataset.product.split(":").map(Number);
        catalog[cat].products[prod][input.dataset.field] = input.type === "number" ? Number(input.value || 0) : input.value;
        touch();
      });
    });

    catalogNode.querySelectorAll("[data-add-product]").forEach((button) => {
      button.addEventListener("click", () => {
        const cat = Number(button.dataset.addProduct);
        catalog[cat].products.push({
          id: Estimator.uid("product"),
          name: "Nuevo producto",
          desc: "",
          price: 0,
          unit: "ud",
          image: "",
          images: [],
          technicalPdf: "",
          technicalPdfThumbnail: "",
        });
        touch();
        render();
      });
    });

    catalogNode.querySelectorAll("[data-delete-product]").forEach((button) => {
      button.addEventListener("click", () => {
        const [cat, prod] = button.dataset.deleteProduct.split(":").map(Number);
        catalog[cat].products.splice(prod, 1);
        touch();
        render();
      });
    });

    catalogNode.querySelectorAll("[data-delete-image]").forEach((button) => {
      button.addEventListener("click", () => {
        const [cat, prod, imageIndex] = button.dataset.deleteImage.split(":").map(Number);
        const product = catalog[cat].products[prod];
        product.images = (product.images || []).filter((_, index) => index !== imageIndex);
        product.image = product.images[0] || "";
        render();
        persistCatalog("Imagen quitada").catch(() => {});
      });
    });

    catalogNode.querySelectorAll("[data-delete-cat]").forEach((button) => {
      button.addEventListener("click", () => {
        const cat = Number(button.dataset.deleteCat);
        catalog.splice(cat, 1);
        touch();
        render();
      });
    });

    catalogNode.querySelectorAll("[data-move-cat]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.moveCat);
        const dir = Number(button.dataset.dir);
        const target = index + dir;
        if (target < 0 || target >= catalog.length) return;
        const [item] = catalog.splice(index, 1);
        catalog.splice(target, 0, item);
        touch();
        render();
      });
    });

    catalogNode.querySelectorAll("[data-file-image]").forEach((input) => {
      input.addEventListener("change", async () => {
        const [cat, prod] = input.dataset.fileImage.split(":").map(Number);
        const files = Array.from(input.files || []);
        if (!files.length) return;
        await uploadProductImages(cat, prod, files);
        input.value = "";
      });
    });

    catalogNode.querySelectorAll("[data-upload-image]").forEach((box) => {
      box.addEventListener("dragover", (event) => {
        event.preventDefault();
        box.classList.add("is-dragover");
      });
      box.addEventListener("dragleave", () => {
        box.classList.remove("is-dragover");
      });
      box.addEventListener("drop", async (event) => {
        event.preventDefault();
        box.classList.remove("is-dragover");
        const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith("image/"));
        if (!files.length) return;
        const [cat, prod] = box.dataset.uploadImage.split(":").map(Number);
        await uploadProductImages(cat, prod, files);
      });
    });

    catalogNode.querySelectorAll("[data-file-pdf]").forEach((input) => {
      input.addEventListener("change", async () => {
        const [cat, prod] = input.dataset.filePdf.split(":").map(Number);
        const file = input.files?.[0];
        if (!file) return;
        try {
          touch("Subiendo PDF...");
          catalog[cat].products[prod].technicalPdf = await Estimator.uploadAssetFile("estimator-catalog", `product-pdf-${cat + 1}-${prod + 1}`, file);
          await persistCatalog("PDF subido");
          render();
        } catch (error) {
          touch("Error al subir PDF", "error");
        } finally {
          input.value = "";
        }
      });
    });
  }

  addCategoryBtn.addEventListener("click", () => {
    catalog.push({ id: Estimator.uid("cat"), name: "Nueva seccion", sub: "", color: "green", products: [] });
    touch();
    render();
  });

  saveCatalogBtn.addEventListener("click", async () => {
    try {
      await persistCatalog("Guardado");
      render();
    } catch (error) {
      return;
    }
  });

  render();
})();
