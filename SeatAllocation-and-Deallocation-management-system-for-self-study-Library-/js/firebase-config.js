// firebase-config.js - Fixed version
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjKGiYrqK1TlBi0N4aFHEi2WNZdnPy3s8",
  authDomain: "library-7abcc-f1a9d.firebaseapp.com",
  projectId: "library-7abcc-f1a9d",
  storageBucket: "library-7abcc-f1a9d.firebasestorage.app",
  messagingSenderId: "861023989601",
  appId: "1:861023989601:web:795656dddb6e0795f05f20"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Firebase collections
const USERS_COLLECTION = "users";
const BOOKINGS_COLLECTION = "bookings";
const SEATS_COLLECTION = "seats";
const PAYMENTS_COLLECTION = "payments";
const TIME_SLOTS_COLLECTION = "timeSlots";

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
      console.log("Firebase persistence error: ", err);
  });

// Export Firebase services
window.firebaseApp = app;
window.auth = auth;
window.db = db;
window.storage = storage;
window.firebaseCollections = {
    USERS: USERS_COLLECTION,
    BOOKINGS: BOOKINGS_COLLECTION,
    SEATS: SEATS_COLLECTION,
    PAYMENTS: PAYMENTS_COLLECTION,
    TIME_SLOTS: TIME_SLOTS_COLLECTION
};

console.log("Firebase initialized successfully");

// Initialize default data if needed
async function initializeDefaultData() {
    try {
        // Check if time slots exist
        const timeSlotsSnapshot = await db.collection(TIME_SLOTS_COLLECTION).get();
        if (timeSlotsSnapshot.empty) {
            await createDefaultTimeSlots();
        }

        // Check if seats exist
        const seatsSnapshot = await db.collection(SEATS_COLLECTION).get();
        if (seatsSnapshot.empty) {
            await createDefaultSeats();
        }
    } catch (error) {
        console.error("Error initializing default data:", error);
    }
}

// Create default time slots (using modular Firebase)
async function createDefaultTimeSlots() {
    const { doc, setDoc, serverTimestamp, collection } = await import('firebase/firestore');
    
    const defaultTimeSlots = {
        morning: {
            name: "Morning Slot",
            time: "8:00 AM - 2:00 PM",
            price: 80,
            duration: "6 hours",
            features: ["Wi-Fi Included", "Refreshment Access", "6 Hours Study Time"],
            isActive: true,
            createdAt: serverTimestamp()
        },
        evening: {
            name: "Evening Slot",
            time: "2:00 PM - 8:00 PM",
            price: 80,
            duration: "6 hours",
            features: ["Wi-Fi Included", "Refreshment Access", "6 Hours Study Time"],
            isActive: true,
            createdAt: serverTimestamp()
        },
        fullday: {
            name: "Full Day",
            time: "8:00 AM - 8:00 PM",
            price: 150,
            duration: "12 hours",
            features: ["Wi-Fi Included", "Refreshment Access", "Locker Facility", "12 Hours Study Time"],
            isActive: true,
            createdAt: serverTimestamp()
        },
        night: {
            name: "Night Slot",
            time: "8:00 PM - 8:00 AM",
            price: 120,
            duration: "12 hours",
            features: ["Wi-Fi Included", "Refreshment Access", "Special Quiet Zone", "12 Hours Study Time"],
            isActive: true,
            createdAt: serverTimestamp()
        },
        "24hours": {
            name: "24 Hours",
            time: "24 Hours",
            price: 250,
            duration: "24 hours",
            features: ["Wi-Fi Included", "Unlimited Refreshments", "Locker Facility", "Priority Seating", "24 Hours Study Time"],
            isActive: true,
            createdAt: serverTimestamp()
        }
    };

    try {
        for (const [key, slot] of Object.entries(defaultTimeSlots)) {
            await setDoc(doc(db, TIME_SLOTS_COLLECTION, key), slot);
        }
        console.log("Default time slots created");
    } catch (error) {
        console.error("Error creating time slots:", error);
    }
}

// Create default seats (using modular Firebase)
async function createDefaultSeats() {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    
    const seatTypes = ["standard", "premium", "window", "corner"];
    
    try {
        for (let i = 1; i <= 170; i++) {
            const randomType = seatTypes[Math.floor(Math.random() * seatTypes.length)];
            const isPremium = randomType === "premium";
            const seatData = {
                seatNumber: i,
                type: randomType,
                isPremium: isPremium,
                isActive: true,
                features: getSeatFeatures(randomType),
                row: Math.ceil(i / 17),
                column: ((i - 1) % 17) + 1,
                createdAt: serverTimestamp()
            };
            
            await setDoc(doc(db, SEATS_COLLECTION, `seat_${i}`), seatData);
        }
        console.log("Default seats created");
    } catch (error) {
        console.error("Error creating seats:", error);
    }
}

function getSeatFeatures(type) {
    const features = {
        standard: ["Standard Chair", "Individual Table", "Charging Port", "Reading Light"],
        premium: ["Ergonomic Chair", "Large Table", "Dual Charging Ports", "Adjustable Light", "Extra Space"],
        window: ["Natural Light", "Standard Chair", "Individual Table", "Charging Port", "View"],
        corner: ["Extra Privacy", "Standard Chair", "Individual Table", "Charging Port", "Quiet Area"]
    };
    return features[type] || features.standard;
}

// Initialize data when auth state changes
auth.onAuthStateChanged(() => {
    initializeDefaultData();
});