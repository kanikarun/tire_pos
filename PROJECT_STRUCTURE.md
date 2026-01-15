# Tire POS System - Complete Project Structure

## Directory Structure
```
D:\Inventory_pos\
├── backend\
│   ├── app\
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── routers\
│   │       ├── __init__.py
│   │       ├── categories.py
│   │       ├── products.py
│   │       ├── stock.py
│   │       └── sales.py
│   ├── venv\
│   ├── tire_pos.db (auto-created)
│   └── requirements.txt
└── frontend\
    ├── index.html
    ├── pos.html
    ├── product.html
    ├── stock.html
    ├── css\
    │   └── style.css
    └── js\
        ├── api.js
        └── products.js
```

## Database Schema

### Categories Table
- `id` (Integer, PK)
- `category_name` (String, Unique)
- `created_at` (DateTime)

### Products Table
- `id` (Integer, PK)
- `name` (String)
- `code` (String, Unique) - Product SKU/Code
- `width` (Integer) - Tire width in mm
- `ratio` (Integer) - Aspect ratio
- `rim` (Integer) - Rim diameter in inches
- `price` (Float)
- `category_id` (Integer, FK → categories.id)
- `created_at` (DateTime)

### Stock Table
- `id` (Integer, PK)
- `product_id` (Integer, FK → products.id, Unique)
- `quantity` (Integer)
- `last_updated` (DateTime)

### Sales Table
- `id` (Integer, PK)
- `product_id` (Integer, FK → products.id)
- `quantity` (Integer)
- `unit_price` (Float)
- `total_price` (Float)
- `sale_date` (DateTime)

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/{id}` - Get specific category
- `POST /api/categories` - Create category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Products
- `GET /api/products` - Get all products
- `GET /api/products/{id}` - Get specific product
- `POST /api/products` - Create product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

### Stock
- `GET /api/stock` - Get all stock
- `GET /api/stock/{product_id}` - Get product stock
- `PUT /api/stock/{product_id}` - Update stock quantity
- `POST /api/stock/{product_id}/adjust` - Adjust stock (+/-)
- `GET /api/stock/low-stock/{threshold}` - Get low stock items

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/{id}` - Get specific sale
- `POST /api/sales` - Create sale (auto-updates stock)
- `GET /api/sales/report/daily` - Daily sales report
- `GET /api/sales/report/product/{id}` - Product sales report

## Installation Steps

### 1. Create Virtual Environment
```bash
 cd D:\Inventory_pos\tire_pos\backend
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install fastapi uvicorn sqlalchemy pydantic python-multipart
```

### 3. Create requirements.txt
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-multipart==0.0.6
```

### 4. Create __init__.py files
Make sure these files exist (can be empty):
- `backend\app\__init__.py`
- `backend\app\routers\__init__.py`

### 5. Run the Application
```bash
 cd D:\Inventory_pos\tire_pos\backend

uvicorn app.main:app --reload
```

### 6. Access the Application
- Frontend: http://localhost:8000/product.html
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Testing the Setup

### Test 1: Add a Category
1. Go to http://localhost:8000/product.html
2. Click "+ Category"
3. Enter "All-Season"
4. Click "Save"

### Test 2: Add a Product
1. Click "+ Product"
2. Fill in:
   - Name: Michelin Primacy 4
   - Code: MICH-235-45-18
   - Width: 235
   - Ratio: 45
   - Rim: 18
   - Price: 150.00
   - Category: All-Season
3. Click "Save Product"

### Test 3: Check API
Go to http://localhost:8000/docs and test endpoints:
- Try GET /api/products
- Try GET /api/categories

## Common Issues

### Issue: ModuleNotFoundError
**Solution**: Make sure all `__init__.py` files exist

### Issue: Cannot import router
**Solution**: Check file names match exactly (categories.py, products.py, etc.)

### Issue: Database error
**Solution**: Delete `tire_pos.db` and restart server

### Issue: Frontend not loading
**Solution**: Check FRONTEND_DIR path in main.py

## File Checklist
- [ ] backend/app/__init__.py
- [ ] backend/app/main.py
- [ ] backend/app/database.py
- [ ] backend/app/models.py
- [ ] backend/app/routers/__init__.py
- [ ] backend/app/routers/categories.py
- [ ] backend/app/routers/products.py
- [ ] backend/app/routers/stock.py
- [ ] backend/app/routers/sales.py
- [ ] frontend/product.html
- [ ] frontend/css/style.css
- [ ] frontend/js/api.js
- [ ] frontend/js/products.js

## Next Steps
1. Create stock management page
2. Create POS (Point of Sale) page
3. Create dashboard with sales analytics
4. Add user authentication
5. Add barcode scanner support