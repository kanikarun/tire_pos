// products.js - Products page logic
import { api, showToast, openModal, closeModal } from './api.js';

let products = [];
let categories = [];

// Load all data dynamically
async function loadData() {
  try {
    const tbody = document.getElementById('product-rows');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 24px;">Loading products...</td></tr>';
    
    // Fetch products and categories in parallel
    [products, categories] = await Promise.all([
      api.get('/products'),
      api.get('/categories')
    ]);
    
    renderProducts();
    populateCategorySelect();
  } catch (err) {
    const tbody = document.getElementById('product-rows');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 24px;">Failed to load data</td></tr>';
    showToast('Failed to load data: ' + err.message, 'danger');
  }
}

// Render products table with real-time data
function renderProducts(filter = '') {
  const tbody = document.getElementById('product-rows');
  const filtered = products.filter(p => {
    const search = filter.toLowerCase();
    const size = getSizeString(p);
    return p.name.toLowerCase().includes(search) || 
           p.code.toLowerCase().includes(search) ||
           size.toLowerCase().includes(search) ||
           (p.category?.category_name || '').toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 24px;">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const size = getSizeString(p);
    const stock = p.stock?.quantity || 0;
    
    // Dynamic stock badge
    let stockBadge = '';
    if (stock <= 0) {
      stockBadge = '<span class="badge danger">Out of Stock</span>';
    } else if (stock <= 5) {
      stockBadge = '<span class="badge danger">Critical</span>';
    } else if (stock <= 10) {
      stockBadge = '<span class="badge warn">Low Stock</span>';
    } else {
      stockBadge = `<span class="badge success">${stock} in stock</span>`;
    }
    
    return `
      <tr>
        <td>
          <strong>${p.name}</strong>
          <div style="color: var(--muted); font-size: 13px;">Code: ${p.code}</div>
        </td>
        <td>${size}</td>
        <td class="num" style="color: var(--primary); font-weight: 600;">$${p.price.toFixed(2)}</td>
        <td>
          <span class="badge info">${p.category?.category_name || 'Uncategorized'}</span>
        </td>
        <td class="num">${stockBadge}</td>
      </tr>
    `;
  }).join('');
}

// Get size string (handle null values)
function getSizeString(product) {
  if (product.width && product.ratio && product.rim) {
    return `${product.width}/${product.ratio}R${product.rim}`;
  }
  return 'N/A';
}

// Populate category dropdown dynamically
function populateCategorySelect() {
  const select = document.getElementById('p-category');
  
  if (categories.length === 0) {
    select.innerHTML = '<option value="">No categories - Create one first</option>';
    select.disabled = true;
    return;
  }
  
  select.disabled = false;
  select.innerHTML = categories.map(c => 
    `<option value="${c.id}">${c.category_name}</option>`
  ).join('');
}

// Add category with real-time update
async function addCategory() {
  const nameInput = document.getElementById('cat-name');
  const name = nameInput.value.trim();
  
  if (!name) {
    showToast('Please enter a category name', 'warn');
    nameInput.focus();
    return;
  }

  // Check for duplicates locally first
  if (categories.some(c => c.category_name.toLowerCase() === name.toLowerCase())) {
    showToast('Category already exists', 'warn');
    return;
  }

  const saveBtn = document.getElementById('save-category');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const newCat = await api.post('/categories', { category_name: name });
    categories.push(newCat);
    categories.sort((a, b) => a.category_name.localeCompare(b.category_name));
    
    populateCategorySelect();
    closeModal('modal-category');
    nameInput.value = '';
    
    showToast(`Category "${newCat.category_name}" added successfully`, 'success');
  } catch (err) {
    showToast('Failed to add category: ' + err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// Add product with validation and real-time update
async function addProduct() {
  const name = document.getElementById('p-name').value.trim();
  const code = document.getElementById('p-code').value.trim().toUpperCase();
  const widthVal = document.getElementById('p-width').value.trim();
  const ratioVal = document.getElementById('p-ratio').value.trim();
  const rimVal = document.getElementById('p-rim').value.trim();
  const price = parseFloat(document.getElementById('p-price').value);
  const category_id = parseInt(document.getElementById('p-category').value);

  // Required fields validation
  if (!name || !code || !price || !category_id) {
    showToast('Please fill required fields (Name, Code, Price, Category)', 'warn');
    return;
  }

  if (price <= 0) {
    showToast('Price must be positive', 'warn');
    return;
  }

  // Optional size fields
  const width = widthVal ? parseInt(widthVal) : null;
  const ratio = ratioVal ? parseInt(ratioVal) : null;
  const rim = rimVal ? parseInt(rimVal) : null;

  // Validate size fields if provided
  if ((width && width <= 0) || (ratio && ratio <= 0) || (rim && rim <= 0)) {
    showToast('Size values must be positive if provided', 'warn');
    return;
  }

  // Check for duplicate code locally first
  if (products.some(p => p.code === code)) {
    showToast(`Product code "${code}" already exists`, 'warn');
    return;
  }

  const saveBtn = document.getElementById('save-product');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const newProduct = await api.post('/products', {
      name,
      code,
      width,
      ratio,
      rim,
      price,
      category_id
    });
    
    products.push(newProduct);
    renderProducts(document.getElementById('search').value);
    closeModal('modal-product');
    
    // Clear form
    document.getElementById('p-name').value = '';
    document.getElementById('p-code').value = '';
    document.getElementById('p-width').value = '';
    document.getElementById('p-ratio').value = '';
    document.getElementById('p-rim').value = '';
    document.getElementById('p-price').value = '';
    
    showToast(`Product "${newProduct.name}" added successfully`, 'success');
  } catch (err) {
    showToast('Failed to add product: ' + err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Search with debounce for better performance
  let searchTimeout;
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        renderProducts(e.target.value);
      }, 300);
    });
  }

  // Open category modal
  const btnOpenCategory = document.getElementById('btn-open-category');
  if (btnOpenCategory) {
    btnOpenCategory.addEventListener('click', () => {
      openModal('modal-category');
      setTimeout(() => {
        document.getElementById('cat-name').focus();
      }, 100);
    });
  }

  // Open product modal
  const btnOpenProduct = document.getElementById('btn-open-product');
  if (btnOpenProduct) {
    btnOpenProduct.addEventListener('click', () => {
      if (categories.length === 0) {
        showToast('Please create a category first', 'warn');
        return;
      }
      openModal('modal-product');
      setTimeout(() => {
        document.getElementById('p-name').focus();
      }, 100);
    });
  }

  // Save handlers
  const saveCategory = document.getElementById('save-category');
  if (saveCategory) {
    saveCategory.addEventListener('click', addCategory);
  }

  const saveProduct = document.getElementById('save-product');
  if (saveProduct) {
    saveProduct.addEventListener('click', addProduct);
  }

  // Enter key to submit in category modal
  const catName = document.getElementById('cat-name');
  if (catName) {
    catName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addCategory();
    });
  }

  // Auto-uppercase product code
  const codeInput = document.getElementById('p-code');
  if (codeInput) {
    codeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }
  
  // Auto-refresh products every 60 seconds
  setInterval(loadData, 60000);
});