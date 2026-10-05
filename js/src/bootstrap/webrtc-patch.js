// ─── js/src/bootstrap/webrtc-patch.js · neuters WebRTC to block IP leaks ───
// Replaces window.RTCPeerConnection with a wrapper whose getTransceivers()
// stops every transceiver and returns an empty list. Any page code probing
// WebRTC (e.g. to enumerate local IPs via ICE/SDP) gets nothing usable,
// while the constructor still works for sites that legitimately need it.
// Default RTC configuration: no STUN/TURN servers, unified-plan SDP.
const config = {
  iceServers: [],
  iceTransportPolicy: "all",
  bundlePolicy: "balanced",
  rtcpMuxPolicy: "require",
  sdpSemantics: "unified-plan",
  peerIdentity: null,
  certificates: [],
};
// Chrome-specific media constraints, every audio-processing / network
// behavior explicitly disabled.
const constraints = {
  optional: [
    {
      googIPv6: false,
    },
    {
      googDscp: false,
    },
    {
      googCpuOveruseDetection: false,
    },
    {
      googCpuUnderuseThreshold: 55,
    },
    {
      googCpuOveruseThreshold: 85,
    },
    {
      googSuspendBelowMinBitrate: false,
    },
    {
      googScreencastMinBitrate: 400,
    },
    {
      googCombinedAudioVideoBwe: false,
    },
    {
      googScreencastUseTransportCc: false,
    },
    {
      googNoiseReduction2: false,
    },
    {
      googHighpassFilter: false,
    },
    {
      googEchoCancellation3: false,
    },
    {
      googExperimentalEchoCancellation: false,
    },
    {
      googAutoGainControl2: false,
    },
    {
      googTypingNoiseDetection: false,
    },
    {
      googAutoGainControl: false,
    },
    {
      googBeamforming: false,
    },
    {
      googExperimentalNoiseSuppression: false,
    },
    {
      googEchoCancellation: false,
    },
    {
      googEchoCancellation2: false,
    },
    {
      googNoiseReduction: false,
    },
    {
      googExperimentalWebRtcEchoCancellation: false,
    },
    {
      googRedundantRtcpFeedback: false,
    },
    {
      googScreencastDesktopMirroring: false,
    },
    {
      googSpatialAudio: false,
    },
    {
      offerToReceiveAudio: false,
    },
    {
      offerToReceiveVideo: false,
    },
  ],
};
// Fold the constraints into the config object passed to the constructor.
Object.assign(config, constraints);
// Keep a reference to the browser's real RTCPeerConnection (vendor-prefixed
// fallbacks included) before overwriting the global.
const oldPeerConnection =
  window.RTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.mozRTCPeerConnection;
if (oldPeerConnection) {
  // Note: the "constraints" parameter shadows the module-level const above —
  // intentional pass-through of whatever the caller supplied.
  window.RTCPeerConnection = function (configuration, constraints) {
    const peerConnection = new oldPeerConnection(configuration, constraints);
    peerConnection.getTransceivers = function () {
      // Ask the real implementation for transceivers, stop them all, and
      // report none — the leak-prevention core of this patch.
      const transceivers =
        oldPeerConnection.prototype.getTransceivers.call(this);
      for (const transceiver of transceivers) {
        transceiver.stop();
      }
      return [];
    };
    return peerConnection;
  };
}
