import { OpenAPIV3 } from "openapi-types";

// ─── Reusable schemas ─────────────────────────────────────────────────────────

const PaginationSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    page: { type: "integer", example: 1 },
    limit: { type: "integer", example: 10 },
    total: { type: "integer", example: 42 },
    totalPages: { type: "integer", example: 5 },
  },
};

const SuccessResponse = (
  dataSchema: OpenAPIV3.SchemaObject,
): OpenAPIV3.ResponseObject => ({
  description: "Success",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: dataSchema,
        },
      },
    },
  },
});

const ErrorResponse = (desc: string): OpenAPIV3.ResponseObject => ({
  description: desc,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          code: { type: "string", example: "BAD_REQUEST" },
          message: { type: "string", example: desc },
          errors: { type: "object" },
        },
      },
    },
  },
});

const BearerAuth: OpenAPIV3.SecurityRequirementObject[] = [{ bearerAuth: [] }];

// Common query params
const PageParam: OpenAPIV3.ParameterObject = {
  name: "page",
  in: "query",
  schema: { type: "integer", default: 1 },
};
const LimitParam: OpenAPIV3.ParameterObject = {
  name: "limit",
  in: "query",
  schema: { type: "integer", default: 10, maximum: 50 },
};
const IdParam = (desc: string): OpenAPIV3.ParameterObject => ({
  name: "id",
  in: "path",
  required: true,
  description: desc,
  schema: { type: "string", format: "uuid" },
});

// ─── Spec ─────────────────────────────────────────────────────────────────────

export const spec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "SEAPEDIA API",
    version: "1.0.0",
    description: `
## SEAPEDIA — Multi-role marketplace API

**Levels implemented:** 1 (Auth & Reviews) · 2 (Seller & Catalog) · 3 (Buyer Wallet, Cart & Checkout)

### Authentication flow
1. \`POST /auth/register\` — always creates a **BUYER** account (no role selection)
2. \`POST /auth/login\` — single-role users get a session immediately; multi-role users receive a \`rolePendingToken\`
3. \`POST /auth/select-role\` — exchange the \`rolePendingToken\` for a full session with an active role
4. Use the returned \`accessToken\` as \`Bearer <token>\` on all protected endpoints
5. \`POST /profile/become-seller\` — upgrade to SELLER (creates store atomically)
6. \`POST /profile/become-driver\` — upgrade to DRIVER

### Price formula
\`total = (subtotal − discountAmount + deliveryFee) × 1.12\`

PPN (12%) is applied on the net amount after discount and delivery fee.

### Delivery fees
| Method | Fee |
|--------|-----|
| INSTANT | Rp 50.000 |
| NEXT_DAY | Rp 25.000 |
| REGULAR | Rp 15.000 |
    `,
  },
  servers: [
    { url: "http://localhost:4000/api", description: "Local development" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access token from /auth/login or /auth/select-role",
      },
    },
    schemas: {
      Pagination: PaginationSchema,
    },
  },
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Profile" },
    { name: "Reviews" },
    { name: "Catalog" },
    { name: "Buyer — Wallet" },
    { name: "Buyer — Address" },
    { name: "Buyer — Cart" },
    { name: "Buyer — Checkout & Orders" },
    { name: "Seller — Store" },
    { name: "Seller — Products" },
    { name: "Seller — Orders" },
  ],
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: { status: { type: "string", example: "ok" } },
          }),
        },
      },
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new account",
        description:
          "Creates a BUYER account. No roles field needed — everyone starts as BUYER.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
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
                    example: "johndoe@seapedia.test",
                  },
                  password: {
                    type: "string",
                    minLength: 8,
                    example: "Password123!",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": SuccessResponse({
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              username: { type: "string" },
              email: { type: "string" },
              roles: {
                type: "array",
                items: { type: "string" },
                example: ["BUYER"],
              },
            },
          }),
          "400": ErrorResponse("Validation failed"),
          "409": ErrorResponse("Username or email already registered"),
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description: `
- **Single-role user** → returns \`accessToken\` + \`refreshToken\` immediately (\`requiresRoleSelection: false\`)
- **Multi-role user** → returns \`rolePendingToken\` only (\`requiresRoleSelection: true\`). Use \`POST /auth/select-role\` next.
        `,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["usernameOrEmail", "password"],
                properties: {
                  usernameOrEmail: { type: "string", example: "johndoe" },
                  password: { type: "string", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              requiresRoleSelection: { type: "boolean" },
              roles: { type: "array", items: { type: "string" } },
              accessToken: {
                type: "string",
                description: "Present when requiresRoleSelection is false",
              },
              refreshToken: {
                type: "string",
                description: "Present when requiresRoleSelection is false",
              },
              rolePendingToken: {
                type: "string",
                description:
                  "Present when requiresRoleSelection is true (5-min TTL)",
              },
              activeRole: {
                type: "string",
                description: "Present when requiresRoleSelection is false",
              },
            },
          }),
          "401": ErrorResponse("Invalid credentials"),
        },
      },
    },

    "/auth/select-role": {
      post: {
        tags: ["Auth"],
        summary: "Select active role after login (multi-role users)",
        description:
          "Use the `rolePendingToken` from /auth/login as Bearer token here — NOT a regular accessToken.",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: {
                    type: "string",
                    enum: ["BUYER", "SELLER", "DRIVER"],
                    example: "SELLER",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              activeRole: { type: "string", example: "SELLER" },
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
            },
          }),
          "401": ErrorResponse("Invalid or expired role-selection token"),
          "403": ErrorResponse("You do not own the requested role"),
        },
      },
    },

    "/auth/switch-role": {
      post: {
        tags: ["Auth"],
        summary: "Switch active role mid-session",
        description:
          "Use a valid accessToken. Returns a new accessToken with the new activeRole.",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["BUYER", "SELLER", "DRIVER"] },
                },
              },
            },
          },
        },
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              accessToken: { type: "string" },
              activeRole: { type: "string" },
            },
          }),
          "403": ErrorResponse("You do not own the requested role"),
        },
      },
    },

    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: { accessToken: { type: "string" } },
          }),
          "401": ErrorResponse("Invalid or expired refresh token"),
        },
      },
    },

    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (revokes refresh token)",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: { message: { type: "string", example: "Logged out" } },
          }),
          "401": ErrorResponse("Unauthorized"),
        },
      },
    },

    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user profile",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              username: { type: "string" },
              email: { type: "string" },
              roles: { type: "array", items: { type: "string" } },
              activeRole: { type: "string" },
            },
          }),
          "401": ErrorResponse("Unauthorized"),
        },
      },
    },

    "/me/summary": {
      get: {
        tags: ["Auth"],
        summary: "Cross-role dashboard summary",
        description:
          "Returns wallet balance, store info, and driver earnings for whichever roles this user owns.",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              activeRole: { type: "string" },
              roles: { type: "array", items: { type: "string" } },
              buyer: {
                type: "object",
                nullable: true,
                properties: { walletBalance: { type: "number" } },
              },
              seller: {
                type: "object",
                nullable: true,
                properties: { storeName: { type: "string", nullable: true } },
              },
              driver: {
                type: "object",
                nullable: true,
                properties: {
                  driverEarnings: { type: "number", nullable: true },
                },
              },
            },
          }),
        },
      },
    },

    // ── Profile ─────────────────────────────────────────────────────────────
    "/profile/roles": {
      get: {
        tags: ["Profile"],
        summary: "List roles owned by current user",
        description:
          "Frontend calls this to decide which upgrade buttons to show.",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              roles: {
                type: "array",
                items: { type: "string" },
                example: ["BUYER"],
              },
              activeRole: { type: "string", example: "BUYER" },
            },
          }),
          "401": ErrorResponse("Unauthorized"),
        },
      },
    },

    "/profile/become-seller": {
      post: {
        tags: ["Profile"],
        summary: "Upgrade to Seller (Open Store)",
        description:
          "Grants SELLER role AND creates the store atomically. Idempotent — returns 409 if already a Seller.",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["storeName"],
                properties: {
                  storeName: {
                    type: "string",
                    minLength: 3,
                    maxLength: 60,
                    example: "Toko Elektronik Jaya",
                  },
                  description: {
                    type: "string",
                    maxLength: 500,
                    example: "Jual berbagai produk elektronik",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": SuccessResponse({
            type: "object",
            properties: {
              message: { type: "string" },
              store: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  storeName: { type: "string" },
                },
              },
            },
          }),
          "400": ErrorResponse("Validation failed"),
          "409": ErrorResponse("Already a seller, or store name already taken"),
        },
      },
    },

    "/profile/become-driver": {
      post: {
        tags: ["Profile"],
        summary: "Upgrade to Driver",
        description:
          "Grants DRIVER role. Idempotent — returns 409 if already a Driver.",
        security: BearerAuth,
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          "201": SuccessResponse({
            type: "object",
            properties: { message: { type: "string" } },
          }),
          "409": ErrorResponse("Already a driver"),
        },
      },
    },

    // ── Reviews ─────────────────────────────────────────────────────────────
    "/reviews": {
      get: {
        tags: ["Reviews"],
        summary: "List public application reviews",
        description: "No auth required.",
        parameters: [PageParam, LimitParam],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    reviewerName: { type: "string" },
                    rating: { type: "integer" },
                    comment: { type: "string" },
                    userId: { type: "string", nullable: true },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
        },
      },
      post: {
        tags: ["Reviews"],
        summary: "Submit an application review",
        description:
          "No checkout required. Works for guests (no token) and logged-in users. Script tags are stripped from comment.",
        security: [{}],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reviewerName", "rating", "comment"],
                properties: {
                  reviewerName: {
                    type: "string",
                    minLength: 2,
                    maxLength: 100,
                    example: "Sari Dewi",
                  },
                  rating: {
                    type: "integer",
                    minimum: 1,
                    maximum: 5,
                    example: 5,
                  },
                  comment: {
                    type: "string",
                    maxLength: 1000,
                    example: "Aplikasi yang sangat mudah digunakan!",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": SuccessResponse({
            type: "object",
            properties: {
              id: { type: "string" },
              reviewerName: { type: "string" },
              rating: { type: "integer" },
              comment: { type: "string" },
              userId: { type: "string", nullable: true },
            },
          }),
          "400": ErrorResponse("Validation failed"),
        },
      },
    },

    // ── Catalog ─────────────────────────────────────────────────────────────
    "/catalog/products": {
      get: {
        tags: ["Catalog"],
        summary: "Browse products (public)",
        description:
          "Only returns active products with stock > 0. No auth required.",
        parameters: [
          PageParam,
          LimitParam,
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by product name",
          },
          {
            name: "storeId",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by store",
          },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
        ],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              data: { type: "array", items: { type: "object" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
        },
      },
    },

    "/catalog/products/{id}": {
      get: {
        tags: ["Catalog"],
        summary: "Get product detail (public)",
        parameters: [IdParam("Product UUID")],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              price: { type: "number" },
              stock: { type: "integer" },
              imageUrl: { type: "string", nullable: true },
              store: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  storeName: { type: "string" },
                },
              },
            },
          }),
          "404": ErrorResponse("Product not found"),
        },
      },
    },

    "/catalog/stores/{id}": {
      get: {
        tags: ["Catalog"],
        summary: "Get store page (public)",
        parameters: [IdParam("Store UUID")],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              store: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  storeName: { type: "string" },
                },
              },
              products: { type: "array", items: { type: "object" } },
            },
          }),
          "404": ErrorResponse("Store not found"),
        },
      },
    },

    // ── Buyer — Wallet ───────────────────────────────────────────────────────
    "/buyer/wallet": {
      get: {
        tags: ["Buyer — Wallet"],
        summary: "Get wallet balance",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: { balance: { type: "number", example: 500000 } },
          }),
          "401": ErrorResponse("Unauthorized"),
          "403": ErrorResponse("Active role must be BUYER"),
        },
      },
    },

    "/buyer/wallet/topup": {
      post: {
        tags: ["Buyer — Wallet"],
        summary: "Top up wallet (dummy)",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount"],
                properties: {
                  amount: {
                    type: "number",
                    minimum: 1,
                    maximum: 10000000,
                    example: 200000,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: { balance: { type: "number" } },
          }),
          "400": ErrorResponse("Validation failed"),
        },
      },
    },

    "/buyer/wallet/transactions": {
      get: {
        tags: ["Buyer — Wallet"],
        summary: "List wallet transaction history",
        security: BearerAuth,
        parameters: [PageParam, LimitParam],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["TOPUP", "PAYMENT", "REFUND"],
                    },
                    amount: { type: "number" },
                    description: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
        },
      },
    },

    // ── Buyer — Address ──────────────────────────────────────────────────────
    "/buyer/addresses": {
      get: {
        tags: ["Buyer — Address"],
        summary: "List delivery addresses",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({ type: "array", items: { type: "object" } }),
        },
      },
      post: {
        tags: ["Buyer — Address"],
        summary: "Add a delivery address",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["label", "recipientName", "phone", "fullAddress"],
                properties: {
                  label: { type: "string", example: "Rumah" },
                  recipientName: { type: "string", example: "Budi Santoso" },
                  phone: { type: "string", example: "081234567890" },
                  fullAddress: {
                    type: "string",
                    example: "Jl. Sudirman No. 1, Jakarta Pusat 10220",
                  },
                  isDefault: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          "201": SuccessResponse({ type: "object" }),
          "400": ErrorResponse("Validation failed"),
        },
      },
    },

    "/buyer/addresses/{id}": {
      put: {
        tags: ["Buyer — Address"],
        summary: "Update an address",
        security: BearerAuth,
        parameters: [IdParam("Address UUID")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  recipientName: { type: "string" },
                  phone: { type: "string" },
                  fullAddress: { type: "string" },
                  isDefault: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Address not found"),
        },
      },
      delete: {
        tags: ["Buyer — Address"],
        summary: "Delete an address",
        description:
          "Cannot delete the default address — set another as default first.",
        security: BearerAuth,
        parameters: [IdParam("Address UUID")],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: { message: { type: "string" } },
          }),
          "404": ErrorResponse("Address not found"),
          "409": ErrorResponse("Cannot delete default address"),
        },
      },
    },

    // ── Buyer — Cart ─────────────────────────────────────────────────────────
    "/buyer/cart": {
      get: {
        tags: ["Buyer — Cart"],
        summary: "Get cart",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              storeId: { type: "string", nullable: true },
              subtotal: { type: "number" },
              cartItems: { type: "array", items: { type: "object" } },
            },
          }),
        },
      },
      delete: {
        tags: ["Buyer — Cart"],
        summary: "Clear entire cart",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: { message: { type: "string" } },
          }),
        },
      },
    },

    "/buyer/cart/items": {
      post: {
        tags: ["Buyer — Cart"],
        summary: "Add item to cart",
        description:
          "**Single-store rule:** returns 409 if the product belongs to a different store than the current cart.",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId", "quantity"],
                properties: {
                  productId: { type: "string", format: "uuid" },
                  quantity: { type: "integer", minimum: 1, example: 2 },
                },
              },
            },
          },
        },
        responses: {
          "201": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Product not found"),
          "409": ErrorResponse("Cross-store conflict or insufficient stock"),
        },
      },
    },

    "/buyer/cart/items/{productId}": {
      put: {
        tags: ["Buyer — Cart"],
        summary: "Update item quantity",
        security: BearerAuth,
        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: { quantity: { type: "integer", minimum: 1 } },
              },
            },
          },
        },
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Item not in cart"),
        },
      },
      delete: {
        tags: ["Buyer — Cart"],
        summary: "Remove item from cart",
        security: BearerAuth,
        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Item not in cart"),
        },
      },
    },

    // ── Buyer — Checkout & Orders ────────────────────────────────────────────
    "/buyer/checkout/preview": {
      post: {
        tags: ["Buyer — Checkout & Orders"],
        summary: "Preview checkout totals (no order created)",
        description:
          "Use this to show the summary screen before the buyer confirms.",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
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
        },
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              subtotal: { type: "number", example: 350000 },
              discountAmount: { type: "number", example: 35000 },
              discountType: { type: "string", example: "PROMO" },
              deliveryFee: { type: "number", example: 15000 },
              ppnAmount: { type: "number", example: 39600 },
              total: { type: "number", example: 369600 },
              deliveryMethod: { type: "string", example: "REGULAR" },
            },
          }),
          "409": ErrorResponse("Cart empty or invalid discount code"),
        },
      },
    },

    "/buyer/checkout": {
      post: {
        tags: ["Buyer — Checkout & Orders"],
        summary: "Confirm checkout — creates order",
        description: `
Atomic transaction:
1. Decrement stock (race-safe conditional update)
2. Create Order + OrderItems (price snapshot)
3. Deduct wallet
4. Increment voucher usedCount if applicable
5. Clear cart

Initial order status: **SEDANG_DIKEMAS**
        `,
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["addressId", "deliveryMethod"],
                properties: {
                  addressId: { type: "string", format: "uuid" },
                  deliveryMethod: {
                    type: "string",
                    enum: ["INSTANT", "NEXT_DAY", "REGULAR"],
                  },
                  discountCode: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": SuccessResponse({
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              status: { type: "string", example: "SEDANG_DIKEMAS" },
              total: { type: "number" },
              deliveryMethod: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          }),
          "409": ErrorResponse("Insufficient balance or stock"),
        },
      },
    },

    "/buyer/orders": {
      get: {
        tags: ["Buyer — Checkout & Orders"],
        summary: "List my orders",
        security: BearerAuth,
        parameters: [
          PageParam,
          LimitParam,
          {
            name: "status",
            in: "query",
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
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              data: { type: "array", items: { type: "object" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
        },
      },
    },

    "/buyer/orders/{id}": {
      get: {
        tags: ["Buyer — Checkout & Orders"],
        summary: "Get order detail + status history",
        security: BearerAuth,
        parameters: [IdParam("Order UUID")],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              id: { type: "string" },
              status: { type: "string" },
              subtotal: { type: "number" },
              discountAmount: { type: "number" },
              deliveryFee: { type: "number" },
              ppnAmount: { type: "number" },
              total: { type: "number" },
              orderItems: { type: "array", items: { type: "object" } },
              statusHistory: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    note: { type: "string" },
                    changedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          }),
          "404": ErrorResponse("Order not found"),
        },
      },
    },

    "/buyer/reports/spending": {
      get: {
        tags: ["Buyer — Checkout & Orders"],
        summary: "Spending report",
        security: BearerAuth,
        parameters: [
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
            example: "2025-01-01",
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
            example: "2025-12-31",
          },
        ],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              totalSpent: { type: "number" },
              totalOrders: { type: "integer" },
            },
          }),
        },
      },
    },

    // ── Seller — Store ───────────────────────────────────────────────────────
    "/seller/store": {
      get: {
        tags: ["Seller — Store"],
        summary: "Get my store",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              id: { type: "string" },
              storeName: { type: "string" },
              description: { type: "string", nullable: true },
            },
          }),
          "404": ErrorResponse("Store not found"),
        },
      },
      put: {
        tags: ["Seller — Store"],
        summary: "Update my store",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  storeName: { type: "string", minLength: 3, maxLength: 60 },
                  description: { type: "string", maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "409": ErrorResponse("Store name already taken"),
        },
      },
    },

    // ── Seller — Products ────────────────────────────────────────────────────
    "/seller/products": {
      get: {
        tags: ["Seller — Products"],
        summary: "List my products (includes inactive)",
        security: BearerAuth,
        parameters: [
          PageParam,
          LimitParam,
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              data: { type: "array", items: { type: "object" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
        },
      },
      post: {
        tags: ["Seller — Products"],
        summary: "Create a product",
        description: "Send as `multipart/form-data` to include an image file.",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name", "price", "stock"],
                properties: {
                  name: { type: "string", example: "Kemeja Polos" },
                  description: { type: "string" },
                  price: { type: "number", example: 89000 },
                  stock: { type: "integer", example: 50 },
                  image: {
                    type: "string",
                    format: "binary",
                    description: "JPEG/PNG/WebP, max 2 MB",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": SuccessResponse({ type: "object" }),
          "400": ErrorResponse("Validation failed"),
        },
      },
    },

    "/seller/products/{id}": {
      get: {
        tags: ["Seller — Products"],
        summary: "Get one of my products",
        security: BearerAuth,
        parameters: [IdParam("Product UUID")],
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Not found in your store"),
        },
      },
      put: {
        tags: ["Seller — Products"],
        summary: "Update a product",
        description:
          "Send as `multipart/form-data`. Old image is deleted from Supabase when a new one is uploaded.",
        security: BearerAuth,
        parameters: [IdParam("Product UUID")],
        requestBody: {
          required: true,
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
          },
        },
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Not found in your store"),
        },
      },
      delete: {
        tags: ["Seller — Products"],
        summary: "Delete a product",
        description: "Also deletes the product image from Supabase Storage.",
        security: BearerAuth,
        parameters: [IdParam("Product UUID")],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: { message: { type: "string" } },
          }),
          "404": ErrorResponse("Not found"),
        },
      },
    },

    // ── Seller — Orders ──────────────────────────────────────────────────────
    "/seller/orders": {
      get: {
        tags: ["Seller — Orders"],
        summary: "List incoming orders",
        security: BearerAuth,
        parameters: [
          PageParam,
          LimitParam,
          {
            name: "status",
            in: "query",
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
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              data: { type: "array", items: { type: "object" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
        },
      },
    },

    "/seller/orders/{id}": {
      get: {
        tags: ["Seller — Orders"],
        summary: "Get order detail",
        security: BearerAuth,
        parameters: [IdParam("Order UUID")],
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Not found in your store"),
        },
      },
    },

    "/seller/orders/{id}/process": {
      post: {
        tags: ["Seller — Orders"],
        summary: "Process order (SEDANG_DIKEMAS → MENUNGGU_PENGIRIM)",
        description:
          "Also creates a DeliveryJob so drivers can see this order.",
        security: BearerAuth,
        parameters: [IdParam("Order UUID")],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              status: { type: "string", example: "MENUNGGU_PENGIRIM" },
            },
          }),
          "404": ErrorResponse("Order not found"),
          "409": ErrorResponse("Order not in SEDANG_DIKEMAS status"),
        },
      },
    },

    "/seller/reports/income": {
      get: {
        tags: ["Seller — Orders"],
        summary: "Income report",
        security: BearerAuth,
        parameters: [
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              totalIncome: { type: "number" },
              totalOrders: { type: "integer" },
            },
          }),
        },
      },
    },
  },
};
