const socket = io();

const roomCreateCont = document.getElementById("roomCreateCont");
const roomCreateForm = document.getElementById("roomCreateForm");
const roomNameInput = document.getElementById("roomName");

const videoChatCont = document.getElementById("videoChatCont");
const myFace = document.getElementById("myFace");
const micBtn = document.getElementById("micBtn");
const videoBtn = document.getElementById("videoBtn");
const camSelect = document.getElementById("camSelect");
const friendFace = document.getElementById("friendFace");

let roomName;
let stream;
let muteBtn = true;
let videoOnOff = true;
let myPeerConnection;
let myDataChannel;

async function findDevices() {
  try {
    const myAllDevice = await navigator.mediaDevices.enumerateDevices();
    const myCamDevice = myAllDevice.filter(
      (device) => device.kind === "videoinput"
    );
    const currentCam = stream.getVideoTracks()[0];
    camSelect.innerHTML = "";
    myCamDevice.forEach((each) => {
      const option = document.createElement("option");
      option.value = each.deviceId;
      option.innerText = each.label;
      if (currentCam.label === each.label) {
        option.selected = true;
      }
      camSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}
async function getMedia(constraints) {
  const basicConstraints = {
    audio: true,
    video: {facingMode: "user"},
  };
  const mutateConstraints = {
    audio: true,
    video: {
      deviceId: constraints,
    },
  };
  try {
    stream = await navigator.mediaDevices.getUserMedia(
      !constraints ? basicConstraints : mutateConstraints
    );

    if (!constraints) {
      await findDevices();
    }
    myFace.srcObject = stream;
  } catch (e) {
    console.log(e);
  }
}
async function handleCamChange() {
  await getMedia(camSelect.value);
  if (myPeerConnection) {
    const videoTrack = stream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}
async function handleRoomCreate(event) {
  event.preventDefault();
  roomName = roomNameInput.value;
  await getMedia();
  makePeerConnection();
  socket.emit("room_create", roomName);
  roomNameInput.value = "";
}
function handleMute() {
  stream.getAudioTracks().forEach((each) => (each.enabled = !each.enabled));
  if (!muteBtn) {
    muteBtn = true;
    micBtn.innerText = "MIC MUTE";
  } else {
    muteBtn = false;
    micBtn.innerText = "MIC UNMUTE";
  }
}
function handleVideoOnOff() {
  stream.getVideoTracks().forEach((each) => (each.enabled = !each.enabled));
  if (!videoOnOff) {
    videoOnOff = true;
    videoBtn.innerText = "VIDEO OFF";
  } else {
    videoOnOff = false;
    videoBtn.innerText = "VIDEO ON";
  }
}

roomCreateForm.addEventListener("submit", handleRoomCreate);
micBtn.addEventListener("click", handleMute);
videoBtn.addEventListener("click", handleVideoOnOff);
camSelect.addEventListener("input", handleCamChange);

async function makePeerConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          //개인 고유의 stun 서버가 필요하다
          //아래는 테스트용으로만 사용
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  stream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, stream));
  myPeerConnection.addEventListener("icecandidate", handleICECandidate);
  myPeerConnection.addEventListener("track", handleAddTrack);
}

function handleICECandidate(data) {
  socket.emit("send_ice", data.candidate, roomName);
}
function handleAddTrack(data) {
  friendFace.srcObject = data.streams[0];
}

socket.on("join_room", async () => {
  const offer = await myPeerConnection.createOffer();
  await myPeerConnection.setLocalDescription(offer);
  socket.emit("send_offer", roomName, offer);
});

socket.on("receive_offer", async (offer) => {
  myPeerConnection.setRemoteDescription(offer);
  const receivedDone = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(receivedDone);
  socket.emit("received_doneSig", receivedDone, roomName);
});
socket.on("answer_offer", (doneSign) => {
  myPeerConnection.setRemoteDescription(doneSign);
});

socket.on("received_ice", (ice) => {
  myPeerConnection.addIceCandidate(ice);
});
