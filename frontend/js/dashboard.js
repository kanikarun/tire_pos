// dashboard.js - Dashboard page logic
const API_BASE = '/api';

// Helper to get size string (handle null values)
function getSizeString(product) {
  if (product && product.width && product.ratio && product.rim) {
    return `${product.width}/${product.ratio}R${product.rim}`;
  }
  return 'N/A';
}

async function loadDashboard() {
  try {
    // Show loading state
    document.getElementById('total-products').innerHTML = '<div style="font-size: 14px;">...</div>';
    document.getElementById('total-stock').innerHTML = '<div style="font-size: 14px;">...</div>';
    document.getElementById('low-stock').innerHTML = '<div style="font-size: 14px;">...</div>';
    document.getElementById('today-sales').innerHTML = '<div style="font-size: 14px;">...</div>';

    // Fetch all data in parallel
    const [productsRes, salesRes, stockRes, dailyReportRes] = await Promise.all([
      fetch(`${API_BASE}/products`),
      fetch(`${API_BASE}/sales?limit=1000`),  // Get up to 1000 sales (all records)
      fetch(`${API_BASE}/stock/low-stock/10`),
      fetch(`${API_BASE}/sales/report/daily`)
    ]);

    if (!productsRes.ok || !salesRes.ok || !stockRes.ok || !dailyReportRes.ok) {
      throw new Error('Failed to fetch data');
    }

    const products = await productsRes.json();
    const sales = await salesRes.json();
    const lowStockItems = await stockRes.json();
    const dailyReport = await dailyReportRes.json();

    // Calculate total stock across all products
    const totalStock = products.reduce((sum, p) => sum + (p.stock?.quantity || 0), 0);

    // Count low stock items
    const lowStockCount = lowStockItems.length;

    // Get today's revenue from the report
    const todayRevenue = dailyReport.total_revenue || 0;

    // Update stats cards with animation
    animateNumber('total-products', products.length);
    animateNumber('total-stock', totalStock);
    animateNumber('low-stock', lowStockCount);
    document.getElementById('today-sales').textContent = `$${todayRevenue.toFixed(2)}`;

    // Render ALL recent sales (scrollable container will handle display)
    renderRecentSales(sales);

    // Render low stock items (top 5)
    renderLowStock(lowStockItems.slice(0, 5));

  } catch (err) {
    console.error('Failed to load dashboard:', err);
    showError('Failed to load dashboard data');
  }
}

function animateNumber(elementId, targetValue) {
  const element = document.getElementById(elementId);
  const duration = 500;
  const steps = 20;
  const stepValue = targetValue / steps;
  let currentValue = 0;

  const interval = setInterval(() => {
    currentValue += stepValue;
    if (currentValue >= targetValue) {
      element.textContent = targetValue;
      clearInterval(interval);
    } else {
      element.textContent = Math.floor(currentValue);
    }
  }, duration / steps);
}

function renderRecentSales(sales) {
  const tbody = document.getElementById('recent-sales');

  if (sales.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--muted); padding: 24px;">No sales yet</td></tr>';
    return;
  }

  // Each sale is a separate row - NOT grouped
  tbody.innerHTML = sales.map(sale => {
    const saleDate = new Date(sale.sale_date);
    const time = saleDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const isToday = saleDate.toDateString() === new Date().toDateString();
    const product = sale.product;

    return `
      <tr>
        <td>
          <strong>${product?.name || 'Unknown Product'}</strong>
          <div style="color: var(--muted); font-size: 12px;">
            ${product?.code || 'N/A'} • ${getSizeString(product)}
          </div>
        </td>
        <td class="num"><strong>${sale.quantity}</strong></td>
        <td class="num" style="color: var(--primary);">$${sale.total_price.toFixed(2)}</td>
        <td style="font-size: 13px;">
          ${isToday ? time : saleDate.toLocaleDateString() + ' ' + time}
        </td>
      </tr>
    `;
  }).join('');
}

function renderLowStock(stockItems) {
  const tbody = document.getElementById('low-stock-items');

  if (stockItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--muted); padding: 24px;">✓ All products well stocked</td></tr>';
    return;
  }

  tbody.innerHTML = stockItems.map(s => {
    const p = s.product;
    if (!p) return '';

    const size = getSizeString(p);
    const stockClass = s.quantity === 0 ? 'danger' : 'warn';
    const stockText = s.quantity === 0 ? 'Out of Stock' : `${s.quantity} left`;

    return `
      <tr>
        <td>
          <strong>${p.name}</strong>
          <div style="color: var(--muted); font-size: 12px;">${p.code}</div>
        </td>
        <td>${size}</td>
        <td class="num">
          <span class="badge ${stockClass}">${stockText}</span>
        </td>
      </tr>
    `;
  }).filter(row => row !== '').join('');
}

function showError(message) {
  document.getElementById('total-products').textContent = 'Error';
  document.getElementById('total-stock').textContent = 'Error';
  document.getElementById('low-stock').textContent = 'Error';
  document.getElementById('today-sales').textContent = 'Error';

  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = 'toast show danger';
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

function updateDate() {
  const dateEl = document.getElementById('current-date');
  if (!dateEl) return;

  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  dateEl.textContent = now.toLocaleDateString('en-US', options);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  updateDate();
  loadDashboard();

  // Auto-refresh every 30 seconds for live updates
  setInterval(loadDashboard, 30000);

  // Update time every minute
  setInterval(updateDate, 60000);
});