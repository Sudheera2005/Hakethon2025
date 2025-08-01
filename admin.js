class AdminDashboard {
    constructor() {
        this.rooms = JSON.parse(localStorage.getItem('classroom_rooms')) || this.initializeSampleRooms();
        this.pendingRequests = JSON.parse(localStorage.getItem('classroom_pending_requests')) || [];
        this.approvedBookings = JSON.parse(localStorage.getItem('classroom_bookings')) || [];
        this.semesterAssignments = JSON.parse(localStorage.getItem('classroom_semester_assignments')) || [];
        this.currentEditId = null;
        this.currentSemesterEditId = null;
        this.init();
    }

    initializeSampleRooms() {
        const sampleRooms = [
            { id: this.generateId(), name: "Room A101", type: "Classroom", location: "Building A, Floor 1", capacity: 30 },
            { id: this.generateId(), name: "Lab B205", type: "Laboratory", location: "Building B, Floor 2", capacity: 20 },
            { id: this.generateId(), name: "Conference C301", type: "Conference Room", location: "Building C, Floor 3", capacity: 15 }
        ];
        localStorage.setItem('classroom_rooms', JSON.stringify(sampleRooms));
        return sampleRooms;
    }

    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        this.setupEventListeners();
        this.renderRooms();
        this.renderPendingRequests();
        this.renderSemesterAssignments();
        this.updatePendingCount();
    }

    showToast(message, type) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }

    validateRoomForm(formData) {
        const errors = [];
        
        if (!formData.name || formData.name.trim() === '') {
            errors.push('Room name is required');
        } else if (formData.name.length > 50) {
            errors.push('Room name must be less than 50 characters');
        }

        const validTypes = ['Classroom', 'Laboratory', 'Conference Room', 'Auditorium'];
        if (!formData.type || !validTypes.includes(formData.type)) {
            errors.push('Please select a valid room type');
        }

        if (!formData.location || formData.location.trim() === '') {
            errors.push('Location is required');
        } else if (formData.location.length > 100) {
            errors.push('Location must be less than 100 characters');
        }

        if (isNaN(formData.capacity)) {
            errors.push('Capacity must be a number');
        } else if (!Number.isInteger(formData.capacity)) {
            errors.push('Capacity must be a whole number (no decimals)');
        } else if (formData.capacity <= 0) {
            errors.push('Capacity must be greater than 0');
        } else if (formData.capacity > 500) {
            errors.push('Capacity must be 500 or less');
        }

        const existingRoom = this.rooms.find(room => 
            room.name.toLowerCase() === formData.name.toLowerCase() && 
            (!this.currentEditId || room.id !== this.currentEditId)
        );
        
        if (existingRoom) {
            errors.push('A room with this name already exists');
        }

        return errors;
    }

    showFormErrors(errors) {
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('has-error');
        });

        document.querySelectorAll('.error-message').forEach(el => {
            el.remove();
        });

        errors.forEach(error => {
            let field = '';
                    
            if (error.includes('name')) field = 'room-name';
            else if (error.includes('type')) field = 'room-type';
            else if (error.includes('location')) field = 'room-location';
            else if (error.includes('Capacity')) field = 'room-capacity';
                    
            if (field) {
                const formGroup = document.getElementById(field).closest('.form-group');
                formGroup.classList.add('has-error');
                
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.textContent = error;
                formGroup.appendChild(errorElement);
            } else {
                this.showToast(error, 'error');
            }
        });
    }

    handleRoomSubmit() {
        const formData = {
            name: document.getElementById('room-name').value.trim(),
            type: document.getElementById('room-type').value,
            location: document.getElementById('room-location').value.trim(),
            capacity: parseInt(document.getElementById('room-capacity').value)
        };

        const errors = this.validateRoomForm(formData);
        
        if (errors.length > 0) {
            this.showFormErrors(errors);
            return;
        }

        if (this.currentEditId) {
            this.updateRoom(this.currentEditId, formData);
        } else {
            this.addRoom(formData);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(e.target.dataset.section);
            });
        });

        document.querySelector('.sidebar-toggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });

        document.getElementById('room-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRoomSubmit();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.cancelEdit();
        });

        document.getElementById('room-search').addEventListener('input', (e) => {
            this.searchRooms(e.target.value);
        });

        document.getElementById('room-capacity').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    switchSection(section) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        const titles = {
            'rooms': 'Room Management',
            'bookings': 'Booking Approvals',
            'semester': 'Semester Assignments'
        };
        document.getElementById('page-title').textContent = titles[section];
    }

    addRoom(roomData) {
        const newRoom = {
            id: this.generateId(),
            ...roomData
        };
                
        this.rooms.push(newRoom);
        this.saveRooms();
        this.renderRooms();
        this.clearForm();
        this.showToast('Room added successfully!', 'success');
    }

    updateRoom(id, roomData) {
        const index = this.rooms.findIndex(room => room.id === id);
        if (index !== -1) {
            this.rooms[index] = { id, ...roomData };
            this.saveRooms();
            this.renderRooms();
            this.cancelEdit();
            this.showToast('Room updated successfully!', 'success');
        }
    }

    saveRooms() {
        localStorage.setItem('classroom_rooms', JSON.stringify(this.rooms));
    }

    renderRooms() {
        const tbody = document.getElementById('rooms-tbody');
        tbody.innerHTML = '';

        this.rooms.forEach(room => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${room.name}</td>
                <td>${room.type}</td>
                <td>${room.location}</td>
                <td>${room.capacity}</td>
                <td class="actions">
                    <button class="btn btn-edit" onclick="adminDashboard.editRoom('${room.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="adminDashboard.deleteRoom('${room.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    editRoom(id) {
        const room = this.rooms.find(room => room.id === id);
        if (room) {
            this.currentEditId = id;
            document.getElementById('room-name').value = room.name;
            document.getElementById('room-type').value = room.type;
            document.getElementById('room-location').value = room.location;
            document.getElementById('room-capacity').value = room.capacity;
            document.getElementById('edit-room-id').value = id;
            document.getElementById('form-title').textContent = 'Edit Room';
            document.getElementById('submit-text').textContent = 'Update Room';
            document.getElementById('cancel-edit').style.display = 'inline-block';
        }
    }

    deleteRoom(id) {
        if (confirm('Are you sure you want to delete this room?')) {
            this.rooms = this.rooms.filter(room => room.id !== id);
            this.saveRooms();
            this.renderRooms();
            this.showToast('Room deleted successfully!', 'success');
        }
    }

    cancelEdit() {
        this.currentEditId = null;
        this.clearForm();
        document.getElementById('form-title').textContent = 'Add New Room';
        document.getElementById('submit-text').textContent = 'Add Room';
        document.getElementById('cancel-edit').style.display = 'none';
    }

    clearForm() {
        document.getElementById('room-form').reset();
        document.getElementById('edit-room-id').value = '';
        
        document.querySelectorAll('.error-message').forEach(el => {
            el.remove();
        });
        document.querySelectorAll('.has-error').forEach(el => {
            el.classList.remove('has-error');
        });
    }

    searchRooms(query) {
        const rows = document.querySelectorAll('#rooms-tbody tr');
        const searchTerm = query.toLowerCase();
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    renderPendingRequests() {
        const grid = document.getElementById('bookings-grid');
        grid.innerHTML = '';

        if (this.pendingRequests.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">No pending bookings</p>';
            return;
        }

        this.pendingRequests.forEach(request => {
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.innerHTML = `
                <div class="booking-header">
                    <h4>${request.roomName}</h4>
                    <span class="badge">Pending</span>
                </div>
                <div class="booking-info">
                    <p><strong>Requester:</strong> ${request.requester}</p>
                    <p><strong>Date:</strong> ${request.date}</p>
                    <p><strong>Time:</strong> ${request.startTime} - ${request.endTime}</p>
                    <p><strong>Purpose:</strong> ${request.purpose}</p>
                </div>
                <div class="booking-actions">
                    <button class="btn btn-success" onclick="adminDashboard.approveRequest('${request.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger" onclick="adminDashboard.rejectRequest('${request.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    approveRequest(requestId) {
        const requestIndex = this.pendingRequests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) return;

        const request = this.pendingRequests[requestIndex];
        this.approvedBookings.push({
            ...request,
            status: 'approved',
            approvedAt: new Date().toISOString()
        });
        this.pendingRequests.splice(requestIndex, 1);
        this.saveAllData();
        this.renderPendingRequests();
        this.updatePendingCount();
        this.showToast('Booking approved successfully!', 'success');
    }

    rejectRequest(requestId) {
        const requestIndex = this.pendingRequests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) return;

        const request = this.pendingRequests[requestIndex];
        this.pendingRequests.splice(requestIndex, 1);
        this.saveAllData();
        this.renderPendingRequests();
        this.updatePendingCount();
        this.showToast('Booking rejected!', 'error');
    }

    saveAllData() {
        localStorage.setItem('classroom_rooms', JSON.stringify(this.rooms));
        localStorage.setItem('classroom_pending_requests', JSON.stringify(this.pendingRequests));
        localStorage.setItem('classroom_bookings', JSON.stringify(this.approvedBookings));
        localStorage.setItem('classroom_semester_assignments', JSON.stringify(this.semesterAssignments));
    }

    updatePendingCount() {
        const pendingCountEl = document.getElementById('pending-count');
        const pendingCountHeaderEl = document.getElementById('pending-count-header');
        if (pendingCountEl) pendingCountEl.textContent = this.pendingRequests.length;
        if (pendingCountHeaderEl) pendingCountHeaderEl.textContent = this.pendingRequests.length;
    }

    openSemesterAssignmentModal(assignmentId = null) {
        this.currentSemesterEditId = assignmentId;
        const modal = document.getElementById('semester-assignment-modal');
        modal.classList.add('active');
                
        // Populate room dropdown
        const roomSelect = document.getElementById('semester-room');
        roomSelect.innerHTML = '';
        this.rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = `${room.name} (${room.type})`;
            roomSelect.appendChild(option);
        });
                
        if (assignmentId) {
            // Editing existing assignment
            const assignment = this.semesterAssignments.find(a => a.id === assignmentId);
            if (assignment) {
                document.getElementById('semester-assignment-id').value = assignment.id;
                document.getElementById('semester-room').value = assignment.roomId;
                document.getElementById('semester-lecturer').value = assignment.lecturer;
                document.getElementById('semester-course').value = assignment.course;
                document.getElementById('semester-day').value = assignment.day;
                document.getElementById('semester-time').value = assignment.time;
                document.getElementById('semester-duration').value = assignment.duration;
                document.getElementById('semester-start').value = assignment.startDate;
                document.getElementById('semester-end').value = assignment.endDate;
            }
        } else {
            // New assignment - clear form
            document.getElementById('semester-assignment-id').value = '';
            document.getElementById('semester-assignment-form').reset();
        }
    }

    closeSemesterAssignmentModal() {
        document.getElementById('semester-assignment-modal').classList.remove('active');
        this.currentSemesterEditId = null;
    }

    saveSemesterAssignment() {
        const roomId = document.getElementById('semester-room').value;
        const lecturer = document.getElementById('semester-lecturer').value.trim();
        const course = document.getElementById('semester-course').value.trim();
        const day = document.getElementById('semester-day').value;
        const time = document.getElementById('semester-time').value;
        const duration = document.getElementById('semester-duration').value;
        const startDate = document.getElementById('semester-start').value;
        const endDate = document.getElementById('semester-end').value;
        
        // Basic validation
        if (!roomId || !lecturer || !course || !day || !time || !duration || !startDate || !endDate) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            this.showToast('End date must be after start date', 'error');
            return;
        }
        
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) {
            this.showToast('Selected room not found', 'error');
            return;
        }

        if (duration <= 0 || duration > 4) {
            this.showToast('Duration must be between 1 and 4 hours', 'error');
            return;
        }
                
        const assignmentData = {
            roomId,
            roomName: room.name,
            lecturer,
            course,
            day,
            time,
            duration: parseInt(duration),
            startDate,
            endDate
        };
        
        if (this.currentSemesterEditId) {
            // Update existing assignment
            const index = this.semesterAssignments.findIndex(a => a.id === this.currentSemesterEditId);
            if (index !== -1) {
                assignmentData.id = this.currentSemesterEditId;
                this.semesterAssignments[index] = assignmentData;
                this.showToast('Assignment updated successfully', 'success');
            }
        } else {
            // Add new assignment
            assignmentData.id = this.generateId();
            this.semesterAssignments.push(assignmentData);
            this.showToast('Assignment added successfully', 'success');
        }
                
        this.saveAllData();
        this.renderSemesterAssignments();
        this.closeSemesterAssignmentModal();
    }

    renderSemesterAssignments() {
        const tbody = document.getElementById('semester-tbody');
        tbody.innerHTML = '';
        
        if (this.semesterAssignments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: #666;">No semester assignments found</td>
                </tr>
            `;
            return;
        }
        
        this.semesterAssignments.forEach(assignment => {
            const room = this.rooms.find(r => r.id === assignment.roomId) || {};
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${room.name || 'N/A'}</td>
                <td>${assignment.lecturer}</td>
                <td>${assignment.course}</td>
                <td>${assignment.day}</td>
                <td>${assignment.time}</td>
                <td>${assignment.duration} hrs</td>
                <td>${new Date(assignment.startDate).toLocaleDateString()} - ${new Date(assignment.endDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-edit" onclick="adminDashboard.openSemesterAssignmentModal('${assignment.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="adminDashboard.deleteSemesterAssignment('${assignment.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    deleteSemesterAssignment(id) {
        if (confirm('Are you sure you want to delete this semester assignment?')) {
            this.semesterAssignments = this.semesterAssignments.filter(a => a.id !== id);
            this.saveAllData();
            this.renderSemesterAssignments();
            this.showToast('Assignment deleted successfully', 'success');
        }
    }
}

const adminDashboard = new AdminDashboard();