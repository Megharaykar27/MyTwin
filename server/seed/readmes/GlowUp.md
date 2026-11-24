<div align="center">

# Glow<i>Up</i>

**A full-stack fashion & beauty store with an AI shopping advisor.**

React · Node.js · Express · MongoDB · Google Gemini · Razorpay

<!-- After deploying, replace the two links below -->
[Live demo](#) · [Video walkthrough](#)

</div>

---

GlowUp is a complete e-commerce web app for makeup, skincare, fashion and jewellery. Shoppers can browse and filter the catalogue, save a wishlist, apply coupons, pay with Razorpay or cash on delivery, and track every order on a live timeline. **Glow**, the built-in AI advisor, turns a plain-English request like *"wedding next month, dry skin, ₹5,000 budget"* into product picks from the store's own catalogue. Admins get a dashboard with sales charts, stock alerts and full product, order and coupon management.

> **Try it without signing up:** `demo@glowup.com` / `glowup123` (there's a one-click "fill demo account" button on the sign-in page).

<!-- Add screenshots here: docs/home.png, docs/product.png, docs/advisor.png, docs/admin.png -->

## Features

**Shopping**
- Search, multi-category filters, price ranges, sorting and pagination, all kept in the URL so filtered pages can be shared and bookmarked
- Product pages with image gallery, hover-to-zoom, stock warnings and related products
- Ratings and reviews: one review per customer, **verified purchase** badge for delivered orders, average rating calculated from real reviews
- Wishlist with instant (optimistic) updates
- Bag with quantity limits checked against live stock, a free-shipping progress bar and coupon codes

**Checkout & orders**
- Address validation (Indian mobile number and pincode formats)
- **Razorpay** online payment (test mode) with server-side signature verification, plus cash on delivery
- **Safe stock handling:** stock is reserved with an atomic MongoDB update, so two shoppers can never buy the same last item; it's released again if payment is abandoned or the order is cancelled
- Order tracking timeline (Placed → Packed → Shipped → Out for Delivery → Delivered), and customers can cancel before shipping

**AI Beauty Advisor ("Glow")**
- Chat assistant powered by **Google Gemini**, limited to recommending products that really exist in the catalogue (the server checks every product id it returns)
- Understands skin type, occasion and budget, and replies in short, friendly sentences with product cards
- Works without an API key too: a keyword matcher with budget detection takes over automatically

**Admin dashboard**
- Revenue, orders, customers and average order value
- 14-day revenue chart, sales by category, top sellers, low-stock alerts, recent orders
- Add, edit and delete products (image URL or Cloudinary upload)
- Move orders through each status; cancelling restocks items automatically
- Create, pause and delete coupons (percentage or flat, minimum order, maximum discount, expiry date)

**Quality**
- JWT authentication with protected and admin-only routes
- Security middleware: Helmet headers, rate limiting on login and the AI chat, request size limits, field allow-lists on admin updates
- One central error handler, so every API error has the same `{ message }` shape
- Responsive editorial design with Framer Motion animations, loading skeletons, and pages that load only when visited

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, Vite, React Router 6, Tailwind CSS, Framer Motion, Recharts, Axios, Lucide icons |
| Backend | Node.js, Express, Mongoose, JWT, bcrypt, Helmet, express-rate-limit, Multer |
| Database | MongoDB Atlas |
| Services | Google Gemini API, Razorpay (test mode), Cloudinary |

## How it's built

```
client (React + Vite)  ──►  REST API (Express)  ──►  MongoDB Atlas
                                  │
                                  ├──► Google Gemini   (AI advisor)
                                  ├──► Razorpay        (payments)
                                  └──► Cloudinary      (image upload)
```

A few design decisions:

- **Money is calculated in one place.** `server/utils/pricing.js` computes subtotal, coupon discount, shipping and total for both the bag and checkout, so the price shown is always the price charged. The client never sends prices.
- **Orders copy product details.** Each order stores the name, image and price at the time of purchase, so editing a product later never changes old orders.
- **Optional services switch themselves off.** `GET /api/config` tells the frontend which services have keys set. Without Razorpay keys, checkout offers only cash on delivery; without a Gemini key, the advisor uses keyword matching.

## API overview

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Public |
| GET / PUT | `/api/auth/me` | User |
| GET | `/api/products?search=&category=&minPrice=&maxPrice=&sort=&page=` | Public |
| GET | `/api/products/meta`, `/api/products/:id` | Public |
| POST | `/api/products/:id/reviews` | User |
| POST / PUT / DELETE | `/api/products`, `/api/products/:id` | Admin |
| GET / POST / PUT / DELETE | `/api/cart`, `/api/cart/:productId` | User |
| GET / POST | `/api/wishlist`, `/api/wishlist/:productId` | User |
| POST | `/api/orders`, `/api/orders/:id/verify`, `/api/orders/:id/abandon` | User |
| GET | `/api/orders/mine`, `/api/orders/:id` | User |
| PUT | `/api/orders/:id/cancel` | User |
| GET / PUT | `/api/orders`, `/api/orders/:id/status` | Admin |
| GET | `/api/coupons/public` | Public |
| GET / POST / PUT / DELETE | `/api/coupons` | Admin |
| POST | `/api/advisor` | Public (rate limited) |
| GET | `/api/admin/stats` | Admin |

## Run it locally

You need **Node.js 18+** and a free **MongoDB Atlas** database.

```bash
git clone https://github.com/Megharaykar27/GlowUp.git
cd GlowUp

# 1. Backend
cd server
npm install
cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET
npm run seed              # adds 30 products, sample orders, coupons and demo accounts
npm run dev               # API on http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev               # store on http://localhost:5173
```

The seed script prints the admin login. Set `SEED_ADMIN_PASSWORD` in `.env` to choose it yourself.

**Optional keys** (in `server/.env`, all have free tiers):

| Variable | Turns on |
|---|---|
| `GEMINI_API_KEY` | Gemini-powered advisor ([get a key](https://aistudio.google.com)) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Online payment (use **Test Mode** keys) |
| `CLOUDINARY_*` | Image upload in the admin panel |

Razorpay test card: `4111 1111 1111 1111`, any future expiry, any CVV.

## Project structure

```
GlowUp/
├── client/
│   └── src/
│       ├── components/   Navbar, ProductCard, AdvisorChat, shared UI
│       ├── context/      Auth and shop (bag, wishlist) state
│       ├── pages/        Home, Shop, ProductDetails, Cart, Checkout, Orders…
│       │   └── admin/    Overview, Products, Orders, Coupons
│       └── utils/        API client, formatting helpers
└── server/
    ├── models/           User, Product, Order, Coupon
    ├── routes/           auth, products, cart, wishlist, orders, coupons, advisor, admin
    ├── middleware/       auth (JWT), error handling
    ├── utils/            pricing, Razorpay client, async helper
    └── seed.js           demo data
```

## Credits

Product photos from [Unsplash](https://unsplash.com) (Unsplash License). Brands and products in the demo data are fictional.

---

Built by **Megha Raykar** · [GitHub](https://github.com/Megharaykar27) · [LinkedIn](https://www.linkedin.com/in/megha-raykar-335617337/)
