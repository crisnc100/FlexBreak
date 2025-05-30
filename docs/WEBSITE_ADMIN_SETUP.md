# FlexBreak Website Admin Dashboard Setup

## 🎯 Goal
Create a web dashboard where you can review manual verification requests and generate one-time codes.

## 🏗️ Architecture Overview

```
User emails support → Email parsed → Website admin dashboard → You review → Generate code → User gets discount
```

## 📧 Email Integration Options

### Option 1: Gmail API Integration (Recommended)
- **Setup:** Connect your flexbreakapp@gmail.com to your website
- **How it works:** Website automatically pulls emails with verification requests
- **Pros:** Fully automated email parsing
- **Cons:** Requires Gmail API setup

### Option 2: Email Forwarding + Manual Entry
- **Setup:** Forward emails to a webhook or manually copy-paste
- **How it works:** You manually add requests to the dashboard
- **Pros:** Simple to set up
- **Cons:** More manual work

### Option 3: Email Parser Service (Zapier/Make)
- **Setup:** Use Zapier to parse emails and send to your website
- **How it works:** Zapier reads emails → Extracts data → Sends to your API
- **Pros:** No coding needed for email parsing
- **Cons:** Monthly cost (~$20)

## 🌐 Website Backend API Endpoints

You'll need to add these to your FlexBreak website:

### 1. Submit Verification Request
```javascript
POST /api/admin/verification-requests
{
  "email": "user@gmail.com",
  "userType": "student",
  "details": "Stanford University, Computer Science student",
  "submittedAt": "2023-..."
}
```

### 2. Get Pending Requests (Admin Dashboard)
```javascript
GET /api/admin/verification-requests?status=pending
Returns: [
  {
    "id": "req_123",
    "email": "user@gmail.com", 
    "userType": "student",
    "details": "...",
    "submittedAt": "...",
    "status": "pending"
  }
]
```

### 3. Approve/Reject Request
```javascript
POST /api/admin/verification-requests/req_123/decision
{
  "action": "approve", // or "reject"
  "adminNotes": "Valid Stanford student ID provided",
  "verificationCode": "VERIFY-STU-ABC123" // auto-generated
}
```

### 4. Verify Code (App calls this)
```javascript
POST /api/admin/verify-code
{
  "email": "user@gmail.com",
  "code": "VERIFY-STU-ABC123"
}
Returns: {
  "valid": true,
  "userType": "student"
}
```

## 🎨 Admin Dashboard UI

### Dashboard Home
```html
<!DOCTYPE html>
<html>
<head>
    <title>FlexBreak Admin - Verification Requests</title>
    <style>
        /* Clean, simple styling */
        body { font-family: -apple-system, sans-serif; margin: 40px; }
        .request-card { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .pending { border-left: 4px solid #ff9500; }
        .approved { border-left: 4px solid #4caf50; }
        .rejected { border-left: 4px solid #f44336; }
        .actions { margin-top: 15px; }
        .btn { padding: 8px 16px; margin-right: 10px; border: none; border-radius: 4px; cursor: pointer; }
        .approve { background: #4caf50; color: white; }
        .reject { background: #f44336; color: white; }
    </style>
</head>
<body>
    <h1>FlexBreak Verification Requests</h1>
    
    <div id="requests-container">
        <!-- Requests loaded here via JavaScript -->
    </div>

    <script>
        // Load and display verification requests
        async function loadRequests() {
            const response = await fetch('/api/admin/verification-requests?status=pending');
            const requests = await response.json();
            
            const container = document.getElementById('requests-container');
            container.innerHTML = requests.map(req => `
                <div class="request-card pending">
                    <h3>${req.userType.toUpperCase()} - ${req.email}</h3>
                    <p><strong>Details:</strong> ${req.details}</p>
                    <p><strong>Submitted:</strong> ${new Date(req.submittedAt).toLocaleString()}</p>
                    
                    <div class="actions">
                        <button class="btn approve" onclick="approveRequest('${req.id}')">
                            ✅ Approve
                        </button>
                        <button class="btn reject" onclick="rejectRequest('${req.id}')">
                            ❌ Reject
                        </button>
                    </div>
                </div>
            `).join('');
        }

        async function approveRequest(requestId) {
            const code = `VERIFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            
            const response = await fetch(`/api/admin/verification-requests/${requestId}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    verificationCode: code,
                    adminNotes: 'Approved by admin'
                })
            });
            
            if (response.ok) {
                alert(`Approved! Code generated: ${code}\n\nEmail this code to the user.`);
                loadRequests(); // Refresh list
            }
        }

        async function rejectRequest(requestId) {
            const reason = prompt('Rejection reason (optional):');
            
            const response = await fetch(`/api/admin/verification-requests/${requestId}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject',
                    adminNotes: reason || 'Does not meet verification criteria'
                })
            });
            
            if (response.ok) {
                alert('Request rejected.');
                loadRequests(); // Refresh list
            }
        }

        // Load requests on page load
        loadRequests();
        
        // Auto-refresh every 30 seconds
        setInterval(loadRequests, 30000);
    </script>
</body>
</html>
```

## 🔧 Implementation Steps

### Step 1: Database Setup
Add a table to your website database:
```sql
CREATE TABLE verification_requests (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_type ENUM('student', 'office') NOT NULL,
    details TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    verification_code VARCHAR(255),
    admin_notes TEXT,
    processed_at TIMESTAMP NULL,
    code_used BOOLEAN DEFAULT FALSE
);
```

### Step 2: Email Integration
Choose one of the email options above and implement it.

### Step 3: API Endpoints
Add the 4 API endpoints to your website backend.

### Step 4: Admin Dashboard
Create the HTML page above and add it to your website.

### Step 5: Mobile App Integration
Update the mobile app to use the new WebAdminIntegration service.

## 🎯 Your Workflow

1. **User needs verification** → Gets message to email you
2. **Email arrives** → Appears in your admin dashboard
3. **You review** (30 seconds) → Click "Approve" or "Reject"
4. **Code generated** → Copy code and email it to user
5. **User enters code** → Gets instant discount access
6. **Code becomes invalid** → Prevents reuse

## 💡 Advanced Features (Optional)

- **Auto-email codes:** Automatically email approved codes to users
- **Email templates:** Pre-written approval/rejection emails
- **Bulk actions:** Approve multiple requests at once
- **Analytics:** Track approval rates, common rejection reasons
- **Mobile notifications:** Get notified on your phone when new requests arrive

## 🔒 Security Notes

- Use HTTPS for all API calls
- Generate secure API keys
- Rate limit the API endpoints
- Store codes with expiration dates
- Log all admin actions for audit trail

This system will reduce your manual work to ~30 seconds per verification request!