navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	
	var source1 = audioCtx.createMediaStreamSource(stream);
	var source2 = audioCtx.createMediaStreamSource(stream);
	
	// Q = center_frequency / (top_frequency - bottom_frequency)
	// Q = [775|2325] / (3400 - 300)
	// Q = [0.25|0.75]
	var filter1 = audioCtx.createBiquadFilter();
	filter1.type = 'bandpass';
	filter1.frequency.value = 775;
	filter1.Q.value = 0.25;
	var filter2 = audioCtx.createBiquadFilter();
	filter2.type = 'bandpass';
	filter2.frequency.value = 2325;
	filter2.Q.value = 0.75;

	console.log(filter1);

	
}).catch(function(err) {
	console.log(err);
});
