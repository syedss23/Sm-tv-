// Clips Manager
class ClipsManager {
    constructor() {
        this.clipsContainer = document.getElementById('clipsContainer');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.errorMessage = document.getElementById('errorMessage');
        this.clips = [];
        this.currentClipIndex = 0;
        this.observer = null;
        this.isScrolling = false;
        this.scrollTimeout = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadClips();
            this.renderClips();
            this.setupScrollBehavior();
            this.hideLoading();
        } catch (error) {
            console.error('Error initializing clips:', error);
            this.showError();
        }
    }

    async loadClips() {
        try {
            const response = await fetch('clips.json');
            if (!response.ok) throw new Error('Failed to load clips');
            const data = await response.json();
            this.clips = data.clips;
        } catch (error) {
            throw error;
        }
    }

    renderClips() {
        if (!this.clips || this.clips.length === 0) {
            this.showError();
            return;
        }

        this.clipsContainer.innerHTML = this.clips.map((clip, index) => `
            <div class="clip-item" data-clip-index="${index}">
                <div class="video-wrapper">
                    <iframe 
                        src="${clip.embedUrl}" 
                        frameborder="0" 
                        allowfullscreen
                        allow="autoplay; fullscreen; accelerometer; gyroscope"
                        loading="${index === 0 ? 'eager' : 'lazy'}">
                    </iframe>
                </div>
                <div class="clip-info">
                    <div class="clip-series">${clip.series}</div>
                    <div class="clip-title">${clip.title}</div>
                    <div class="clip-description">${clip.description}</div>
                    <div class="clip-hashtags">${clip.hashtags.join(' ')}</div>
                </div>
                <div class="action-buttons">
                    <div>
                        <button class="action-btn like-btn" data-clip-id="${clip.id}">
                            ${clip.isLiked ? '❤️' : '🤍'}
                        </button>
                        <div class="action-count">${this.formatCount(clip.likes)}</div>
                    </div>
                    <div>
                        <button class="action-btn comment-btn" data-clip-id="${clip.id}">
                            💬
                        </button>
                        <div class="action-count">${this.formatCount(clip.comments)}</div>
                    </div>
                    <div>
                        <button class="action-btn share-btn" data-clip-id="${clip.id}">
                            ↗️
                        </button>
                        <div class="action-count">${this.formatCount(clip.shares)}</div>
                    </div>
                    <div>
                        <button class="action-btn download-btn" data-clip-id="${clip.id}">
                            ⬇️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        this.setupActionButtons();
    }

    setupActionButtons() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clipId = e.currentTarget.dataset.clipId;
                this.handleLike(clipId, e.currentTarget);
            });
        });

        // Comment buttons
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clipId = e.currentTarget.dataset.clipId;
                this.handleComment(clipId);
            });
        });

        // Share buttons
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clipId = e.currentTarget.dataset.clipId;
                this.handleShare(clipId);
            });
        });

        // Download buttons
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clipId = e.currentTarget.dataset.clipId;
                this.handleDownload(clipId);
            });
        });
    }

    setupScrollBehavior() {
        const clipItems = document.querySelectorAll('.clip-item');
        
        // Intersection Observer to track current clip
        const observerOptions = {
            root: this.clipsContainer,
            threshold: 0.6
        };

        this.observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.currentClipIndex = parseInt(entry.target.dataset.clipIndex);
                }
            });
        }, observerOptions);

        clipItems.forEach(clip => this.observer.observe(clip));

        // Smooth snap after scrolling stops
        this.clipsContainer.addEventListener('scroll', () => {
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
            this.isScrolling = true;

            this.scrollTimeout = setTimeout(() => {
                this.isScrolling = false;
                const currentClip = clipItems[this.currentClipIndex];
                if (currentClip) {
                    currentClip.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }, 150);
        });

        // Prevent fast scroll skipping on desktop
        this.clipsContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = Math.sign(e.deltaY);
            
            if (!this.isScrolling) {
                const nextIndex = this.currentClipIndex + delta;
                
                if (nextIndex >= 0 && nextIndex < clipItems.length) {
                    clipItems[nextIndex].scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }
        }, { passive: false });
    }

    handleLike(clipId, button) {
        const clip = this.clips.find(c => c.id === clipId);
        if (!clip) return;

        clip.isLiked = !clip.isLiked;
        clip.likes += clip.isLiked ? 1 : -1;

        button.textContent = clip.isLiked ? '❤️' : '🤍';
        button.classList.toggle('liked', clip.isLiked);
        
        const countElement = button.nextElementSibling;
        if (countElement) {
            countElement.textContent = this.formatCount(clip.likes);
        }

        // Save to localStorage
        this.saveLikeState(clipId, clip.isLiked);
    }

    handleComment(clipId) {
        const clip = this.clips.find(c => c.id === clipId);
        console.log('Comment on:', clip.title);
        // Implement comment functionality
        alert('Comments feature coming soon!');
    }

    handleShare(clipId) {
        const clip = this.clips.find(c => c.id === clipId);
        
        if (navigator.share) {
            navigator.share({
                title: clip.title,
                text: clip.description,
                url: window.location.href
            }).catch(err => console.log('Share cancelled'));
        } else {
            // Fallback copy to clipboard
            const shareUrl = `${window.location.origin}/clips/${clipId}`;
            navigator.clipboard.writeText(shareUrl);
            alert('Link copied to clipboard!');
        }
    }

    handleDownload(clipId) {
        const clip = this.clips.find(c => c.id === clipId);
        if (clip.downloadUrl) {
            window.open(clip.downloadUrl, '_blank');
        } else {
            alert('Download not available for this clip');
        }
    }

    formatCount(count) {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count.toString();
    }

    saveLikeState(clipId, isLiked) {
        const likes = JSON.parse(localStorage.getItem('clipLikes') || '{}');
        likes[clipId] = isLiked;
        localStorage.setItem('clipLikes', JSON.stringify(likes));
    }

    loadLikeStates() {
        const likes = JSON.parse(localStorage.getItem('clipLikes') || '{}');
        this.clips.forEach(clip => {
            if (likes[clip.id] !== undefined) {
                clip.isLiked = likes[clip.id];
            }
        });
    }

    hideLoading() {
        this.loadingSpinner.style.display = 'none';
    }

    showError() {
        this.hideLoading();
        this.errorMessage.style.display = 'block';
        setTimeout(() => {
            this.errorMessage.style.display = 'none';
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ClipsManager();
});
