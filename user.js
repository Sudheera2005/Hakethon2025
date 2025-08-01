class ClassroomBookingSystem {
    constructor() {
        this.rooms = JSON.parse(localStorage.getItem('classroom_rooms')) || [];
        this.currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        this.currentBooking = null;
        this.init();
    }

    init() {
        this.checkNotifications();
        this.setDefaultDateTime();
        this.renderRooms();
        this.renderMyBookings();
        this.setupEventListeners();
    }

    checkNotifications() {
        if (!this.currentUser?.id) return;
        
        const notifications = JSON.parse(localStorage.getItem('user_notifications')) || {};
        const userNotifications = notifications[this.currentUser.id] || [];
        
        // Display unread notifications
        userNotifications.filter(n => !n.read).forEach(notification => {
            this.showNotification(notification.message, notification.type);
            notification.read = true;
        });
        
        // Save back
        notifications[this.currentUser.id] = userNotifications;
        localStorage.setItem('user_notifications', JSON.stringify(notifications));
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
        const date = document.getElementById('booking-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        
        return this.rooms.filter(room => {
            const typeMatch = !roomType || room.type === roomType;
            const capacityMatch = room.capacity >= minCapacity;
            const available = this.isRoomAvailable(room.id, date, startTime, endTime);
            
            return typeMatch && capacityMatch && available;
        });
    }

    isRoomAvailable(roomId, date, startTime, endTime) {
        const pendingRequests = JSON.parse(localStorage.getItem('classroom_pending_requests')) || [];
        const approvedBookings = JSON.parse(localStorage.getItem('classroom_bookings')) || [];
        
        // Check approved bookings
        const hasApprovedConflict = approvedBookings.some(booking => 
            booking.roomId === roomId && 
            booking.date === date &&
            !(endTime <= booking.startTime || startTime >= booking.endTime)
        );
        
        // Check pending requests
        const hasPendingConflict = pendingRequests.some(request => 
            request.roomId === roomId && 
            request.date === date &&
            !(endTime <= request.startTime || startTime >= request.endTime)
        );
        
        return !hasApprovedConflict && !hasPendingConflict;
    }

    renderRooms() {
        const roomsGrid = document.getElementById('rooms-grid');
        const filteredRooms = this.getFilteredRooms();

        if (filteredRooms.length === 0) {
            roomsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No available rooms found</h3>
                    <p>Try adjusting your filters or select a different time</p>
                </div>
            `;
            return;
        }

        const date = document.getElementById('booking-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;

        roomsGrid.innerHTML = filteredRooms.map(room => {
            const isAvailable = this.isRoomAvailable(room.id, date, startTime, endTime);
            
            return `
                <div class="room-card" onclick="bookingSystem.openBookingModal('${room.id}')">
                    <div class="room-header">
                        <div>
                            <div class="room-name">${room.name}</div>
                            <div class="room-type">${room.type}</div>
                        </div>
                        <div class="room-status ${isAvailable ? 'available' : 'unavailable'}">
                            ${isAvailable ? 'Available' : 'Unavailable'}
                        </div>
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
                        ${room.features?.slice(0, 3).map(feature => 
                            `<span class="feature-tag">${feature}</span>`
                        ).join('')}
                    </div>
                    
                    <button class="book-btn" ${!isAvailable ? 'disabled' : ''} 
                            onclick="event.stopPropagation(); bookingSystem.openBookingModal('${room.id}')">
                        ${isAvailable ? 'Book Room' : 'Unavailable'}
                    </button>
                </div>
            `;
        }).join('');
    }

    openBookingModal(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;

        const date = document.getElementById('booking-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;

        // Check availability
        if (!this.isRoomAvailable(roomId, date, startTime, endTime)) {
            this.showNotification('This room is no longer available at the selected time', 'error');
            this.renderRooms();
            return;
        }

        this.currentBooking = { roomId, room };

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="booking-summary">
                <h4>Booking Details</h4>
                <div class="booking-details">
                    <p><strong>Room:</strong> ${room.name} (${room.type})</p>
                    <p><strong>Capacity:</strong> ${room.capacity} seats</p>
                    <p><strong>Location:</strong> ${room.location}</p>
                    <p><strong>Date:</strong> ${this.formatDate(date)}</p>
                    <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
                </div>
                <div class="form-group">
                    <label for="booking-purpose">Purpose of Booking</label>
                    <textarea id="booking-purpose" placeholder="Enter the purpose of your booking (e.g., CS101 Lecture)"></textarea>
                </div>
            </div>
        `;

        document.getElementById('booking-modal').classList.add('active');
    }

    confirmBooking() {
        if (!this.currentBooking || !this.currentUser) return;

        const date = document.getElementById('booking-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const purpose = document.getElementById('booking-purpose').value;

        // Validate
        if (!date || !startTime || !endTime || !purpose) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (startTime >= endTime) {
            this.showNotification('End time must be after start time', 'error');
            return;
        }
        if (startTime-endTime > 4){
            this.showNotification('Booking duration cannot exceed 4 hours', 'error');
            return;
        }
        
        const now = new Date().getHours()
        const stime = startTime.split(':')[0];
        if (stime - now<=1){
            this.showNotification('Booking must be made at least 1 hour in advance', 'error');
            return;     
        }
        alert(stime - now)
        // Check availability again
        if (!this.isRoomAvailable(this.currentBooking.roomId, date, startTime, endTime)) {
            this.showNotification('This room is no longer available', 'error');
            this.closeModal();
            this.renderRooms();
            return;
        }

        // Create booking request
        const request = {
            id: 'req_' + Date.now(),
            roomId: this.currentBooking.roomId,
            roomName: this.currentBooking.room.name,
            requester: this.currentUser.name,
            requesterId: this.currentUser.id,
            date,
            startTime,
            endTime,
            purpose,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Add to pending requests
        const pendingRequests = JSON.parse(localStorage.getItem('classroom_pending_requests')) || [];
        pendingRequests.push(request);
        localStorage.setItem('classroom_pending_requests', JSON.stringify(pendingRequests));

        this.closeModal();
        this.renderRooms();
        this.renderMyBookings();
        this.showNotification('Booking request submitted for approval', 'success');
    }

    renderMyBookings() {
        const bookingsList = document.getElementById('bookings-list');
        if (!this.currentUser?.id) return;

        const pendingRequests = JSON.parse(localStorage.getItem('classroom_pending_requests')) || [];
        const approvedBookings = JSON.parse(localStorage.getItem('classroom_bookings')) || [];
        
        const myBookings = [
            ...pendingRequests.filter(r => r.requesterId === this.currentUser.id),
            ...approvedBookings.filter(b => b.requesterId === this.currentUser.id)
        ];

        document.getElementById('booking-count').textContent = 
            `${myBookings.length} ${myBookings.length === 1 ? 'booking' : 'bookings'}`;

        if (myBookings.length === 0) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <h3>No bookings yet</h3>
                    <p>Your booking requests will appear here</p>
                </div>
            `;
            return;
        }

        bookingsList.innerHTML = myBookings.map(booking => `
            <div class="booking-item ${booking.status}">
                <div class="booking-header">
                    <h5>${booking.roomName}</h5>
                    <span class="status-badge ${booking.status}">${booking.status}</span>
                </div>
                <div class="booking-details">
                    <p>${this.formatDate(booking.date)} • ${booking.startTime}-${booking.endTime}</p>
                    <p>${booking.purpose}</p>
                </div>
                ${booking.status === 'pending' ? `
                    <button class="btn-cancel" onclick="bookingSystem.cancelBooking('${booking.id}')">
                        Cancel Request
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking request?')) return;

        let pendingRequests = JSON.parse(localStorage.getItem('classroom_pending_requests')) || [];
        const index = pendingRequests.findIndex(r => r.id === bookingId);
        
        if (index !== -1) {
            pendingRequests.splice(index, 1);
            localStorage.setItem('classroom_pending_requests', JSON.stringify(pendingRequests));
            this.renderMyBookings();
            this.renderRooms();
            this.showNotification('Booking request cancelled', 'success');
        }
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

    closeModal() {
        document.getElementById('booking-modal').classList.remove('active');
        this.currentBooking = null;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${
                type === 'success' ? 'check-circle' : 
                type === 'error' ? 'exclamation-circle' : 
                'info-circle'
            }"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

const bookingSystem = new ClassroomBookingSystem();

// Global functions for HTML event handlers
function searchRooms() {
    bookingSystem.renderRooms();
}

function closeModal() {
    bookingSystem.closeModal();
}

function confirmBooking() {
    bookingSystem.confirmBooking();
}