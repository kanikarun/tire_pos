// stock.js - Stock management logic
import { api, showToast, openModal, closeModal } from './api.js';

let products = [];
let currentProduct = null;

// Get size string (handle null values)
function getSizeString(product) {
  if (product.width && product.ratio && product.rim) {
    return `${product.width}/${product.ratio}R${product.rim}`;
  }
  return 'N/A';
}

// Load products with real-time stock data
async function loadProducts() {
  try {
    const tbody = document.getElementById('stock-rows');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 24px;">Loading inventory...</td></tr>';
    
    products = await api.get('/products');
    
    // Sort by stock level (low stock first)
    products.sort((a, b) => {
      const stockA = a.stock?.quantity || 0;
      const stockB = b.stock?.quantity || 0;
      return stockA - stockB;
    });
    
    renderStock();
  } catch (err) {
    const tbody = document.getElementById('stock-rows');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 24px;">Failed to load inventory</td></tr>';
    showToast('Failed to load products: ' + err.message, 'danger');
  }
}

// Render stock table with real-time data
function renderStock(filter = '') {
  const tbody = document.getElementById('stock-rows');
  const filtered = products.filter(p => {
    const search = filter.toLowerCase();
    const size = getSizeString(p);
    return p.name.toLowerCase().includes(search) || 
           p.code.toLowerCase().includes(search) ||
           size.toLowerCase().includes(search) ||
           (p.category?.category_name || '').toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 24px;">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const size = getSizeString(p);
    const stock = p.stock?.quantity || 0;
    
    // Determine status badge and styling
    let statusBadge = '';
    let stockStyle = '';
    if (stock <= 0) {
      statusBadge = '<span class="badge danger">⚠ Out of Stock</span>';
      stockStyle = 'color: var(--danger); font-weight: 700;';
    } else if (stock <= 5) {
      statusBadge = '<span class="badge danger">Critical</span>';
      stockStyle = 'color: var(--danger); font-weight: 700;';
    } else if (stock <= 10) {
      statusBadge = '<span class="badge warn">Low Stock</span>';
      stockStyle = 'color: var(--warning); font-weight: 700;';
    } else if (stock <= 20) {
      statusBadge = '<span class="badge info">Normal</span>';
      stockStyle = 'font-weight: 600;';
    } else {
      statusBadge = '<span class="badge success">In Stock</span>';
      stockStyle = 'color: var(--primary); font-weight: 600;';
    }

    return `
      <tr style="${stock <= 0 ? 'background: rgba(239,68,68,0.05);' : ''}">
        <td>
          <strong>${p.name}</strong>
          <div style="color: var(--muted); font-size: 13px;">${p.category?.category_name || 'Uncategorized'}</div>
        </td>
        <td>
          <code style="background: var(--border); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${p.code}</code>
        </td>
        <td>${size}</td>
        <td class="num">$${p.price.toFixed(2)}</td>
        <td class="num" style="${stockStyle}">${stock}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn" onclick="openStockModal(${p.id})">
            ${stock <= 0 ? '📦 Restock' : '✏ Update'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Open stock modal with current product data
window.openStockModal = function(productId) {
  currentProduct = products.find(p => p.id === productId);
  if (!currentProduct) return;

  const stock = currentProduct.stock?.quantity || 0;
  const size = getSizeString(currentProduct);

  document.getElementById('stock-product-name').value = `${currentProduct.name} - ${size} (${currentProduct.code})`;
  document.getElementById('stock-current').value = `${stock} units`;
  document.getElementById('stock-quantity').value = '';
  document.getElementById('stock-type').value = stock <= 0 ? 'set' : 'add';

  // Update placeholder based on type
  updateQuantityPlaceholder();

  openModal('modal-stock');
  
  // Focus on quantity input
  setTimeout(() => {
    document.getElementById('stock-quantity').focus();
  }, 100);
}

// Update quantity placeholder based on adjustment type
function updateQuantityPlaceholder() {
  const type = document.getElementById('stock-type').value;
  const input = document.getElementById('stock-quantity');
  const stock = currentProduct?.stock?.quantity || 0;
  
  if (type === 'set') {
    input.placeholder = 'Enter new quantity';
  } else if (type === 'add') {
    input.placeholder = 'Enter quantity to add';
  } else if (type === 'remove') {
    input.placeholder = `Max: ${stock}`;
  }
}

// Update stock with real-time validation
async function updateStock() {
  if (!currentProduct) return;

  const type = document.getElementById('stock-type').value;
  const quantity = parseInt(document.getElementById('stock-quantity').value);
  const currentStock = currentProduct.stock?.quantity || 0;

  // Validation
  if (!quantity && quantity !== 0) {
    showToast('Please enter a quantity', 'warn');
    return;
  }

  if (quantity < 0) {
    showToast('Quantity cannot be negative', 'warn');
    return;
  }

  if (type === 'remove' && quantity > currentStock) {
    showToast(`Cannot remove ${quantity}. Only ${currentStock} in stock`, 'warn');
    return;
  }

  if (type === 'set' && quantity > 9999) {
    showToast('Quantity too large. Maximum is 9999', 'warn');
    return;
  }

  // Disable save button during request
  const saveBtn = document.getElementById('save-stock');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Updating...';

  try {
    let result;
    let message = '';

    if (type === 'set') {
      result = await api.put(`/stock/${currentProduct.id}`, { quantity });
      message = `Stock set to ${quantity} units`;
    } else if (type === 'add') {
      result = await api.post(`/stock/${currentProduct.id}/adjust`, { adjustment: quantity });
      message = `Added ${quantity} units (New total: ${result.quantity})`;
    } else if (type === 'remove') {
      result = await api.post(`/stock/${currentProduct.id}/adjust`, { adjustment: -quantity });
      message = `Removed ${quantity} units (New total: ${result.quantity})`;
    }

    // Update local product data
    const productIndex = products.findIndex(p => p.id === currentProduct.id);
    if (productIndex !== -1) {
      products[productIndex].stock = result;
    }

    // Re-render with updated data
    renderStock(document.getElementById('search').value);
    closeModal('modal-stock');
    showToast(message, 'success');
    
    currentProduct = null;
  } catch (err) {
    showToast('Failed to update stock: ' + err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  // Search with debounce
  let searchTimeout;
  document.getElementById('search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderStock(e.target.value);
    }, 300);
  });

  // Refresh button with loading state
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    const btn = document.getElementById('btn-refresh');
    const originalText = btn.textContent;
    btn.textContent = '⟳ Refreshing...';
    btn.disabled = true;
    
    await loadProducts();
    
    btn.textContent = originalText;
    btn.disabled = false;
    showToast('Inventory refreshed', 'success');
  });

  // Save stock
  document.getElementById('save-stock').addEventListener('click', updateStock);

  // Update placeholder when type changes
  document.getElementById('stock-type').addEventListener('change', updateQuantityPlaceholder);

  // Allow Enter key to submit
  document.getElementById('stock-quantity').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      updateStock();
    }
  });
  
  // Auto-refresh every 60 seconds
  setInterval(loadProducts, 60000);
});