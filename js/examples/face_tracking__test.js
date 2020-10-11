/**
 * BRFv5 - Simple Blink Detection
 *
 * A simple approach with quite a lot false positives. Fast movement isn't handled
 * properly. Though this code is quite good when it comes to staring contest apps.
 *
 * For the last 13 frames (0.433 seconds at 30 FPS) it records the distance between
 * upper and lower lid. It looks at the first 3, the middle 3 and the last 3 frames
 * and compares the distances. If the middle segment is smaller than the other two,
 * it's a blink. This lags 0.25 seconds behind, but is instant enough in most cases.
 *
 * Only a 68 landmarks model is able to detect blinks.
 */

import { setupExample }                     from './setup__example.js'
import { trackCamera, trackImage }          from './setup__example.js'

import { drawCircles, drawTriangles }                      from '../utils/utils__canvas.js'
import { drawFaceDetectionResults }         from '../utils/utils__draw_tracking_results.js'
import { detectBlink }                      from '../utils/utils__blink_detection.js'

import { loadPNGOverlays, updateByFace }    from '../ui/ui__overlay__png.js'
import { hidePNGOverlay }                   from '../ui/ui__overlay__png.js'

import { brfv5 }                            from '../brfv5/brfv5__init.js'
import { colorPrimary, colorSecondary, colorTertiary }     from '../utils/utils__colors.js'
import {faceTriangles68l} from "../utils/utils__face_triangles.js";

let _leftEyeBlinked         = false;
let _rightEyeBlinked        = false;

let _leftEyeTimeOut         = -1;
let _rightEyeTimeOut        = -1;

const _leftEyeLidDistances  = [];
const _rightEyeLidDistances = [];

let logTwentyTimes = 0;
let logInterval = 100;

const _images = [
  {url:'./assets/brfv5_img_center.png', alpha: 1.0, scale: 1.0, xOffset: 0.0, yOffset:0.0},
  {url:'./assets/brfv5_img_left.png', alpha: 1.0, scale: 1.0, xOffset: 0.0, yOffset:0.0},
  {url:'./assets/brfv5_img_right.png', alpha: 1.0, scale: 1.0, xOffset: 0.0, yOffset:0.0},
  {url:'./assets/brfv5_img_mouth.png', alpha: 1.0, scale: 1.0, xOffset: 0.0, yOffset:0.0},
  {url:'./assets/brfv5_img_eye_right.png', alpha: 1.0, scale: 1.0, xOffset: 0.0, yOffset:0.0},
  {url:'./assets/brfv5_img_eye_left.png', alpha: 1.0, scale: 1.0, xOffset: 0.0, yOffset:0.0},
]

let loadedImagesOnce = false;

export const configureExample = (brfv5Config) => {

  if (!loadedImagesOnce){
    loadedImagesOnce = true;
    loadPNGOverlays(_images);
  }
}

export const handleTrackingResults = (brfv5Manager, brfv5Config, canvas) => {

  const ctx   = canvas.getContext('2d')
  const faces = brfv5Manager.getFaces()

  let doDrawFaceDetection = false

  for(let i = 0; i < faces.length; i++) {

    const face = faces[i];

    if(face.state === brfv5.BRFv5State.FACE_TRACKING) {

      //ctx.clearRect(0, 0, canvas.width, canvas.height);
      //ctx.rect(0, 0, canvas.width, canvas.height);
      //ctx.fillStyle = "green";
      //ctx.fill();
      const lm                = face.landmarks;

      const turnAmount = (lm[30].x - face.bounds.x) / face.bounds.width;

      //ctx.drawImage(_images[0].image, face.translationX - _images[0].image.width * 0.5, face.translationY - _images[0].image.height * 0.5);
      const imageHeight = _images[0].image.height;
      const imageWidth = _images[0].image.width;
      const yCoord = (lm[14].y + lm[2].y - face.bounds.width * (imageHeight/imageWidth)) / 2;
      if (turnAmount < 0.3){
        ctx.drawImage(_images[1].image, face.bounds.x, yCoord, face.bounds.width,face.bounds.width * (imageHeight/imageWidth));
      } else if (turnAmount > 0.7){
        ctx.drawImage(_images[2].image, face.bounds.x, yCoord, face.bounds.width,face.bounds.width * (imageHeight/imageWidth));
      } else {
        ctx.drawImage(_images[0].image, face.bounds.x, yCoord, face.bounds.width,face.bounds.width * (imageHeight/imageWidth));
      }

      //ctx.drawImage(_images[3].image, lm[48].x, lm[62].y, lm[54].x - lm[48].x, lm[57].y - lm[62].y);
      ctx.drawImage(_images[3].image, face.bounds.x - ((lm[54].x - lm[48].x) / 2) + face.bounds.width / 2, (lm[14].y + lm[2].y + face.bounds.width * (imageHeight/imageWidth) * 0.4) / 2, lm[54].x - lm[48].x, lm[57].y - lm[62].y);
      ctx.drawImage(_images[4].image, face.bounds.x, yCoord, face.bounds.width,face.bounds.width * (_images[4].image.height/_images[4].image.width));

      //drawCircles(ctx, face.landmarks, colorPrimary, 2.0);
      drawTriangles(ctx, face.vertices, faceTriangles68l, 1.5, colorPrimary, 0.4);
      // // Select the eye landmarks, then detect blinks for left and right individually:
      //
      // const leftEyeLandmarks  = [lm[36], lm[39], lm[37], lm[38], lm[41], lm[40]];
      // const rightEyeLandmarks = [lm[45], lm[42], lm[44], lm[43], lm[46], lm[47]];
      //
      // detectBlinkLeft( leftEyeLandmarks,  _leftEyeLidDistances,  ctx);
      // detectBlinkRight(rightEyeLandmarks, _rightEyeLidDistances, ctx);
      //
      // console.log(face);
      //
      // // White for blink, blue for no blink:
      //
      // drawCircles(ctx, leftEyeLandmarks,
      //     _leftEyeBlinked ? colorSecondary : colorPrimary, 3.0);
      // drawCircles(ctx, rightEyeLandmarks,
      //     _rightEyeBlinked ? colorSecondary : colorPrimary, 3.0);

      drawCircles(ctx, [lm[30]], colorTertiary, 2.0);
      if (logTwentyTimes < 4){
        logInterval --;
        if (logInterval === 0){
          logInterval = 100;
          logTwentyTimes ++;

          console.log(face);
          console.log(lm[30]);
          console.log(_images);
        }
      }

    } else {

      _leftEyeLidDistances.length  = 0;
      _rightEyeLidDistances.length = 0;

      ctx.clearRect(0,0,canvas.width, canvas.height);

      //doDrawFaceDetection = true;
    }
  }

  if(doDrawFaceDetection) {
    drawFaceDetectionResults(brfv5Manager, brfv5Config, canvas)
  }

  return false
}

const detectBlinkLeft = (lm, distances) => {

  const blinked = detectBlink(lm[0], lm[1], lm[2], lm[3], lm[4], lm[5], distances);

  // Keep a blink status for 0.150 seconds, then reset:

  if(blinked) {

    // Set blinked! Reset after 150ms.

    _leftEyeBlinked = true;

    if(_leftEyeTimeOut > -1) { clearTimeout(_leftEyeTimeOut); }

    _leftEyeTimeOut = setTimeout(() => { _leftEyeBlinked = false; }, 150);
  }
}

const detectBlinkRight = (lm, distances) => {

  const blinked = detectBlink(lm[0], lm[1], lm[2], lm[3], lm[4], lm[5], distances);

  if(blinked) {

    // Set blinked! Reset after 150ms.

    _rightEyeBlinked = true;

    if(_rightEyeTimeOut > -1) { clearTimeout(_rightEyeTimeOut); }

    _rightEyeTimeOut = setTimeout(() => { _rightEyeBlinked = false; }, 150);
  }
}

const exampleConfig = {

  onConfigure:              configureExample,
  onTracking:               handleTrackingResults
}

// run() will be called automatically after 1 second, if run isn't called immediately after the script was loaded.
// Exporting it allows re-running the configuration from within other scripts.

let timeoutId = -1

export const run = () => {

  clearTimeout(timeoutId)
  setupExample(exampleConfig)

  if(window.selectedSetup === 'image') {

    trackImage('./assets/tracking/' + window.selectedImage)

  } else {

    trackCamera()
  }
}

timeoutId = setTimeout(() => { run() }, 1000)

export default { run }
