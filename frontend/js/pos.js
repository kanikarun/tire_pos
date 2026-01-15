// pos.js - Point of Sale logic
import { api, showToast } from './api.js';

let products = [];
let cart = [];

// Get size string (handle null values)
function getSizeString(product) {
  if (product.width && product.ratio && product.rim) {
    return `${product.width}/${product.ratio}R${product.rim}`;
  }
  return 'N/A';
}

// Load products with real-time stock
async function loadProducts() {
  try {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 48px;">Loading products...</div>';
    
    products = await api.get('/products');
    
    // Filter out products with no stock for better UX
    products.sort((a, b) => {
      const stockA = a.stock?.quantity || 0;
      const stockB = b.stock?.quantity || 0;
      if (stockA === 0 && stockB > 0) return 1;
      if (stockA > 0 && stockB === 0) return -1;
      return 0;
    });
    
    renderProducts();
  } catch (err) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 48px;">Failed to load products</div>';
    showToast('Failed to load products: ' + err.message, 'danger');
  }
}

// Render products grid with real-time data
function renderProducts(filter = '') {
  const grid = document.getElementById('products-grid');
  const filtered = products.filter(p => {
    const search = filter.toLowerCase();
    const size = getSizeString(p);
    return p.name.toLowerCase().includes(search) || 
           p.code.toLowerCase().includes(search) ||
           size.toLowerCase().includes(search) ||
           (p.category?.category_name || '').toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 48px;">No products found</div>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const size = getSizeString(p);
    const stock = p.stock?.quantity || 0;
    const inStock = stock > 0;
    
    // Check if product is already in cart
    const cartItem = cart.find(item => item.product.id === p.id);
    const inCart = cartItem ? cartItem.quantity : 0;
    const availableStock = stock - inCart;

    return `
      <div class="product-card ${!inStock ? 'out-of-stock' : ''}" 
           onclick="${inStock ? `addToCart(${p.id})` : ''}"
           style="${!inStock ? 'opacity: 0.5; cursor: not-allowed;' : 'cursor: pointer;'}">
        <div class="title">${p.name}</div>
        <div class="meta">${size}</div>
        <div class="meta" style="color: var(--info);">${p.code}</div>
        <div class="meta" style="color: var(--muted); font-size: 12px;">${p.category?.category_name || 'Uncategorized'}</div>
        <div class="row" style="justify-content: space-between; margin-top: 8px;">
          <div class="h2" style="color: var(--primary);">$${p.price.toFixed(2)}</div>
          <span class="badge ${stock > 10 ? 'success' : stock > 0 ? 'warn' : 'danger'}">
            ${stock > 0 ? `${availableStock} left` : 'Out'}
          </span>
        </div>
        ${inCart > 0 ? `<div style="margin-top: 6px;"><span class="badge info">${inCart} in cart</span></div>` : ''}
      </div>
    `;
  }).join('');
}

// Add to cart with stock validation
window.addToCart = function(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const stock = product.stock?.quantity || 0;
  if (stock <= 0) {
    showToast('Product out of stock', 'warn');
    return;
  }

  const existingItem = cart.find(item => item.product.id === productId);
  
  if (existingItem) {
    if (existingItem.quantity >= stock) {
      showToast(`Only ${stock} available in stock`, 'warn');
      return;
    }
    existingItem.quantity++;
  } else {
    cart.push({ product, quantity: 1 });
  }

  renderCart();
  renderProducts(document.getElementById('search-product').value);
  showToast(`Added ${product.name} to cart`, 'success');
}

// Remove from cart
window.removeFromCart = function(productId) {
  cart = cart.filter(item => item.product.id !== productId);
  renderCart();
  renderProducts(document.getElementById('search-product').value);
  showToast('Item removed from cart', 'success');
}

// Update quantity with stock validation
window.updateQuantity = function(productId, change) {
  const item = cart.find(i => i.product.id === productId);
  if (!item) return;

  const newQty = item.quantity + change;
  const stock = item.product.stock?.quantity || 0;

  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQty > stock) {
    showToast(`Only ${stock} available in stock`, 'warn');
    return;
  }

  item.quantity = newQty;
  renderCart();
  renderProducts(document.getElementById('search-product').value);
}

// Render cart with live totals
function renderCart() {
  const cartEl = document.getElementById('cart-items');
  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('btn-checkout');

  if (cart.length === 0) {
    cartEl.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 48px 24px;">🛒 Cart is empty<br><small>Click on products to add</small></div>';
    countEl.textContent = '0 items';
    totalEl.textContent = '$0.00';
    checkoutBtn.disabled = true;
    return;
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  cartEl.innerHTML = cart.map(item => {
    const size = getSizeString(item.product);
    const itemTotal = item.product.price * item.quantity;
    
    return `
      <div class="row" style="justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border);">
        <div style="flex: 1;">
          <div><strong>${item.product.name}</strong></div>
          <div class="muted" style="font-size: 13px;">${size} • ${item.product.code}</div>
          <div style="font-size: 13px; color: var(--info);">$${item.product.price.toFixed(2)} each</div>
        </div>
        <div class="row" style="gap: 8px; align-items: center;">
          <button class="btn icon" onclick="updateQuantity(${item.product.id}, -1)" title="Decrease">−</button>
          <div style="min-width: 35px; text-align: center; font-weight: bold;">${item.quantity}</div>
          <button class="btn icon" onclick="updateQuantity(${item.product.id}, 1)" title="Increase">+</button>
          <div style="min-width: 80px; text-align: right; font-weight: bold; color: var(--primary);">$${itemTotal.toFixed(2)}</div>
          <button class="btn icon danger" onclick="removeFromCart(${item.product.id})" title="Remove">✕</button>
        </div>
      </div>
    `;
  }).join('');

  countEl.textContent = `${totalItems} item${totalItems > 1 ? 's' : ''}`;
  totalEl.textContent = `$${total.toFixed(2)}`;
  checkoutBtn.disabled = false;
}

// Clear cart with confirmation
function clearCart() {
  if (cart.length === 0) return;
  
  if (confirm(`Clear all ${cart.length} item(s) from cart?`)) {
    cart = [];
    renderCart();
    renderProducts(document.getElementById('search-product').value);
    showToast('Cart cleared', 'success');
  }
}

// Checkout with real-time stock updates
async function checkout() {
  if (cart.length === 0) return;

  const checkoutBtn = document.getElementById('btn-checkout');
  const originalText = checkoutBtn.textContent;
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'Processing...';

  try {
    const sales = [];
    
    // Process each item in cart
    for (const item of cart) {
      const sale = await api.post('/sales', {
        product_id: item.product.id,
        quantity: item.quantity
      });
      sales.push(sale);
    }

    const total = sales.reduce((sum, s) => sum + s.total_price, 0);
    const itemCount = sales.reduce((sum, s) => sum + s.quantity, 0);
    
    // Clear cart
    cart = [];
    renderCart();
    
    // Reload products to get updated stock
    await loadProducts();
    
    showToast(`✓ Sale completed! ${itemCount} items • Total: $${total.toFixed(2)}`, 'success');
  } catch (err) {
    showToast('Checkout failed: ' + err.message, 'danger');
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = originalText;
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  // Search with debounce for better performance
  let searchTimeout;
  document.getElementById('search-product').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderProducts(e.target.value);
    }, 300);
  });

  document.getElementById('btn-clear-cart').addEventListener('click', clearCart);
  document.getElementById('btn-checkout').addEventListener('click', checkout);
  
  // Auto-refresh products every 60 seconds to keep stock current
  setInterval(loadProducts, 60000);
});