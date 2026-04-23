# AgriculMS — Frontend Application
**AI-Powered Agricultural Management System for Bangladesh**

A complete Next.js 14 frontend for the Agricultural Management System (AMS) SaaS platform.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17+ 
- npm or yarn

### Installation

```bash
# 1. Navigate to project directory
cd ams-frontend

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Testing Setup

### One-click demo access
- Go to `/auth/admin-login` for `Admin`, `Officer`, `Vendor`, `Company`, and `Farmer`
- Use the `Quick Demo Access` cards to open any dashboard instantly
- Use `Reset Demo` before testing a new flow if you want fresh mock data again
- Go to `/auth/farmer-login` and use `Open Demo Farmer Dashboard` for farmer-only testing

### Manual demo credentials
Password for all roles: **password123**
Farmer OTP for manual verification: **123456**

| Role | Email | Login Route |
|------|-------|-------------|
| Admin | admin@ams.com.bd | `/auth/admin-login` |
| Officer | rahim@dae.gov.bd | `/auth/admin-login` |
| Vendor | vendor@ams.com.bd | `/auth/admin-login` |
| Company | company@ams.com.bd | `/auth/admin-login` |
| Farmer | abdul.karim@farmer.com | `/auth/farmer-login` |

### Included demo data
- 5 role-based demo accounts with editable profile data
- 3 farmers with crop profiles, districts, and marketplace-ready data
- Advisory cases with pending, assigned, AI-analyzed, and responded states
- Product catalog, vendor orders, crop listings, price tracking, and notifications
- Resettable local demo state so repeated testing stays predictable

---

## 📁 Project Structure

```
ams-frontend/
├── app/                          # Next.js 14 App Router pages
│   ├── page.tsx                  # Landing page
│   ├── pricing/page.tsx          # Pricing page
│   ├── auth/
│   │   ├── farmer-login/page.tsx # Farmer OTP login
│   │   └── admin-login/page.tsx  # Admin/Officer/Vendor login
│   └── dashboard/
│       ├── farmer/page.tsx       # Farmer dashboard
│       ├── admin/page.tsx        # Admin dashboard
│       ├── officer/page.tsx      # Officer dashboard
│       ├── vendor/page.tsx       # Vendor dashboard
│       └── company/page.tsx      # Company dashboard
│
├── components/
│   ├── landing/                  # Landing page sections
│   │   ├── Navbar.tsx
│   │   ├── HeroSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── ServicesSection.tsx
│   │   └── Sections.tsx          # Products, Blog, Testimonials, Footer...
│   └── dashboard/
│       ├── DashboardShell.tsx    # Shared sidebar + topbar layout
│       └── DashboardComponents.tsx # StatCard, MiniTable, Badge, etc.
│
├── services/
│   ├── index.ts                  # All mock API service functions
│   └── mockData.ts               # Mock JSON data
│
├── types/index.ts                # All TypeScript interfaces
├── constants/index.ts            # App constants, nav links, plans
├── utils/index.ts                # Utility helpers (formatBDT, cn, etc.)
└── hooks/                        # Custom React hooks (extend here)
```

---

## 🔌 Connecting Real Laravel API

All API calls are in `/services/index.ts`. To connect to a real backend:

1. Set `NEXT_PUBLIC_API_URL=https://your-api.com` in `.env.local`
2. Replace mock service functions with real fetch calls:

```typescript
// Before (mock):
async getProducts(): Promise<Product[]> {
  await delay();
  return MOCK_PRODUCTS;
}

// After (real API):
async getProducts(): Promise<Product[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}
```

---

## 🎨 Tech Stack

| Technology | Purpose |
|-----------|---------|
| Next.js 14 (App Router) | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Recharts | Dashboard charts |
| Lucide React | Icons |

## 🌐 Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/pricing` | Subscription plans |
| `/auth/farmer-login` | Farmer OTP login |
| `/auth/admin-login` | Staff login |
| `/dashboard/farmer` | Farmer portal |
| `/dashboard/admin` | Super admin panel |
| `/dashboard/officer` | Advisory officer panel |
| `/dashboard/vendor` | Vendor/marketplace panel |
| `/dashboard/company` | Crop buyer portal |

---

## 🌏 i18n Support

String externalization is architecture-ready. To add Bangla:

1. Install `next-i18next`
2. Move text to `/public/locales/en/common.json` and `/public/locales/bn/common.json`
3. Replace hardcoded strings with `t('key')`

---

*Built for AgriculMS — Group 3 · April 2026*
