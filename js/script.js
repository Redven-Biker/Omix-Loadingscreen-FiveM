var Vis = function(opt) {
   	function extend(a, b){
		for(var key in b)
			if(b.hasOwnProperty(key))
				a[key] = b[key];
		return a;
	}
	var opts = {
		preferredBarWidth: 16,
		forcePreferredBarWidth: false,
		barSpacing: 1,
		color: 'rainbow',
		rainbowOpacity: 1,
		element: 'canvas#visCanvas',
		sourceElement: 'audio#visSource',
		height: null,
		width: null,
		numBars: null,
		hideIfZero: true,
		loop: false,
		autoplay: true,
		volume: 1,
		sources: [],
		consecutiveZeroesLimit: 50,
		onPlay: function(name) {
			console.log('now playing ' + name);
		},
		onPause: function() {

		},
		onEnd: function() {

		},
		onDragStart: function() {

		},
		onDragEnd: function() {

		},
		onVolumeChange: function() {

		}
	};

	if (opt) extend(opts, opt);

	var _this = this;
	var seeking = false;
	var cv = document.querySelector(opts.element);

	if (!opts.width) {
		opts.width = cv.parentElement.clientWidth;
	}
	if (!opts.height) {
		opts.height = cv.parentElement.clientHeight;
	}

	var barColors = [];
	cv.setAttribute('height', opts.height);
	cv.setAttribute('width', opts.width);
		
	var numBars = (opts.numBars ? opts.numBars : Math.floor(opts.width / (opts.preferredBarWidth + opts.barSpacing)));
	var barWidth = opts.width / numBars - opts.barSpacing;

	if (opts.forcePreferredWidth) {
		barWidth = opts.preferredBarWidth;
	}
	if (barWidth < 4) barWidth = 4;
	
	for (var i = 0; i < numBars; i++) {
		var frequency = 5 / numBars;
		if (opts.color == 'rainbow2') {
			g = Math.floor(Math.sin(frequency * i + 0) * (127) + 128);
			r = Math.floor(Math.sin(frequency * i + 2) * (127) + 128);
			b = Math.floor(Math.sin(frequency * i + 4) * (127) + 128);
			barColors[i] = 'rgba('+r+','+g+','+b+','+opts.rainbowOpacity+')';
		} else if (opts.color == 'rainbow') {
			b = Math.floor(Math.sin(frequency * i + 0) * (127) + 128);
			g = Math.floor(Math.sin(frequency * i + 1) * (127) + 128);
			r = Math.floor(Math.sin(frequency * i + 3) * (127) + 128);
			barColors[i] = 'rgba('+r+','+g+','+b+','+opts.rainbowOpacity+')';
		} else if (opts.color == 'random') {
			barColors[i] = '#' + Math.floor(Math.random() * 16777215).toString(16);
		} else {
			barColors[i] = opts.color;
		}
	}
	
	var c = cv.getContext('2d');

	var cInd = 0;
	var ind = 0;
	for (var i = 0; i < cv.getAttribute('width'); i += (barWidth + opts.barSpacing)) {
		c.save();
		c.fillStyle = barColors[cInd++];
		c.translate(i, 0);
		c.fillRect(0, opts.height - opts.height * Math.random(), barWidth, opts.height);
		c.restore();
		ind += Math.floor(usableLength / numBars);
	}

				
	var ctx = new AudioContext();
	var audio = document.querySelector(opts.sourceElement);

	audio.src = opts.sources[0];

	var audioSrc = ctx.createMediaElementSource(audio);
	var analyser = ctx.createAnalyser();
	audioSrc.connect(analyser);
	analyser.connect(ctx.destination);

	var frequencyData = new Uint8Array(analyser.frequencyBinCount);
	var usableLength = 250;
	var consZ = 0;
	var consZLim = opts.consecutiveZeroesLimit || 50;

	function setUsableLength(len) {
		if (len < usableLength) return;
		usableLength = len;
	}
	function renderFrame() {
		requestAnimationFrame(renderFrame);
		analyser.getByteFrequencyData(frequencyData);

		for (var i = 0; i < frequencyData.length; i++) {
			if (frequencyData[i] == 0) {
				consZ++;
			} else {
				consZ = 0;
			}
			if (consZ >= consZLim) {
				setUsableLength(i - consZLim + 1);
				break;
			}
		}
		c.clearRect(0, 0, opts.width, opts.height);
		var ind = 0;
		var cInd = 0;
		for (var i = 0; i < cv.getAttribute('width'); i += (barWidth + opts.barSpacing)) {
			c.save();
			c.fillStyle = barColors[cInd++];
			c.translate(i, 0);
			if (!opts.hideIfZero)
				c.fillRect(0, opts.height - opts.height * (frequencyData[Math.floor(ind)] / 255) - 1, barWidth, opts.height);
			else 
				c.fillRect(0, opts.height - opts.height * (frequencyData[Math.floor(ind)] / 255), barWidth, opts.height);

			c.restore();
			ind += Math.floor(usableLength / numBars);
		}
		if (audio.ended) {
			opts.onEnd();
			_this.next();
		}
	}

	audio.volume = opts.volume;
	this.loop = opts.loop;
	setTimeout(function() {
		renderFrame(this);
		if (opts.autoplay) {
			audio.play();
		}
	}, 1);

	audio.addEventListener('play', function() {
		opts.onPlay(opts.sources[playlistIndex].match(/([\w|.|-|%]+)$/g)[0]);
	});
	audio.addEventListener('pause', function() {
		opts.onPause();
	});
	audio.addEventListener('seeking', function() {
		seeking = true;
		opts.onDragStart();
	});
	audio.addEventListener('seeked', function() {
		seeking = false;
		if (audio.currentTime == audio.duration) {
			_this.next();
		}
		opts.onDragEnd();
	});
	audio.addEventListener('volumechange', function() {
		opts.onVolumeChange();
	});

	var playlistIndex = 0;

	this.play = function(newSource) {
		if (newSource) audio.src = newSource;
		audio.pause();
		audio.play();
		return this;
	}
	this.pause = function() {
		audio.pause();
		return this;
	}
	this.volume = function(vol) {
		audio.volume = vol;
		return this;
	}
	this.loop = function(loop) {
		this.loop = loop;
		return this;
	}
	this.mute = function(muted) {
		audio.muted = muted;
		return this;
	}
	this.duration = function() {
		return audio.duration;
	}
	this.seek = function(seconds) {
		if (seconds != null) {
			audio.currentTime = seconds;
			return this;
		} else {
			return audio.currentTime;
		}
	}
	this.next = function() {
		playlistIndex++;
		if (playlistIndex == opts.sources.length) {
			playlistIndex = 0;
			if (this.loop) {
					return this.play(opts.sources[playlistIndex]);
			} else {
				return this.pause();
			}
		} else {
				return this.play(opts.sources[playlistIndex]);
		}
	}
	this.prev = function() {
		playlistIndex--;
		if (playlistIndex < 0)
			playlistIndex = opts.sources.length - 1;
			return this.play(opts.sources[playlistIndex]);
	}

};

var vis = new Vis({
	sourceElement: '#music',
	preferredBarWidth: 30,
	sources: ['music/music.mp3'],
	volume: 0.1,
	loop: true,
	//hideIfZero: false,
	//numBars: 10,
	//color: 'rgba(255,255,255,.1)'
	//rainbowOpacity: 0.2
});