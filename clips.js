// Clips Manager with Auto-Play on Load
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
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            await this.loadClips();
            this.loadLikeStates();
            this.renderClips();
            this.setupScrollBehavior();
            this.hideLoading();
            
            // IMPORTANT: Auto-play first video immediately
            setTimeout(() => {
                this.autoPlayFirstVideo();
            }, 800);
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing clips:', error);
            this.showError();
        }
    }

    async loadClips() {
        try {
            const response = await fetch('clips.json');
            if (!response.ok) throw new Error('Failed to load clips');
            this.clips = await response.json();
            
            this.clips = this.clips.map(clip => ({
                ...clip,
                likes: clip.likes || 0,
                comments: clip.comments || 0,
                shares: clip.shares || 0,
                isLiked: false,
                series: this.extractSeriesName(clip.title)
            }));
        } catch (error) {
            throw error;
        }
    }

    extractSeriesName(title) {
        if (title.includes('Alp Arslan')) return 'Alp Arslan';
        if (title.includes('Murad')) return 'Sultan Murad';
        if (title.includes('Orhan')) return 'Kurulus Orhan';
        if (title.includes('Mehmet') || title.includes('Fatih')) return 'Sultan Mehmet Fatih';
        if (title.includes('Salahuddin') || title.includes('Ayyubi')) return 'Salahuddin Ayyubi';
        if (title.includes('Rumi')) return 'Rumi';
        return 'Turkish Drama';
    }

    generateHashtags(title, series) {
        const hashtags = [];
        hashtags.push('#' + series.replace(/s+/g, ''));
        hashtags.push('#TurkishDrama');
        
        if (title.toLowerCase().includes('battle')) hashtags.push('#EpicBattle');
        if (title.toLowerCase().includes('sultan')) hashtags.push('#Ottoman');
        
        return hashtags;
    }

    renderClips() {
        if (!this.clips || this.clips.length === 0) {
            this.showError();
            return;
        }

        this.clipsContainer.innerHTML = this.clips.map((clip, index) => `
            <div class="clip-item" data-clip-index="${index}" data-clip-id="${clip.id}">
                <div class="video-wrapper">
                    <iframe 
                        id="video-${index}"
                        src="${clip.embed}" 
                        frameborder="0" 
                        allowfullscreen
                        allow="autoplay; fullscreen; accelerometer; gyroscope; picture-in-picture"
                        loading="${index === 0 ? 'eager' : 'lazy'}">
                    </iframe>
                </div>
                <div class="clip-info">
                    <div class="clip-series">${clip.series}</div>
                    <div class="clip-title">${clip.title}</div>
                    <div class="clip-description">${clip.desc}</div>
                    <div class="clip-hashtags">${this.generateHashtags(clip.title, clip.series).join(' ')}</div>
                </div>
                <div class="action-buttons">
                    <div>
                        <button class="action-btn like-btn ${clip.isLiked ? 'liked' : ''}" data-clip-id="${clip.id}" aria-label="Like">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="${clip.isLiked ? '#ff0050' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                        <div class="action-count">${this.formatCount(clip.likes)}</div>
                    </div>
                    <div>
                        <button class="action-btn comment-btn" data-clip-id="${clip.id}" aria-label="Comment">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                        <div class="action-count">${this.formatCount(clip.comments)}</div>
                    </div>
                    <div>
                        <button class="action-btn share-btn" data-clip-id="${clip.id}" aria-label="Share">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                <polyline points="16 6 12 2 8 6"></polyline>
                                <line x1="12" y1="2" x2="12" y2="15"></line>
                            </svg>
                        </button>
                        <div class="action-count">${this.formatCount(clip.shares)}</div>
                    </div>
                </div>
            </div>
        `).join('');

        this.setupActionButtons();
    }

    autoPlayFirstVideo() {
        const firstIframe = document.getElementById('video-0');
        if (!firstIframe) return;

        // Force autoplay on first video
        const embedUrl = this.clips[0].embed;
        const separator = embedUrl.includes('?') ? '&' : '?';
        firstIframe.src = `${embedUrl}${separator}autoplay=1`;
        
        console.log('Auto-playing first video');
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
    }

    setupScrollBehavior() {
        const clipItems = document.querySelectorAll('.clip-item');
        
        const observerOptions = {
            root: this.clipsContainer,
            threshold: 0.7
        };

        this.observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const clipIndex = parseInt(entry.target.dataset.clipIndex);
                
                if (entry.isIntersecting) {
                    this.currentClipIndex = clipIndex;
                    this.playVideo(clipIndex);
                } else {
                    this.pauseVideo(clipIndex);
                }
            });
        }, observerOptions);

        clipItems.forEach(clip => this.observer.observe(clip));

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

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const direction = e.key === 'ArrowDown' ? 1 : -1;
                const nextIndex = this.currentClipIndex + direction;
                
                if (nextIndex >= 0 && nextIndex < clipItems.length) {
                    clipItems[nextIndex].scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }
        });
    }

    playVideo(index) {
        const iframe = document.getElementById(`video-${index}`);
        if (!iframe) return;

        const currentSrc = iframe.src;
        if (!currentSrc.includes('autoplay=1')) {
            const separator = currentSrc.includes('?') ? '&' : '?';
            iframe.src = `${currentSrc}${separator}autoplay=1`;
        }
    }

    pauseVideo(index) {
        const iframe = document.getElementById(`video-${index}`);
        if (!iframe) return;

        const currentSrc = iframe.src.replace(/[?&]autoplay=1/, '').replace(/&&/g, '&');
        if (iframe.src !== currentSrc) {
            iframe.src = currentSrc;
        }
    }

    handleLike(clipId, button) {
        const clip = this.clips.find(c => c.id === clipId);
        if (!clip) return;

        clip.isLiked = !clip.isLiked;
        clip.likes = (clip.likes || 0) + (clip.isLiked ? 1 : -1);

        const svg = button.querySelector('svg');
        svg.setAttribute('fill', clip.isLiked ? '#ff0050' : 'none');
        button.classList.toggle('liked', clip.isLiked);
        
        const countElement = button.parentElement.querySelector('.action-count');
        if (countElement) {
            countElement.textContent = this.formatCount(clip.likes);
        }

        button.style.transform = 'scale(1.2)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);

        this.saveLikeState(clipId, clip.isLiked, clip.likes);
    }

    handleComment(clipId) {
        const clip = this.clips.find(c => c.id === clipId);
        console.log('Comment on:', clip.title);
        
        clip.comments = (clip.comments || 0) + 1;
        
        const clipElement = document.querySelector(`[data-clip-id="${clipId}"]`);
        const commentCount = clipElement.querySelector('.comment-btn').parentElement.querySelector('.action-count');
        if (commentCount) {
            commentCount.textContent = this.formatCount(clip.comments);
        }
        
        alert('Comments feature coming soon! 💬');
    }

    handleShare(clipId) {
        const clip = this.clips.find(c => c.id === clipId);
        
        clip.shares = (clip.shares || 0) + 1;
        
        const clipElement = document.querySelector(`[data-clip-id="${clipId}"]`);
        const shareCount = clipElement.querySelector('.share-btn').parentElement.querySelector('.action-count');
        if (shareCount) {
            shareCount.textContent = this.formatCount(clip.shares);
        }
        
        const shareData = {
            title: clip.title,
            text: clip.desc,
            url: `${window.location.origin}/clips?id=${clipId}`
        };

        if (navigator.share) {
            navigator.share(shareData)
                .then(() => console.log('Shared successfully'))
                .catch(err => console.log('Share cancelled', err));
        } else {
            const shareUrl = shareData.url;
            navigator.clipboard.writeText(shareUrl)
                .then(() => {
                    alert('📋 Link copied to clipboard!');
                })
                .catch(() => {
                    prompt('Copy this link:', shareUrl);
                });
        }
    }

    formatCount(count) {
        if (!count || count === 0) return '0';
        
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count.toString();
    }

    saveLikeState(clipId, isLiked, likeCount) {
        const likes = JSON.parse(localStorage.getItem('clipLikes') || '{}');
        likes[clipId] = { isLiked, likeCount, timestamp: Date.now() };
        localStorage.setItem('clipLikes', JSON.stringify(likes));
    }

    loadLikeStates() {
        const likes = JSON.parse(localStorage.getItem('clipLikes') || '{}');
        this.clips.forEach(clip => {
            if (likes[clip.id]) {
                clip.isLiked = likes[clip.id].isLiked;
                clip.likes = likes[clip.id].likeCount || 0;
            }
        });
    }

    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
    }

    showError() {
        this.hideLoading();
        if (this.errorMessage) {
            this.errorMessage.style.display = 'block';
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ClipsManager();
});

// Also try to initialize on page show (for back/forward navigation)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // Page was loaded from cache, reinitialize if needed
        const firstIframe = document.getElementById('video-0');
        if (firstIframe && !firstIframe.src.includes('autoplay=1')) {
            setTimeout(() => {
                const clipManager = new ClipsManager();
            }, 300);
        }
    }
});
