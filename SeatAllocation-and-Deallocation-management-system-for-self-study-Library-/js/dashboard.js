// dashboard.js - Student Dashboard JavaScript (Updated)

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded successfully');
    
    // Initialize dashboard
    initializeDashboard();
    
    // Load user data
    loadUserData();
    
    // Load dashboard stats
    loadDashboardStats();
    
    // Load upcoming bookings
    loadUpcomingBookings();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup sidebar navigation
    setupSidebarNavigation();
});

function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update user info in the header
    updateUserInfo(currentUser);
}

function setupSidebarNavigation() {
    console.log('Setting up sidebar navigation...');
    
    // Booking History link
    const bookingHistoryLink = document.querySelector('a[href="booking-history.html"]');
    if (bookingHistoryLink) {
        bookingHistoryLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Agar booking-history.html file nahi hai toh temporary message show karo
            if (!checkPageExists('booking-history.html')) {
                showNotification('Booking History page is under development', 'info');
                // Yahan aap temporary content show kar sakte hain
                showTemporaryBookingHistory();
            } else {
                window.location.href = 'booking-history.html';
            }
        });
    }
    
    // Profile link
    const profileLink = document.querySelector('a[href="profile.html"]');
    if (profileLink) {
        profileLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (!checkPageExists('profile.html')) {
                showNotification('Profile page is under development', 'info');
                showTemporaryProfile();
            } else {
                window.location.href = 'profile.html';
            }
        });
    }
    
    // Payments link
    const paymentsLink = document.querySelector('a[href="payments.html"]');
    if (paymentsLink) {
        paymentsLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (!checkPageExists('payments.html')) {
                showNotification('Payments page is under development', 'info');
                showTemporaryPayments();
            } else {
                window.location.href = 'payments.html';
            }
        });
    }
    
    // Settings link
    const settingsLink = document.querySelector('a[href="#"]');
    if (settingsLink && settingsLink.querySelector('i.fa-cog')) {
        settingsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Settings page is under development', 'info');
            showTemporarySettings();
        });
    }
    
    // Logout button
    const logoutBtn = document.querySelector('#logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUser();
        });
    }
}

function checkPageExists(pageUrl) {
    // Simple check - agar page exist karta hai toh true return karo
    // Isko aap server-side check se replace kar sakte hain
    return false; // Temporary: saare pages under development hain
}

function showTemporaryBookingHistory() {
    // Temporary booking history content show karo
    const mainContent = document.querySelector('.dashboard-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="temporary-page">
            <div class="page-header">
                <h2>Booking History</h2>
                <p>View your past bookings and reservations</p>
            </div>
            <div class="content-card">
                <div class="card-header">
                    <h3>Your Booking History</h3>
                    <div class="card-actions">
                        <button class="btn-export" onclick="exportBookingHistory()">
                            <i class="fas fa-download"></i>
                            Export
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="no-bookings-message">
                        <i class="fas fa-history" style="font-size: 64px; color: #bdc3c7; margin-bottom: 20px;"></i>
                        <h4>No booking history available</h4>
                        <p>Your past bookings will appear here once you start using the library.</p>
                        <a href="booking.html" class="btn btn-primary" style="margin-top: 20px;">
                            <i class="fas fa-calendar-plus"></i>
                            Book Your First Seat
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Active sidebar item update karo
    updateActiveSidebarItem('booking-history');
}

function showTemporaryProfile() {
    const mainContent = document.querySelector('.dashboard-content');
    if (!mainContent) return;
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    
    mainContent.innerHTML = `
        <div class="temporary-page">
            <div class="page-header">
                <h2>My Profile</h2>
                <p>Manage your account information and preferences</p>
            </div>
            
            <div class="profile-container">
                <div class="profile-card">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <img src="${currentUser.photoURL || 'https://ui-avatars.com/api/?name=Student+User&background=3498db&color=fff'}" alt="Profile">
                            <button class="btn-edit-avatar">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                        <div class="profile-info">
                            <h3>${currentUser.name || 'Student User'}</h3>
                            <p>${currentUser.email || 'student@example.com'}</p>
                            <span class="user-badge">Student Member</span>
                        </div>
                    </div>
                    
                    <div class="profile-details">
                        <div class="detail-section">
                            <h4>Personal Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Full Name</label>
                                    <span>${currentUser.name || 'Not set'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Phone Number</label>
                                    <span>${currentUser.phone || 'Not set'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Email Address</label>
                                    <span>${currentUser.email || 'Not set'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Member Since</label>
                                    <span>${new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Education Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>College/School</label>
                                    <span>${currentUser.college || 'Not set'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Education Level</label>
                                    <span>${currentUser.educationLevel || 'Not set'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Course/Class</label>
                                    <span>${currentUser.courseClass || 'Not set'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <button class="btn btn-primary" onclick="editProfile()">
                            <i class="fas fa-edit"></i>
                            Edit Profile
                        </button>
                        <button class="btn btn-secondary" onclick="changePassword()">
                            <i class="fas fa-lock"></i>
                            Change Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    updateActiveSidebarItem('profile');
}

function showTemporaryPayments() {
    const mainContent = document.querySelector('.dashboard-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="temporary-page">
            <div class="page-header">
                <h2>Payments</h2>
                <p>Manage your payments and wallet</p>
            </div>
            
            <div class="payments-container">
                <div class="wallet-card">
                    <div class="wallet-header">
                        <h3>Wallet Balance</h3>
                        <div class="wallet-amount">
                            <span class="amount">₹0</span>
                            <span class="wallet-status">No funds added yet</span>
                        </div>
                    </div>
                    <div class="wallet-actions">
                        <button class="btn btn-success" onclick="addFunds()">
                            <i class="fas fa-plus"></i>
                            Add Funds
                        </button>
                        <button class="btn btn-secondary" onclick="viewTransactionHistory()">
                            <i class="fas fa-history"></i>
                            Transaction History
                        </button>
                    </div>
                </div>
                
                <div class="content-card">
                    <div class="card-header">
                        <h3>Recent Transactions</h3>
                    </div>
                    <div class="card-content">
                        <div class="no-transactions-message">
                            <i class="fas fa-receipt" style="font-size: 48px; color: #bdc3c7; margin-bottom: 15px;"></i>
                            <h4>No transactions yet</h4>
                            <p>Your payment history will appear here once you start making payments.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    updateActiveSidebarItem('payments');
}

function showTemporarySettings() {
    const mainContent = document.querySelector('.dashboard-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="temporary-page">
            <div class="page-header">
                <h2>Settings</h2>
                <p>Configure your account settings and preferences</p>
            </div>
            
            <div class="settings-container">
                <div class="content-card">
                    <div class="card-header">
                        <h3>Account Settings</h3>
                    </div>
                    <div class="card-content">
                        <div class="settings-list">
                            <div class="setting-item">
                                <div class="setting-info">
                                    <h4>Notifications</h4>
                                    <p>Manage email and push notifications</p>
                                </div>
                                <div class="setting-action">
                                    <label class="switch">
                                        <input type="checkbox" checked>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-info">
                                    <h4>Privacy Settings</h4>
                                    <p>Control your privacy preferences</p>
                                </div>
                                <div class="setting-action">
                                    <button class="btn btn-outline" onclick="managePrivacy()">
                                        Manage
                                    </button>
                                </div>
                            </div>
                            
                            <div class="setting-item">
                                <div class="setting-info">
                                    <h4>Language</h4>
                                    <p>Select your preferred language</p>
                                </div>
                                <div class="setting-action">
                                    <select class="form-control">
                                        <option>English</option>
                                        <option>Hindi</option>
                                        <option>Marathi</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="content-card">
                    <div class="card-header">
                        <h3>Danger Zone</h3>
                    </div>
                    <div class="card-content">
                        <div class="danger-actions">
                            <button class="btn btn-danger" onclick="deleteAccount()">
                                <i class="fas fa-trash"></i>
                                Delete Account
                            </button>
                            <p class="danger-note">Once you delete your account, there is no going back. Please be certain.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    updateActiveSidebarItem('settings');
}

function updateActiveSidebarItem(activeItem) {
    // Sabhi sidebar items se active class hatao
    const sidebarItems = document.querySelectorAll('.sidebar-menu li');
    sidebarItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Active item ko set karo
    let activeElement;
    switch(activeItem) {
        case 'dashboard':
            activeElement = document.querySelector('a[href="student-dashboard.html"]').parentElement;
            break;
        case 'booking':
            activeElement = document.querySelector('a[href="booking.html"]').parentElement;
            break;
        case 'booking-history':
            activeElement = document.querySelector('a[href="booking-history.html"]').parentElement;
            break;
        case 'profile':
            activeElement = document.querySelector('a[href="profile.html"]').parentElement;
            break;
        case 'payments':
            activeElement = document.querySelector('a[href="payments.html"]').parentElement;
            break;
        case 'settings':
            activeElement = document.querySelector('a[href="#"]').parentElement;
            break;
    }
    
    if (activeElement) {
        activeElement.classList.add('active');
    }
}

// Temporary function implementations
function exportBookingHistory() {
    showNotification('Export feature will be available soon', 'info');
}

function editProfile() {
    showNotification('Profile editing will be available soon', 'info');
}

function changePassword() {
    showNotification('Password change feature will be available soon', 'info');
}

function addFunds() {
    showNotification('Add funds feature will be available soon', 'info');
}

function viewTransactionHistory() {
    showNotification('Transaction history will be available soon', 'info');
}

function managePrivacy() {
    showNotification('Privacy settings will be available soon', 'info');
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        showNotification('Account deletion feature will be available soon', 'warning');
    }
}

// Rest of your existing functions remain the same...
function updateUserInfo(user) {
    const userNameElement = document.querySelector('.user-name');
    const userAvatarElement = document.querySelector('.user-avatar img');
    
    if (userNameElement && user.name) {
        userNameElement.textContent = user.name;
    }
    
    if (userAvatarElement && user.photoURL) {
        userAvatarElement.src = user.photoURL;
    }
}

// ... (baaki ke existing functions yahi rahenge)