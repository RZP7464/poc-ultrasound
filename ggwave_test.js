function showAlert() {
    document.getElementById("alertBox").style.display = "block";
    document.getElementById("overlay").style.display = "block";
}

function acceptAction() {
    window.open(rxData.value)
    document.getElementById("alertBox").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}

function rejectAction() {
    alert("You rejected the payment link.");
    document.getElementById("alertBox").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}

window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

var context = null;
var recorder = null;
var isReceiving = false;

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

// Send function
function onSend() {
    init();

    if (isReceiving) {
        stopReceive();
    }

    statusText.textContent = "Sending...";



    // generate audio waveform
    var waveform = ggwave.encode(instance, txData.value, ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_NORMAL, 10)

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
}

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
    captureToggle.textContent = "STOP";
    statusText.textContent = "Listening...";
    rxData.value = 'Listening for audio...';

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
                if (isValidURL(decoded)) {
                    rxData.value = decoded;
                    showAlert();
                } else {
                    console.log(decoded + " is invalid");
                }
            }
        };

        mediaStream.connect(recorder);
        recorder.connect(context.destination);
    }).catch(function(e) {
        console.error(e);
        statusText.textContent = "Error accessing microphone";
        isReceiving = false;
        captureToggle.textContent = "RECEIVE";
    });
}

function stopReceive() {
    if (recorder) {
        recorder.disconnect();
        if (mediaStream) mediaStream.disconnect();
        recorder = null;
    }

    isReceiving = false;
    captureToggle.textContent = "RECEIVE";
    statusText.textContent = "Ready";
    rxData.value = '';
}