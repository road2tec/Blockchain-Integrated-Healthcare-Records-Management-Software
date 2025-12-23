# Blockchain-Integrated Healthcare Records Management System

A comprehensive healthcare records management system with blockchain integration for data integrity, immutability, patient ownership, and transparent access control.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Admin Panel │  │Doctor Panel │  │     Patient Panel       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │    MetaMask       │                        │
│                    │  (Signing Only)   │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Backend (Express)  │
                    │   - JWT Auth         │
                    │   - API Routes       │
                    │   - Ethers.js        │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────┴─────┐       ┌──────┴──────┐     ┌──────┴──────┐
    │ MongoDB   │       │   Ganache   │     │   Uploads   │
    │  Atlas    │       │ (Ethereum)  │     │   (Local)   │
    │           │       │             │     │             │
    │ - Users   │       │ - Consents  │     │ - Medical   │
    │ - Records │       │ - Hashes    │     │   Files     │
    │ - Consents│       │ - Audit     │     │             │
    └───────────┘       └─────────────┘     └─────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas |
| Blockchain | Ethereum (Ganache Local) |
| Smart Contracts | Solidity 0.8.19 |
| Blockchain Library | Ethers.js v6 |
| Wallet | MetaMask (transactions only) |
| Authentication | JWT (access + refresh tokens) |
| Hashing | SHA-256 |

## 📁 Project Structure

```
Approch 2/
├── backend/
│   ├── config/
│   │   ├── blockchain.js    # Ethers.js provider setup
│   │   └── db.js            # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js          # JWT verification
│   │   └── roleCheck.js     # RBAC middleware
│   ├── models/
│   │   ├── User.js          # User schema
│   │   ├── MedicalRecord.js # Record schema
│   │   └── Consent.js       # Consent schema
│   ├── routes/
│   │   ├── auth.js          # Auth endpoints
│   │   ├── admin.js         # Admin endpoints
│   │   ├── doctor.js        # Doctor endpoints
│   │   └── patient.js       # Patient endpoints
│   ├── services/
│   │   ├── hashService.js   # SHA-256 hashing
│   │   └── blockchainService.js
│   ├── server.js
│   └── package.json
├── contracts/
│   ├── UserRegistry.sol
│   ├── ConsentManager.sol
│   ├── MedicalRecordIndex.sol
│   ├── AccessControl.sol
│   ├── AuditLog.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── hardhat.config.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand store
│   │   └── types/          # TypeScript types
│   └── package.json
└── uploads/                # Medical files storage
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- npm or yarn
- MongoDB Atlas account
- Ganache (for local blockchain)
- MetaMask browser extension

### 1. Clone and Setup

```bash
cd "/Users/abhijeetgolhar/Documents/Road2Tech/P10/Approch 2"
```

### 2. Setup Backend

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and other configs
```

### 3. Setup Smart Contracts

```bash
cd contracts
npm install

# Start Ganache (in a separate terminal)
# Use Ganache GUI or CLI on port 7545

# Deploy contracts
npm run compile
npm run deploy
# Note the deployed addresses and update backend/.env
```

### 4. Setup Frontend

```bash
cd frontend
npm install

# Create .env.local
cp .env.example .env.local
```

### 5. Run the Application

```bash
# Terminal 1: Ganache (already running)

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

### 6. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## ⚙️ Environment Variables

### Backend (.env)

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT Secrets
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Blockchain
BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545
BLOCKCHAIN_CHAIN_ID=1337

# Contract Addresses (after deployment)
USER_REGISTRY_ADDRESS=0x...
CONSENT_MANAGER_ADDRESS=0x...
MEDICAL_RECORD_INDEX_ADDRESS=0x...
ACCESS_CONTROL_ADDRESS=0x...
AUDIT_LOG_ADDRESS=0x...

# Server
PORT=5000
NODE_ENV=development

# Admin Account
ADMIN_EMAIL=admin@healthcare.com
ADMIN_PASSWORD=Admin@123
ADMIN_PRIVATE_KEY=0x... # From Ganache
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545
NEXT_PUBLIC_CHAIN_ID=1337
```

## 🔐 Authentication Flow

1. **Sign Up/Login**: Email + Password (stored in MongoDB)
2. **Session**: JWT access tokens (15min) + refresh tokens (7 days)
3. **Wallet Connection**: After login, user can connect MetaMask
4. **Blockchain Transactions**: MetaMask used only for signing

> ⚠️ **Important**: Users authenticate with email/password, NOT with wallets directly.

## 📋 Smart Contracts

| Contract | Purpose |
|----------|---------|
| `UserRegistry` | Register user Ethereum addresses, map to roles |
| `ConsentManager` | Grant/revoke doctor access to patient records |
| `MedicalRecordIndex` | Store SHA-256 hashes of medical files |
| `AccessControl` | Enforce permissions, emergency access |
| `AuditLog` | Immutable logging for compliance |

## 👥 User Roles

### Admin
- Approve/reject doctor registrations
- Manage patient accounts
- View blockchain audit logs
- Monitor system health

### Doctor
- Login with credentials
- Connect MetaMask for signing
- Request patient consent (on-chain)
- Upload medical records (off-chain file, on-chain hash)
- Verify record integrity

### Patient
- Login with credentials
- Connect MetaMask for approvals
- View medical history
- Grant/revoke doctor access (on-chain)
- Track access logs
- Verify record integrity

## 🔄 Key Workflows

### Medical Record Upload (Doctor)
1. Doctor selects patient (must have consent)
2. Uploads file, generates SHA-256 hash
3. Signs with MetaMask
4. File stored locally, hash stored on blockchain
5. Record metadata stored in MongoDB

### Consent Grant/Revoke (Patient)
1. Patient receives consent request
2. Reviews doctor details
3. Signs grant/revoke with MetaMask
4. Transaction recorded on blockchain
5. Access immediately updated

### Record Verification
1. User requests verification
2. System recalculates file hash
3. Compares with on-chain hash
4. Returns VERIFIED or TAMPERED status

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Smart contract tests
cd contracts
npm test

# Frontend
cd frontend
npm run lint
```

## 📝 API Endpoints

### Auth
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/connect-wallet` - Link MetaMask

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/doctors` - List doctors
- `PUT /api/admin/doctors/:id/approve` - Approve doctor
- `GET /api/admin/patients` - List patients
- `GET /api/admin/audit-logs` - View audit logs

### Doctor
- `GET /api/doctor/dashboard` - Dashboard
- `GET /api/doctor/patients` - Patients with consent
- `POST /api/doctor/consent-request/:patientId` - Request consent
- `POST /api/doctor/records` - Upload record
- `GET /api/doctor/verify-record/:id` - Verify integrity

### Patient
- `GET /api/patient/dashboard` - Dashboard
- `GET /api/patient/records` - My records
- `POST /api/patient/consent/:doctorId/grant` - Grant access
- `POST /api/patient/consent/:doctorId/revoke` - Revoke access
- `GET /api/patient/access-logs` - View access history

## 📄 License

MIT License

---

Built with ❤️ for secure healthcare data management
