let currentImageIndex = 0;
let images = [];
let touchStartX = 0;
let touchStartY = 0;
let isAnimating = false;
let activeImageElement = null; // Track which element is showing the current image

const imageContainer = document.getElementById('imageContainer');
const imageWrapper = document.getElementById('imageWrapper');
const currentImage = document.getElementById('currentImage');
const nextImage = document.getElementById('nextImage');
const emptyState = document.getElementById('emptyState');
const status = document.getElementById('status');

// Load images on page load
loadImages();

// Poll for new images every 3 seconds
setInterval(async () => {
  try {
    const response = await fetch('/api/images');
    const data = await response.json();
    
    // If we're on empty state and new images appear, reload
    if (images.length === 0 && data.images.length > 0) {
      location.reload();
    }
    
    // If image count changed (added or removed), reload
    if (data.images.length !== images.length && images.length > 0) {
      location.reload();
    }
  } catch (error) {
    console.error('Error checking for new images:', error);
  }
}, 3000);

async function loadImages() {
  try {
    const response = await fetch('/api/images');
    const data = await response.json();
    images = data.images;
    currentImageIndex = 0;

    if (images.length === 0) {
      showEmptyState();
    } else {
      showImage();
    }
  } catch (error) {
    console.error('Error loading images:', error);
    showEmptyState();
  }
}

function showEmptyState() {
  imageWrapper.style.display = 'none';
  emptyState.style.display = 'flex';
  status.textContent = '';
  
  // Reset background color smoothly
  imageContainer.style.transition = 'background-color 0.3s ease';
  imageContainer.style.backgroundColor = '#000';
}

function showImage() {
  if (currentImageIndex >= images.length) {
    showEmptyState();
    return;
  }

  emptyState.style.display = 'none';
  imageWrapper.style.display = 'flex';

  const imageName = images[currentImageIndex];
  
  // Check if the active element already has the correct image loaded and visible
  if (activeImageElement && 
      activeImageElement.src.includes(encodeURIComponent(imageName)) && 
      parseFloat(activeImageElement.style.opacity) >= 0.9) {
    // Already showing the correct image, just reset transform and preload next
    activeImageElement.style.transform = '';
    activeImageElement.style.zIndex = '2';
    
    // Preload next image in the other element
    const preloadElement = activeImageElement === currentImage ? nextImage : currentImage;
    if (currentImageIndex + 1 < images.length) {
      const nextImageName = images[currentImageIndex + 1];
      preloadElement.src = `/toSort/${encodeURIComponent(nextImageName)}`;
      preloadElement.style.opacity = '0';
      preloadElement.style.transition = 'none';
      preloadElement.style.zIndex = '1';
      preloadElement.style.transform = '';
    } else {
      preloadElement.src = '';
      preloadElement.style.opacity = '0';
    }
  } else {
    // Need to load the image - use whichever element is available
    let targetElement, preloadElement;
    
    if (!activeImageElement) {
      // First load
      targetElement = currentImage;
      preloadElement = nextImage;
    } else {
      // Use the non-active element
      targetElement = activeImageElement === currentImage ? nextImage : currentImage;
      preloadElement = activeImageElement;
    }
    
    targetElement.src = `/toSort/${encodeURIComponent(imageName)}`;
    targetElement.style.transform = '';
    targetElement.style.transition = 'none';
    targetElement.style.opacity = '0';
    targetElement.style.zIndex = '2';
    
    targetElement.onload = () => {
      requestAnimationFrame(() => {
        targetElement.style.transition = 'opacity 0.15s ease';
        targetElement.style.opacity = '1';
      });
    };
    
    activeImageElement = targetElement;
    
    // Preload next image
    if (currentImageIndex + 1 < images.length) {
      const nextImageName = images[currentImageIndex + 1];
      preloadElement.src = `/toSort/${encodeURIComponent(nextImageName)}`;
      preloadElement.style.opacity = '0';
      preloadElement.style.transition = 'none';
      preloadElement.style.zIndex = '1';
      preloadElement.style.transform = '';
    } else {
      preloadElement.src = '';
      preloadElement.style.opacity = '0';
    }
  }

  status.textContent = `${images.length - currentImageIndex} remaining`;
}

async function moveImage(action) {
  if (isAnimating || currentImageIndex >= images.length || !activeImageElement) return;

  isAnimating = true;
  const imageName = images[currentImageIndex];
  
  const oldActiveElement = activeImageElement;

  // Remove swiping class so transitions work, and explicitly set transition
  activeImageElement.classList.remove('swiping');
  activeImageElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

  // Set final position and opacity - will transition smoothly from current position
  if (action === 'approve') {
    activeImageElement.style.transform = 'translateX(150vw) rotateZ(15deg)';
  } else {
    activeImageElement.style.transform = 'translateX(-150vw) rotateZ(-15deg)';
  }
  activeImageElement.style.opacity = '0';

  // Smoothly reset background to black
  imageContainer.style.transition = 'background-color 0.3s ease';
  imageContainer.style.backgroundColor = '#000';
  
  // Fade in the preloaded next image fully as current image swipes away
  if (currentImageIndex + 1 < images.length) {
    const preloadElement = activeImageElement === currentImage ? nextImage : currentImage;
    preloadElement.style.transition = 'opacity 0.3s ease';
    preloadElement.style.opacity = '1';
    preloadElement.style.zIndex = '2';
    // Switch active element to the one that just faded in
    activeImageElement = preloadElement;
    
    // Ensure old element is properly hidden
    oldActiveElement.style.zIndex = '1';
  }

  try {
    const endpoint = action === 'approve' ? '/api/approve' : '/api/decline';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: imageName })
    });

    if (response.ok) {
      // Remove the image from our local array to keep count in sync
      images.splice(currentImageIndex, 1);
      setTimeout(() => {
        showImage();
        isAnimating = false;
      }, 300);
    } else {
      console.error('Failed to move image');
      isAnimating = false;
    }
  } catch (error) {
    console.error('Error moving image:', error);
    isAnimating = false;
  }
}

// Touch swipe detection
imageWrapper.addEventListener('touchstart', (e) => {
  if (isAnimating) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

imageWrapper.addEventListener('touchmove', (e) => {
  if (isAnimating || !activeImageElement) return;
  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;
  const diffX = currentX - touchStartX;
  const diffY = currentY - touchStartY;

  // Only process horizontal swipes (not vertical)
  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (e.cancelable) {
      e.preventDefault();
    }
    const rotation = (diffX / window.innerWidth) * 15;
    activeImageElement.style.transform = `translateX(${diffX}px) rotateZ(${rotation}deg)`;
    activeImageElement.classList.add('swiping');
    
    // Update background color based on swipe distance
    const swipePercent = Math.min(Math.abs(diffX) / window.innerWidth, 1);
    const bgOpacity = Math.min(swipePercent * 2, 1); // Full opacity at 50% swipe
    if (diffX > 0) {
      // Swiping right - show green
      imageContainer.style.backgroundColor = `rgba(72, 180, 67, ${bgOpacity})`;
    } else {
      // Swiping left - show red
      imageContainer.style.backgroundColor = `rgba(200, 54, 45, ${bgOpacity})`;
    }
    
    // Fade in the preloaded next image as we swipe
    if (currentImageIndex + 1 < images.length) {
      const preloadElement = activeImageElement === currentImage ? nextImage : currentImage;
      preloadElement.style.transition = 'none';
      preloadElement.style.opacity = `${swipePercent * 0.7}`;
    }
  }
}, { passive: false });

imageWrapper.addEventListener('touchend', (e) => {
  if (isAnimating || !activeImageElement) return;

  const currentX = e.changedTouches[0].clientX;
  const diffX = currentX - touchStartX;
  const threshold = window.innerWidth * 0.2;

  activeImageElement.classList.remove('swiping');

  if (Math.abs(diffX) > threshold) {
    if (diffX > 0) {
      moveImage('approve');
    } else {
      moveImage('decline');
    }
  } else {
    activeImageElement.style.transform = '';
    // Reset background color smoothly
    imageContainer.style.transition = 'background-color 0.3s ease';
    imageContainer.style.backgroundColor = '#000';
    // Fade out next image preview
    const preloadElement = activeImageElement === currentImage ? nextImage : currentImage;
    preloadElement.style.transition = 'opacity 0.3s ease';
    preloadElement.style.opacity = '0';
    setTimeout(() => {
      imageContainer.style.transition = 'none';
      preloadElement.style.transition = 'none';
    }, 300);
  }
});
