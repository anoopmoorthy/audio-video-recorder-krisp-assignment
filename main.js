/**
 * @class CommandPublisher
 * @description
 * The `CommandPublisher` class provides a basic implementation of the Publisher-Subscriber (Pub-Sub) pattern.
 * It allows subscribers to register callbacks for specific actions and dispatches commands to notify those subscribers.
 * 
 * @example
 * // Create a new instance of CommandPublisher
 * const commandPublisher = new CommandPublisher();
 * 
 * // Subscribe to an action
 * commandPublisher.subscribe('ACTION_TYPE', (payload) => {
 *     console.log('Action received:', payload);
 * });
 * 
 * // Dispatch a command
 * commandPublisher.dispatch({ action: 'ACTION_TYPE', payload: 'Data' });
 * 
 * // Output: Action received: Data
 */
class CommandPublisher {
    constructor() {
        this.subscribers = {};
    }

    subscribe(action, callback) {
        if (!this.subscribers[action]) {
            this.subscribers[action] = [];
        }
        this.subscribers[action].push(callback);
    }

    dispatch(command) {
        const { action, payload } = command;
        if (this.subscribers[action]) {
            this.subscribers[action].forEach(callback => callback(payload));
        }
    }
}
/**
 * @function captureImageData
 * @description
 * Handles the file input change event to read and load an image file. 
 * Once the image is loaded, its metadata (name, width, height) and the image object are packaged into a payload 
 * and dispatched through the `commandPublisher` with the action 'IMAGE_UPLOADED'.
 * 
 * @param {Event} event - The file input change event. The file should be selected from an <input type="file"> element.
 * 
 */
function captureImageData(event) {
    // Get the first file from the input event
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        // When the file is successfully read, this function is triggered
        reader.onload = function (e) {
            const image = new Image();
            image.src = e.target.result;
            image.onload = function () {
                const data = {
                    name: file.name,
                    image: image,
                    width: image.width,
                    height: image.height
                };
                // Dispatch the image data using the CommandPublisher with the 'IMAGE_UPLOADED' action
                commandPublisher.dispatch({ action: 'IMAGE_UPLOADED', payload: data });
            };
        };
        reader.readAsDataURL(file);
    }
    // Reset the input value to allow the same file to be selected again
    event.target.value = null;
}
/**
 * @function audioVideoStream
 * @description
 * Requests access to the user's audio and video streams using the appropriate `getUserMedia` method based on the browser's implementation.
 * Returns a Promise that resolves with the media stream if successful or logs an error if the request fails.
 * 
 * @returns {Promise<MediaStream>} A Promise that resolves with the `MediaStream` object containing the user's audio and video streams.
 * 
 */
function audioVideoStream() {
    return new Promise((resolve, reject) => {
        let options = {
            video: true,
            audio: true
        };

        navigator.getMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia;

        function success(stream) {
            resolve(stream);
        }
        function failure(error) {
            console.error("Error", error.code);
        }
        navigator.getMedia(options, success, failure);
    });
}
/**
 * @function ListManager
 * @description
 * A factory function that creates a `ListManager` object for managing a list of HTML elements. 
 * It provides methods to add and remove items from the list, and uses a user-supplied `createListItem` function 
 * to generate the HTML elements that are appended to the container.
 * 
 * @param {Object} options - Configuration options for the `ListManager`.
 * @param {HTMLElement} options.container - The container element where list items will be appended.
 * @param {Function} options.createListItem - A user-supplied function to create HTML elements for the list items.
 * 
 * @returns {Object} An instance of the `ListManager` with methods to manage the list.
 * @property {Array} list - An internal array to hold list items.
 * @property {Object} index - An internal object to index list items by their ID.
 * @property {Function} add - Method to add an item to the list.
 * @property {Function} remove - Method to remove an item from the list.
 * 
 */
const ListManager = (function () {
    let api = {
        add: function (o) {
            this.index[o.id] = this.createListItem.call(this, o);
            this.container.appendChild(this.index[o.id]);
        },
        remove: function (o) {
            this.index[o.id].parentNode.removeChild(this.index[o.id]);
            delete this.index[o.id];
        }
    };

    return function (options) {
        let list = [];
        let index = {};
        let $ = {
            list: list,
            index: index,
            ...api,
            ...options
        };
        return $;
    }
})();
/**
 * @function CanvasControl
 * @description
 * Creates an instance of `CanvasControl` for managing and manipulating a HTML canvas element. 
 * It provides methods for controlling playback, recording, layer management, and audio volume adjustments.
 * 
 * @param {Object} options - Configuration options for the `CanvasControl`.
 * @param {HTMLCanvasElement} options.canvas - The canvas element used for drawing and rendering.
 * @param {HTMLElement} [options.overlay] - Element displayed during recording.
 * @param {HTMLMediaElement} [options.source] - Media source (e.g., video element) for rendering on the canvas.
 * @param {HTMLElement} [options.volume] - Element representing the volume control.
 * @param {HTMLMediaElement} [options.playback] - Element for playback of recorded content.
 * 
 * @returns {Object} An instance of `CanvasControl` with methods to manage canvas operations.
 * @property {Array} layers - Array of layers added to the canvas.
 * @property {Object} contexts - Dictionary of layer contexts indexed by their IDs.
 * @property {Function} setStream - Sets up the media stream for audio and video recording.
 * @property {Function} setCanvas - Sets the canvas element to be used for drawing.
 * @property {Function} getContext - Retrieves the 2D rendering context of the canvas.
 * @property {Function} addLayer - Adds a layer to the canvas with specified rendering function.
 * @property {Function} removeLayer - Removes a layer from the canvas by its ID.
 * @property {Function} draw - Draws all active layers on the canvas.
 * @property {Function} play - Starts playback of the media source and drawing interval.
 * @property {Function} stop - Stops playback of the media source and drawing interval.
 * @property {Function} drag - Attaches a mousemove event listener to track mouse position on the canvas.
 * @property {Function} startRecord - Starts recording the canvas and audio.
 * @property {Function} stopRecord - Stops recording and processes the recorded data.
 * @property {Function} volumeIncrease - Increases the audio volume.
 * @property {Function} volumeDecrease - Decreases the audio volume.
 */
const CanvasControl = (function () {

    let api = {
        setStream: function (stream) {
            const canvasVideoStream = this.canvas.captureStream(30);

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const gainNode = audioContext.createGain()
            const mediaStreamAudioSourceNode = audioContext.createMediaStreamSource(stream);
            mediaStreamAudioSourceNode.connect(gainNode);
            const destination = audioContext.createMediaStreamDestination();
            gainNode.connect(destination);

            const combinedStream = new MediaStream([
                ...canvasVideoStream.getVideoTracks(),
                ...destination.stream.getAudioTracks()
                //...stream.getAudioTracks()
            ]);
            this.gainNode = gainNode;
            this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
            this.stream = stream;
            this.chunks = [];
            function bufferChunks(event) {
                if (event.data.size > 0) {
                    this.chunks.push(event.data);
                }

            }
            function storeChunks() {
                const blob = new Blob(this.chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                this.playback.src = url;
                /*
                    a.style.display = 'none';
                    a.href = url;
                    a.download = 'recorded-video.webm';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }, 100);
                */

                this.chunks = [];
            };
            this.mediaRecorder.ondataavailable = bufferChunks.bind(this);
            this.mediaRecorder.onstop = storeChunks.bind(this);
        },
        setCanvas: function (canvas) {
            this.canvas = canvas;
        },
        getContext: function () {
            return this.canvas.getContext('2d');
        },
        getLayerContext: function () {

        },
        /**
         * @method addLayer
         * @description
         * Adds a layer to the canvas with a specified rendering function and optional setup function.
         * 
         * @param {number|null} id - The ID of the layer. If null, an ID will be generated based on the layer count.
         * @param {Function} render - The function used to render the layer.
         * @param {Function} [context] - Optional setup function for the layer context.
         * 
         * @throws {Error} If a layer with the same ID already exists.
         */
        addLayer: function (id, render, context) {
            if (this.layers.find(layer => layer.id === id)) {
                throw new Error(`Layer id: ${id} exists`);
            } else {
                id = id || this.layers.length;
                this.contexts[id] = {
                    id: id,
                    render: render,
                    active: true,
                    context: this.getContext(),
                    canvas: this.canvas
                };
                context && context.call(this, this.contexts[id]);
                this.layers.push(this.contexts[id]);
            }
        },
        removeLayer: function (id) {
            let layer = null;
            if (layer = this.layers.find(layer => layer.id === parseInt(id))) {
                this.layers.splice(this.layers.indexOf(layer), 1);
            }
        },
        draw: function () {
            this.layers.forEach(layer => {
                layer.active && layer.render.call(this, layer);
            });
        },
        play: function (event) {
            event.preventDefault();
            this.source.paused && this.source.play();
            if (this.interval === null) {
                this.interval = setInterval(this.draw.bind(this), 0);
            }
        },
        stop: function (event) {
            event.preventDefault();
            !this.source.paused && this.source.pause();
            clearInterval(this.interval);
            this.interval = null;
        },
        drag: function () {
            this.canvas.addEventListener('mousemove', (event) => {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                console.log(mouseX, mouseY);
            });
        },
        startRecord: function (event) {
            event.preventDefault();
            if (this.mediaRecorder.state !== 'recording') {
                this.overlay.style.display = 'block';
                this.mediaRecorder.start();
            }
        },
        stopRecord: function (event) {
            event.preventDefault();
            this.mediaRecorder.stop();
            this.overlay.style.display = '';
        },
        volumeIncrease: function () {
            let gain = this.gainNode.gain.value;
            if (gain < 1) {
                let value = Math.min(gain + 0.1, 1);
                this.volume.style.height = `${Math.floor(value * 100)}%`;
                this.gainNode.gain.value = value;
            }
        },
        volumeDecrease: function () {
            let gain = this.gainNode.gain.value;
            if (gain > 0) {
                let value = Math.max(gain - 0.1, 0);
                this.volume.style.height = `${Math.floor(value * 100)}%`;
                this.gainNode.gain.value = value;
            }
        },
        notify: function (event) {
            switch (event.action) {
                case 'PLAY':
                    this.play(event.event);
                    break;
                case 'STOP':
                    this.stop(event.event);
                    break;
                case 'VOLUME_UP':
                    this.volumeIncrease();
                    break;
                case 'VOLUME_DOWN':
                    this.volumeDecrease();
                    break;
                case 'START_RECORD':
                    this.startRecord(event.event);
                    break;
                case 'STOP_RECORD':
                    this.stopRecord(event.event);
                    break;
            }
        },
        setSource: function(stream){
            this.source = document.createElement('video');
            if ('srcObject' in this.source) {
                this.source.srcObject = stream;
            } else {
                this.source.src = URL.createObjectURL(stream);
            }
            this.setStream(stream);
        }
    }

    return function (options) {

        let $ = {
            audio: null,
            interval: null,
            layers: [],
            contexts: {},
            ...options,
            ...api,
            initialize: function () {
                if (options.canvas) {
                    options.canvas.originClean = true;
                    this.setCanvas(options.canvas);
                }
                options.streamProvider().then($.setSource.bind($));
            }
        };
        $.initialize();
        return $;
    };
})();