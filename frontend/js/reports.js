// reports.js - Reports page logic
const API_BASE = '/api';

let allSales = [];

// Get user's timezone
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log('User timezone detected:', userTimezone);

// Get size string helper
function getSizeString(product) {
  if (product && product.width && product.ratio && product.rim) {
    return `${product.width}/${product.ratio}R${product.rim}`;
  }
  return 'N/A';
}

// Set default dates
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date-from').value = today;
  document.getElementById('date-to').value = today;
}

// Toggle date fields based on report type
function toggleDateFields() {
  const reportType = document.getElementById('report-type').value;
  const fromField = document.getElementById('date-from-field');
  const toField = document.getElementById('date-to-field');

  if (reportType === 'custom') {
    fromField.style.display = 'block';
    toField.style.display = 'block';
  } else if (reportType === 'all') {
    fromField.style.display = 'none';
    toField.style.display = 'none';
  } else {
    fromField.style.display = 'none';
    toField.style.display = 'none';
  }
}

// Generate report
async function generateReport() {
  try {
    const reportType = document.getElementById('report-type').value;
    const tbody = document.getElementById('sales-rows');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 24px;">Loading...</td></tr>';

    // Fetch all sales
    const response = await fetch(`${API_BASE}/sales?limit=10000`);
    if (!response.ok) throw new Error('Failed to fetch sales');

    allSales = await response.json();

    // Filter sales based on report type
    let filteredSales = filterSalesByType(allSales, reportType);

    // Render report
    renderReport(filteredSales, reportType);
    renderSummary(filteredSales);
    renderProductSummary(filteredSales);

  } catch (err) {
    console.error('Failed to generate report:', err);
    showToast('Failed to generate report: ' + err.message, 'danger');
  }
}

// Filter sales by report type
function filterSalesByType(sales, type) {
  // Get current date in user's local timezone
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (type === 'all') {
    return sales;
  }

  if (type === 'daily') {
    // Filter sales from today (local timezone)
    return sales.filter(s => {
      const saleDate = new Date(s.sale_date);
      const saleDateLocal = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
      return saleDateLocal.getTime() === todayLocal.getTime();
    });
  }

  if (type === 'weekly') {
    const weekAgo = new Date(todayLocal);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sales.filter(s => {
      const saleDate = new Date(s.sale_date);
      const saleDateLocal = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
      return saleDateLocal >= weekAgo;
    });
  }

  if (type === 'monthly') {
    const monthAgo = new Date(todayLocal);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return sales.filter(s => {
      const saleDate = new Date(s.sale_date);
      const saleDateLocal = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
      return saleDateLocal >= monthAgo;
    });
  }

  if (type === 'weekly') {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sales.filter(s => new Date(s.sale_date) >= weekAgo);
  }

  if (type === 'monthly') {
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return sales.filter(s => new Date(s.sale_date) >= monthAgo);
  }

  if (type === 'custom') {
    const fromDate = new Date(document.getElementById('date-from').value);
    const toDate = new Date(document.getElementById('date-to').value);
    toDate.setHours(23, 59, 59, 999);

    return sales.filter(s => {
      const saleDate = new Date(s.sale_date);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }

  return sales;
}

// Render report table
function renderReport(sales, reportType) {
  const tbody = document.getElementById('sales-rows');
  const reportTitle = document.getElementById('report-title');
  const reportCount = document.getElementById('report-count');

  // Update title
  const titles = {
    daily: "Today's Sales",
    weekly: "Last 7 Days Sales",
    monthly: "Last 30 Days Sales",
    custom: "Custom Range Sales",
    all: "All Time Sales"
  };
  reportTitle.textContent = titles[reportType] || "Sales Report";
  reportCount.textContent = `${sales.length} transaction${sales.length !== 1 ? 's' : ''}`;

  if (sales.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 24px;">No sales found for this period</td></tr>';
    return;
  }

  tbody.innerHTML = sales.map(sale => {
    // Convert UTC date to user's local timezone
    const saleDate = new Date(sale.sale_date);
    const dateStr = saleDate.toLocaleDateString(undefined, { timeZone: userTimezone });
    const timeStr = saleDate.toLocaleTimeString(undefined, { timeZone: userTimezone });
    const product = sale.product;

    return `
      <tr>
        <td>
          <div style="color: white">${dateStr}</div>
          <div style="color: var(--muted); font-size: 12px;">${timeStr}</div>
        </td>
        <td style="color: white" ><strong>${product?.name || 'Unknown'}</strong></td>
        <td style="color:white" >${product?.code || 'N/A'}</td>
        <td style="color: white" >${getSizeString(product)}</td>
        <td style="color: white" class="num"><strong>${sale.quantity}</strong></td>
        <td style="color: white" class="num">$${sale.unit_price.toFixed(2)}</td>
        <td  class="num" style="color: var(--primary); font-weight: 600;">$${sale.total_price.toFixed(2)}</td>
      </tr>
    `;
  }).join('');
}

// Render summary cards
function renderSummary(sales) {
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.total_price, 0);
  const itemsSold = sales.reduce((sum, s) => sum + s.quantity, 0);
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  document.getElementById('total-sales').textContent = totalSales;
  document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
  document.getElementById('items-sold').textContent = itemsSold;
  document.getElementById('avg-sale').textContent = `$${avgSale.toFixed(2)}`;
}

// Render product summary
function renderProductSummary(sales) {
  const tbody = document.getElementById('product-summary-rows');

  if (sales.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 24px;">No data</td></tr>';
    return;
  }

  // Group by product
  const productMap = {};
  let totalRevenue = 0;

  sales.forEach(sale => {
    const productId = sale.product_id;
    if (!productMap[productId]) {
      productMap[productId] = {
        product: sale.product,
        quantity: 0,
        revenue: 0
      };
    }
    productMap[productId].quantity += sale.quantity;
    productMap[productId].revenue += sale.total_price;
    totalRevenue += sale.total_price;
  });

  // Convert to array and sort by revenue
  const productSummary = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

  tbody.innerHTML = productSummary.map(item => {
    const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue * 100) : 0;

    return `
      <tr>
        <td>
          <strong style="color: white" >${item.product?.name || 'Unknown'}</strong>
          <div style="color: var(--muted); font-size: 12px;">${getSizeString(item.product)}</div>
        </td>
        <td style="color: white" >${item.product?.code || 'N/A'}</td>
        <td style="color: white" class="num"><strong>${item.quantity}</strong></td>
        <td  class="num" style="color: var(--primary); font-weight: 600;">$${item.revenue.toFixed(2)}</td>
        <td style="color: white" class="num">${percentage.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');
}

// Print report
function printReport() {
  // Set print header info with user's timezone
  const reportType = document.getElementById('report-type').value;
  const now = new Date();

  const dateStr = now.toLocaleString(undefined, {
    timeZone: userTimezone,
    dateStyle: 'full',
    timeStyle: 'short'
  });

const timezoneLabel = userTimezone === 'Asia/Bangkok'
  ? 'Cambodia'
  : userTimezone;

document.getElementById('print-date').textContent =
  `Generated: ${dateStr} (${timezoneLabel})`;


  const titles = {
    daily: "Today's Sales Report",
    weekly: "Last 7 Days Sales Report",
    monthly: "Last 30 Days Sales Report",
    custom: "Custom Range Sales Report",
    all: "All Time Sales Report"
  };
  document.getElementById('print-period').textContent = titles[reportType] || "Sales Report";

  // Trigger print
  window.print();
}

// Show toast
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();

  // Set default to "All Time" to show all sales
  document.getElementById('report-type').value = 'all';
  toggleDateFields();

  // Generate all time report by default
  generateReport();

  // Event listeners
  document.getElementById('report-type').addEventListener('change', toggleDateFields);
  document.getElementById('btn-generate').addEventListener('click', generateReport);
  document.getElementById('btn-print').addEventListener('click', printReport);
});