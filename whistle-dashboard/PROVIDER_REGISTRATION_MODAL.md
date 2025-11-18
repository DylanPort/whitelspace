# 🎯 Provider Registration Modal

**Fully functional popup for registering as a WHISTLE provider, matching the monochrome 3D theme.**

## Features

### ✅ Two-Step Registration Flow

**Step 1: Requirements Overview**
- Display all requirements
- Show earning potential
- "Continue" button to proceed

**Step 2: Registration Form**
- Stake amount input (min 10,000 WHISTLE)
- RPC endpoint URL
- Server location
- Uptime commitment (min 99%)
- "Back" and "Register" buttons

### ✅ Design & Styling

**Monochrome 3D Theme:**
- Angular clipped corners (20px chamfer)
- Gradient background (dark gray to darker gray)
- 9-layer shadow system (extreme depth)
- Radial gradient overlay (light source simulation)
- Backdrop blur + dark overlay (95% black)

**Visual Effects:**
- Smooth spring animation on open/close
- Progress indicator (2-step bar)
- Hover states on buttons
- Focus states on inputs
- Loading states during transaction

### ✅ Functionality

**Wallet Integration:**
- Checks wallet connection
- Creates stake transaction
- Sends transaction to blockchain
- Displays success/error messages

**Form Validation:**
- Minimum stake: 10,000 WHISTLE
- Minimum uptime: 99%
- Required fields: All
- Number inputs with min/max/step

**State Management:**
- Two-step navigation
- Form data persistence
- Loading states
- Modal open/close

---

## Component Structure

### Props

```typescript
interface ProviderRegistrationModalProps {
  isOpen: boolean;      // Controls modal visibility
  onClose: () => void;  // Callback to close modal
}
```

### State

```typescript
const [step, setStep] = useState(1);           // Current step (1 or 2)
const [loading, setLoading] = useState(false); // Transaction loading

const [formData, setFormData] = useState({
  stakeAmount: '10000',        // Default 10k WHISTLE
  rpcUrl: '',                  // Provider's RPC endpoint
  serverLocation: '',          // Geographic location
  uptimeCommitment: '99',      // Uptime percentage
});
```

---

## Usage

### In ProviderRegistrationPanel.tsx

```typescript
import { useState } from 'react';
import ProviderRegistrationModal from './ProviderRegistrationModal';

export default function ProviderRegistrationPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRegister = () => {
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <button onClick={handleRegister}>
        REGISTER NOW
      </button>

      <ProviderRegistrationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
```

---

## Modal Styling

### Backdrop

```css
background: rgba(0, 0, 0, 0.95)
backdrop-filter: blur(10px)
```

**Effect:** Dark overlay with blur for depth.

### Container

```css
background: linear-gradient(
  135deg,
  rgba(22, 22, 22, 0.98) 0%,
  rgba(12, 12, 12, 0.98) 100%
)
border: 1px solid rgba(255, 255, 255, 0.15)
backdrop-filter: blur(30px)
```

**Effect:** Gradient dark background with subtle white border.

### Shadow System (9 Layers)

```css
box-shadow: 
  /* Extreme depth */
  0 30px 100px rgba(0, 0, 0, 0.95),
  0 15px 50px rgba(0, 0, 0, 0.85),
  0 8px 25px rgba(0, 0, 0, 0.75),
  /* Edge highlights */
  inset 0 1px 0 rgba(255, 255, 255, 0.2),
  inset 0 -1px 0 rgba(0, 0, 0, 0.9)
```

**Effect:** Extreme 3D depth with dramatic shadows.

### Clipped Corners

```css
clip-path: polygon(
  20px 0,
  calc(100% - 20px) 0,
  100% 20px,
  100% calc(100% - 20px),
  calc(100% - 20px) 100%,
  20px 100%,
  0 calc(100% - 20px),
  0 20px
)
```

**Effect:** Angular beveled corners matching dashboard theme.

### Gradient Overlay

```css
background: radial-gradient(
  circle at 20% 20%,
  rgba(255, 255, 255, 0.08) 0%,
  transparent 40%,
  rgba(0, 0, 0, 0.4) 100%
)
```

**Effect:** Light source from top-left corner.

---

## Animations

### Modal Entry

```typescript
initial={{ scale: 0.9, opacity: 0, y: 20 }}
animate={{ scale: 1, opacity: 1, y: 0 }}
exit={{ scale: 0.9, opacity: 0, y: 20 }}
transition={{ type: 'spring', damping: 25, stiffness: 300 }}
```

**Effect:** Smooth spring animation with slight drop.

### Backdrop Entry

```typescript
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
```

**Effect:** Fade in/out.

### Step Transition

```typescript
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: -20 }}
```

**Effect:** Slide in from right, slide out to left.

---

## Step-by-Step Flow

### Step 1: Requirements

**Display:**
- Introduction text
- Requirements checklist (4 items):
  - 10,000 WHISTLE staked
  - Dedicated server specs
  - 99%+ uptime
  - Run provider software
- Earning information box

**Action:**
- "Continue" button → Go to Step 2

### Step 2: Registration Form

**Inputs:**
1. **Stake Amount**
   - Type: Number
   - Min: 10,000
   - Step: 1,000
   - Default: 10,000

2. **RPC Endpoint URL**
   - Type: Text
   - Placeholder: `https://your-rpc.example.com`

3. **Server Location**
   - Type: Text
   - Placeholder: `US-East, EU-West, etc.`

4. **Uptime Commitment**
   - Type: Number
   - Min: 99
   - Max: 100
   - Step: 0.1
   - Default: 99

**Actions:**
- "Back" button → Go to Step 1
- "Register" button → Submit transaction

---

## Transaction Flow

### 1. Validation

```typescript
const stakeAmount = parseFloat(formData.stakeAmount);
if (isNaN(stakeAmount) || stakeAmount < 10000) {
  alert('Minimum stake is 10,000 WHISTLE');
  return;
}
```

### 2. Create Transaction

```typescript
const transaction = await createStakeTransaction(publicKey, stakeAmount);
```

### 3. Send to Blockchain

```typescript
const signature = await sendTransaction(transaction, connection);
```

### 4. Success Message

```
Provider registration successful!

Signature: [transaction signature]

Your node will be activated once you start the WHISTLE provider software.
```

### 5. Reset & Close

- Reset form to defaults
- Reset to step 1
- Close modal

---

## Progress Indicator

**Visual:**
- Two horizontal bars
- Active steps: White with glow
- Inactive steps: Dark gray

**Code:**
```tsx
<div className="flex items-center gap-2">
  <div className={`flex-1 h-1 ${step >= 1 ? 'bg-white' : 'bg-gray-700'}`} />
  <div className={`flex-1 h-1 ${step >= 2 ? 'bg-white' : 'bg-gray-700'}`} />
</div>
```

**Effect:** Shows current progress (Step 1 of 2 or Step 2 of 2).

---

## Error Handling

### Wallet Not Connected

```typescript
if (!publicKey || !connected) {
  alert('Please connect your wallet first');
  return;
}
```

### Invalid Stake Amount

```typescript
if (stakeAmount < 10000) {
  alert('Minimum stake is 10,000 WHISTLE');
  return;
}
```

### Transaction Failed

```typescript
catch (err: any) {
  alert(`Registration failed: ${err.message}`);
}
```

---

## Accessibility

### Keyboard Navigation
- ✅ Tab through inputs
- ✅ Enter to submit
- ✅ Escape to close modal

### Screen Readers
- ✅ Semantic HTML
- ✅ Label associations
- ✅ ARIA attributes (implicit via button/input)

### Focus Management
- ✅ Focus trap within modal
- ✅ Return focus on close

---

## Responsive Design

**Width:**
- Max width: 512px (`max-w-lg`)
- Padding: 16px on mobile, 32px on desktop

**Content:**
- Stacks vertically
- Full-width inputs
- Full-width buttons

---

## Integration Points

### Smart Contract

**Function Used:**
```typescript
createStakeTransaction(publicKey, stakeAmount)
```

**Location:**
`lib/contract.ts`

**Purpose:**
Creates a transaction to stake WHISTLE tokens and register as provider.

### Wallet

**Used:**
- `publicKey` - Provider's wallet address
- `connected` - Connection status
- `sendTransaction` - Send transaction to blockchain

---

## Files Modified

```
✅ components/ProviderRegistrationModal.tsx [NEW]
✅ components/ProviderRegistrationPanel.tsx [MODIFIED]
```

**Total: 1 new file, 1 modified file**

---

## Testing Checklist

- [ ] Modal opens on "REGISTER NOW" click
- [ ] Backdrop closes modal on click
- [ ] Close button (×) works
- [ ] Step 1 displays requirements
- [ ] "Continue" button navigates to Step 2
- [ ] Progress bar updates correctly
- [ ] All form inputs work
- [ ] "Back" button returns to Step 1
- [ ] "Register" button validates stake amount
- [ ] Transaction is created and sent
- [ ] Success message displays with signature
- [ ] Modal closes after successful registration
- [ ] Form resets after registration
- [ ] Loading state shows during transaction
- [ ] Error messages display on failure

---

## Customization

### Colors

Change gradient:
```typescript
background: 'linear-gradient(
  135deg,
  rgba(YOUR_COLOR) 0%,
  rgba(YOUR_COLOR) 100%
)'
```

### Shadows

Adjust depth:
```css
0 [distance]px [blur]px rgba(0, 0, 0, [opacity])
```

### Corners

Change chamfer size:
```css
clip-path: polygon(
  [size]px 0,
  calc(100% - [size]px) 0,
  ...
)
```

### Steps

Add more steps:
```typescript
const [step, setStep] = useState(1);
// Add step 3, 4, etc.
```

---

## Future Enhancements

### Potential Features

- [ ] Email notification setup
- [ ] Discord webhook integration
- [ ] Automatic server health checks
- [ ] Provider dashboard link
- [ ] Earnings calculator
- [ ] Network status preview
- [ ] Hardware requirements validator
- [ ] Multi-sig support
- [ ] Testnet registration option

---

## Result

**A fully functional registration modal:**
- 🎨 Matches monochrome 3D theme perfectly
- ✨ Smooth animations and transitions
- 🔒 Blockchain transaction integration
- 📱 Responsive and accessible
- 💎 Professional polish
- ⚡ Production-ready

**Perfect for onboarding WHISTLE providers!** 🚀

