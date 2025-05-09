function showAlert(amount) {
    document.getElementById("alertBox").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    // Also update the POS display amount
    document.querySelector('#amount').textContent = '₹ ' + amount[1] + '.00';
}

function acceptAction() {
    const statusText = document.getElementById("statusText");
    statusText.textContent = "Payment accepted!";
    
    // Flash status indicator green
    const statusIndicator = document.getElementById("statusIndicator");
    statusIndicator.classList.add("active");
    
    // Add the transaction to history
    addTransactionToHistory(true);
    
    setTimeout(() => {
        // If the data is a URL, open it
        if (isValidURL(rxData.value)) {
            window.open(rxData.value);
        }
        
        // Close modal
        document.getElementById("alertBox").style.display = "none";
        document.getElementById("overlay").style.display = "none";
        
        // Reset after 3 seconds
        setTimeout(() => {
            statusText.textContent = "Ready to receive";
            statusIndicator.classList.remove("active");
            document.querySelector('.pos-display .amount').textContent = '₹ ---.--';
        }, 3000);
    }, 1000);
}

function rejectAction() {
    const statusText = document.getElementById("statusText");
    statusText.textContent = "Payment rejected";
    
    // Add the transaction to history as failed
    addTransactionToHistory(false);
    
    // Close modal
    document.getElementById("alertBox").style.display = "none";
    document.getElementById("overlay").style.display = "none";
    
    // Reset after 2 seconds
    setTimeout(() => {
        statusText.textContent = "Ready to receive";
        document.querySelector('.pos-display .amount').textContent = '₹ ---.--';
    }, 2000);
}

function addTransactionToHistory(isSuccess) {
    // Get amount from modal
    const amountText = document.querySelector('#payment-amount span:last-child').textContent;
    
    // Create new transaction element
    const transactionList = document.querySelector('.transaction-list');
    const newTransaction = document.createElement('div');
    newTransaction.className = 'transaction-item';
    
    // Generate random order number
    const orderNum = Math.floor(10000 + Math.random() * 90000);
    
    // Get current time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    newTransaction.innerHTML = `
        <div class="transaction-info">
            <div class="transaction-name">Order #${orderNum}</div>
            <div class="transaction-date">Today, ${displayHours}:${minutes} ${ampm}</div>
        </div>
        <div class="transaction-amount ${isSuccess ? 'success' : 'failed'}">${amountText}</div>
    `;
    
    // Add to the top of the list
    if (transactionList.firstChild) {
        transactionList.insertBefore(newTransaction, transactionList.firstChild);
    } else {
        transactionList.appendChild(newTransaction);
    }
    
    // Remove oldest transaction if there are more than 5
    if (transactionList.children.length > 5) {
        transactionList.removeChild(transactionList.lastChild);
    }
}

window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

var context = null;
var recorder = null;
var isReceiving = false;
var mediaStream = null;

// the ggwave module instance
var ggwave = null;
var parameters = null;
var instance = null;

// instantiate the ggwave instance
ggwave_factory().then(function(obj) {
    ggwave = obj;
});

var txData = document.getElementById("txData");
var rxData = document.getElementById("rxData");
var captureToggle = document.getElementById("captureToggle");
var statusText = document.getElementById("statusText");
var statusIndicator = document.getElementById("statusIndicator");

// helper function
function convertTypedArray(src, type) {
    var buffer = new ArrayBuffer(src.byteLength);
    var baseView = new src.constructor(buffer).set(src);
    return new type(buffer);
}

// initialize audio context and ggwave
function init() {
    if (!context) {
        context = new AudioContext({sampleRate: 48000});

        parameters = ggwave.getDefaultParameters();
        parameters.sampleRateInp = context.sampleRate;
        parameters.sampleRateOut = context.sampleRate;
        instance = ggwave.init(parameters);
    }
}

// URL validation helper
function isValidURL(str) {
    try {
        new URL(str);
        return true;
    } catch (_) {
        return false;
    }
}

// Ensure all DOM elements are loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Capture toggle button
    if (captureToggle) {
        captureToggle.addEventListener("click", function() {
            if (isReceiving) {
                stopReceive();
            } else {
                startListening();
            }
        });
    }

    // Generate payment button
    const generatePaymentBtn = document.getElementById('generatePayment');
    if (generatePaymentBtn) {
        generatePaymentBtn.addEventListener('click', function() {
            // Generate and display the payment URL
            const paymentUrl = generatePaymentURL();
            
            // Animate button press
            this.style.transform = 'translateY(4px)';
            this.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0.2)';
            
            setTimeout(() => {
                this.style.transform = '';
                this.style.boxShadow = '';
            }, 100);
        });
    }

    // Keypad buttons
    document.querySelectorAll('.pos-key').forEach(key => {
        key.addEventListener('click', function() {
            // Animate the button press
            this.style.transform = 'translateY(4px)';
            this.style.boxShadow = '0 0 0 #2d3748';
            
            setTimeout(() => {
                this.style.transform = '';
                this.style.boxShadow = '';
            }, 100);
        });
    });
});

// Add function to generate payment URL
function generatePaymentURL() {
    // Generate random amount between 10 and 1000
    const amount = Math.floor(Math.random() * 990 + 10);
    
    // Use a fixed ID for demonstration purposes
    const paymentId = "pl_QSiWE4HOKMKQHh";
    
    // Create the payment URL
    const url = `https://pages.razorpay.com/${paymentId}/view?amount=${amount}`;
    
    // Update the URL display
    const paymentUrlDisplay = document.getElementById("payment-url");
    paymentUrlDisplay.textContent = url;
    
    // Update the amount display
    document.querySelector('.pos-display .amount').textContent = `₹ ${amount}.00`;
    
    // Initialize audio context if needed
    init();
    
    // generate audio waveform
    var waveform = ggwave.encode(instance, url, ggwave.ProtocolId.GGWAVE_PROTOCOL_ULTRASOUND_FASTEST, 10)

    // play audio
    var buf = convertTypedArray(waveform, Float32Array);
    var buffer = context.createBuffer(1, buf.length, context.sampleRate);
    buffer.getChannelData(0).set(buf);
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);

    setTimeout(() => {
        statusText.textContent = "Message sent!";
    }, 1000);
    
    return url;
}

async function startListening() {
    init();
    isReceiving = true;
    captureToggle.textContent = "STOP";
    captureToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="6" width="12" height="12"></rect>
        </svg>
        STOP
    `;
    statusText.textContent = "Listening for payments...";
    statusIndicator.classList.add("active");
    
    await context.audioWorklet.addModule('ggwave-processor.js');

    let constraints = {
        audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false
        }
    };

    navigator.mediaDevices.getUserMedia(constraints).then(function(e) {
        mediaStream = context.createMediaStreamSource(e);

        recorder = new AudioWorkletNode(context, 'ggwave-processor');
        recorder.port.onmessage = function(event) {
            const samples = new Float32Array(event.data);
            const res = ggwave.decode(instance, convertTypedArray(samples, Int8Array));
            if (res && res.length > 0) {
                const decoded = new TextDecoder("utf-8").decode(res);
                rxData.value = decoded;
                // https://pages.razorpay.com/pl_QSiWE4HOKMKQHh/view?amount=13
                const amount = decoded.match(/amount=(\d+)/);
                showAlert(amount);
            }
        };

        mediaStream.connect(recorder);
        recorder.connect(context.destination);
    }).catch(function(e) {
        console.error(e);
        statusText.textContent = "Error accessing microphone";
        statusIndicator.classList.remove("active");
        isReceiving = false;
        resetCaptureButton();
    });
}

function stopReceive() {
    if (recorder) {
        recorder.disconnect();
        if (mediaStream) mediaStream.disconnect();
        recorder = null;
    }

    isReceiving = false;
    resetCaptureButton();
    statusText.textContent = "Ready to receive";
    statusIndicator.classList.remove("active");
    rxData.value = '';
}

function resetCaptureButton() {
    captureToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        </svg>
        LISTEN
    `;
}