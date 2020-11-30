import './main.css';

const player = document.querySelector('#player');
const mount = document.querySelector('#mount');

// Safari...
const AudioContext =
	window.AudioContext || // Default
	window.webkitAudioContext || // Safari and old versions of Chrome
	false;

const audioContext = new AudioContext();
// If looking for low latency (i.e. guitar plugged into live input)
// const audioContext = new AudioContext({ latencyHint: 0.00001});
const mediaElementSource = audioContext.createMediaElementSource(player);

let currentPluginAudioNode, liveInputGainNode;

// Very simple function to connect the plugin audionode to the host
const connectPlugin = (audioNode) => {
	if (currentPluginAudioNode) {
		mediaElementSource.disconnect(currentPluginAudioNode);
		currentPluginAudioNode.disconnect(audioContext.destination);
		currentPluginAudioNode = null;
	}

	liveInputGainNode.connect(audioNode);
	console.log('connected live input node to plugin node');

	mediaElementSource.connect(audioNode);
	audioNode.connect(audioContext.destination);
	currentPluginAudioNode = audioNode;
};

// Very simple function to append the plugin root dom node to the host
const mountPlugin = (domNode) => {
	mount.innerHTML = '';
	mount.appendChild(domNode);
};

const form = document.querySelector('#form');
const examples = document.querySelectorAll('#examples > li');

Array.from(examples).forEach((example) => {
	example.addEventListener('click', () => {
		const pluginUrl = `/packages/${example.dataset.pluginUrl}/index.js`;
		form.pluginUrl.value = pluginUrl;
	});
});

let state;

const setPlugin = async (pluginUrl) => {
	// Load plugin from the url of its json descriptor
	// Pass the option { noGui: true } to not load the GUI by default
	// IMPORTANT NOTICE :
	// In order to be able to load the plugin in this example host,
	// you must add the plugin to the field webaudiomodules
	// in the package.json. Example :
	// "webaudiomodules": {
	//     "pingpongdelay": "dist", // you should replace dist with the build directory of your plugin
	//     "yourplugin": "dist"
	// }
	const { default: WAM } = await import(pluginUrl);

	// Create a new instance of the plugin
	// You can can optionnally give more options such as the initial state of the plugin
	const instance = await WAM.createInstance(audioContext, {
		params: {
			feedback: 0.7,
		},
	});
	window.instance = instance;
	// instance.enable();

	// Connect the audionode to the host
	connectPlugin(instance.audioNode);

	audioContext.resume();
	//player.play();

	// Load the GUI if need (ie. if the option noGui was set to true)
	// And calls the method createElement of the Gui module
	const pluginDomNode = await instance.createGui();

	// Show plugin info
	showPluginInfo(instance, pluginDomNode);

	mountPlugin(pluginDomNode);

	const saveStateButton = document.querySelector('#saveStateButton');
	const restoreStateButton = document.querySelector('#restoreStateButton');

	saveStateButton.disabled = false; // enable save state button
	restoreStateButton.disabled = true; // disable restore state button

	saveStateButton.onclick = async () => {
		console.log('Saving state...');
		state = await instance.audioNode.getState();
		restoreStateButton.disabled = false;
	};

	restoreStateButton.onclick = () => {
		console.log('Restoring state...');
		instance.audioNode.setState(state);
	};
};

form.addEventListener('submit', (event) => {
	event.preventDefault();
	const pluginUrl = form.pluginUrl.value;
	setPlugin(pluginUrl);
});

// ----- DISPLAY PLUGIN INFO -----
async function showPluginInfo(instance, gui) {
	let pluginInfoDiv = document.querySelector('#pluginInfoDiv');
	let paramInfos = await instance.audioNode.getParameterInfo();
	let guiWidth = undefined,
		guiHeight = undefined;
	try {
		guiWidth = gui.properties.dataWidth.value;
		guiHeight = gui.properties.dataHeight.value;
	} catch (err) {
		guiWidth = 'undefined, (you should define get properties in Gui.js)';
		guiHeight = 'undefined, (you should define get properties in Gui.js)';
	}

	let parameterList = '';

	for (const [key, value] of Object.entries(paramInfos)) {
		parameterList += `<li><b>${key}</b> : ${JSON.stringify(value)}</li>`;
	}

	pluginInfoDiv.innerHTML = `
	<li><b>instance.name :</b> ${instance.name}</li>
	<li><b>instance.vendor :</b> ${instance.vendor}</li>
	<li><b>gui.properties.dataWidth.value</b> : ${guiWidth}</li>
	<li><b>gui.properties.dataHeight.value</b> : ${guiHeight}</li>
	<li><b>instance.audioNode.getParameterInfo() :</b>
		<ul>
		   ${parameterList}
		</ul>
	</li>
	`;
}
// ------- LIVE INPUT ------
// live input
var liveInputActivated = false;
let inputStreamNode;

function convertToMono(input) {
	var splitter = audioContext.createChannelSplitter(2);
	var merger = audioContext.createChannelMerger(2);

	input.connect(splitter);
	splitter.connect(merger, 0, 0);
	splitter.connect(merger, 0, 1);
	splitter.connect(merger, 1, 0);
	splitter.connect(merger, 1, 1);
	return merger;
}

var defaultConstraints = {
	audio: {
		echoCancellation: false,
		mozNoiseSuppression: false,
		mozAutoGainControl: false,
	},
};
// User input part
function setLiveInputToNewStream(stream) {
	window.stream = stream;
	inputStreamNode = audioContext.createMediaStreamSource(stream);
	let inputinputStreamNodeMono = convertToMono(inputStreamNode);

	liveInputGainNode = audioContext.createGain();

	liveInputGainNode.gain.value = liveInputActivated ? 1 : 0;
	console.log(
		'liveInputGainNode.gain.value = ' + liveInputGainNode.gain.value
	);
	inputinputStreamNodeMono.connect(liveInputGainNode);

	console.log('Live Input node created...');
}

// initial live input setup.
navigator.mediaDevices.getUserMedia(defaultConstraints).then((stream) => {
	setLiveInputToNewStream(stream);
});

navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

function handleDeviceChange(event) {
	console.log('### INPUT DEVICE LIST CHANGED');
	// let's rebuild the menu
	rebuildAudioDeviceMenu()();
}

let liveInputButton = document.querySelector('#toggleLiveInput');
liveInputButton.onclick = toggleLiveInput;

function toggleLiveInput(event) {
	audioContext.resume();

	var button = document.querySelector('#toggleLiveInput');

	if (!liveInputActivated) {
		button.innerHTML =
			"Live input: <span style='color:green;'>ACTIVATED</span>, click to toggle on/off!";
		liveInputGainNode.gain.setValueAtTime(1, audioContext.currentTime);
	} else {
		button.innerHTML =
			"Live input: <span style='color:red;'>NOT ACTIVATED</span>, click to toggle on/off!";
		liveInputGainNode.gain.setValueAtTime(0, audioContext.currentTime);
	}
	liveInputActivated = !liveInputActivated;
}

// -------- select audio input device ---------
let audioInput = document.querySelector('#selectAudioInput');

function gotDevices(deviceInfos) {
	// lets rebuild the menu
	audioInput.innerHTML = '';

	for (let i = 0; i !== deviceInfos.length; ++i) {
		const deviceInfo = deviceInfos[i];
		if (deviceInfo.kind === 'audioinput') {
			const option = document.createElement('option');
			option.value = deviceInfo.deviceId;
			option.text =
				deviceInfo.label || `microphone ${audioInput.length + 1}`;
			audioInput.appendChild(option);
			console.log('adding ' + option.text);
		} else {
			console.log('Some other kind of source/device: ', deviceInfo);
		}
	}
}

buildAudioDeviceMenu();

function rebuildAudioDeviceMenu() {
	console.log('REBUILDING INPUT DEVICE MENU');
	buildAudioDeviceMenu();
	console.log('RE OPENING INPUT LIVE STREAM WITH DEFAULT DEVICE');
	// initial live input setup.
	let defaultConstraints = {
		audio: {
			echoCancellation: false,
			mozNoiseSuppression: false,
			mozAutoGainControl: false,
		},
	};
	navigator.mediaDevices.getUserMedia(defaultConstraints).then((stream) => {
		setLiveInputToNewStream(stream);
	});
	// rebuild graph with plugin
	console.log('REBUILDING GRAPH');
	const pluginUrl = form.pluginUrl.value;
	setPlugin(pluginUrl);
}

function buildAudioDeviceMenu() {
	console.log('BUILDING DEVICE MENU');
	navigator.mediaDevices
		.enumerateDevices()
		.then(gotDevices)
		.catch((error) => {
			console.log(
				'navigator.MediaDevices.getUserMedia error: ',
				error.message,
				error.name
			);
		});

	audioInput.onchange = (e) => {
		let index = e.target.selectedIndex;
		let id = e.target[index].value;
		let label = e.target[index].text;

		console.dir('Audio input selected : ' + label + ' id = ' + id);
		changeStream(id);
	};

	function changeStream(id) {
		var constraints = {
			audio: {
				echoCancellation: false,
				mozNoiseSuppression: false,
				mozAutoGainControl: false,
				deviceId: id
					? {
							exact: id,
					  }
					: undefined,
			},
		};
		navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
			setLiveInputToNewStream(stream);
			const pluginUrl = form.pluginUrl.value;
			setPlugin(pluginUrl);
		});
	}
}
