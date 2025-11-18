# Provider Contact Form Integration

## 📋 Overview

The WHISTLE logo button now opens a **3-step Provider Application Form** that collects comprehensive details about potential providers.

## 🎯 What It Collects

### Step 1: Contact Information
- ✅ Full Name (required)
- ✅ Email Address (required)
- ✅ Telegram Username (optional)
- ✅ Discord Username (optional)

### Step 2: Provider Details
- Organization/Company Name
- Infrastructure Experience
- Server Location/Data Center
- Current Infrastructure Setup

### Step 3: Technical Specs & Questions
- Planned Server Specifications
- Network Bandwidth
- Total Storage Capacity
- Motivation for becoming a provider
- Expected Query Volume
- Additional Services
- Questions for the WHISTLE team

## 🔌 Backend Integration

Currently, submissions are logged to the console. To actually receive them:

### Option 1: Email Service (Easiest)

```typescript
// In whistle-dashboard/components/ProviderContactModal.tsx
// Replace the TODO section with:

const response = await fetch('/api/provider-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});

if (!response.ok) throw new Error('Submission failed');
```

**Create** `whistle-dashboard/app/api/provider-contact/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  const data = await request.json();
  
  // Setup email transporter (use your email service)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Send email
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: 'providers@whistle.network', // Your email
    subject: `New Provider Application: ${data.name}`,
    html: `
      <h2>New Provider Application</h2>
      
      <h3>Contact Information</h3>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Telegram:</strong> ${data.telegram || 'N/A'}</p>
      <p><strong>Discord:</strong> ${data.discord || 'N/A'}</p>
      
      <h3>Provider Details</h3>
      <p><strong>Organization:</strong> ${data.organization || 'N/A'}</p>
      <p><strong>Experience:</strong> ${data.experience || 'N/A'}</p>
      <p><strong>Server Location:</strong> ${data.serverLocation || 'N/A'}</p>
      <p><strong>Current Infrastructure:</strong> ${data.currentInfrastructure || 'N/A'}</p>
      
      <h3>Technical Specifications</h3>
      <p><strong>Server Specs:</strong> ${data.serverSpecs || 'N/A'}</p>
      <p><strong>Bandwidth:</strong> ${data.bandwidth || 'N/A'}</p>
      <p><strong>Storage:</strong> ${data.storageCapacity || 'N/A'}</p>
      
      <h3>Business Questions</h3>
      <p><strong>Motivation:</strong> ${data.motivation || 'N/A'}</p>
      <p><strong>Expected Volume:</strong> ${data.expectedVolume || 'N/A'}</p>
      <p><strong>Additional Services:</strong> ${data.additionalServices || 'N/A'}</p>
      <p><strong>Questions:</strong> ${data.questions || 'N/A'}</p>
    `,
  });

  return NextResponse.json({ success: true });
}
```

**Add to `.env.local`:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Install dependency:**
```bash
cd whistle-dashboard
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### Option 2: Database Storage

Store in PostgreSQL:

```sql
CREATE TABLE provider_applications (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telegram VARCHAR(100),
  discord VARCHAR(100),
  organization VARCHAR(255),
  experience TEXT,
  server_location VARCHAR(255),
  current_infrastructure TEXT,
  server_specs TEXT,
  bandwidth VARCHAR(100),
  storage_capacity VARCHAR(100),
  motivation TEXT,
  expected_volume VARCHAR(100),
  additional_services TEXT,
  questions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending'
);
```

### Option 3: Third-Party Service

Use Airtable, Notion API, or Google Sheets for easy management.

## 🎨 User Experience

1. **Click "WHISTLE" logo** → Opens provider application modal
2. **3-step form** with progress indicator
3. **Validation** → Name & email required
4. **Submit** → Toast notification with confirmation
5. **Follow-up** → "We'll contact you within 48 hours"

## 📧 Response Template

After receiving an application, send:

```
Subject: WHISTLE Provider Application - Next Steps

Hi [Name],

Thank you for your interest in becoming a WHISTLE provider!

We've received your application and our team will review it within 48 hours.

Next Steps:
1. Technical interview (30 min)
2. Infrastructure verification
3. Provider onboarding & setup
4. Token bonding & registration

Questions? Reply to this email or reach out on Telegram: @whistlenetwork

Best,
WHISTLE Team
```

## 🚀 Current Status

- ✅ Frontend form built (3 steps)
- ✅ Validation & UX polish
- ✅ Toast notifications
- ⏳ Backend endpoint (needs implementation)
- ⏳ Email service setup (needs configuration)

## 📝 Notes

Form data is currently logged to browser console. Check `console.log('Provider Contact Form Submission:', ...)` in the browser DevTools to see submissions while testing.

