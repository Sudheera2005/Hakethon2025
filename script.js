// APIIT Classroom Booking System - JavaScript
class ClassroomBookingSystem {
    constructor() {
        this.rooms = this.generateSampleRooms();
        this.bookings = this.loadBookings();
        this.currentBooking = null;
        this.init();
    }

    init() {
        console.log(localStorage.getItem("LoggedUser"))
        this.setDefaultDateTime();
        this.renderRooms();
        this.renderBookings();
        this.setupEventListeners();
    }

    generateSampleRooms() {
        const roomTypes = ['classroom', 'lab', 'auditorium'];
        const features = ['Projector', 'Whiteboard', 'AC', 'WiFi', 'Audio System', 'Video Conferencing'];
        const buildings = ['A', 'B', 'C', 'D'];
        
        const rooms = [];
        
        // Generate 20 sample rooms
        for (let i = 1; i <= 20; i++) {
            const building = buildings[Math.floor(Math.random() * buildings.length)];
            const floor = Math.floor(Math.random() * 5) + 1;
            const roomNumber = String(i).padStart(2, '0');
            
            const room = {
                id: `room_${i}`,
                name: `${building}${floor}.${roomNumber}`,
                type: roomTypes[Math.floor(Math.random() * roomTypes.length)],
                capacity: this.getCapacityByType(roomTypes[Math.floor(Math.random() * roomTypes.length)]),
                features: this.getRandomFeatures(features),
                status: Math.random() > 0.3 ? 'available' : 'occupied',
                location: `Building ${building}, Floor ${floor}`
            };
            
            rooms.push(room);
        }
        
        return rooms;
    }

    getCapacityByType(type) {
        switch (type) {
            case 'classroom': return Math.floor(Math.random() * 30) + 20; // 20-50
            case 'lab': return Math.floor(Math.random() * 20) + 15; // 15-35
            case 'auditorium': return Math.floor(Math.random() * 200) + 100; // 100-300
            default: return 30;
        }
    }

    getRandomFeatures(allFeatures) {
        const numFeatures = Math.floor(Math.random() * 4) + 2; // 2-5 features
        const shuffled = [...allFeatures].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, numFeatures);
    }

    setDefaultDateTime() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        const startTime = `${String(currentHour + 1).padStart(2, '0')}:00`;
        const endTime = `${String(currentHour + 2).padStart(2, '0')}:00`;

        document.getElementById('booking-date').value = today;
        document.getElementById('start-time').value = startTime;
        document.getElementById('end-time').value = endTime;
    }

    setupEventListeners() {
        // Filter change listeners
        document.getElementById('room-type').addEventListener('change', () => this.renderRooms());
        document.getElementById('min-capacity').addEventListener('input', () => this.renderRooms());
        
        // Date/time change listeners
        document.getElementById('booking-date').addEventListener('change', () => this.renderRooms());
        document.getElementById('start-time').addEventListener('change', () => this.renderRooms());
        document.getElementById('end-time').addEventListener('change', () => this.renderRooms());

        // Modal close on background click
        document.getElementById('booking-modal').addEventListener('click', (e) => {
            if (e.target.id === 'booking-modal') {
                this.closeModal();
            }
        });
    }

    getFilteredRooms() {
        const roomType = document.getElementById('room-type').value;
        const minCapacity = parseInt(document.getElementById('min-capacity').value) || 0;
        
        return this.rooms.filter(room => {
            const typeMatch = !roomType || room.type === roomType;
            const capacityMatch = room.capacity >= minCapacity;
            return typeMatch && capacityMatch;
        });
    }

    renderRooms() {
        const roomsGrid = document.getElementById('rooms-grid');
        const filteredRooms = this.getFilteredRooms();

        if (filteredRooms.length === 0) {
            roomsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-search"></i>
                    <h3>No rooms found</h3>
                    <p>Try adjusting your filters or search criteria</p>
                </div>
            `;
            return;
        }

        roomsGrid.innerHTML = filteredRooms.map(room => `
            <div class="room-card ${room.status}" onclick="bookingSystem.openBookingModal('${room.id}')">
                <div class="room-header">
                    <div>
                        <div class="room-name">${room.name}</div>
                        <div class="room-type">${room.type}</div>
                    </div>
                    <div class="room-status ${room.status}">${room.status}</div>
                </div>
                
                <div class="room-details">
                    <div class="room-capacity">
                        <i class="fas fa-users"></i>
                        <span>${room.capacity} seats</span>
                    </div>
                    <div class="room-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${room.location}</span>
                    </div>
                </div>
                
                <div class="room-features">
                    ${room.features.slice(0, 3).map(feature => 
                        `<span class="feature-tag">${feature}</span>`
                    ).join('')}
                    ${room.features.length > 3 ? `<span class="feature-tag">+${room.features.length - 3} more</span>` : ''}
                </div>
                
                <button class="book-btn" ${room.status === 'occupied' ? 'disabled' : ''} 
                        onclick="event.stopPropagation(); bookingSystem.openBookingModal('${room.id}')">
                    ${room.status === 'available' ? 'Book Room' : 'Unavailable'}
                </button>
            </div>
        `).join('');
    }

    openBookingModal(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || room.status === 'occupied') return;

        this.currentBooking = {
            roomId: roomId,
            room: room
        };

        const date = document.getElementById('booking-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;

        const modal = document.getElementById('booking-modal');
        const modalBody = document.getElementById('modal-body');

        modalBody.innerHTML = `
            <div class="booking-summary">
                <h4 style="margin-bottom: 1rem; color: var(--gray-800);">Booking Details</h4>
                
                <div style="background: var(--gray-50); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1rem;">
                    <div style="display: grid; gap: 0.75rem;">
                        <div><strong>Room:</strong> ${room.name} (${room.type})</div>
                        <div><strong>Capacity:</strong> ${room.capacity} seats</div>
                        <div><strong>Location:</strong> ${room.location}</div>
                        <div><strong>Date:</strong> ${this.formatDate(date)}</div>
                        <div><strong>Time:</strong> ${startTime} - ${endTime}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <strong>Room Features:</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                        ${room.features.map(feature => 
                            `<span class="feature-tag">${feature}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div style="background: var(--primary-50); padding: 1rem; border-radius: var(--radius-md); border-left: 4px solid var(--primary-500);">
                    <strong style="color: var(--primary-700);">Note:</strong> 
                    <span style="color: var(--primary-600);">Please ensure you cancel at least 2 hours before the scheduled time if plans change.</span>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('booking-modal').classList.remove('active');
        this.currentBooking = null;
    }

    confirmBooking() {
        if (!this.currentBooking) return;

        const date = document.getElementById('booking-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;

        // Validate times
        if (!date || !startTime || !endTime) {
            alert('Please fill in all date and time fields.');
            return;
        }

        if (startTime >= endTime) {
            alert('End time must be after start time.');
            return;
        }

        const booking = {
            id: `booking_${Date.now()}`,
            roomId: this.currentBooking.roomId,
            roomName: this.currentBooking.room.name,
            roomType: this.currentBooking.room.type,
            date: date,
            startTime: startTime,
            endTime: endTime,
            status: this.getBookingStatus(date, startTime),
            createdAt: new Date().toISOString()
        };

        this.bookings.push(booking);
        this.saveBookings();
        this.renderBookings();
        
        // Update room status
        const room = this.rooms.find(r => r.id === this.currentBooking.roomId);
        if (room) {
            room.status = 'occupied';
        }
        this.renderRooms();

        this.closeModal();
        this.showNotification('Request for booking sent!', 'success');
    }

    getBookingStatus(date, startTime) {
        const now = new Date();
        const bookingDateTime = new Date(`${date}T${startTime}`);
        
        if (bookingDateTime > now) {
            return 'pending';
        } else {
            return 'active';
        }
    }

    loadBookings() {
        const stored = localStorage.getItem('apiit_bookings');
        if (stored) {
            return JSON.parse(stored);
        }
        
        // Return sample bookings if none exist
        return [
            {
                id: 'booking_1',
                roomId: 'room_1',
                roomName: 'A2.01',
                roomType: 'classroom',
                date: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endTime: '11:00',
                status: 'pending',
                createdAt: new Date().toISOString()
            },
            {
                id: 'booking_2',
                roomId: 'room_5',
                roomName: 'B3.05',
                roomType: 'lab',
                date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                startTime: '14:00',
                endTime: '16:00',
                status: 'pending',
                createdAt: new Date().toISOString()
            },
            {
                id: 'booking_3',
                roomId: 'room_10',
                roomName: 'C1.10',
                roomType: 'auditorium',
                date: new Date().toISOString().split('T')[0],
                startTime: '08:00',
                endTime: '09:00',
                status: 'active',
                createdAt: new Date().toISOString()
            }
        ];
    }

    saveBookings() {
        localStorage.setItem('apiit_bookings', JSON.stringify(this.bookings));
    }

    renderBookings() {
        const bookingsList = document.getElementById('bookings-list');
        const bookingCount = document.getElementById('booking-count');

        if (this.bookings.length === 0) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <h3>No bookings yet</h3>
                    <p>Your room bookings will appear here</p>
                </div>
            `;
            bookingCount.textContent = '0 bookings';
            return;
        }

        const activeBookings = this.bookings.filter(b => b.status !== 'cancelled');
        bookingCount.textContent = `${activeBookings.length} active booking${activeBookings.length !== 1 ? 's' : ''}`;

        bookingsList.innerHTML = this.bookings.map(booking => `
            <div class="booking-card">
                <div class="booking-header">
                    <div>
                        <div class="booking-room">${booking.roomName}</div>
                        <div class="booking-date">${this.formatDate(booking.date)} • ${booking.startTime} - ${booking.endTime}</div>
                    </div>
                    <div class="booking-status ${booking.status}">${booking.status}</div>
                </div>
                
                <div style="margin: 0.75rem 0; font-size: 0.875rem; color: var(--gray-600);">
                    <i class="fas fa-building"></i> ${booking.roomType.charAt(0).toUpperCase() + booking.roomType.slice(1)}
                </div>
                
                <div class="booking-actions">
                    <button class="btn-sm btn-primary" onclick="bookingSystem.editBooking('${booking.id}')">
                        <i class="fas fa-edit"></i> Modify
                    </button>
                    <button class="btn-sm btn-danger" onclick="bookingSystem.cancelBooking('${booking.id}')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `).join('');
    }

    editBooking(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        // Pre-fill the form with booking details
        document.getElementById('booking-date').value = booking.date;
        document.getElementById('start-time').value = booking.startTime;
        document.getElementById('end-time').value = booking.endTime;

        // Scroll to booking section
        document.querySelector('.booking-section').scrollIntoView({ behavior: 'smooth' });
        
        this.showNotification('Booking details loaded. Modify the time and search for available rooms.', 'info');
    }

    cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        const bookingIndex = this.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex === -1) return;

        const booking = this.bookings[bookingIndex];
        
        // Update room status back to available
        const room = this.rooms.find(r => r.id === booking.roomId);
        if (room) {
            room.status = 'available';
        }

        this.bookings.splice(bookingIndex, 1);
        this.saveBookings();
        this.renderBookings();
        this.renderRooms();
        
        this.showNotification('Booking cancelled successfully.', 'success');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add notification styles
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${type === 'success' ? 'var(--success-500)' : type === 'error' ? 'var(--error-500)' : 'var(--primary-600)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-xl);
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Global functions for HTML onclick handlers
function searchRooms() {
    bookingSystem.renderRooms();
    bookingSystem.showNotification('Searching for available rooms...', 'info');
}

function closeModal() {
    bookingSystem.closeModal();
}

function confirmBooking() {
    bookingSystem.confirmBooking();
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the booking system when the page loads
let bookingSystem;
document.addEventListener('DOMContentLoaded', () => {
    bookingSystem = new ClassroomBookingSystem();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close modal
    if (e.key === 'Escape') {
        bookingSystem?.closeModal();
    }
    
    // Ctrl/Cmd + Enter to confirm booking
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.getElementById('booking-modal').classList.contains('active')) {
            bookingSystem?.confirmBooking();
        }
    }
});