document.addEventListener('DOMContentLoaded', function () {
    // Set default booking date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bookingDate').value = today;

    // Event listeners for balance calculation
    document.getElementById('advance').addEventListener('input', calculateBalance);
    document.getElementById('totalAmount').addEventListener('input', calculateBalance);

    // Show booking tab by default
    showTab('booking');

    // Tab switching functionality
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            showTab(tabId);
        });
    });

    // Form submission
    document.getElementById('bookingForm').addEventListener('submit', function (e) {
        e.preventDefault();
        saveBooking();
    });

    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', function () {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        loadBookings(searchTerm);
    });

    document.getElementById('searchInput').addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.toLowerCase();
            loadBookings(searchTerm);
        }
    });

    // Export buttons
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);

    // Invoice buttons
    document.getElementById('printInvoiceBtn').addEventListener('click', printInvoice);
    document.getElementById('downloadInvoiceBtn').addEventListener('click', downloadInvoicePDF);
    document.getElementById('sendWhatsAppInvoiceBtn').addEventListener('click', sendWhatsAppInvoice);

    // WhatsApp settings
    document.getElementById('saveWhatsAppSettings').addEventListener('click', saveWhatsAppSettings);
    document.getElementById('whatsappTemplate').addEventListener('change', toggleCustomMessage);
    document.getElementById('sendWhatsAppMessage').addEventListener('click', sendWhatsAppMessage);

    // Load WhatsApp settings if they exist
    loadWhatsAppSettings();

    // Initialize balance calculation
    calculateBalance();
});

let monthlyBookingsChart = null;
let paymentStatusChart = null;
let currentInvoiceBooking = null;

// Show specific tab content
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');

    if (tabId === 'records') {
        loadBookings();
    } else if (tabId === 'dashboard') {
        updateDashboard();
    } else if (tabId === 'whatsapp') {
        toggleCustomMessage();
    }
}

// Calculate balance amount
function calculateBalance() {
    const total = parseFloat(document.getElementById('totalAmount').value) || 0;
    const advance = parseFloat(document.getElementById('advance').value) || 0;
    const balance = total - advance;
    document.getElementById('balance').value = balance.toFixed(2);
}

// Save booking to localStorage
function saveBooking() {
    const booking = {
        id: Date.now().toString(),
        customerName: document.getElementById('customerName').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        bookingDate: document.getElementById('bookingDate').value,
        pickup: document.getElementById('pickup').value.trim(),
        destination: document.getElementById('destination').value.trim(),
        buses: parseInt(document.getElementById('buses').value) || 0,
        totalAmount: parseFloat(document.getElementById('totalAmount').value) || 0,
        advance: parseFloat(document.getElementById('advance').value) || 0,
        balance: parseFloat(document.getElementById('balance').value) || 0,
        status: 'confirmed'
    };

    // Validation
    if (!booking.customerName || !booking.phone || !booking.pickup || !booking.destination || booking.buses <= 0) {
        alert('Please fill in all required fields correctly!');
        return;
    }

    let bookings = JSON.parse(localStorage.getItem('lemonToursBookings')) || [];
    bookings.push(booking);
    localStorage.setItem('lemonToursBookings', JSON.stringify(bookings));

    // Send WhatsApp notification if enabled
    if (document.getElementById('sendWhatsApp').checked) {
        sendBookingConfirmation(booking);
    }

    alert('Booking saved successfully!');
    document.getElementById('bookingForm').reset();
    document.getElementById('bookingDate').value = new Date().toISOString().split('T')[0];
    calculateBalance();
    showTab('records');
}

// Load bookings into table
function loadBookings(searchTerm = '') {
    let bookings = JSON.parse(localStorage.getItem('lemonToursBookings')) || [];
    const tbody = document.querySelector('#bookingsTable tbody');
    tbody.innerHTML = '';

    if (searchTerm) {
        bookings = bookings.filter(b =>
            b.customerName.toLowerCase().includes(searchTerm) ||
            b.phone.includes(searchTerm)
        );
    }

    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="no-data">No bookings found</td></tr>';
        return;
    }

    // Sort by booking date (newest first)
    bookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

    bookings.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.id.slice(-4)}</td>
            <td>${booking.customerName}</td>
            <td>${booking.phone}</td>
            <td>${formatDate(booking.bookingDate)}</td>
            <td>${booking.pickup}</td>
            <td>${booking.destination}</td>
            <td>${booking.buses}</td>
            <td>₹${booking.totalAmount.toFixed(2)}</td>
            <td>₹${booking.advance.toFixed(2)}</td>
            <td>₹${booking.balance.toFixed(2)}</td>
            <td>
                <button class="action-btn edit-btn" data-id="${booking.id}" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${booking.id}" title="Delete"><i class="fas fa-trash"></i></button>
                <button class="action-btn invoice-btn" data-id="${booking.id}" title="Generate Invoice"><i class="fas fa-file-invoice"></i></button>
                <button class="action-btn whatsapp-btn" data-id="${booking.id}" title="Send WhatsApp"><i class="fab fa-whatsapp"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Add event listeners to action buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this booking?')) {
                deleteBooking(this.getAttribute('data-id'));
            }
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            editBooking(this.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.invoice-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            generateInvoice(this.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.whatsapp-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            sendBookingWhatsApp(this.getAttribute('data-id'));
        });
    });
}

// Edit booking
function editBooking(id) {
    let bookings = JSON.parse(localStorage.getItem('lemonToursBookings')) || [];
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    // Fill form with booking data
    document.getElementById('customerName').value = booking.customerName;
    document.getElementById('phone').value = booking.phone;
    document.getElementById('bookingDate').value = booking.bookingDate;
    document.getElementById('pickup').value = booking.pickup;
    document.getElementById('destination').value = booking.destination;
    document.getElementById('buses').value = booking.buses;
    document.getElementById('totalAmount').value = booking.totalAmount;
    document.getElementById('advance').value = booking.advance;
    calculateBalance();

    // Remove old booking
    bookings = bookings.filter(b => b.id !== id);
    localStorage.setItem('lemonToursBookings', JSON.stringify(bookings));

    showTab('booking');
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
}

// Delete booking
function deleteBooking(id) {
    let bookings = JSON.parse(localStorage.getItem('lemonToursBookings')) || [];
    bookings = bookings.filter(b => b.id !== id);
    localStorage.setItem('lemonToursBookings', JSON.stringify(bookings));
    loadBookings(document.getElementById('searchInput').value.toLowerCase());
    updateDashboard();
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Update dashboard stats and charts
function updateDashboard() {
    const bookings = JSON.parse(localStorage.getItem('lemonToursBookings')) || [];
    
    // Update stats
    document.getElementById('totalBookings').textContent = bookings.length;
    document.getElementById('totalBuses').textContent = bookings.reduce((sum, b) => sum + b.buses, 0);
    document.getElementById('totalRevenue').textContent = `₹${bookings.reduce((sum, b) => sum + b.totalAmount, 0).toFixed(2)}`;
    document.getElementById('totalAdvance').textContent = `₹${bookings.reduce((sum, b) => sum + b.advance, 0).toFixed(2)}`;
    document.getElementById('pendingBalance').textContent = `₹${bookings.reduce((sum, b) => sum + b.balance, 0).toFixed(2)}`;

    // Update charts
    updateMonthlyBookingsChart(bookings);
    updatePaymentStatusChart(bookings);
}

// Monthly bookings chart
function updateMonthlyBookingsChart(bookings) {
    const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'short' }));
    const monthlyCounts = new Array(12).fill(0);

    bookings.forEach(b => {
        const month = new Date(b.bookingDate).getMonth();
        monthlyCounts[month]++;
    });

    const ctx = document.getElementById('monthlyBookingsChart').getContext('2d');
    
    if (monthlyBookingsChart) {
        monthlyBookingsChart.data.datasets[0].data = monthlyCounts;
        monthlyBookingsChart.update();
    } else {
        monthlyBookingsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Bookings',
                    data: monthlyCounts,
                    backgroundColor: 'rgba(255, 165, 0, 0.6)',
                    borderColor: 'rgba(255, 165, 0, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
}

// Payment status chart
function updatePaymentStatusChart(bookings) {
    const paidCount = bookings.filter(b => b.balance <= 0).length;
    const pendingCount = bookings.length - paidCount;

    const ctx = document.getElementById('paymentStatusChart').getContext('2d');
    
    if (paymentStatusChart) {
        paymentStatusChart.data.datasets[0].data = [paidCount, pendingCount];
        paymentStatusChart.update();
    } else {
        paymentStatusChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Paid', 'Pending'],
                datasets: [{
                    data: [paidCount, pendingCount],
                    backgroundColor: ['#4CAF50', '#F44336'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }
}

// Export to Excel
function exportToExcel() {
    let bookings = JSON.parse(localStorage.getItem('lemonToursBookings')) || [];
    if (bookings.length === 0) {
        alert('No bookings to export!');
        return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [
        ['ID', 'Customer Name', 'Phone', 'Booking Date', 'Pickup', 'Destination', 'Buses', 'Total (₹)', 'Advance (₹)', 'Balance (₹)', 'Status']
    ];

    bookings.forEach(b => {
        wsData.push([
            b.id.slice(-4),
            b.customerName,
            b.phone,
            formatDate(b.bookingDate),
            b.pickup,
            b.destination,
            b.buses,
            b.totalAmount.toFixed(2),
            b.advance.toFixed(2),
            b.balance.toFixed(2),
            b.status || 'confirmed'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    XLSX.writeFile(wb, 'LemonTours_Bookings.xlsx');
}

// Export to PDF
function exportToPDF() {
    let bookings = JSON.parse(localStorage.getItem('lemonToursBookings')) || [];
    if (bookings.length === 0) {
        alert('No bookings to export!');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text('Lemon Tours & Travels - Booking Records', 105, 15, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
    
    // Table headers
    const headers = [
        ['ID', 'Customer', 'Phone', 'Date', 'Pickup', 'Destination', 'Buses', 'Total', 'Advance', 'Balance', 'Status']
    ];
    
    // Table data
    const data = bookings.map(b => [
        b.id.slice(-4),
        b.customerName,
        b.phone,
        formatDate(b.bookingDate),
        b.pickup,
        b.destination,
        b.buses,
        '₹' + b.totalAmount.toFixed(2),
        '₹' + b.advance.toFixed(2),
        '₹' + b.balance.toFixed(2),
        b.status || 'confirmed'
    ]);
    
    // Add table
    doc.autoTable({
        head: headers,
        body: data,
        startY: 30,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 165, 0],
            textColor: [255, 255, 255]
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { top: 30 }
    });
    
    doc.save('LemonTours_Bookings.pdf');
}

// Generate invoice
function generateInvoice(bookingId) {
    let bookings = JSON.parse(localStorage.getItem('lemonToursBookings')) || [];
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
        alert('Booking not found!');
        return;
    }
    
    currentInvoiceBooking = booking;
    
    // Update invoice content
    document.getElementById('invoiceId').textContent = `#${booking.id.slice(-4)}`;
    document.getElementById('invoiceDate').textContent = new Date().toLocaleDateString();
    document.getElementById('invoiceCustomerName').textContent = booking.customerName;
    document.getElementById('invoicePhone').textContent = booking.phone;
    document.getElementById('invoiceBookingDate').textContent = formatDate(booking.bookingDate);
    document.getElementById('invoicePickup').textContent = booking.pickup;
    document.getElementById('invoiceDestination').textContent = booking.destination;
    document.getElementById('invoiceBuses').textContent = booking.buses;
    document.getElementById('invoiceTotal').textContent = booking.totalAmount.toFixed(2);
    document.getElementById('invoiceAdvance').textContent = booking.advance.toFixed(2);
    document.getElementById('invoiceBalance').textContent = booking.balance.toFixed(2);
    
    showTab('invoice');
}

// Print invoice
function printInvoice() {
    if (!currentInvoiceBooking) {
        alert('No invoice generated to print!');
        return;
    }
    window.print();
}

// Download invoice as PDF
function downloadInvoicePDF() {
    if (!currentInvoiceBooking) {
        alert('No invoice generated to download!');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Invoice header
    doc.setFontSize(18);
    doc.setTextColor(255, 165, 0);
    doc.text('Lemon Tours & Travels', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Hyderabad City', 105, 27, { align: 'center' });
    doc.text('Phone: +91 9876543210', 105, 34, { align: 'center' });
    
    // Invoice title
    doc.setFontSize(16);
    doc.text('BOOKING INVOICE', 105, 45, { align: 'center' });
    
    // Invoice details
    doc.setFontSize(10);
    doc.text(`Invoice ID: #${currentInvoiceBooking.id.slice(-4)}`, 15, 55);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 60);
    
    // Customer info
    doc.text(`Customer Name: ${currentInvoiceBooking.customerName}`, 15, 70);
    doc.text(`Phone: ${currentInvoiceBooking.phone}`, 15, 75);
    
    // Booking details
    doc.text(`Booking Date: ${formatDate(currentInvoiceBooking.bookingDate)}`, 15, 85);
    doc.text(`Pickup Location: ${currentInvoiceBooking.pickup}`, 15, 90);
    doc.text(`Destination: ${currentInvoiceBooking.destination}`, 15, 95);
    doc.text(`Number of Buses: ${currentInvoiceBooking.buses}`, 15, 100);
    
    // Summary table
    doc.autoTable({
        startY: 110,
        head: [['Description', 'Amount (₹)']],
        body: [
            ['Total Amount', currentInvoiceBooking.totalAmount.toFixed(2)],
            ['Advance Paid', currentInvoiceBooking.advance.toFixed(2)],
            ['Balance Amount', currentInvoiceBooking.balance.toFixed(2)]
        ],
        theme: 'grid',
        headStyles: {
            fillColor: [255, 165, 0],
            textColor: [255, 255, 255]
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 'auto' }
        }
    });
    
    // Footer
    doc.setFontSize(10);
    doc.text('Thank you for choosing Lemon Tours & Travels!', 105, doc.lastAutoTable.finalY + 15, { align: 'center' });
    doc.text('For any queries, please contact +91 9876543210', 105, doc.lastAutoTable.finalY + 20, { align: 'center' });
    
    doc.save(`Invoice_${currentInvoiceBooking.id.slice(-4)}.pdf`);
}

// WhatsApp functionality
function loadWhatsAppSettings() {
    const settings = JSON.parse(localStorage.getItem('lemonToursWhatsAppSettings')) || {};
    document.getElementById('apiKey').value = settings.apiKey || '';
    document.getElementById('apiUrl').value = settings.apiUrl || 'https://api.whatsapp.com/send';
    document.getElementById('businessPhone').value = settings.businessPhone || '';
}

function saveWhatsAppSettings() {
    const settings = {
        apiKey: document.getElementById('apiKey').value.trim(),
        apiUrl: document.getElementById('apiUrl').value.trim(),
        businessPhone: document.getElementById('businessPhone').value.trim()
    };
    
    localStorage.setItem('lemonToursWhatsAppSettings', JSON.stringify(settings));
    showStatusMessage('Settings saved successfully!', 'success');
}

function toggleCustomMessage() {
    const template = document.getElementById('whatsappTemplate').value;
    const customContainer = document.getElementById('customMessageContainer');
    customContainer.style.display = template === 'custom' ? 'block' : 'none';
}

function sendWhatsAppMessage() {
    const phone = document.getElementById('whatsappPhone').value.trim();
    if (!phone) {
        showStatusMessage('Please enter a phone number', 'error');
        return;
    }

    const template = document.getElementById('whatsappTemplate').value;
    let message = '';

    if (template === 'custom') {
        message = document.getElementById('whatsappCustomMessage').value.trim();
    } else {
        // Default templates
        if (template === 'booking_confirmation') {
            message = 'Hello {customer_name}, your booking with Lemon Tours & Travels is confirmed!';
        } else if (template === 'payment_reminder') {
            message = 'Hello {customer_name}, this is a payment reminder from Lemon Tours & Travels.';
        }
    }

    if (!message) {
        showStatusMessage('Please enter a message', 'error');
        return;
    }

    const settings = JSON.parse(localStorage.getItem('lemonToursWhatsAppSettings')) || {};
    if (!settings.apiKey || !settings.businessPhone) {
        showStatusMessage('Please configure WhatsApp settings first', 'error');
        return;
    }

    // In a real implementation, you would use the WhatsApp API here
    // This is just a simulation
    showStatusMessage('WhatsApp message sent successfully!', 'success');
    
    // For demo purposes, we'll open WhatsApp with the message
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
}

function sendBookingConfirmation(booking) {
    const settings = JSON.parse(localStorage.getItem('lemonToursWhatsAppSettings')) || {};
    if (!settings.apiKey || !settings.businessPhone) return;

    const message = `Hello ${booking.customerName}, your booking with Lemon Tours & Travels is confirmed!
    
Booking ID: ${booking.id.slice(-4)}
Pickup: ${booking.pickup} on ${formatDate(booking.bookingDate)}
Destination: ${booking.destination}
Buses: ${booking.buses}

Total Amount: ₹${booking.totalAmount.toFixed(2)}
Advance Paid: ₹${booking.advance.toFixed(2)}
Balance Amount: ₹${booking.balance.toFixed(2)}

Thank you for choosing Lemon Tours & Travels!`;

    // In a real implementation, you would use the WhatsApp API here
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${booking.phone}?text=${encodedMessage}`, '_blank');
}

function sendBookingWhatsApp(bookingId) {
    let bookings = JSON.parse(localStorage.getItem('lemonToursBookings')) || [];
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
        alert('Booking not found!');
        return;
    }

    sendBookingConfirmation(booking);
}

function sendWhatsAppInvoice() {
    if (!currentInvoiceBooking) {
        alert('No invoice generated to send!');
        return;
    }

    const message = `Invoice for your booking with Lemon Tours & Travels
    
Invoice ID: #${currentInvoiceBooking.id.slice(-4)}
Customer: ${currentInvoiceBooking.customerName}
Booking Date: ${formatDate(currentInvoiceBooking.bookingDate)}
Pickup: ${currentInvoiceBooking.pickup}
Destination: ${currentInvoiceBooking.destination}
Buses: ${currentInvoiceBooking.buses}

Total Amount: ₹${currentInvoiceBooking.totalAmount.toFixed(2)}
Advance Paid: ₹${currentInvoiceBooking.advance.toFixed(2)}
Balance Amount: ₹${currentInvoiceBooking.balance.toFixed(2)}

Thank you for choosing Lemon Tours & Travels!`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${currentInvoiceBooking.phone}?text=${encodedMessage}`, '_blank');
}

function showStatusMessage(message, type) {
    const statusEl = document.getElementById('whatsappStatus');
    statusEl.textContent = message;
    statusEl.className = 'status-message ' + type;
    setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'status-message';
    }, 5000);
}