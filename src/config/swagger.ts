import { OpenAPIV3 } from "openapi-types";

const spec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "SEAPEDIA API",
    version: "1.0.0",
    description: `
## Authentication
1. **Register** → always gets BUYER role  
2. **Login** → if single-role: returns \`accessToken\` directly. If multi-role: returns \`rolePendingToken\`  
3. **Select Role** → exchange \`rolePendingToken\` for full \`accessToken\`  
4. **Authorize** → click the 🔒 button, paste \`Bearer <accessToken>\`

## Calculation Formula
\`total = (subtotal − discountAmount + deliveryFee) × 1.12\`

## Delivery Fees
| Method | Fee |
|---|---|
| INSTANT | Rp 50.000 |
| NEXT_DAY | Rp 25.000 |
| REGULAR | Rp 15.000 |
    `,
  },
  servers: [{ url: "/api", description: "Local dev" }],

  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      // ── common ─────────────────────────────────────────────────────────────
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          code: { type: "string", example: "BAD_REQUEST" },
          message: { type: "string" },
          errors: { type: "object" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      // ── auth ───────────────────────────────────────────────────────────────
      RegisterBody: {
        type: "object",
        required: ["username", "email", "password"],
        properties: {
          username: {
            type: "string",
            minLength: 3,
            maxLength: 30,
            example: "johndoe",
          },
          email: {
            type: "string",
            format: "email",
            example: "johndoe@example.com",
          },
          password: { type: "string", minLength: 8, example: "Password123!" },
        },
      },
      LoginBody: {
        type: "object",
        required: ["usernameOrEmail", "password"],
        properties: {
          usernameOrEmail: { type: "string", example: "buyer_demo" },
          password: { type: "string", example: "Password123!" },
        },
      },
      SelectRoleBody: {
        type: "object",
        required: ["role"],
        properties: {
          role: { type: "string", enum: ["BUYER", "SELLER", "DRIVER"] },
        },
      },
      RefreshBody: {
        type: "object",
        required: ["refreshToken"],
        properties: { refreshToken: { type: "string" } },
      },
      // ── profile ────────────────────────────────────────────────────────────
      BecomeSellerBody: {
        type: "object",
        required: ["storeName"],
        properties: {
          storeName: {
            type: "string",
            minLength: 3,
            maxLength: 60,
            example: "Toko Keren",
          },
          description: {
            type: "string",
            maxLength: 500,
            example: "Jual berbagai produk",
          },
        },
      },
      // ── store ──────────────────────────────────────────────────────────────
      UpdateStoreBody: {
        type: "object",
        properties: {
          storeName: { type: "string", minLength: 3, maxLength: 60 },
          description: { type: "string", maxLength: 500 },
        },
      },
      // ── product ────────────────────────────────────────────────────────────
      CreateProductBody: {
        type: "object",
        required: ["name", "price", "stock"],
        properties: {
          name: { type: "string", example: "Kemeja Pria" },
          description: { type: "string" },
          price: { type: "number", example: 89000 },
          stock: { type: "integer", example: 50 },
        },
      },
      UpdateProductBody: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          stock: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      // ── review ─────────────────────────────────────────────────────────────
      ReviewBody: {
        type: "object",
        required: ["reviewerName", "rating", "comment"],
        properties: {
          reviewerName: { type: "string", example: "Budi Santoso" },
          rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
          comment: { type: "string", example: "Pengiriman cepat!" },
        },
      },
      // ── wallet ─────────────────────────────────────────────────────────────
      TopupBody: {
        type: "object",
        required: ["amount"],
        properties: { amount: { type: "number", example: 200000 } },
      },
      // ── address ────────────────────────────────────────────────────────────
      AddressBody: {
        type: "object",
        required: ["label", "recipientName", "phone", "fullAddress"],
        properties: {
          label: { type: "string", example: "Rumah" },
          recipientName: { type: "string", example: "Budi Santoso" },
          phone: { type: "string", example: "081234567890" },
          fullAddress: {
            type: "string",
            example: "Jl. Sudirman No. 1, Jakarta Pusat",
          },
          isDefault: { type: "boolean", example: true },
        },
      },
      // ── cart ───────────────────────────────────────────────────────────────
      AddToCartBody: {
        type: "object",
        required: ["productId", "quantity"],
        properties: {
          productId: { type: "string", format: "uuid" },
          quantity: { type: "integer", minimum: 1, example: 2 },
        },
      },
      UpdateCartItemBody: {
        type: "object",
        required: ["quantity"],
        properties: { quantity: { type: "integer", minimum: 1 } },
      },
      // ── checkout ───────────────────────────────────────────────────────────
      CheckoutBody: {
        type: "object",
        required: ["addressId", "deliveryMethod"],
        properties: {
          addressId: { type: "string", format: "uuid" },
          deliveryMethod: {
            type: "string",
            enum: ["INSTANT", "NEXT_DAY", "REGULAR"],
          },
          discountCode: { type: "string", example: "PROMO10" },
        },
      },
    },
  },

  paths: {
    // ═══════════════════════════════════════════════════════════════════════
    // HEALTH
    // ═══════════════════════════════════════════════════════════════════════
    "/health": {
      get: {
        tags: ["🟢 Health"],
        summary: "Health check",
        responses: { 200: { description: "OK" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════════════════════════════
    "/auth/register": {
      post: {
        tags: ["🔐 Auth"],
        summary: "Register — always starts as BUYER",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterBody" },
            },
          },
        },
        responses: {
          201: { description: "User created" },
          400: { description: "Validation error" },
          409: { description: "Username or email already exists" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["🔐 Auth"],
        summary: "Login",
        description:
          "**Single-role**: returns `accessToken` + `refreshToken` directly.\n\n**Multi-role**: returns `rolePendingToken` — must call `/auth/select-role` next.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginBody" },
            },
          },
        },
        responses: {
          200: {
            description:
              "Single-role: full session. Multi-role: rolePendingToken.",
          },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/auth/select-role": {
      post: {
        tags: ["🔐 Auth"],
        summary: "Select active role (multi-role users only)",
        description:
          "Use the `rolePendingToken` from `/auth/login` as the Bearer token here.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SelectRoleBody" },
            },
          },
        },
        responses: {
          200: { description: "Full session issued with chosen activeRole" },
          401: { description: "Invalid or missing role-pending token" },
          403: { description: "Role not owned by this account" },
        },
      },
    },
    "/auth/switch-role": {
      post: {
        tags: ["🔐 Auth"],
        summary: "Switch active role mid-session",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SelectRoleBody" },
            },
          },
        },
        responses: {
          200: { description: "New accessToken with updated activeRole" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["🔐 Auth"],
        summary: "Refresh access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshBody" },
            },
          },
        },
        responses: {
          200: { description: "New accessToken" },
          401: { description: "Invalid or revoked refresh token" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["🔐 Auth"],
        summary: "Logout — revokes refresh token",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Logged out" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["🔐 Auth"],
        summary: "Current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "User id, username, email, roles, activeRole" },
        },
      },
    },
    "/me/summary": {
      get: {
        tags: ["🔐 Auth"],
        summary:
          "Cross-role summary (wallet balance, store name, driver earnings)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Summary per role" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PROFILE — ROLE UPGRADE
    // ═══════════════════════════════════════════════════════════════════════
    "/profile/roles": {
      get: {
        tags: ["👤 Profile"],
        summary: "Get all roles owned by the logged-in user",
        description:
          "Frontend uses this to decide which upgrade buttons to show.",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "roles[] and activeRole" } },
      },
    },
    "/profile/become-seller": {
      post: {
        tags: ["👤 Profile"],
        summary: "Upgrade to Seller — opens a store atomically",
        description:
          'Grants SELLER role + creates Store in one transaction. Like Tokopedia "Buka Toko".',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BecomeSellerBody" },
            },
          },
        },
        responses: {
          201: { description: "SELLER role granted + store created" },
          409: { description: "Already a seller, or store name taken" },
        },
      },
    },
    "/profile/become-driver": {
      post: {
        tags: ["👤 Profile"],
        summary: "Upgrade to Driver",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          201: { description: "DRIVER role granted" },
          409: { description: "Already a driver" },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // REVIEWS (PUBLIC)
    // ═══════════════════════════════════════════════════════════════════════
    "/reviews": {
      post: {
        tags: ["⭐ Reviews"],
        summary: "Submit app review — guests and logged-in users allowed",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReviewBody" },
            },
          },
        },
        responses: {
          201: { description: "Review saved (comment sanitized for XSS)" },
        },
      },
      get: {
        tags: ["⭐ Reviews"],
        summary: "List app reviews (paginated)",
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 10 },
          },
        ],
        responses: { 200: { description: "Paginated review list" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC CATALOG
    // ═══════════════════════════════════════════════════════════════════════
    "/catalog/products": {
      get: {
        tags: ["🛍️ Catalog (Public)"],
        summary: "Browse products — no auth required",
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 12 },
          },
          { in: "query", name: "search", schema: { type: "string" } },
          {
            in: "query",
            name: "storeId",
            schema: { type: "string", format: "uuid" },
          },
          { in: "query", name: "minPrice", schema: { type: "number" } },
          { in: "query", name: "maxPrice", schema: { type: "number" } },
        ],
        responses: {
          200: { description: "Active in-stock products with store info" },
        },
      },
    },
    "/catalog/products/{id}": {
      get: {
        tags: ["🛍️ Catalog (Public)"],
        summary: "Product detail",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Product + store block" },
          404: { description: "Not found" },
        },
      },
    },
    "/catalog/stores/{id}": {
      get: {
        tags: ["🛍️ Catalog (Public)"],
        summary: "Store page with active products",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { 200: { description: "Store info + products[]" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SELLER
    // ═══════════════════════════════════════════════════════════════════════
    "/seller/store": {
      get: {
        tags: ["🏪 Seller — Store"],
        summary: "Get my store",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Store object" } },
      },
      put: {
        tags: ["🏪 Seller — Store"],
        summary: "Update my store",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateStoreBody" },
            },
          },
        },
        responses: { 200: { description: "Updated store" } },
      },
    },
    "/seller/products": {
      get: {
        tags: ["🏪 Seller — Products"],
        summary: "List my products (includes inactive)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 12 },
          },
          { in: "query", name: "search", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Paginated product list" } },
      },
      post: {
        tags: ["🏪 Seller — Products"],
        summary: "Create product (supports image upload)",
        description:
          "Use **multipart/form-data** when uploading an image. Use **application/json** otherwise.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name", "price", "stock"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  price: { type: "number" },
                  stock: { type: "integer" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProductBody" },
            },
          },
        },
        responses: { 201: { description: "Product created" } },
      },
    },
    "/seller/products/{id}": {
      get: {
        tags: ["🏪 Seller — Products"],
        summary: "Get one of my products",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Product" },
          404: { description: "Not found in your store" },
        },
      },
      put: {
        tags: ["🏪 Seller — Products"],
        summary: "Update product (supports image replacement)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  price: { type: "number" },
                  stock: { type: "integer" },
                  isActive: { type: "boolean" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProductBody" },
            },
          },
        },
        responses: { 200: { description: "Updated product" } },
      },
      delete: {
        tags: ["🏪 Seller — Products"],
        summary: "Delete product (also removes image from Supabase)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/seller/orders": {
      get: {
        tags: ["🏪 Seller — Orders"],
        summary: "Incoming orders",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 10 },
          },
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: [
                "SEDANG_DIKEMAS",
                "MENUNGGU_PENGIRIM",
                "SEDANG_DIKIRIM",
                "PESANAN_SELESAI",
                "DIKEMBALIKAN",
              ],
            },
          },
        ],
        responses: { 200: { description: "Order list" } },
      },
    },
    "/seller/orders/{id}": {
      get: {
        tags: ["🏪 Seller — Orders"],
        summary: "Order detail",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Order with items and status history" },
        },
      },
    },
    "/seller/orders/{id}/process": {
      post: {
        tags: ["🏪 Seller — Orders"],
        summary: "Process order: SEDANG_DIKEMAS → MENUNGGU_PENGIRIM",
        description: "Also creates the DeliveryJob so drivers can see it.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Order status updated" },
          409: { description: "Order not in SEDANG_DIKEMAS state" },
        },
      },
    },
    "/seller/reports/income": {
      get: {
        tags: ["🏪 Seller — Orders"],
        summary: "Income report (completed orders)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "from",
            schema: { type: "string", format: "date-time" },
          },
          {
            in: "query",
            name: "to",
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: { 200: { description: "totalIncome and totalOrders" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BUYER — WALLET
    // ═══════════════════════════════════════════════════════════════════════
    "/buyer/wallet": {
      get: {
        tags: ["💰 Buyer — Wallet"],
        summary: "Get wallet balance",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Current balance" } },
      },
    },
    "/buyer/wallet/topup": {
      post: {
        tags: ["💰 Buyer — Wallet"],
        summary: "Top up wallet (dummy — no payment gateway)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TopupBody" },
            },
          },
        },
        responses: { 200: { description: "New balance" } },
      },
    },
    "/buyer/wallet/transactions": {
      get: {
        tags: ["💰 Buyer — Wallet"],
        summary: "Transaction history",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 10 },
          },
        ],
        responses: { 200: { description: "Paginated transactions" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BUYER — ADDRESSES
    // ═══════════════════════════════════════════════════════════════════════
    "/buyer/addresses": {
      get: {
        tags: ["📍 Buyer — Addresses"],
        summary: "List delivery addresses",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Address list (default first)" } },
      },
      post: {
        tags: ["📍 Buyer — Addresses"],
        summary: "Add address",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddressBody" },
            },
          },
        },
        responses: { 201: { description: "Address created" } },
      },
    },
    "/buyer/addresses/{id}": {
      put: {
        tags: ["📍 Buyer — Addresses"],
        summary: "Update address",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddressBody" },
            },
          },
        },
        responses: { 200: { description: "Updated address" } },
      },
      delete: {
        tags: ["📍 Buyer — Addresses"],
        summary: "Delete address (cannot delete default)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Deleted" },
          409: { description: "Cannot delete default address" },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BUYER — CART
    // ═══════════════════════════════════════════════════════════════════════
    "/buyer/cart": {
      get: {
        tags: ["🛒 Buyer — Cart"],
        summary: "Get cart with subtotal",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Cart items, store, subtotal" } },
      },
      delete: {
        tags: ["🛒 Buyer — Cart"],
        summary: "Clear entire cart",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Cart cleared" } },
      },
    },
    "/buyer/cart/items": {
      post: {
        tags: ["🛒 Buyer — Cart"],
        summary: "Add item to cart",
        description:
          "**Single-store rule**: if item is from a different store than existing cart items, returns 409 with a message to clear cart first.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddToCartBody" },
            },
          },
        },
        responses: {
          201: { description: "Updated cart" },
          409: {
            description: "Different store conflict or insufficient stock",
          },
        },
      },
    },
    "/buyer/cart/items/{productId}": {
      put: {
        tags: ["🛒 Buyer — Cart"],
        summary: "Update item quantity",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "productId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCartItemBody" },
            },
          },
        },
        responses: { 200: { description: "Updated cart" } },
      },
      delete: {
        tags: ["🛒 Buyer — Cart"],
        summary: "Remove item from cart",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "productId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { 200: { description: "Updated cart" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BUYER — CHECKOUT & ORDERS
    // ═══════════════════════════════════════════════════════════════════════
    "/buyer/checkout/preview": {
      post: {
        tags: ["💳 Buyer — Checkout"],
        summary: "Preview order totals (no order created)",
        description:
          "Returns subtotal, discountAmount, deliveryFee, ppnAmount, total. Call this before showing the confirmation screen.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CheckoutBody" },
            },
          },
        },
        responses: { 200: { description: "Calculated totals" } },
      },
    },
    "/buyer/checkout": {
      post: {
        tags: ["💳 Buyer — Checkout"],
        summary: "Confirm checkout — creates order atomically",
        description: `**Atomically in one transaction:**
1. Decrements stock (race-safe conditional update)
2. Creates Order with all financial snapshots
3. Deducts wallet balance
4. Increments voucher used count (if applicable)
5. Clears cart

Returns 409 if wallet balance insufficient or stock ran out.`,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CheckoutBody" },
            },
          },
        },
        responses: {
          201: { description: "Order created with status SEDANG_DIKEMAS" },
          409: {
            description: "Insufficient balance, out of stock, or empty cart",
          },
        },
      },
    },
    "/buyer/orders": {
      get: {
        tags: ["💳 Buyer — Checkout"],
        summary: "Order history",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 10 },
          },
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: [
                "SEDANG_DIKEMAS",
                "MENUNGGU_PENGIRIM",
                "SEDANG_DIKIRIM",
                "PESANAN_SELESAI",
                "DIKEMBALIKAN",
              ],
            },
          },
        ],
        responses: { 200: { description: "Paginated order list" } },
      },
    },
    "/buyer/orders/{id}": {
      get: {
        tags: ["💳 Buyer — Checkout"],
        summary: "Order detail with items and status timeline",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { 200: { description: "Full order detail" } },
      },
    },
    "/buyer/reports/spending": {
      get: {
        tags: ["💳 Buyer — Checkout"],
        summary: "Spending report",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "from",
            schema: { type: "string", format: "date-time" },
          },
          {
            in: "query",
            name: "to",
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: { 200: { description: "totalSpent and totalOrders" } },
      },
    },
  },
};

export default spec;
