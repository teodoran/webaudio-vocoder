var gainedBandpassFilter = function (band, sources, context) {
	var cutoff = 1; // Max value is 1000, indicating a sharp cutoff.

	var lowpass = context.createBiquadFilter();
	lowpass.type = 'lowpass';
	lowpass.frequency.value = band.highFrequency;
	lowpass.Q.value = cutoff;

	var highpass = context.createBiquadFilter();
	highpass.type = 'highpass';
	highpass.frequency.value = band.lowFrequency;
	highpass.Q.value = cutoff;

	var gain = context.createGain();
	gain.gain.value = 0;

	sources.map(function (source) {
		source.connect(lowpass);
	});
	lowpass.connect(highpass);
	highpass.connect(gain);
	
	return gain;
};

var whiteNoise = function (context) {
	var bufferSize = 2 * context.sampleRate,
	    noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate),
	    output = noiseBuffer.getChannelData(0);

	for (var i = 0; i < bufferSize; i++) {
	    output[i] = Math.random() * 2 - 1;
	}

	var whiteNoise = context.createBufferSource();
	whiteNoise.buffer = noiseBuffer;
	whiteNoise.loop = true;
	whiteNoise.start(0);

	return whiteNoise;
}

var brownNoise = function (context) {
	var bufferSize = 4096;
	var brownNoise = (function() {
	    var lastOut = 0.0;
	    var node = context.createScriptProcessor(bufferSize, 1, 1);
	    node.onaudioprocess = function(e) {
	        var output = e.outputBuffer.getChannelData(0);
	        for (var i = 0; i < bufferSize; i++) {
	            var white = Math.random() * 2 - 1;
	            output[i] = (lastOut + (0.02 * white)) / 1.02;
	            lastOut = output[i];
	            output[i] *= 3.5; // (roughly) compensate for gain
	        }
	    }
	    return node;
	})();

	return brownNoise;
}

var testAudio = function (context) {
	var audio = document.getElementById('testAudio');
	var audioStream = context.createMediaElementSource(audio);

	audio.play();

	/*var compressor = context.createDynamicsCompressor();
	compressor.threshold.value = -50;
	compressor.knee.value = 40;
	compressor.ratio.value = 12;
	compressor.reduction.value = -20;
	compressor.attack.value = 0;
	compressor.release.value = 0.25;

	audioStream.connect(compressor);*/

	return audioStream;
}

var testAudio2 = function (context) {
	var audio = document.getElementById('testAudio2');
	var audioStream = context.createMediaElementSource(audio);

	audio.play();

	return audioStream;
}

var sawSynth = function (context, detune) {
	var pitch = 80;

	var oscillator = context.createOscillator();
	oscillator.type = 'sawtooth';
	oscillator.frequency.value = pitch;
	oscillator.detune.value = detune;
	oscillator.start();

	return oscillator;
}

var microphone = function (stream, context) {
	return context.createMediaStreamSource(stream);
}

var gainMap = function (ig) {
	if (ig < 40) {
		return ig * (1/200000);;
	}
	if (ig < 80) {
		return ig * (1/20000);
	}
	if (ig < 120) {
		return ig * (1/2000);
	}
	if (ig < 160) {
		return ig * (1/500);
	}

	return ig * (1/255);

	//return ig * (1/255);
}

navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	
	var audio = testAudio(audioCtx);
	// var audio = microphone(stream, audioCtx);

	var analyser = audioCtx.createAnalyser();
	analyser.fftSize = 32;//256;
	var bufferLength = analyser.frequencyBinCount;
	var dataArray = new Uint8Array(bufferLength);

	var sampleRate = audioCtx.sampleRate;
	var bands = [];
	var lowFrq = 0;
	for (var i = 1; i < bufferLength; i++) {
		var highFrq = (i * audioCtx.sampleRate) / analyser.fftSize;
		
		bands.push({
			lowFrequency: lowFrq,
			highFrequency: highFrq
		});

		lowFrq = highFrq;
	}

	audio.connect(analyser);

	// Passthrough
	var audioGain = audioCtx.createGain();
	audioGain.gain.value = 0;

	audio.connect(audioGain);
	audioGain.connect(audioCtx.destination);
	

	// var noise = testAudio2(audioCtx);
	// var noise = whiteNoise(audioCtx);
	// var noise = sawSynth(audioCtx);

	// Supersaw
	var noises = [];
	for (var i = 0; i < 5; i++) {
		noises.push(sawSynth(audioCtx, i * 0.2));
	}

	// var noise = brownNoise(audioCtx);
	var gains = bands.map(function (band) {
		var gain = gainedBandpassFilter(band, noises, audioCtx);
		gain.connect(audioCtx.destination);
		return gain;
	});

	setInterval(function () {
		analyser.getByteFrequencyData(dataArray);

		var test = [];

		for (var i = 1; i < bufferLength; i++) {
			var g = gainMap(dataArray[i]);
			gains[i-1].gain.value = g;
			test.push(g);
		}

		//console.log(test);
		console.log(dataArray);

	}, 0);

}).catch(function(err) {
	console.log(err);
});

