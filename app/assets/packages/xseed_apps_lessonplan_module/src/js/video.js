var player;
function initVideoPlayer(divElementId, source, retryCount = 5) {
  console.log("divElementId", divElementId)

  const divElement = document.getElementById(divElementId);

  if (!divElement) {
    if (retryCount >= 0) {
      retryCount -= 1;

      setTimeout(() => {
        initVideoPlayer(divElementId, source, retryCount);
      }, 100);
    }
  } else {
    const player = insertVideoElement(divElementId, source);
    player.play();
  }
}

function insertVideoElement(elementId, source) {
  const divElement = document.getElementById(elementId);
  divElement.innerHTML = `
  <video
    id="video-${elementId}"
    class="video-js vjs-default-skin vjs-big-play-centered"
    controls
    preload="auto"
    style='width: 100%;height: 100%;background-color: #fff;'
  >
    <source src='${source}' type='video/mp4'/>
  </video>`;

  const player = videojs(
    videoElementId(elementId),
    {
      disableVideoPlayPauseClick: true,
      controlBar: {
        playbackRateMenuButton: false,
        fullscreenToggle: false,
        pictureInPictureToggle: false
      },
      autoplay: true,
      userActions: { doubleClick: false }
    },
    function () {}
  );

  return player;
}

function videoElementId(elementId) {
  return `video-${elementId}`;
}

function toggleVideoPlayState(elementId) {
  const player = videojs(videoElementId(elementId));

  if (player) {
    if (player.paused()) {
      player.play();
    } else {
      player.pause();
    }
  }
}

async function cloneVideoPlayer(
  sourceId,
  destinationId,
  forcePlayVideo,
  retryCount = 10
) {
  const sourceElement = document.getElementById(sourceId);
  const destinationElement = document.getElementById(destinationId);

  if (!destinationElement) {
    if (retryCount >= 0) {
      retryCount -= 1;
      setTimeout(() => {
        cloneVideoPlayer(sourceId, destinationId, forcePlayVideo, retryCount);
      }, 100);
    }
  } else {
    const sourcePlayer = videojs(videoElementId(sourceId));

    if (sourcePlayer) {
      const destinationPlayer = insertVideoElement(
        destinationId,
        sourcePlayer.src()
      );
      const isSourceVideoPaused = sourcePlayer.paused();

      await destinationPlayer.currentTime(sourcePlayer.currentTime());
      await destinationPlayer.volume(sourcePlayer.volume());
      await destinationPlayer.muted(sourcePlayer.muted());

      if (forcePlayVideo) {
        destinationPlayer.play();
      } else {
        if (isSourceVideoPaused) {
          destinationPlayer.pause();
        } else {
          destinationPlayer.play();
        }
      }

      sourcePlayer.pause();
      sourcePlayer.dispose();
      sourceElement.innerHTML = "";
    }
  }
}
