

const CONFIG = {
  businessName: "BOVINO TECH",
  whatsappNumber: "59163293389", 
  logoPath: "logo-bovino-tech.png",
  qrPath: "qr-comercial.png",
  currency: "Bs",

  boneRuleEnabled: true
};


const PRODUCTS = [
  { id: "leche-cruda", name: "Leche cruda", category: "LECHE", price: 12, unit: "litro", image: "leche-cruda.png", emoji: "🥛", description: "Leche fresca del campo." },
  { id: "leche-cocida", name: "Leche cocida", category: "LECHE", price: 14, unit: "litro", image: "leche-cocida.jpg", emoji: "🥛", description: "Leche cocida, lista para disfrutar." },
  { id: "carne-primera", name: "Carne de primera", category: "CARNE", price: 36, unit: "kilogramo", image: "carne-primera.jpg", emoji: "🥩", description: "Corte de primera calidad." },
    { id: "carne-primera", name: "Carne de segunda", category: "CARNE", price: 34, unit: "kilogramo", image: "carne-segunda.jpg", emoji: "🥩", description: "Corte de segunda." },
    { id: "carne-primera", name: "Carne con hueso", category: "CARNE", price: 30, unit: "kilogramo", image: "carne-con-hueso.jpg", emoji: "🥩", description: "Corte con hueso." },
  { id: "costilla", name: "Costilla", category: "CARNE", price: 30, unit: "kilogramo", image: "costilla.jpg", emoji: "🥩", description: "Costilla de res por kilogramo." },
  { id: "otros-cortes", name: "Otros cortes de carne", category: "CARNE", price: 30, unit: "kilogramo", image: "otros-cortes.jpg", emoji: "🥩", description: "Consulta los cortes disponibles." },
  { id: "Higado", name: "Higado", category: "Higado", price: 30, unit: "kilogramo", image: "higado.jpg", emoji: "🦴", description: "Higado vendido por kilogramo." },
  { id: "hueso de primera", name: "Hueso de primera", category: "CARNE", price: 25, unit: "kilogramo", image: "hueso-de-primera.jpg", emoji: "🦴", description: "Hueso de primera calidad vendido por kilogramo." },
  { id: "hueso de segunda", name: "Hueso de segunda", category: "CARNE", price: 20, unit: "kilogramo", image: "hueso-de-segunda.jpg", emoji: "🦴", description: "Hueso de segunda vendido por kilogramo." }
  ];


function calculateAdditionalBone(totalMeatKg) {
  if (totalMeatKg < 3) {
    return 0;
  }

  return Math.floor((totalMeatKg - 1) / 2);
}

const STORAGE_KEY = "bovinoTechCart_v1";
let activeCategory = "TODOS";
let toastTimer;
let cart = loadCart();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function formatMoney(value) {
  return `${CONFIG.currency} ${Number(value || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function getProduct(id) { return PRODUCTS.find(product => product.id === id); }
function isValidPrice(price) { return typeof price === "number" && Number.isFinite(price) && price >= 0; }
function safeQuantity(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 1000) / 1000, 999) : 1;
}
function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(item => getProduct(item.id) && Number(item.qty) > 0)
      .map(item => ({ id: item.id, qty: safeQuantity(item.qty) }));
  } catch (error) {
    return [];
  }
}
function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }
  catch (error) { /* La tienda sigue funcionando aunque el navegador bloquee localStorage. */ }
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.hidden = false; document.body.style.overflow = "hidden"; }
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.hidden = true;
  if (!$$(".modal-backdrop:not([hidden])").length) document.body.style.overflow = "";
}
function cartQuantityFor(id) {
  const item = cart.find(row => row.id === id);
  return item ? item.qty : 0;
}


function getCartSummary() {
  const lines = cart.map(item => {
    const product = getProduct(item.id);
    return product ? { id: product.id, name: product.name, category: product.category, unit: product.unit,
      qty: item.qty, price: product.price, subtotal: isValidPrice(product.price) ? product.price * item.qty : null,
      isAutomatic: false } : null;
  }).filter(Boolean);

  const totalMeatKg = lines
    .filter(line => line.category === "CARNE" && line.id !== "hueso de primera")
    .reduce((sum, line) => sum + line.qty, 0);
  const boneProduct = getProduct("hueso de primera");
  const additionalBoneQty = calculateAdditionalBone(totalMeatKg);

  if (additionalBoneQty > 0 && boneProduct && isValidPrice(boneProduct.price)) {
    lines.push({ id: "hueso-adicional", name: "Hueso adicional (regla automática)", category: "CARNE",
      unit: "kilogramo", qty: additionalBoneQty, price: boneProduct.price,
      subtotal: boneProduct.price * additionalBoneQty, isAutomatic: true });
  }

  const total = lines.reduce((sum, line) => sum + (line.subtotal === null ? 0 : line.subtotal), 0);
  const hasUndefinedPrice = lines.some(line => !isValidPrice(line.price));
  return { lines, total, hasUndefinedPrice };
}
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  $("#cart-count").textContent = Number.isInteger(count) ? String(count) : count.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
function renderProducts() {
  const grid = $("#product-grid");
  const visible = PRODUCTS.filter(p => activeCategory === "TODOS" || p.category === activeCategory);
  grid.innerHTML = "";
  visible.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";
    const imageWrap = document.createElement("div");
    imageWrap.className = "product-image";
    const img = document.createElement("img");
    img.src = product.image;
    img.alt = product.name;
    img.loading = "lazy";
    img.onerror = () => {
      imageWrap.innerHTML = `<div class="image-placeholder" role="img" aria-label="${escapeHTML(product.name)}">${product.emoji || "🐄"}</div>`;
    };
    imageWrap.appendChild(img);

    const info = document.createElement("div");
    info.className = "product-info";
    const category = document.createElement("div");
    category.className = "product-category";
    category.textContent = product.category;
    const title = document.createElement("h3");
    title.textContent = product.name;
    const description = document.createElement("p");
    description.className = "product-description";
    description.textContent = product.description || "";
    const bottom = document.createElement("div");
    bottom.className = "product-bottom";
    if (isValidPrice(product.price)) {
      const price = document.createElement("div");
      price.className = "price";
      price.textContent = formatMoney(product.price);
      const unit = document.createElement("div");
      unit.className = "unit";
      unit.textContent = `por ${product.unit}`;
      const add = document.createElement("button");
      add.type = "button";
      add.className = "button button-primary button-full";
      add.textContent = "Agregar al carrito";
      add.addEventListener("click", () => addToCart(product.id));
      bottom.append(price, unit, add);
    } else {
      const pending = document.createElement("p");
      pending.className = "price-pending";
      pending.textContent = "Precio pendiente de configuración";
      const unit = document.createElement("div");
      unit.className = "unit";
      unit.textContent = `Unidad: ${product.unit}`;
      const disabled = document.createElement("button");
      disabled.type = "button";
      disabled.className = "button button-primary button-full";
      disabled.disabled = true;
      disabled.textContent = "Precio no disponible";
      bottom.append(pending, unit, disabled);
    }
    info.append(category, title, description, bottom);
    card.append(imageWrap, info);
    grid.appendChild(card);
  });
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function addToCart(id) {
  const product = getProduct(id);
  if (!product || !isValidPrice(product.price)) {
    showToast("Este producto no se puede comprar hasta configurar su precio.");
    return;
  }
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty = safeQuantity(existing.qty + 1);
  else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  updateCartCount();
  showToast(`${product.name} agregado al carrito.`);
}
function changeQuantity(id, value) {
  const item = cart.find(row => row.id === id);
  const product = getProduct(id);
  if (!item || !product) return;
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty <= 0) {
    cart = cart.filter(row => row.id !== id);
  } else {
    item.qty = safeQuantity(qty);
  }
  saveCart();
  renderCart();
  updateCartCount();
}
function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
  updateCartCount();
}
function renderCart() {
  const container = $("#cart-items");
  const summary = getCartSummary();
  container.innerHTML = "";
  if (!summary.lines.length) {
    container.innerHTML = '<div class="empty-cart"><span aria-hidden="true">🛒</span><strong>Tu carrito está vacío</strong><p>Agrega productos del catálogo para comenzar.</p></div>';
  } else {
    summary.lines.forEach(line => {
      const row = document.createElement("div");
      row.className = "cart-item";
      const details = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = line.name;
      const meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = line.price === null ? `${line.qty} ${line.unit} · Precio pendiente` :
        `${line.qty} ${line.unit} × ${formatMoney(line.price)}${line.isAutomatic ? " · Calculado automáticamente" : ""}`;
      details.append(title, meta);
      if (!line.isAutomatic) {
        const controls = document.createElement("div");
        controls.className = "qty-controls";
        const minus = document.createElement("button");
        minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", `Reducir ${line.name}`);
        minus.addEventListener("click", () => changeQuantity(line.id, line.qty - 1));
        const input = document.createElement("input");
        input.type = "number"; input.min = "0.001"; input.max = "999"; input.step = "0.5";
        input.value = line.qty; input.setAttribute("aria-label", `Cantidad de ${line.name}`);
        input.addEventListener("change", () => changeQuantity(line.id, input.value));
        const plus = document.createElement("button");
        plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", `Aumentar ${line.name}`);
        plus.addEventListener("click", () => changeQuantity(line.id, line.qty + 1));
        const remove = document.createElement("button");
        remove.type = "button"; remove.className = "remove-item"; remove.textContent = "Eliminar";
        remove.addEventListener("click", () => removeFromCart(line.id));
        controls.append(minus, input, plus, remove);
        details.appendChild(controls);
      }
      const right = document.createElement("div");
      const subtotal = document.createElement("div");
      subtotal.className = "item-subtotal";
      subtotal.textContent = line.subtotal === null ? "Precio pendiente" : formatMoney(line.subtotal);
      right.appendChild(subtotal);
      row.append(details, right);
      container.appendChild(row);
    });
  }
  $("#cart-total").textContent = formatMoney(summary.total);
  $("#checkout-total").textContent = formatMoney(summary.total);
  $("#qr-total").textContent = formatMoney(summary.total);
  $("#go-checkout").disabled = !cart.length || summary.hasUndefinedPrice;
  if (summary.hasUndefinedPrice) {
    $("#go-checkout").title = "Configura todos los precios antes de continuar.";
  } else {
    $("#go-checkout").removeAttribute("title");
  }
}
function updatePaymentPanel() {
  const method = $("#payment-method").value;
  $("#qr-panel").hidden = method !== "QR";
  $("#cash-panel").hidden = method !== "EFECTIVO";
}
function buildWhatsAppMessage(formData) {
  const summary = getCartSummary();
  const lines = [
    `Hola, quiero realizar un pedido en ${CONFIG.businessName}.`,
    "",
    `Nombre: ${formData.customerName}`,
    `Celular de contacto: ${formData.customerPhone}`,
    `Método de pago: ${formData.paymentMethod === "QR" ? "QR (pendiente de verificación)" : "Efectivo al recoger en el establecimiento"}`,
    "",
    "DETALLE DEL PEDIDO:"
  ];
  summary.lines.forEach(line => {
    const priceText = isValidPrice(line.price) ? `${formatMoney(line.price)} por ${line.unit}` : "precio pendiente";
    const subtotalText = line.subtotal === null ? "subtotal pendiente" : formatMoney(line.subtotal);
    lines.push(`- ${line.name}: ${line.qty} ${line.unit}; ${priceText}; subtotal: ${subtotalText}${line.isAutomatic ? " (hueso adicional calculado)" : ""}`);
  });
  lines.push("", `TOTAL ESTIMADO: ${formatMoney(summary.total)}`);
  lines.push("Modalidad: recoger en el establecimiento (entrega a domicilio).");
  if (formData.notes) lines.push("", `Observaciones: ${formData.notes}`);
  lines.push("", "Por favor, confirmen la disponibilidad del pedido. Gracias.");
  return lines.join("\n");
}
function submitOrder(event) {
  event.preventDefault();
  const error = $("#form-error");
  error.textContent = "";
  const summary = getCartSummary();
  if (!cart.length) {
    error.textContent = "Agrega al menos un producto antes de continuar.";
    return;
  }
  if (summary.hasUndefinedPrice) {
    error.textContent = "Hay productos sin precio configurado. Retíralos o configura sus precios antes de continuar.";
    return;
  }
  const name = $("#customer-name").value.trim();
  const phone = $("#customer-phone").value.trim();
  const method = $("#payment-method").value;
  const notes = $("#customer-notes").value.trim();
  if (!name || !phone || !method) {
    error.textContent = "Completa tu nombre, número de celular y método de pago.";
    return;
  }
  if (!CONFIG.whatsappNumber || !/^\d{8,15}$/.test(CONFIG.whatsappNumber)) {
    error.textContent = "El número comercial de WhatsApp aún no está configurado. Edita CONFIG.whatsappNumber en script.js.";
    return;
  }
  const message = buildWhatsAppMessage({ customerName: name, customerPhone: phone, paymentMethod: method, notes });
  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  closeModal("checkout-modal");
  showToast("Se preparó el mensaje. Envíalo desde WhatsApp para completar el pedido.");
}
function setLogoAndQrPaths() {
  ["#header-logo", "#welcome-logo"].forEach(selector => {
    const element = $(selector);
    if (element) element.src = CONFIG.logoPath;
  });
  $("#payment-qr").src = CONFIG.qrPath;
}

function init() {
  setLogoAndQrPaths();
  renderProducts();
  renderCart();
  updateCartCount();

  $("#enter-store").addEventListener("click", () => {
    $("#welcome-screen").classList.remove("active");
    $("#store-screen").classList.add("active");
    $("#store-screen .store-hero").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#brand-home").addEventListener("click", event => {
    event.preventDefault();
    $("#store-screen").classList.remove("active");
    $("#welcome-screen").classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#open-cart").addEventListener("click", () => { renderCart(); openModal("cart-modal"); });
  $$(".category-tab").forEach(button => button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    $$(".category-tab").forEach(tab => tab.classList.toggle("active", tab === button));
    renderProducts();
  }));
  $$("[data-close-modal]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
  $$(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeModal(backdrop.id);
  }));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") $$(".modal-backdrop:not([hidden])").forEach(modal => closeModal(modal.id));
  });
  $("#clear-cart").addEventListener("click", () => {
    if (!cart.length) { showToast("El carrito ya está vacío."); return; }
    cart = [];
    saveCart(); renderCart(); updateCartCount();
    showToast("Carrito vaciado.");
  });
  $("#go-checkout").addEventListener("click", () => {
    const summary = getCartSummary();
    if (!cart.length || summary.hasUndefinedPrice) return;
    closeModal("cart-modal");
    $("#form-error").textContent = "";
    renderCart();
    openModal("checkout-modal");
  });
  $("#payment-method").addEventListener("change", updatePaymentPanel);
  $("#checkout-form").addEventListener("submit", submitOrder);
}

document.addEventListener("DOMContentLoaded", init);
