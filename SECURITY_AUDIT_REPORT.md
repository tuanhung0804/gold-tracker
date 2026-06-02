# Security Audit Report
**Date:** June 2, 2026
**Target:** Gold Tracker Codebase
**Scope:** Injection Flaws, Authentication, Data Exposure, Dependencies, Security Headers

## Executive Summary
A comprehensive security audit of the Gold Tracker application was conducted, focusing on source code review and threat modeling. The application leverages a robust stack (Next.js App Router, Prisma ORM, libSQL) which inherently mitigates several traditional vulnerability classes like SQL Injection and direct Cross-Site Scripting (XSS) in the UI. 

However, the audit identified **1 High severity** vulnerability related to missing authentication and access control, **1 Medium-High severity** issue involving HTML injection in email templates, and several **Medium/Low severity** misconfigurations regarding security headers and input validation. 

Immediate remediation of the API route protections is strongly recommended to prevent unauthorized data manipulation.

---

## Critical & High Findings

### 1. Broken Authentication & Missing Access Control (High)
* **Locations:** 
  - `src/app/api/portfolio/route.ts`
  - `src/app/api/cron/track/route.ts` (Lines 8-10)
* **Description:** 
  The Next.js API routes currently lack authentication middleware or authorization checks. 
  - The **Portfolio API** (`/api/portfolio`) allows any public, unauthenticated user to Create, Read, Update, and Delete (CRUD) portfolio items via `POST`, `PUT`, and `DELETE` requests.
  - The **Cron API** (`/api/cron/track`) is completely exposed. Although the developer left a comment indicating it should be secured (`// In a real production app on Vercel, you'd secure this with an Authorization header`), it currently executes a heavy scraping task and sends emails whenever hit.
* **Exploit Vector:** An attacker can craft a simple `curl` or `fetch` script to wipe out the database (`DELETE /api/portfolio?id=X`), inject false portfolio data, or hit the cron endpoint repeatedly to cause Denial of Service (DoS), rate-limiting from the scraped site, or email spam.

---

### 2. HTML Injection / Email XSS (Medium/High)
* **Location:** `src/lib/email.ts` (Lines ~48-66)
* **Description:**
  The `sendPriceChangeEmail` function dynamically constructs an HTML email template using string interpolation. The `name` variable is injected directly into the `htmlBody` without any sanitization or HTML encoding:
  ```html
  <h2 style="color: #d4af37; ...">
    ${name} 
    ...
  ```
  The `name` value originates from scraping a remote third-party website (`ngoccuanhabe.com`).
* **Exploit Vector:** If the target third-party website is compromised or maliciously alters its table data to include HTML tags (e.g., `<script>alert(1)</script>` or tracking pixels), this payload will be embedded directly into the HTML body of the outbound emails, executing in the recipient's email client.

---

## Medium & Low Findings

### 3. Misconfigured Security Headers (Medium)
* **Location:** `next.config.ts`
* **Description:** The application does not enforce modern HTTP security headers. 
* **Impact:** Without a strict Content-Security-Policy (CSP), X-Frame-Options, and Strict-Transport-Security (HSTS), the application is more susceptible to clickjacking, man-in-the-middle attacks, and future XSS flaws.

### 4. Insufficient Input Validation (Low)
* **Location:** `src/app/api/portfolio/route.ts`
* **Description:** User input parsed from `request.json()` is cast directly using `Number(body.buyPrice)` without strict schema validation. 
* **Impact:** If a user passes an object, boolean, or non-numeric string, it evaluates to `NaN`. Depending on SQLite's handling, this can result in invalid data states or runtime crashes when rendering the UI. 

### 5. Insecure Dependencies Posture (Low)
* **Location:** `package.json`
* **Description:** The application relies on heavily utilized packages (`jsdom`, `puppeteer`, `axios`). While no explicit immediate zero-days are targeted here, there is no automated auditing mechanism in place. 

---

## Remediation Plan

### Step 1: Secure API Routes (Authentication & Authorization)
1. **Portfolio API:** Implement an authentication layer (e.g., NextAuth.js or Clerk) or a simple passcode/API key if this is a single-user dashboard. Wrap `POST`, `PUT`, and `DELETE` handlers in `src/app/api/portfolio/route.ts` with session checks.
   ```typescript
   // Example Check
   const authHeader = request.headers.get('Authorization');
   if (authHeader !== \`Bearer \${process.env.ADMIN_SECRET}\`) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```
2. **Cron API:** Uncomment and implement the secret check in `src/app/api/cron/track/route.ts`.
   ```typescript
   if (request.headers.get('Authorization') !== \`Bearer \${process.env.CRON_SECRET}\`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

### Step 2: Sanitize Email HTML Inputs
Use a utility to escape HTML entities before interpolating external strings into the email body in `src/lib/email.ts`.
```typescript
// Add an HTML escape helper
const escapeHtml = (unsafe: string) => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

// Apply it to the 'name' parameter
const safeName = escapeHtml(name);
```

### Step 3: Implement Security Headers
Modify `next.config.ts` to include standard Next.js security headers.
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};
export default nextConfig;
```

### Step 4: Strict Schema Validation
Integrate a validation library like `zod` in `src/app/api/portfolio/route.ts` to strictly type-check and validate `buyPrice`, `quantity`, and `sellPrice` to ensure they are strictly positive numbers before interacting with Prisma.

### Step 5: Automate Dependency Auditing
Regularly run `npm audit` and integrate it into any deployment pipeline or GitHub Actions workflow to flag vulnerable packages automatically.
