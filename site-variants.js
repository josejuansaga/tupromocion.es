(function () {
  const variants = {
    mediterranea: {
      label: "Mediterranea",
      description: "Calida, luminosa y mas emocional",
      palette: ["#214940", "#C69A54", "#F3EEE5"],
      layout: { hero: "poster", media: "stack", floors: "stacked", qualities: "full", dossier: "lifestyle" },
      sectionOrder: ["media", "map", "floors", "qualities", "pdf", "contact"],
    },
    comercial: {
      label: "Comercial",
      description: "Clara, directa y pensada para vender",
      palette: ["#123C61", "#2D6D9F", "#F3F6F8"],
      layout: { hero: "card", media: "duo", floors: "stacked", qualities: "full", dossier: "sales" },
      sectionOrder: ["map", "media", "floors", "qualities", "pdf", "contact"],
    },
    urbano: {
      label: "Urbano",
      description: "Mas sobria, arquitectonica y contundente",
      palette: ["#111111", "#7B7B7B", "#ECEBE8"],
      layout: { hero: "statement", media: "stack", floors: "stacked", qualities: "full", dossier: "architectural" },
      sectionOrder: ["qualities", "map", "media", "floors", "pdf", "contact"],
    },
    galeria: {
      label: "Galeria",
      description: "Mas visual, pensada para renders y recorrido",
      palette: ["#5D4632", "#C9A57B", "#F6F0E7"],
      layout: { hero: "poster", media: "duo", floors: "gallery", qualities: "full", dossier: "lifestyle" },
      sectionOrder: ["floors", "media", "map", "qualities", "pdf", "contact"],
    },
    catalogo: {
      label: "Catalogo",
      description: "Mas ordenada, tipo dossier comercial",
      palette: ["#233041", "#8FA6BE", "#F3F5F7"],
      layout: { hero: "card", media: "stack", floors: "editorial", qualities: "full", dossier: "sales" },
      sectionOrder: ["map", "floors", "media", "qualities", "pdf", "contact"],
    },
  };

  const variantCss = String.raw`
    body.theme--mediterranea{
      --bg:#F3EEE5;--white:#FEFBF6;--ink:#1A1611;--muted:#7A6E62;
      --line:rgba(26,22,17,.10);--line-strong:rgba(26,22,17,.16);
      --accent:#214940;--accent-mid:#C69A54;--shadow:0 28px 90px rgba(26,22,17,.10);--shadow-sm:0 4px 24px rgba(26,22,17,.08);
    }
    body.theme--mediterranea .hero__panel{background:linear-gradient(145deg,#214940,#102A27);}
    body.theme--mediterranea .quality-panel,
    body.theme--mediterranea .contact-card{background:linear-gradient(145deg,#214940,#102A27);}
    body.theme--mediterranea .media-card__icon,
    body.theme--mediterranea .pdf-card__icon{background:rgba(198,154,84,.10);border-color:rgba(198,154,84,.18);color:#8D6930;}

    body.theme--comercial{
      --bg:#F3F6F8;--white:#FFFFFF;--ink:#15212B;--muted:#66727E;
      --line:rgba(21,33,43,.12);--line-strong:rgba(21,33,43,.18);
      --accent:#123C61;--accent-mid:#2D6D9F;--shadow:0 18px 56px rgba(21,33,43,.10);--shadow-sm:0 4px 20px rgba(21,33,43,.06);
      --r-md:16px;--r-lg:22px;--r-xl:28px;
    }
    body.theme--comercial .shell{width:min(1280px,calc(100% - 40px));}
    body.theme--comercial .hero__panel{background:linear-gradient(145deg,#D9E8F3,#C8DDED);}
    body.theme--comercial .hero__overlay{background:linear-gradient(180deg,rgba(10,29,46,.06) 0%,rgba(10,29,46,.10) 38%,rgba(10,29,46,.48) 100%);}
    body.theme--comercial .brand__copy strong,
    body.theme--comercial .hero__bottom h1,
    body.theme--comercial .section-header h2,
    body.theme--comercial .quality-panel h2,
    body.theme--comercial .floor-body__header h3,
    body.theme--comercial .pdf-card__body h3,
    body.theme--comercial .contact-card__body h2,
    body.theme--comercial .footer__name,
    body.theme--comercial .media-card__body h3,
    body.theme--comercial .media-video-card__head h3{font-family:'Outfit','Segoe UI',sans-serif;font-weight:700;letter-spacing:-.04em;}
    body.theme--comercial .hero__bottom{max-width:620px;padding:28px;border-radius:28px;background:rgba(255,255,255,.94);color:var(--ink);backdrop-filter:blur(10px);box-shadow:var(--shadow);}
    body.theme--comercial .hero__bottom h1{color:var(--ink);font-size:clamp(2.6rem,6vw,4.8rem);line-height:.92;max-width:10ch;}
    body.theme--comercial .hero__intro{color:var(--muted);}
    body.theme--comercial .kicker--light,
    body.theme--comercial .brand__copy span{color:rgba(20,32,43,.55);}
    body.theme--comercial .kicker--light::before{background:rgba(20,32,43,.55);}
    body.theme--comercial .nav-pill{background:#fff;color:var(--accent);border-color:rgba(14,76,125,.14);}
    body.theme--comercial .price-badge{background:var(--accent);color:#fff;}
    body.theme--comercial .media-card,
    body.theme--comercial .floor-card,
    body.theme--comercial .pdf-card,
    body.theme--comercial .footer__bar,
    body.theme--comercial .location-card-plain,
    body.theme--comercial .media-video-frame{background:#fff;}
    body.theme--comercial .quality-panel,
    body.theme--comercial .contact-card{background:linear-gradient(145deg,#123C61,#0C2740);}

    body.theme--urbano{
      --bg:#ECEBE8;--white:#FFFFFF;--ink:#111111;--muted:#606060;
      --line:rgba(17,17,17,.14);--line-strong:rgba(17,17,17,.24);
      --accent:#111111;--accent-mid:#7B7B7B;--shadow:0 10px 24px rgba(17,17,17,.06);--shadow-sm:0 2px 10px rgba(17,17,17,.04);
      --r-sm:0px;--r-md:0px;--r-lg:0px;--r-xl:0px;
    }
    body.theme--urbano .shell{width:min(1320px,calc(100% - 40px));}
    body.theme--urbano .hero{padding:0;}
    body.theme--urbano .hero__panel{min-height:min(88vh,820px);padding:24px;border-radius:0;background:linear-gradient(180deg,#2B2B2B,#111111);}
    body.theme--urbano .hero__overlay{background:linear-gradient(180deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,.02) 34%,rgba(0,0,0,.82) 100%);}
    body.theme--urbano .brand__copy strong,
    body.theme--urbano .hero__bottom h1,
    body.theme--urbano .hero__statement h1,
    body.theme--urbano .section-header h2,
    body.theme--urbano .quality-panel h2,
    body.theme--urbano .floor-body__header h3,
    body.theme--urbano .pdf-card__body h3,
    body.theme--urbano .contact-card__body h2,
    body.theme--urbano .footer__name,
    body.theme--urbano .media-card__body h3,
    body.theme--urbano .media-video-card__head h3{font-family:'Outfit','Segoe UI',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.05em;}
    body.theme--urbano .hero__statement h1{max-width:9ch;}
    body.theme--urbano .hero__statement .hero__intro{max-width:64ch;}
    body.theme--urbano .nav-pill,
    body.theme--urbano .price-badge,
    body.theme--urbano .contact-btn,
    body.theme--urbano .pdf-dl-btn{border-radius:0;}
    body.theme--urbano .media-card,
    body.theme--urbano .floor-card,
    body.theme--urbano .pdf-card,
    body.theme--urbano .footer__bar,
    body.theme--urbano .location-card-plain,
    body.theme--urbano .media-video-frame,
    body.theme--urbano .contact-card,
    body.theme--urbano .quality-panel{border-radius:0;box-shadow:none;}
    body.theme--urbano .quality-panel,
    body.theme--urbano .contact-card{background:#111111;}
    body.theme--urbano .floor-gallery__item,
    body.theme--urbano .floor-plan img,
    body.theme--urbano .contact-logo,
    body.theme--urbano .contact-monogram{border-radius:0;}
    body.theme--urbano .footer__bar{border-width:2px;}

    body.theme--galeria{
      --bg:#F6F0E7;--white:#FFFDF9;--ink:#261C15;--muted:#7A6758;
      --line:rgba(38,28,21,.10);--line-strong:rgba(38,28,21,.16);
      --accent:#5D4632;--accent-mid:#C9A57B;--shadow:0 26px 80px rgba(38,28,21,.10);--shadow-sm:0 8px 28px rgba(38,28,21,.08);
    }
    body.theme--galeria .hero__panel{min-height:min(78vh,760px);background:linear-gradient(145deg,#5D4632,#2E2218);}
    body.theme--galeria .quality-panel,
    body.theme--galeria .contact-card{background:linear-gradient(145deg,#5D4632,#35261A);}
    body.theme--galeria .hero__bottom{max-width:760px;}
    body.theme--galeria .floor-card,
    body.theme--galeria .pdf-card,
    body.theme--galeria .location-card-plain,
    body.theme--galeria .footer__bar{background:rgba(255,253,249,.92);}

    body.theme--catalogo{
      --bg:#F3F5F7;--white:#FFFFFF;--ink:#1A2430;--muted:#677382;
      --line:rgba(26,36,48,.10);--line-strong:rgba(26,36,48,.18);
      --accent:#233041;--accent-mid:#8FA6BE;--shadow:0 18px 54px rgba(26,36,48,.08);--shadow-sm:0 4px 18px rgba(26,36,48,.06);
      --r-sm:12px;--r-md:16px;--r-lg:18px;--r-xl:22px;
    }
    body.theme--catalogo .hero__panel{background:linear-gradient(145deg,#DCE6EF,#EDF3F8);}
    body.theme--catalogo .hero__bottom{max-width:680px;padding:24px;background:rgba(255,255,255,.96);box-shadow:var(--shadow-sm);}
    body.theme--catalogo .hero__bottom h1,
    body.theme--catalogo .section-header h2,
    body.theme--catalogo .floor-body__header h3,
    body.theme--catalogo .quality-panel h2,
    body.theme--catalogo .contact-card__body h2,
    body.theme--catalogo .pdf-card__body h3{font-family:'Outfit','Segoe UI',sans-serif;font-weight:800;letter-spacing:-.05em;}
    body.theme--catalogo .quality-panel,
    body.theme--catalogo .contact-card{background:linear-gradient(145deg,#233041,#1A2430);}
    body.theme--catalogo .media-card,
    body.theme--catalogo .floor-card,
    body.theme--catalogo .pdf-card,
    body.theme--catalogo .location-card-plain,
    body.theme--catalogo .footer__bar{background:#fff;}
  `;

  window.SITE_VARIANTS = variants;
  window.getSiteVariantCss = () => variantCss;
})();
