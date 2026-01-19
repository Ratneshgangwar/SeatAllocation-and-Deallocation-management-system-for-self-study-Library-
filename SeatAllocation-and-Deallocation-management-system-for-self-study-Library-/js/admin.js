// Admin Dashboard JavaScript with Firebase Integration

// Global variables
let currentAdmin = null;
let bookings = [];
let users = [];
let payments = [];
let realTimeListeners = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check admin authentication
    checkAdminAuth();
    
    // Initialize admin dashboard
    initializeAdminDashboard();
    
    // Set up event listeners
    setupEventListeners();
});

// Check if user is authenticated and is admin
async function checkAdminAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection(firebaseCollections.USERS).doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.role === 'admin') {
                        currentAdmin = {
                            uid: user.uid,
                            email: user.email,
                            name: userData.name,
                            role: userData.role
                        };
                        
                        // Store admin data in localStorage
                        localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin));
                        
                        // Update UI with admin info
                        updateAdminUI();
                        
                        // Load dashboard data
                        loadDashboardData();
                    } else {
                        // Redirect to student dashboard if not admin
                        window.location.href = 'student-dashboard.html';
                    }
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                window.location.href = 'login.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Initialize admin dashboard
function initializeAdminDashboard() {
    // Set current date
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Set up real-time listeners
    setupRealtimeListeners();
}

// Update admin UI with user information
function updateAdminUI() {
    const userAvatar = document.querySelector('.user-avatar');
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    
    if (userAvatar) {
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentAdmin.name)}&background=e74c3c&color=fff`;
    }
    
    if (userName) {
        userName.textContent = currentAdmin.name;
    }
    
    if (userRole) {
        userRole.textContent = 'Administrator';
    }
}

// Set up real-time Firestore listeners
function setupRealtimeListeners() {
    // Listen for bookings
    const bookingsListener = db.collection(firebaseCollections.BOOKINGS)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            bookings = [];
            snapshot.forEach(doc => {
                bookings.push({ id: doc.id, ...doc.data() });
            });
            updateRecentBookings();
            updateStats();
        }, (error) => {
            console.error('Error listening to bookings:', error);
        });
    
    realTimeListeners.push(bookingsListener);
    
    // Listen for users
    const usersListener = db.collection(firebaseCollections.USERS)
        .where('role', '==', 'student')
        .onSnapshot((snapshot) => {
            users = [];
            snapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            updateStats();
        }, (error) => {
            console.error('Error listening to users:', error);
        });
    
    realTimeListeners.push(usersListener);
    
    // Listen for payments
    const paymentsListener = db.collection(firebaseCollections.PAYMENTS)
        .orderBy('paymentDate', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            payments = [];
            snapshot.forEach(doc => {
                payments.push({ id: doc.id, ...doc.data() });
            });
            updateStats();
            updateRecentPayments();
        }, (error) => {
            console.error('Error listening to payments:', error);
        });
    
    realTimeListeners.push(paymentsListener);
}

// Set up event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Notification bell
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', showNotifications);
    }
    
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Date filter
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', filterBookingsByDate);
    }
    
    // Export buttons
    const exportBookingsBtn = document.getElementById('exportBookings');
    const exportUsersBtn = document.getElementById('exportUsers');
    const exportPaymentsBtn = document.getElementById('exportPayments');
    
    if (exportBookingsBtn) exportBookingsBtn.addEventListener('click', exportBookings);
    if (exportUsersBtn) exportUsersBtn.addEventListener('click', exportUsers);
    if (exportPaymentsBtn) exportPaymentsBtn.addEventListener('click', exportPayments);
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Refresh data
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load additional data that's not covered by real-time listeners
        await loadTodayBookings();
        await loadRevenueData();
        updateStats();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Update statistics cards
function updateStats() {
    // Total Students
    const totalStudents = users.length;
    document.getElementById('totalStudents').textContent = totalStudents.toLocaleString();
    
    // Total Bookings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBookings = bookings.filter(booking => 
        booking.createdAt && booking.createdAt.toDate() > thirtyDaysAgo
    );
    document.getElementById('totalBookings').textContent = recentBookings.length.toLocaleString();
    
    // Revenue (last 30 days)
    const recentPayments = payments.filter(payment => {
        const paymentDate = payment.paymentDate?.toDate();
        return paymentDate && paymentDate > thirtyDaysAgo && payment.status === 'completed';
    });
    const totalRevenue = recentPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
    
    // Seat Occupancy (today)
    const today = new Date().toDateString();
    const todayBookings = bookings.filter(booking => {
        const bookingDate = booking.bookingDate?.toDate();
        return bookingDate && bookingDate.toDateString() === today && booking.status === 'confirmed';
    });
    const occupancyRate = Math.round((todayBookings.length / 170) * 100);
    document.getElementById('seatOccupancy').textContent = `${occupancyRate}%`;
    
    // Update occupancy bar
    const occupancyBar = document.querySelector('.occupancy-bar-fill');
    if (occupancyBar) {
        occupancyBar.style.width = `${occupancyRate}%`;
        occupancyBar.style.background = occupancyRate >= 80 ? '#e74c3c' : 
                                       occupancyRate >= 60 ? '#f39c12' : '#27ae60';
    }
}

// Update recent bookings table
function updateRecentBookings() {
    const tbody = document.getElementById('recentBookingsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const recentBookings = bookings.slice(0, 10);
    
    recentBookings.forEach(booking => {
        const row = document.createElement('tr');
        
        const bookingDate = booking.bookingDate?.toDate();
        const formattedDate = bookingDate ? bookingDate.toLocaleDateString() : 'N/A';
        const formattedTime = booking.timeSlot || 'N/A';
        
        row.innerHTML = `
            <td>${booking.userName || 'N/A'}</td>
            <td>${booking.userPhone || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td>₹${booking.amount || 0}</td>
            <td><span class="status-badge status-${booking.status || 'pending'}">${booking.status || 'pending'}</span></td>
            <td>
                <button class="btn-action btn-view" onclick="viewBooking('${booking.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                ${booking.status === 'pending' ? `
                    <button class="btn-action btn-confirm" onclick="confirmBooking('${booking.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-action btn-cancel" onclick="cancelBooking('${booking.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update recent payments table
function updateRecentPayments() {
    const tbody = document.getElementById('recentPaymentsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const recentPayments = payments.slice(0, 10);
    
    recentPayments.forEach(payment => {
        const row = document.createElement('tr');
        
        const paymentDate = payment.paymentDate?.toDate();
        const formattedDate = paymentDate ? paymentDate.toLocaleDateString() : 'N/A';
        
        row.innerHTML = `
            <td>${payment.userName || 'N/A'}</td>
            <td>${payment.bookingId || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td>₹${payment.amount || 0}</td>
            <td>${payment.paymentMethod || 'N/A'}</td>
            <td><span class="status-badge status-${payment.status || 'pending'}">${payment.status || 'pending'}</span></td>
            <td>${payment.transactionId || 'N/A'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Load today's bookings
async function loadTodayBookings() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayBookings = await db.collection(firebaseCollections.BOOKINGS)
            .where('bookingDate', '>=', today)
            .where('status', '==', 'confirmed')
            .get();
        
        const bookingsCount = todayBookings.size;
        document.getElementById('todayBookings').textContent = bookingsCount;
        
    } catch (error) {
        console.error('Error loading today bookings:', error);
    }
}

// Load revenue data for chart
async function loadRevenueData() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const revenueData = await db.collection(firebaseCollections.PAYMENTS)
            .where('paymentDate', '>=', thirtyDaysAgo)
            .where('status', '==', 'completed')
            .get();
        
        // Group by date and calculate daily revenue
        const dailyRevenue = {};
        revenueData.forEach(doc => {
            const payment = doc.data();
            const date = payment.paymentDate.toDate().toDateString();
            dailyRevenue[date] = (dailyRevenue[date] || 0) + (payment.amount || 0);
        });
        
        updateRevenueChart(dailyRevenue);
        
    } catch (error) {
        console.error('Error loading revenue data:', error);
    }
}

// Update revenue chart
function updateRevenueChart(dailyRevenue) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    const dates = Object.keys(dailyRevenue).sort();
    const revenues = dates.map(date => dailyRevenue[date]);
    
    // Simple chart implementation (in real app, use Chart.js or similar)
    const chartContainer = document.getElementById('revenueChart');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div class="chart-placeholder">
                <p>Revenue Trend (Last 30 Days)</p>
                <div class="chart-bars">
                    ${revenues.map(revenue => `
                        <div class="chart-bar" style="height: ${(revenue / Math.max(...revenues)) * 100}%">
                            <span>₹${revenue}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="chart-labels">
                    ${dates.map(date => `<span>${new Date(date).getDate()}</span>`).join('')}
                </div>
            </div>
        `;
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate selected tab button
    const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Load tab-specific data
    switch(tabName) {
        case 'bookings':
            loadBookingsTab();
            break;
        case 'users':
            loadUsersTab();
            break;
        case 'payments':
            loadPaymentsTab();
            break;
        case 'reports':
            loadReportsTab();
            break;
    }
}

// Load bookings tab data
async function loadBookingsTab() {
    try {
        const allBookings = await db.collection(firebaseCollections.BOOKINGS)
            .orderBy('createdAt', 'desc')
            .get();
        
        const bookingsList = document.getElementById('allBookingsList');
        if (bookingsList) {
            bookingsList.innerHTML = '';
            
            allBookings.forEach(doc => {
                const booking = doc.data();
                const bookingDate = booking.bookingDate?.toDate();
                const formattedDate = bookingDate ? bookingDate.toLocaleDateString() : 'N/A';
                
                const bookingElement = document.createElement('div');
                bookingElement.className = 'booking-item';
                bookingElement.innerHTML = `
                    <div class="booking-info">
                        <h4>${booking.userName || 'N/A'}</h4>
                        <p>${formattedDate} • ${booking.timeSlot || 'N/A'}</p>
                        <span class="status-badge status-${booking.status || 'pending'}">${booking.status || 'pending'}</span>
                    </div>
                    <div class="booking-actions">
                        <button class="btn-action btn-view" onclick="viewBooking('${doc.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${booking.status === 'pending' ? `
                            <button class="btn-action btn-confirm" onclick="confirmBooking('${doc.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="btn-action btn-delete" onclick="deleteBooking('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                bookingsList.appendChild(bookingElement);
            });
        }
    } catch (error) {
        console.error('Error loading bookings tab:', error);
        showNotification('Error loading bookings', 'error');
    }
}

// Load users tab data
async function loadUsersTab() {
    try {
        const allUsers = await db.collection(firebaseCollections.USERS)
            .where('role', '==', 'student')
            .orderBy('createdAt', 'desc')
            .get();
        
        const usersList = document.getElementById('allUsersList');
        if (usersList) {
            usersList.innerHTML = '';
            
            allUsers.forEach(doc => {
                const user = doc.data();
                const joinDate = user.createdAt?.toDate();
                const formattedDate = joinDate ? joinDate.toLocaleDateString() : 'N/A';
                
                const userElement = document.createElement('div');
                userElement.className = 'user-item';
                userElement.innerHTML = `
                    <div class="user-avatar">
                        <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3498db&color=fff`}" alt="${user.name}">
                    </div>
                    <div class="user-info">
                        <h4>${user.name}</h4>
                        <p>${user.email}</p>
                        <span>${user.phone} • ${user.educationLevel} • Joined ${formattedDate}</span>
                    </div>
                    <div class="user-actions">
                        <button class="btn-action btn-view" onclick="viewUser('${doc.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="editUser('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteUser('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                usersList.appendChild(userElement);
            });
        }
    } catch (error) {
        console.error('Error loading users tab:', error);
        showNotification('Error loading users', 'error');
    }
}

// Load payments tab data
async function loadPaymentsTab() {
    try {
        const allPayments = await db.collection(firebaseCollections.PAYMENTS)
            .orderBy('paymentDate', 'desc')
            .get();
        
        const paymentsList = document.getElementById('allPaymentsList');
        if (paymentsList) {
            paymentsList.innerHTML = '';
            
            allPayments.forEach(doc => {
                const payment = doc.data();
                const paymentDate = payment.paymentDate?.toDate();
                const formattedDate = paymentDate ? paymentDate.toLocaleDateString() : 'N/A';
                
                const paymentElement = document.createElement('div');
                paymentElement.className = 'payment-item';
                paymentElement.innerHTML = `
                    <div class="payment-info">
                        <h4>${payment.userName || 'N/A'}</h4>
                        <p>Booking: ${payment.bookingId || 'N/A'} • ${formattedDate}</p>
                        <span class="amount">₹${payment.amount || 0}</span>
                        <span class="status-badge status-${payment.status || 'pending'}">${payment.status || 'pending'}</span>
                    </div>
                    <div class="payment-details">
                        <span>${payment.paymentMethod || 'N/A'}</span>
                        <span>${payment.transactionId || 'N/A'}</span>
                    </div>
                `;
                
                paymentsList.appendChild(paymentElement);
            });
        }
    } catch (error) {
        console.error('Error loading payments tab:', error);
        showNotification('Error loading payments', 'error');
    }
}

// Load reports tab
async function loadReportsTab() {
    // This would generate various reports
    await generateDailyReport();
    await generateMonthlyReport();
}

// Generate daily report
async function generateDailyReport() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
        const dailyBookings = await db.collection(firebaseCollections.BOOKINGS)
            .where('bookingDate', '>=', today)
            .get();
        
        const dailyPayments = await db.collection(firebaseCollections.PAYMENTS)
            .where('paymentDate', '>=', today)
            .where('status', '==', 'completed')
            .get();
        
        const totalRevenue = dailyPayments.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        
        document.getElementById('dailyBookings').textContent = dailyBookings.size;
        document.getElementById('dailyRevenue').textContent = `₹${totalRevenue}`;
        
    } catch (error) {
        console.error('Error generating daily report:', error);
    }
}

// Generate monthly report
async function generateMonthlyReport() {
    const firstDay = new Date();
    firstDay.setDate(1);
    firstDay.setHours(0, 0, 0, 0);
    
    try {
        const monthlyBookings = await db.collection(firebaseCollections.BOOKINGS)
            .where('bookingDate', '>=', firstDay)
            .get();
        
        const monthlyPayments = await db.collection(firebaseCollections.PAYMENTS)
            .where('paymentDate', '>=', firstDay)
            .where('status', '==', 'completed')
            .get();
        
        const totalRevenue = monthlyPayments.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        
        document.getElementById('monthlyBookings').textContent = monthlyBookings.size;
        document.getElementById('monthlyRevenue').textContent = `₹${totalRevenue}`;
        
    } catch (error) {
        console.error('Error generating monthly report:', error);
    }
}

// Booking management functions
async function confirmBooking(bookingId) {
    if (!confirm('Are you sure you want to confirm this booking?')) return;
    
    try {
        await db.collection(firebaseCollections.BOOKINGS).doc(bookingId).update({
            status: 'confirmed',
            confirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
            confirmedBy: currentAdmin.uid
        });
        
        showNotification('Booking confirmed successfully', 'success');
    } catch (error) {
        console.error('Error confirming booking:', error);
        showNotification('Error confirming booking', 'error');
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
        await db.collection(firebaseCollections.BOOKINGS).doc(bookingId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
            cancelledBy: currentAdmin.uid
        });
        
        showNotification('Booking cancelled successfully', 'success');
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showNotification('Error cancelling booking', 'error');
    }
}

async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return;
    
    try {
        await db.collection(firebaseCollections.BOOKINGS).doc(bookingId).delete();
        showNotification('Booking deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting booking:', error);
        showNotification('Error deleting booking', 'error');
    }
}

// User management functions
async function viewUser(userId) {
    try {
        const userDoc = await db.collection(firebaseCollections.USERS).doc(userId).get();
        if (userDoc.exists) {
            const user = userDoc.data();
            // Show user details in modal
            showUserModal(user);
        }
    } catch (error) {
        console.error('Error viewing user:', error);
        showNotification('Error loading user details', 'error');
    }
}

async function editUser(userId) {
    // Implementation for editing user
    showNotification('Edit user functionality coming soon', 'warning');
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their bookings and cannot be undone.')) return;
    
    try {
        // Delete user's bookings first
        const userBookings = await db.collection(firebaseCollections.BOOKINGS)
            .where('userId', '==', userId)
            .get();
        
        const deletePromises = userBookings.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        
        // Delete user
        await db.collection(firebaseCollections.USERS).doc(userId).delete();
        
        showNotification('User deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

// View booking details
async function viewBooking(bookingId) {
    try {
        const bookingDoc = await db.collection(firebaseCollections.BOOKINGS).doc(bookingId).get();
        if (bookingDoc.exists) {
            const booking = bookingDoc.data();
            // Show booking details in modal
            showBookingModal(booking);
        }
    } catch (error) {
        console.error('Error viewing booking:', error);
        showNotification('Error loading booking details', 'error');
    }
}

// Filter bookings by date
function filterBookingsByDate() {
    const filterValue = document.getElementById('dateFilter').value;
    // Implementation for filtering bookings by date
    showNotification(`Filtering by: ${filterValue}`, 'info');
}

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    // Implementation for searching across different data
}

// Refresh data
function refreshData() {
    loadDashboardData();
    showNotification('Data refreshed successfully', 'success');
}

// Export functions
async function exportBookings() {
    try {
        const allBookings = await db.collection(firebaseCollections.BOOKINGS).get();
        const csvData = convertToCSV(allBookings.docs.map(doc => doc.data()));
        downloadCSV(csvData, 'bookings_export.csv');
        showNotification('Bookings exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting bookings:', error);
        showNotification('Error exporting bookings', 'error');
    }
}

async function exportUsers() {
    try {
        const allUsers = await db.collection(firebaseCollections.USERS)
            .where('role', '==', 'student')
            .get();
        const csvData = convertToCSV(allUsers.docs.map(doc => doc.data()));
        downloadCSV(csvData, 'users_export.csv');
        showNotification('Users exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting users:', error);
        showNotification('Error exporting users', 'error');
    }
}

async function exportPayments() {
    try {
        const allPayments = await db.collection(firebaseCollections.PAYMENTS).get();
        const csvData = convertToCSV(allPayments.docs.map(doc => doc.data()));
        downloadCSV(csvData, 'payments_export.csv');
        showNotification('Payments exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting payments:', error);
        showNotification('Error exporting payments', 'error');
    }
}

// Utility functions for export
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            if (value instanceof Date) {
                return value.toISOString();
            }
            return `"${String(value || '').replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

function downloadCSV(csvData, filename) {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Show notifications
function showNotifications() {
    // Implementation for showing notifications modal
    showNotification('Notifications feature coming soon', 'warning');
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Unsubscribe from real-time listeners
        realTimeListeners.forEach(unsubscribe => unsubscribe());
        
        // Clear localStorage
        localStorage.removeItem('currentAdmin');
        
        // Sign out from Firebase
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
            window.location.href = 'login.html';
        });
    }
}

// Modal functions
function showUserModal(user) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>User Details</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="user-detail">
                    <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3498db&color=fff`}" alt="${user.name}" class="user-detail-photo">
                    <div class="user-detail-info">
                        <h4>${user.name}</h4>
                        <p>${user.email}</p>
                        <p>${user.phone}</p>
                    </div>
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Father's Name:</label>
                        <span>${user.fatherName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Mother's Name:</label>
                        <span>${user.motherName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Aadhaar Number:</label>
                        <span>${user.aadhaarNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>College/School:</label>
                        <span>${user.college || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Education Level:</label>
                        <span>${user.educationLevel || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Course/Class:</label>
                        <span>${user.courseClass || 'N/A'}</span>
                    </div>
                </div>
                <div class="detail-item full-width">
                    <label>Address:</label>
                    <span>${user.address || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showBookingModal(booking) {
    const bookingDate = booking.bookingDate?.toDate();
    const formattedDate = bookingDate ? bookingDate.toLocaleDateString() : 'N/A';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Booking Details</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>User Name:</label>
                        <span>${booking.userName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${booking.userPhone || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Booking Date:</label>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="detail-item">
                        <label>Time Slot:</label>
                        <span>${booking.timeSlot || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Amount:</label>
                        <span>₹${booking.amount || 0}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge status-${booking.status || 'pending'}">${booking.status || 'pending'}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>Special Requests:</label>
                        <span>${booking.specialRequests || 'None'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Notification system
function showNotification(message, type = 'success') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('adminNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'adminNotification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.innerHTML = `
        <div class="notification-content notification-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    realTimeListeners.forEach(unsubscribe => unsubscribe());
});