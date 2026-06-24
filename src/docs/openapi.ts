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

**Levels implemented:** 1 · 2 · 3 · 4 · 5 · 6 · 7 (complete)

### Role flow
1. \`POST /auth/register\` → always **BUYER** (no role selection at signup)

2. \`POST /auth/login\` → single-role → full session | multi-role → \`rolePendingToken\`

3. \`POST /auth/select-role\` → exchange \`rolePendingToken\` for full session with active role

4. \`POST /profile/become-seller\` → grants SELLER + creates Store atomically

5. \`POST /profile/become-driver\` → grants DRIVER role

### Authorization
Paste \`Bearer <accessToken>\` in the **Authorize 🔒** button (top right).
The \`activeRole\` inside the token determines what each endpoint allows.

### Price formula
\`total = (subtotal − discountAmount + deliveryFee) × 1.12\`

### Delivery fees & SLA
| Method | Fee | SLA |
|--------|-----|-----|
| INSTANT | Rp 50.000 | 3 hours |
| NEXT_DAY | Rp 25.000 | 24 hours |
| REGULAR | Rp 15.000 | 72 hours |

### Overdue handling
Orders past their SLA are auto-processed by \`POST /admin/system/run-overdue-check\`
(also triggered automatically by \`advance-day\`):
- **INSTANT / NEXT_DAY** → wallet refunded + stock restored
- **REGULAR** → status set to DIKEMBALIKAN (physical return)

### Driver earnings
Driver receives **80%** of the order's \`deliveryFee\` per completed job.
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
    { name: "Buyer — Discounts" },
    { name: "Seller — Store" },
    { name: "Seller — Products" },
    { name: "Seller — Orders" },
    { name: "Admin — Monitoring" },
    { name: "Admin — Vouchers" },
    { name: "Admin — Promos" },
    { name: "Admin — System" },
    { name: "Driver" },
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

    // ── Level 4: Discounts ──────────────────────────────────────────────────
    "/buyer/discounts/validate": {
      get: {
        tags: ["Buyer — Discounts"],
        summary: "Validate discount code before checkout",
        description:
          "Shows the discount amount in real-time as the buyer types the code.",
        security: BearerAuth,
        parameters: [
          {
            name: "code",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "SAVE10",
          },
          {
            name: "subtotal",
            in: "query",
            required: true,
            schema: { type: "number" },
            example: 350000,
          },
        ],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              valid: { type: "boolean" },
              type: {
                type: "string",
                enum: ["VOUCHER", "PROMO"],
                nullable: true,
              },
              discountType: {
                type: "string",
                enum: ["PERCENT", "FIXED"],
                nullable: true,
              },
              value: { type: "number", nullable: true },
              discountAmount: { type: "number", nullable: true },
              reason: {
                type: "string",
                nullable: true,
                description: "Why it failed (when valid=false)",
              },
            },
          }),
        },
      },
    },

    // ── Level 4: Admin — Monitoring ─────────────────────────────────────────
    "/admin/dashboard": {
      get: {
        tags: ["Admin — Monitoring"],
        summary: "Dashboard summary (counts for all entities)",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              users: { type: "integer" },
              stores: { type: "integer" },
              products: { type: "integer" },
              orders: { type: "integer" },
              vouchers: { type: "integer" },
              promos: { type: "integer" },
              deliveryJobs: { type: "integer" },
              overdueOrders: { type: "integer" },
              simulatedDate: { type: "string", format: "date-time" },
            },
          }),
          "403": ErrorResponse("Admin only"),
        },
      },
    },

    "/admin/users": {
      get: {
        tags: ["Admin — Monitoring"],
        summary: "List all users",
        security: BearerAuth,
        parameters: [PageParam, LimitParam],
        responses: { "200": SuccessResponse({ type: "object" }) },
      },
    },

    "/admin/stores": {
      get: {
        tags: ["Admin — Monitoring"],
        summary: "List all stores",
        security: BearerAuth,
        parameters: [PageParam, LimitParam],
        responses: { "200": SuccessResponse({ type: "object" }) },
      },
    },

    "/admin/orders": {
      get: {
        tags: ["Admin — Monitoring"],
        summary: "List all orders",
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
        responses: { "200": SuccessResponse({ type: "object" }) },
      },
    },

    "/admin/orders/overdue": {
      get: {
        tags: ["Admin — Monitoring"],
        summary: "List overdue orders",
        security: BearerAuth,
        parameters: [PageParam, LimitParam],
        responses: { "200": SuccessResponse({ type: "object" }) },
      },
    },

    "/admin/delivery-jobs": {
      get: {
        tags: ["Admin — Monitoring"],
        summary: "List all delivery jobs",
        security: BearerAuth,
        parameters: [PageParam, LimitParam],
        responses: { "200": SuccessResponse({ type: "object" }) },
      },
    },

    // ── Level 4: Admin — Vouchers ───────────────────────────────────────────
    "/admin/vouchers": {
      get: {
        tags: ["Admin — Vouchers"],
        summary: "List vouchers",
        security: BearerAuth,
        parameters: [PageParam, LimitParam],
        responses: { "200": SuccessResponse({ type: "object" }) },
      },
      post: {
        tags: ["Admin — Vouchers"],
        summary: "Create a voucher",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "code",
                  "discountType",
                  "value",
                  "expiryDate",
                  "usageLimit",
                ],
                properties: {
                  code: { type: "string", example: "SAVE10" },
                  discountType: {
                    type: "string",
                    enum: ["PERCENT", "FIXED"],
                    example: "PERCENT",
                  },
                  value: { type: "number", example: 10 },
                  expiryDate: {
                    type: "string",
                    format: "date",
                    example: "2025-12-31",
                  },
                  usageLimit: { type: "integer", example: 100 },
                },
              },
            },
          },
        },
        responses: {
          "201": SuccessResponse({ type: "object" }),
          "409": ErrorResponse("Code already exists"),
        },
      },
    },

    "/admin/vouchers/{id}": {
      get: {
        tags: ["Admin — Vouchers"],
        summary: "Get voucher detail",
        security: BearerAuth,
        parameters: [IdParam("Voucher UUID")],
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Not found"),
        },
      },
    },

    // ── Level 4: Admin — Promos ─────────────────────────────────────────────
    "/admin/promos": {
      get: {
        tags: ["Admin — Promos"],
        summary: "List promos",
        security: BearerAuth,
        parameters: [PageParam, LimitParam],
        responses: { "200": SuccessResponse({ type: "object" }) },
      },
      post: {
        tags: ["Admin — Promos"],
        summary: "Create a promo",
        security: BearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code", "discountType", "value", "expiryDate"],
                properties: {
                  code: { type: "string", example: "LEBARAN25" },
                  discountType: {
                    type: "string",
                    enum: ["PERCENT", "FIXED"],
                    example: "FIXED",
                  },
                  value: { type: "number", example: 25000 },
                  expiryDate: {
                    type: "string",
                    format: "date",
                    example: "2025-04-30",
                  },
                  description: {
                    type: "string",
                    example: "Promo Lebaran diskon Rp25.000",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": SuccessResponse({ type: "object" }),
          "409": ErrorResponse("Code already exists"),
        },
      },
    },

    "/admin/promos/{id}": {
      get: {
        tags: ["Admin — Promos"],
        summary: "Get promo detail",
        security: BearerAuth,
        parameters: [IdParam("Promo UUID")],
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Not found"),
        },
      },
    },

    // ── Level 4: Admin — System / Time Simulation ───────────────────────────
    "/admin/system/time": {
      get: {
        tags: ["Admin — System"],
        summary: "Get current simulated time",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              simulatedDate: { type: "string", format: "date-time" },
              isSimulated: { type: "boolean" },
            },
          }),
        },
      },
    },

    "/admin/system/advance-day": {
      post: {
        tags: ["Admin — System"],
        summary: "Advance simulated date by N days",
        description:
          "Moves the system clock forward — use for demo to trigger overdue handling.",
        security: BearerAuth,
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  days: { type: "integer", default: 1, example: 3 },
                },
              },
            },
          },
        },
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              simulatedDate: { type: "string", format: "date-time" },
              advancedDays: { type: "integer" },
            },
          }),
        },
      },
    },

    "/admin/system/reset-time": {
      post: {
        tags: ["Admin — System"],
        summary: "Reset to real time",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              simulatedDate: { type: "string", format: "date-time" },
              isSimulated: { type: "boolean" },
            },
          }),
        },
      },
    },

    "/admin/system/run-overdue-check": {
      post: {
        tags: ["Admin — System"],
        summary: "Manually trigger overdue order processing",
        description:
          "Scans all active orders past their `dueAt` and applies auto-refund (INSTANT/NEXT_DAY) or auto-return (REGULAR). Called automatically by `advance-day`.",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              checkedAt: { type: "string", format: "date-time" },
              processed: { type: "integer" },
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    orderId: { type: "string" },
                    action: {
                      type: "string",
                      enum: ["REFUNDED", "RETURNED", "ERROR"],
                    },
                    reason: { type: "string" },
                  },
                },
              },
            },
          }),
          "403": ErrorResponse("Admin only"),
        },
      },
    },

    // ── Level 5: Driver ──────────────────────────────────────────────────────
    "/driver/jobs/available": {
      get: {
        tags: ["Driver"],
        summary: "List available delivery jobs",
        description:
          "Shows only jobs with status AVAILABLE (Seller has processed the order).",
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
                    id: { type: "string", format: "uuid" },
                    status: { type: "string", example: "AVAILABLE" },
                    order: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        total: { type: "number" },
                        deliveryFee: { type: "number" },
                        deliveryMethod: { type: "string" },
                        store: {
                          type: "object",
                          properties: { storeName: { type: "string" } },
                        },
                        address: { type: "object" },
                      },
                    },
                  },
                },
              },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
          "403": ErrorResponse("Active role must be DRIVER"),
        },
      },
    },

    "/driver/jobs/active": {
      get: {
        tags: ["Driver"],
        summary: "Get currently active job (TAKEN)",
        security: BearerAuth,
        responses: {
          "200": SuccessResponse({ type: "object", nullable: true }),
          "403": ErrorResponse("Active role must be DRIVER"),
        },
      },
    },

    "/driver/jobs/history": {
      get: {
        tags: ["Driver"],
        summary: "List completed job history",
        security: BearerAuth,
        parameters: [PageParam, LimitParam],
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

    "/driver/jobs/{id}": {
      get: {
        tags: ["Driver"],
        summary: "Get job detail",
        description: "Only returns the job if status is AVAILABLE.",
        security: BearerAuth,
        parameters: [IdParam("Delivery job UUID")],
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "404": ErrorResponse("Job not found"),
          "409": ErrorResponse("Job no longer available"),
        },
      },
    },

    "/driver/jobs/{id}/take": {
      post: {
        tags: ["Driver"],
        summary: "Take a delivery job",
        description: `Race-safe: uses a conditional update so two drivers cannot take the same job simultaneously.
Order status moves to **SEDANG_DIKIRIM**.`,
        security: BearerAuth,
        parameters: [IdParam("Delivery job UUID")],
        responses: {
          "200": SuccessResponse({ type: "object" }),
          "409": ErrorResponse("Job already taken or you have an active job"),
        },
      },
    },

    "/driver/jobs/{id}/complete": {
      post: {
        tags: ["Driver"],
        summary: "Mark delivery as completed",
        description: `Order status moves to **PESANAN_SELESAI**.
Driver earning (${80}% of deliveryFee) is recorded automatically.`,
        security: BearerAuth,
        parameters: [IdParam("Delivery job UUID")],
        responses: {
          "200": SuccessResponse({
            type: "object",
            properties: {
              message: { type: "string" },
              earning: {
                type: "number",
                description: "80% of order deliveryFee",
              },
              jobId: { type: "string" },
              orderId: { type: "string" },
            },
          }),
          "403": ErrorResponse("Job not assigned to you"),
          "409": ErrorResponse("Job is not in TAKEN status"),
        },
      },
    },

    "/driver/earnings": {
      get: {
        tags: ["Driver"],
        summary: "Get driver earnings summary",
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
              totalEarned: { type: "number", example: 120000 },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    amount: { type: "number" },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          }),
        },
      },
    },
  },
};
