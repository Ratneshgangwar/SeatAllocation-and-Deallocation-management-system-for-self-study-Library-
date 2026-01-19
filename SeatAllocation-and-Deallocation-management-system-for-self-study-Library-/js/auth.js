// Enhanced Authentication JavaScript with Detailed Debugging
console.log('=== AUTH.JS LOADED ===');
console.log('Auth service:', typeof auth !== 'undefined' ? 'Available' : 'Missing');
console.log('Firestore service:', typeof db !== 'undefined' ? 'Available' : 'Missing');
console.log('Firebase object:', typeof firebase !== 'undefined' ? 'Available' : 'Missing');

// Test Firestore connection
async function testFirestoreConnection() {
    console.log('=== TESTING FIRESTORE CONNECTION ===');
    try {
        const testRef = db.collection('testConnection');
        console.log('Test reference created');
        
        const testData = {
            timestamp: new Date(),
            message: 'Test connection',
            test: true
        };
        
        console.log('Attempting to write test document...');
        const docRef = await testRef.add(testData);
        console.log('✅ SUCCESS: Test document written with ID:', docRef.id);
        
        console.log('Attempting to read test document...');
        const docSnap = await docRef.get();
        console.log('✅ SUCCESS: Test document read:', docSnap.exists);
        
        // Clean up
        await docRef.delete();
        console.log('✅ Test document cleaned up');
        
        return true;
    } catch (error) {
        console.error('❌ FIRESTORE CONNECTION FAILED:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CONTENT LOADED ===');
    
    // Test Firestore connection on load
    setTimeout(() => {
        testFirestoreConnection();
    }, 1000);

    // Password toggle functionality
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // Password strength checker
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }

    // Signup Form Handler - SIMPLIFIED VERSION
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('=== SIGNUP FORM SUBMITTED ===');
            
            const formData = {
                name: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                phone: document.getElementById('phone').value
            };
            
            console.log('Form data:', formData);
            
            const btn = this.querySelector('.btn-auth');
            
            // Basic validation
            if (!formData.name || !formData.email || !formData.password) {
                showNotification('Please fill all required fields', 'error');
                return;
            }
            
            btn.classList.add('loading');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
            
            try {
                console.log('Step 1: Testing Firestore connection...');
                const connectionTest = await testFirestoreConnection();
                if (!connectionTest) {
                    throw new Error('Firestore connection failed');
                }
                
                console.log('Step 2: Creating user in Firebase Auth...');
                const userCredential = await auth.createUserWithEmailAndPassword(formData.email, formData.password);
                const user = userCredential.user;
                console.log('✅ User created in Auth:', user.uid);
                
                console.log('Step 3: Preparing user data for Firestore...');
                const userData = {
                    uid: user.uid,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone || '',
                    role: 'student',
                    isActive: true,
                    walletBalance: 0,
                    createdAt: new Date(), // Using JavaScript Date instead of serverTimestamp for testing
                    updatedAt: new Date()
                };
                
                console.log('User data to save:', userData);
                
                console.log('Step 4: Saving to Firestore...');
                // Test with a simple write first
                const testWrite = await db.collection('testUsers').doc(user.uid).set({
                    test: true,
                    timestamp: new Date()
                });
                console.log('✅ Test write successful');
                
                // Now try the actual user data
                await db.collection('users').doc(user.uid).set(userData);
                console.log('✅ User data saved to Firestore');
                
                // Store in localStorage
                localStorage.setItem('currentUser', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    name: formData.name,
                    role: 'student'
                }));
                
                btn.classList.remove('loading');
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
                
                showNotification('Account created successfully! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'student-dashboard.html';
                }, 2000);
                
            } catch (error) {
                console.error('❌ SIGNUP ERROR DETAILS:');
                console.error('Error name:', error.name);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                console.error('Full error:', error);
                
                btn.classList.remove('loading');
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
                
                let errorMessage = 'Registration failed. ';
                
                if (error.code) {
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage += 'This email is already registered.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage += 'Invalid email address.';
                            break;
                        case 'auth/weak-password':
                            errorMessage += 'Password is too weak.';
                            break;
                        case 'permission-denied':
                            errorMessage += 'Database permission denied. Check Firestore rules.';
                            break;
                        default:
                            errorMessage += `Error: ${error.code} - ${error.message}`;
                    }
                } else {
                    errorMessage += error.message;
                }
                
                showNotification(errorMessage, 'error');
            }
        });
    }

    // Login Form Handler - SIMPLIFIED
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('=== LOGIN FORM SUBMITTED ===');
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const btn = this.querySelector('.btn-auth');
            
            console.log('Login attempt for:', email);
            
            btn.classList.add('loading');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                console.log('✅ Login successful:', user.uid);
                
                // Try to get user data
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    showNotification('Login successful!', 'success');
                    setTimeout(() => {
                        window.location.href = 'student-dashboard.html';
                    }, 1000);
                } else {
                    throw new Error('User data not found');
                }
                
            } catch (error) {
                console.error('Login error:', error);
                btn.classList.remove('loading');
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Account';
                showNotification('Login failed: ' + error.message, 'error');
            }
        });
    }
});

// Rest of your helper functions remain the same
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone);
}

function validateAadhaar(aadhaar) {
    const re = /^[0-9]{12}$/;
    return re.test(aadhaar);
}

function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('passwordText');
    
    if (!strengthBar || !strengthText) return;
    
    let strength = 0;
    let text = 'Password strength';
    let className = '';
    
    if (password.length >= 6) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[!@#$%^&*(),.?":{}|<>]+/)) strength++;
    
    switch(strength) {
        case 0:
        case 1:
            className = 'strength-weak';
            text = 'Weak password';
            break;
        case 2:
        case 3:
            className = 'strength-medium';
            text = 'Medium strength';
            break;
        case 4:
        case 5:
            className = 'strength-strong';
            text = 'Strong password';
            break;
    }
    
    strengthBar.className = 'strength-fill ' + className;
    strengthText.textContent = text;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    const errorMessage = formGroup.querySelector('.error-message');
    
    formGroup.classList.add('error');
    formGroup.classList.remove('success');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function showFieldSuccess(fieldId) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    
    formGroup.classList.remove('error');
    formGroup.classList.add('success');
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (notification && notificationText) {
        notificationText.textContent = message;
        notification.className = 'notification show';
        
        if (type === 'error') {
            notification.classList.add('error');
        } else if (type === 'warning') {
            notification.classList.add('warning');
        } else {
            notification.classList.remove('error', 'warning');
        }
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
}