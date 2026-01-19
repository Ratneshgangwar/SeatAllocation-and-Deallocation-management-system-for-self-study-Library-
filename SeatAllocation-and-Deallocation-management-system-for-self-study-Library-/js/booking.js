// Booking Page JavaScript with Firebase Integration

// Global variables
let currentUser = null;
let selectedDate = null;
let selectedTimeSlot = null;
let selectedSeat = null;
let currentStep = 1;
let timeSlots = {};
let seatTypes = {};

document.addEventListener('DOMContentLoaded', function() {
    // Check user authentication
    checkUserAuth();
    
    // Initialize booking page
    initializeBookingPage();
    
    // Set up event listeners
    setupEventListeners();
});

// Check if user is authenticated
async function checkUserAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection(firebaseCollections.USERS).doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    currentUser = {
                        uid: user.uid,
                        email: user.email,
                        name: userData.name,
                        phone: userData.phone,
                        photoURL: userData.photoURL,
                        walletBalance: userData.walletBalance || 0
                    };
                    
                    // Update UI with user info
                    updateUserUI();
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                window.location.href = 'login.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Initialize booking page
async function initializeBookingPage() {
    // Set current date
    const today = new Date();
    document.getElementById('currentDate').textContent = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Set minimum date to today
    const dateInput = document.getElementById('bookingDate');
    const todayFormatted = today.toISOString().split('T')[0];
    dateInput.min = todayFormatted;
    dateInput.value = todayFormatted;
    selectedDate = todayFormatted;
    
    // Load time slots from Firebase
    await loadTimeSlotsFromFirebase();
    
    // Generate seats layout
    await generateSeatsLayout();
    
    // Load wallet balance
    loadWalletBalance();
}

// Load time slots from Firebase
async function loadTimeSlotsFromFirebase() {
    try {
        const timeSlotsSnapshot = await db.collection(firebaseCollections.TIME_SLOTS)
            .where('isActive', '==', true)
            .get();
        
        timeSlots = {};
        timeSlotsSnapshot.forEach(doc => {
            timeSlots[doc.id] = doc.data();
        });
        
        // Load time slots UI
        loadTimeSlotsUI();
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        showNotification('Error loading time slots', 'error');
    }
}

// Load time slots UI
function loadTimeSlotsUI() {
    const timeSlotsGrid = document.getElementById('timeSlotsGrid');
    timeSlotsGrid.innerHTML = '';
    
    Object.entries(timeSlots).forEach(([key, slot]) => {
        const slotCard = document.createElement('div');
        slotCard.className = 'time-slot-card';
        slotCard.dataset.slot = key;
        
        slotCard.innerHTML = `
            <div class="time-slot-time">${slot.time}</div>
            <div class="time-slot-name">${slot.name}</div>
            <div class="time-slot-price">₹${slot.price}</div>
            <ul class="time-slot-features">
                ${slot.features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}
            </ul>
        `;
        
        slotCard.addEventListener('click', () => handleTimeSlotSelect(key, slotCard));
        timeSlotsGrid.appendChild(slotCard);
    });
}

// Update UI with user information
function updateUserUI() {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (userAvatar) {
        userAvatar.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3498db&color=fff`;
    }
    
    if (userName) {
        userName.textContent = currentUser.name;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Date selection
    const dateInput = document.getElementById('bookingDate');
    dateInput.addEventListener('change', handleDateChange);
    
    // Step navigation
    document.getElementById('nextToStep2').addEventListener('click', goToStep2);
    document.getElementById('prevToStep1').addEventListener('click', goToStep1);
    document.getElementById('nextToStep3').addEventListener('click', goToStep3);
    document.getElementById('prevToStep2').addEventListener('click', goToStep2);
    
    // Payment method selection
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', handlePaymentMethodSelect);
    });
    
    // Payment buttons
    document.getElementById('payWithUPI').addEventListener('click', handleUPIPayment);
    document.getElementById('payWithCard').addEventListener('click', handleCardPayment);
    document.getElementById('payWithWallet').addEventListener('click', handleWalletPayment);
    document.getElementById('confirmBooking').addEventListener('click', handleBookingConfirmation);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Handle date change
function handleDateChange(e) {
    selectedDate = e.target.value;
    checkStep1Completion();
    
    // Update available seats for selected date
    updateSeatsAvailability();
}

// Handle time slot selection
function handleTimeSlotSelect(slotKey, slotCard) {
    // Remove selected class from all slots
    document.querySelectorAll('.time-slot-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked slot
    slotCard.classList.add('selected');
    selectedTimeSlot = slotKey;
    
    checkStep1Completion();
}

// Check if step 1 is completed
function checkStep1Completion() {
    const nextButton = document.getElementById('nextToStep2');
    nextButton.disabled = !(selectedDate && selectedTimeSlot);
}

// Go to step 2
function goToStep2() {
    if (selectedDate && selectedTimeSlot) {
        currentStep = 2;
        updateStepDisplay();
        updateSeatsAvailability();
    }
}

// Go back to step 1
function goToStep1() {
    currentStep = 1;
    updateStepDisplay();
}

// Go to step 3
function goToStep3() {
    if (selectedSeat) {
        currentStep = 3;
        updateStepDisplay();
        updateBookingSummary();
        setupPaymentSection();
    }
}

// Go back to step 2
function goToStep2() {
    currentStep = 2;
    updateStepDisplay();
}

// Update step display
function updateStepDisplay() {
    // Update steps indicator
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        if (parseInt(step.dataset.step) === currentStep) {
            step.classList.add('active');
        }
    });
    
    // Update step content
    document.querySelectorAll('.booking-step').forEach(step => {
        step.classList.remove('active');
        if (step.id === `step${currentStep}`) {
            step.classList.add('active');
        }
    });
}

// Generate seats layout from Firebase
async function generateSeatsLayout() {
    try {
        const seatsSnapshot = await db.collection(firebaseCollections.SEATS)
            .where('isActive', '==', true)
            .orderBy('seatNumber')
            .get();
        
        const seatsGrid = document.getElementById('seatsGrid');
        seatsGrid.innerHTML = '';
        
        let availableSeats = 0;
        
        seatsSnapshot.forEach(doc => {
            const seatData = doc.data();
            const seat = document.createElement('div');
            seat.className = `seat available ${seatData.isPremium ? 'premium' : ''}`;
            seat.dataset.seatId = seatData.seatNumber;
            seat.dataset.seatType = seatData.type;
            seat.textContent = seatData.seatNumber;
            
            seat.addEventListener('click', () => handleSeatSelect(seatData.seatNumber, seat));
            seatsGrid.appendChild(seat);
            availableSeats++;
        });
        
        // Update available seats count
        updateAvailableSeatsCount(availableSeats);
        
    } catch (error) {
        console.error('Error generating seats layout:', error);
        showNotification('Error loading seats layout', 'error');
    }
}

// Update seats availability based on selected date
async function updateSeatsAvailability() {
    if (!selectedDate || !selectedTimeSlot) return;
    
    try {
        // Show loading state
        const seats = document.querySelectorAll('.seat');
        seats.forEach(seat => {
            seat.classList.add('loading');
        });
        
        // Get booked seats for selected date and time slot from Firebase
        const bookedSeats = await getBookedSeats(selectedDate, selectedTimeSlot);
        
        // Update seats status
        let availableSeats = 0;
        seats.forEach(seat => {
            const seatId = parseInt(seat.dataset.seatId);
            seat.classList.remove('loading', 'booked', 'available');
            
            if (bookedSeats.includes(seatId)) {
                seat.classList.add('booked');
            } else {
                seat.classList.add('available');
                availableSeats++;
            }
            
            // Re-enable click event for available seats
            if (!bookedSeats.includes(seatId)) {
                seat.addEventListener('click', () => handleSeatSelect(seatId, seat));
            } else {
                seat.removeEventListener('click', () => handleSeatSelect(seatId, seat));
            }
        });
        
        updateAvailableSeatsCount(availableSeats);
        
    } catch (error) {
        console.error('Error updating seats availability:', error);
        showNotification('Error loading seat availability', 'error');
    }
}

// Get booked seats from Firebase
async function getBookedSeats(date, timeSlot) {
    try {
        const bookingsSnapshot = await db.collection(firebaseCollections.BOOKINGS)
            .where('bookingDate', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', 'in', ['confirmed', 'pending'])
            .get();
        
        const bookedSeats = [];
        bookingsSnapshot.forEach(doc => {
            const booking = doc.data();
            if (booking.seatNumber) {
                bookedSeats.push(booking.seatNumber);
            }
        });
        
        return bookedSeats;
    } catch (error) {
        console.error('Error fetching booked seats:', error);
        return [];
    }
}

// Handle seat selection
function handleSeatSelect(seatId, seatElement) {
    // Deselect previously selected seat
    document.querySelectorAll('.seat.selected').forEach(seat => {
        seat.classList.remove('selected');
    });
    
    // Select new seat
    seatElement.classList.add('selected');
    selectedSeat = seatId;
    
    // Update seat info
    updateSeatInfo(seatId, seatElement.dataset.seatType);
    
    // Enable next button
    document.getElementById('nextToStep3').disabled = false;
    
    // Update selected seat info
    document.getElementById('selectedSeatInfo').textContent = `Selected: ${seatId}`;
}

// Update seat information
function updateSeatInfo(seatId, seatTypeKey) {
    // Get seat features from configuration
    const seatFeatures = {
        standard: ["Standard Chair", "Individual Table", "Charging Port", "Reading Light"],
        premium: ["Ergonomic Chair", "Large Table", "Dual Charging Ports", "Adjustable Light", "Extra Space"],
        window: ["Natural Light", "Standard Chair", "Individual Table", "Charging Port", "View"],
        corner: ["Extra Privacy", "Standard Chair", "Individual Table", "Charging Port", "Quiet Area"]
    };
    
    const seatTypeName = {
        standard: "Standard Seat",
        premium: "Premium Seat",
        window: "Window Seat",
        corner: "Corner Seat"
    };
    
    const seatInfoCard = document.getElementById('seatInfoCard');
    const noSeatSelected = seatInfoCard.querySelector('.no-seat-selected');
    const seatDetailsContent = seatInfoCard.querySelector('.seat-details-content');
    
    // Hide "no seat selected" message
    noSeatSelected.style.display = 'none';
    seatDetailsContent.style.display = 'block';
    
    // Update seat details
    document.getElementById('selectedSeatNumber').textContent = `Seat ${seatId}`;
    document.getElementById('selectedSeatType').textContent = seatTypeName[seatTypeKey] || 'Standard Seat';
    document.getElementById('seatLocation').textContent = `Row ${Math.ceil(seatId/17)}, Column ${((seatId-1)%17)+1}`;
    
    // Update features list
    const featuresList = document.getElementById('seatFeaturesList');
    featuresList.innerHTML = (seatFeatures[seatTypeKey] || seatFeatures.standard).map(feature => 
        `<li><i class="fas fa-check"></i> ${feature}</li>`
    ).join('');
}

// Update available seats count
function updateAvailableSeatsCount(count) {
    document.getElementById('availableSeatsCount').textContent = `Available: ${count}`;
}

// Update booking summary
function updateBookingSummary() {
    const selectedSlot = timeSlots[selectedTimeSlot];
    
    // Get seat type to check if it's premium
    const selectedSeatElement = document.querySelector('.seat.selected');
    const isPremiumSeat = selectedSeatElement.classList.contains('premium');
    
    document.getElementById('summaryDate').textContent = new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('summaryTimeSlot').textContent = `${selectedSlot.name} (${selectedSlot.time})`;
    document.getElementById('summarySeatNumber').textContent = selectedSeat;
    document.getElementById('summarySeatType').textContent = isPremiumSeat ? 'Premium Seat' : 'Standard Seat';
    document.getElementById('summaryDuration').textContent = selectedSlot.duration;
    
    // Calculate total amount (premium seats have 20% extra charge)
    let totalAmount = selectedSlot.price;
    if (isPremiumSeat) {
        totalAmount = Math.round(totalAmount * 1.2);
    }
    
    document.getElementById('summaryAmount').textContent = `₹${totalAmount}`;
}

// Setup payment section
function setupPaymentSection() {
    // Enable confirm button when payment method is selected
    document.getElementById('confirmBooking').disabled = false;
}

// Handle payment method selection
function handlePaymentMethodSelect(e) {
    const methodElement = e.currentTarget;
    const method = methodElement.dataset.method;
    
    // Remove selected class from all methods
    document.querySelectorAll('.payment-method').forEach(m => {
        m.classList.remove('selected');
    });
    
    // Add selected class to clicked method
    methodElement.classList.add('selected');
    
    // Show corresponding payment form
    document.querySelectorAll('.payment-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${method}Form`).classList.add('active');
}

// Load wallet balance
function loadWalletBalance() {
    if (!currentUser) return;
    
    const walletBalance = currentUser.walletBalance || 0;
    document.getElementById('walletBalance').textContent = `₹${walletBalance}`;
    
    const selectedSlot = timeSlots[selectedTimeSlot];
    let totalAmount = selectedSlot.price;
    
    // Check if selected seat is premium
    const selectedSeatElement = document.querySelector('.seat.selected');
    if (selectedSeatElement && selectedSeatElement.classList.contains('premium')) {
        totalAmount = Math.round(totalAmount * 1.2);
    }
    
    // Check if wallet has sufficient balance
    const payWithWalletBtn = document.getElementById('payWithWallet');
    const walletNote = document.querySelector('.wallet-note');
    
    if (walletBalance >= totalAmount) {
        payWithWalletBtn.disabled = false;
        walletNote.style.display = 'none';
    } else {
        payWithWalletBtn.disabled = true;
        walletNote.style.display = 'block';
    }
}

// Handle UPI payment
async function handleUPIPayment() {
    const upiId = document.getElementById('upiId').value;
    
    if (!upiId) {
        showNotification('Please enter your UPI ID', 'error');
        return;
    }
    
    if (!validateUPI(upiId)) {
        showNotification('Please enter a valid UPI ID', 'error');
        return;
    }
    
    await processPayment('upi', { upiId });
}

// Handle card payment
async function handleCardPayment() {
    const cardNumber = document.getElementById('cardNumber').value;
    const expiryDate = document.getElementById('expiryDate').value;
    const cvv = document.getElementById('cvv').value;
    const cardHolder = document.getElementById('cardHolder').value;
    
    if (!cardNumber || !expiryDate || !cvv || !cardHolder) {
        showNotification('Please fill all card details', 'error');
        return;
    }
    
    if (!validateCardNumber(cardNumber)) {
        showNotification('Please enter a valid card number', 'error');
        return;
    }
    
    if (!validateExpiryDate(expiryDate)) {
        showNotification('Please enter a valid expiry date', 'error');
        return;
    }
    
    if (!validateCVV(cvv)) {
        showNotification('Please enter a valid CVV', 'error');
        return;
    }
    
    await processPayment('card', {
        cardNumber: maskCardNumber(cardNumber),
        expiryDate,
        cardHolder
    });
}

// Handle wallet payment
async function handleWalletPayment() {
    await processPayment('wallet', {});
}

// Process payment and create booking
async function processPayment(paymentMethod, paymentDetails) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const selectedSlot = timeSlots[selectedTimeSlot];
        const selectedSeatElement = document.querySelector('.seat.selected');
        const isPremiumSeat = selectedSeatElement.classList.contains('premium');
        
        // Calculate total amount
        let totalAmount = selectedSlot.price;
        if (isPremiumSeat) {
            totalAmount = Math.round(totalAmount * 1.2);
        }
        
        // Generate unique booking ID
        const bookingId = generateBookingId();
        
        // Create booking document
        const bookingData = {
            bookingId: bookingId,
            userId: currentUser.uid,
            userName: currentUser.name,
            userPhone: currentUser.phone,
            userEmail: currentUser.email,
            bookingDate: selectedDate,
            timeSlot: selectedTimeSlot,
            seatNumber: selectedSeat,
            seatType: isPremiumSeat ? 'premium' : 'standard',
            duration: selectedSlot.duration,
            amount: totalAmount,
            status: 'confirmed',
            paymentMethod: paymentMethod,
            paymentStatus: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            confirmedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save booking to Firebase
        await db.collection(firebaseCollections.BOOKINGS).doc(bookingId).set(bookingData);
        
        // Create payment record
        const paymentData = {
            paymentId: generatePaymentId(),
            bookingId: bookingId,
            userId: currentUser.uid,
            userName: currentUser.name,
            amount: totalAmount,
            paymentMethod: paymentMethod,
            paymentDetails: paymentDetails,
            status: 'completed',
            paymentDate: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection(firebaseCollections.PAYMENTS).doc(paymentData.paymentId).set(paymentData);
        
        // Update wallet balance if payment method is wallet
        if (paymentMethod === 'wallet') {
            const newBalance = currentUser.walletBalance - totalAmount;
            await db.collection(firebaseCollections.USERS).doc(currentUser.uid).update({
                walletBalance: newBalance,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Show success message
        showNotification('Booking confirmed successfully!', 'success');
        
        // Redirect to booking confirmation page after delay
        setTimeout(() => {
            window.location.href = `booking-confirmation.html?bookingId=${bookingId}`;
        }, 2000);
        
    } catch (error) {
        console.error('Error processing booking:', error);
        showNotification('Error processing booking. Please try again.', 'error');
        loadingOverlay.classList.remove('active');
    }
}

// Handle booking confirmation
async function handleBookingConfirmation() {
    // For demo, we'll use UPI payment as default
    await handleUPIPayment();
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    }
}

// Utility functions
function validateUPI(upiId) {
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    return upiRegex.test(upiId);
}

function validateCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s+/g, '');
    return /^\d{16}$/.test(cleaned);
}

function validateExpiryDate(expiryDate) {
    return /^\d{2}\/\d{2}$/.test(expiryDate);
}

function validateCVV(cvv) {
    return /^\d{3,4}$/.test(cvv);
}

function maskCardNumber(cardNumber) {
    return cardNumber.replace(/\d(?=\d{4})/g, "*");
}

function generateBookingId() {
    return 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function generatePaymentId() {
    return 'PAY' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    notification.className = 'notification show';
    
    if (type === 'error') {
        notification.classList.add('error');
    } else {
        notification.classList.remove('error');
    }
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}