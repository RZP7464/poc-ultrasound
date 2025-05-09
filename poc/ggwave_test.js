function showAlert() {
    document.getElementById("alertBox").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    
    // Generate random payment amount for demo
    const amount = (Math.random() * 3000 + 499).toFixed(2);
    document.querySelector('#payment-amount span:last-child').textContent = '₹ ' + Number(amount).toLocaleString('en-IN');
    
    // Play notification sound
    playBellSound();
}

const bellSound = new Audio('https://dl.prokerala.com/downloads/ringtones/files/mp3/ayogi-309.mp3');

function playBellSound() {
    bellSound.play();
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

// Toggle receive function
captureToggle.addEventListener("click", function() {
    if (isReceiving) {
        stopReceive();
    } else {
        startListening();
    }
});

async function startListening() {
    init();
    isReceiving = true;
    captureToggle.textContent = "STOP LISTENING";
    captureToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="6" width="12" height="12"></rect>
        </svg>
        STOP LISTENING
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
                showAlert();
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
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        START LISTENING
    `;
}